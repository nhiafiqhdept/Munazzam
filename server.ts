import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'org_management_secure_jwt_secret_key_2026';

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Request Logger
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url}`);
  next();
});

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  },
});
const upload = multer({ storage });

// Database File Path
const DB_FILE = path.join(process.cwd(), 'server_database.json');

interface DBData {
  users: any[];
  organizations: any[];
  organizers: any[];
  programs: any[];
  accounts: any[];
  incomes: any[];
  expenses: any[];
  loans: any[];
  repayments: any[];
  transfers: any[];
  audit_logs: any[];
}

function readDB(): DBData {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading DB file:', err);
  }
  return {
    users: [],
    organizations: [],
    organizers: [],
    programs: [],
    accounts: [],
    incomes: [],
    expenses: [],
    loans: [],
    repayments: [],
    transfers: [],
    audit_logs: [],
  };
}

function writeDB(data: DBData) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing DB file:', err);
  }
}

// Auth Middleware
interface AuthRequest extends Request {
  user?: { id: string; email: string };
}

const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token.' });
    }
    req.user = user;
    next();
  });
};

// ==================== AUTH ROUTES ====================
app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const db = readDB();
    const existingUser = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      return res.status(400).json({ error: 'This username is already registered. Please sign in.' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const newUser = {
      id: 'usr_' + Date.now() + Math.random().toString(36).substr(2, 5),
      email: email.toLowerCase(),
      password_hash,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.users.push(newUser);
    writeDB(db);

    const token = jwt.sign({ id: newUser.id, email: newUser.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: { id: newUser.id, email: newUser.email },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const db = readDB();
    const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: { id: user.id, email: user.email },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
});

app.get('/api/auth/me', authenticateToken, (req: AuthRequest, res: Response) => {
  const db = readDB();
  const user = db.users.find((u) => u.id === req.user?.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }
  res.json({ user: { id: user.id, email: user.email } });
});

// Forgot Password endpoint (simulated / ready for backend email setup)
app.post('/api/auth/forgot-password', (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }
  // In production, send reset email here.
  res.json({ message: 'If the email exists, password reset instructions have been dispatched.' });
});

// ==================== FILE UPLOAD ROUTE ====================
app.post('/api/upload', authenticateToken, upload.single('file'), (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ url: fileUrl });
});

// ==================== APPLICATION DATA ENDPOINTS ====================
// Helper to verify organization ownership
function verifyOrgOwnership(db: DBData, orgId: string, userId: string): boolean {
  const org = db.organizations.find((o) => o.id === orgId && o.user_id === userId);
  return !!org;
}

// 1. Organizations
app.get('/api/organizations', authenticateToken, (req: AuthRequest, res: Response) => {
  const db = readDB();
  const userOrgs = db.organizations.filter((o) => o.user_id === req.user?.id);
  res.json(userOrgs);
});

app.post('/api/organizations', authenticateToken, (req: AuthRequest, res: Response) => {
  const db = readDB();
  const { name, college_name, logo, motto, academic_year, mission } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Organization name is required.' });
  }

  const now = new Date().toISOString();
  const newOrg = {
    id: 'org_' + Date.now() + Math.random().toString(36).substr(2, 5),
    user_id: req.user?.id,
    name,
    college_name: college_name || '',
    logo: logo || '',
    motto: motto || '',
    academic_year: academic_year || '',
    mission: mission || '',
    created_at: now,
    updated_at: now,
  };

  db.organizations.push(newOrg);
  writeDB(db);
  res.json(newOrg);
});

app.put('/api/organizations/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  const db = readDB();
  const orgId = req.params.id;
  if (!verifyOrgOwnership(db, orgId, req.user!.id)) {
    return res.status(403).json({ error: 'Unauthorized access to organization.' });
  }

  const orgIndex = db.organizations.findIndex((o) => o.id === orgId);
  if (orgIndex === -1) {
    return res.status(404).json({ error: 'Organization not found.' });
  }

  const updatedOrg = {
    ...db.organizations[orgIndex],
    ...req.body,
    updated_at: new Date().toISOString(),
  };

  db.organizations[orgIndex] = updatedOrg;
  writeDB(db);
  res.json(updatedOrg);
});

app.delete('/api/organizations/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  const db = readDB();
  const orgId = req.params.id;
  if (!verifyOrgOwnership(db, orgId, req.user!.id)) {
    return res.status(403).json({ error: 'Unauthorized access to organization.' });
  }

  db.organizations = db.organizations.filter((o) => o.id !== orgId);
  db.organizers = db.organizers.filter((o) => o.organization_id !== orgId);
  db.programs = db.programs.filter((p) => p.organization_id !== orgId);
  db.accounts = db.accounts.filter((a) => a.organization_id !== orgId);
  db.incomes = db.incomes.filter((i) => i.organization_id !== orgId);
  db.expenses = db.expenses.filter((e) => e.organization_id !== orgId);
  db.loans = db.loans.filter((l) => l.organization_id !== orgId);
  db.repayments = db.repayments.filter((r) => r.organization_id !== orgId);
  db.transfers = db.transfers.filter((t) => t.organization_id !== orgId);
  db.audit_logs = db.audit_logs.filter((a) => a.organization_id !== orgId);

  writeDB(db);
  res.json({ success: true });
});

// Generic CRUD helper for sub-entities (organizers, programs, accounts, incomes, expenses, loans, repayments, transfers, audit_logs)
function setupEntityEndpoints(app: any, entityName: keyof DBData, defaultSortKey = 'created_at') {
  app.get(`/api/${entityName}`, authenticateToken, (req: AuthRequest, res: Response) => {
    const db = readDB();
    const orgId = req.query.organization_id as string;
    if (!orgId || !verifyOrgOwnership(db, orgId, req.user!.id)) {
      return res.status(403).json({ error: 'Valid organization ID required.' });
    }
    const items = (db[entityName] as any[]).filter((item) => item.organization_id === orgId);
    res.json(items);
  });

  app.post(`/api/${entityName}`, authenticateToken, (req: AuthRequest, res: Response) => {
    const db = readDB();
    const { organization_id, ...rest } = req.body;
    if (!organization_id || !verifyOrgOwnership(db, organization_id, req.user!.id)) {
      return res.status(403).json({ error: 'Valid organization ID required.' });
    }

    const now = new Date().toISOString();
    const newItem = {
      id: entityName.slice(0, 3) + '_' + Date.now() + Math.random().toString(36).substr(2, 5),
      organization_id,
      ...rest,
      created_at: now,
      updated_at: now,
    };

    (db[entityName] as any[]).push(newItem);
    writeDB(db);
    res.json(newItem);
  });

  app.put(`/api/${entityName}/:id`, authenticateToken, (req: AuthRequest, res: Response) => {
    const db = readDB();
    const itemId = req.params.id;
    const items = db[entityName] as any[];
    const itemIndex = items.findIndex((i) => i.id === itemId);
    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Item not found.' });
    }

    const item = items[itemIndex];
    if (!verifyOrgOwnership(db, item.organization_id, req.user!.id)) {
      return res.status(403).json({ error: 'Unauthorized.' });
    }

    const updatedItem = {
      ...item,
      ...req.body,
      organization_id: item.organization_id, // prevent org mismatch
      updated_at: new Date().toISOString(),
    };

    items[itemIndex] = updatedItem;
    writeDB(db);
    res.json(updatedItem);
  });

  app.delete(`/api/${entityName}/:id`, authenticateToken, (req: AuthRequest, res: Response) => {
    const db = readDB();
    const itemId = req.params.id;
    const items = db[entityName] as any[];
    const item = items.find((i) => i.id === itemId);
    if (!item) {
      return res.status(404).json({ error: 'Item not found.' });
    }

    if (!verifyOrgOwnership(db, item.organization_id, req.user!.id)) {
      return res.status(403).json({ error: 'Unauthorized.' });
    }

    db[entityName] = items.filter((i) => i.id !== itemId) as any;
    writeDB(db);
    res.json({ success: true });
  });
}

setupEntityEndpoints(app, 'organizers');
setupEntityEndpoints(app, 'programs');
setupEntityEndpoints(app, 'accounts');
setupEntityEndpoints(app, 'incomes');
setupEntityEndpoints(app, 'expenses');
setupEntityEndpoints(app, 'loans');
setupEntityEndpoints(app, 'repayments');
setupEntityEndpoints(app, 'transfers');
setupEntityEndpoints(app, 'audit_logs');

// ==================== VITE / STATIC SERVING ====================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
