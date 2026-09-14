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

// Ensure uploads directory exists safely across local and serverless/Vercel environments
let uploadsDir = path.join(process.cwd(), 'uploads');
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch {
  uploadsDir = path.join('/tmp', 'uploads');
  try {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
  } catch (err) {
    console.warn('Could not initialize uploads directory:', err);
  }
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

// Database File Paths (local root and /tmp for serverless platforms like Vercel)
const LOCAL_DB_FILE = path.join(process.cwd(), 'server_database.json');
const TMP_DB_FILE = path.join('/tmp', 'server_database.json');

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

let memoryCache: DBData | null = null;

function ensureCollections(data: any): DBData {
  const collections: (keyof DBData)[] = [
    'users',
    'organizations',
    'organizers',
    'programs',
    'accounts',
    'incomes',
    'expenses',
    'loans',
    'repayments',
    'transfers',
    'audit_logs',
  ];
  for (const c of collections) {
    if (!Array.isArray(data[c])) {
      data[c] = [];
    }
  }
  return data as DBData;
}

function getDBFilePath(): string {
  if (fs.existsSync(TMP_DB_FILE)) {
    return TMP_DB_FILE;
  }
  if (fs.existsSync(LOCAL_DB_FILE)) {
    return LOCAL_DB_FILE;
  }
  return TMP_DB_FILE;
}

function readDB(): DBData {
  if (memoryCache) {
    return memoryCache;
  }

  const fileToRead = getDBFilePath();
  try {
    if (fs.existsSync(fileToRead)) {
      const data = fs.readFileSync(fileToRead, 'utf-8');
      const parsed = JSON.parse(data);
      memoryCache = ensureCollections(parsed);
      return memoryCache;
    }
  } catch (err) {
    console.warn('Notice reading primary DB file:', err);
  }

  if (fileToRead === TMP_DB_FILE && fs.existsSync(LOCAL_DB_FILE)) {
    try {
      const data = fs.readFileSync(LOCAL_DB_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      memoryCache = ensureCollections(parsed);
      return memoryCache;
    } catch {}
  }

  memoryCache = ensureCollections({});
  return memoryCache;
}

function writeDB(data: DBData) {
  memoryCache = ensureCollections(data);
  const content = JSON.stringify(memoryCache, null, 2);

  // Write to /tmp (always writable in serverless runtimes)
  try {
    const tmpFile = `${TMP_DB_FILE}.${Date.now()}.${Math.random().toString(36).substr(2, 5)}.tmp`;
    fs.writeFileSync(tmpFile, content, 'utf-8');
    fs.renameSync(tmpFile, TMP_DB_FILE);
  } catch (err) {
    console.warn('Persistence notice (/tmp write):', err);
  }

  // Attempt to write to local directory if writable
  try {
    const localTmp = `${LOCAL_DB_FILE}.${Date.now()}.${Math.random().toString(36).substr(2, 5)}.tmp`;
    fs.writeFileSync(localTmp, content, 'utf-8');
    fs.renameSync(localTmp, LOCAL_DB_FILE);
  } catch {}
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
  res.setHeader('Content-Type', 'application/json');
  try {
    const rawIdentifier = (req.body.username || req.body.email || '').trim();
    const password = req.body.password;

    if (!rawIdentifier) {
      return res.status(400).json({ success: false, error: 'USERNAME_REQUIRED', message: 'Username is required.' });
    }
    if (!password) {
      return res.status(400).json({ success: false, error: 'PASSWORD_REQUIRED', message: 'Password is required.' });
    }
    if (rawIdentifier.length < 3) {
      return res.status(400).json({ success: false, error: 'USERNAME_TOO_SHORT', message: 'Username must be at least 3 characters long.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'PASSWORD_TOO_SHORT', message: 'Password must be at least 6 characters long.' });
    }

    const normalized = rawIdentifier.toLowerCase();
    const db = readDB();
    const existingUser = db.users.find((u) => {
      const uEmail = (u.email || '').trim().toLowerCase();
      const uUsername = (u.username || '').trim().toLowerCase();
      const uEmailPrefix = uEmail.includes('@') ? uEmail.split('@')[0] : '';
      const uId = (u.id || '').trim().toLowerCase();
      return (
        (uEmail && uEmail === normalized) ||
        (uUsername && uUsername === normalized) ||
        (uEmailPrefix && uEmailPrefix === normalized) ||
        (uId && uId === normalized)
      );
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'USERNAME_EXISTS',
        message: 'This username already exists. Please choose another username or log in.',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const newUser = {
      id: 'usr_' + Date.now() + Math.random().toString(36).substr(2, 5),
      username: rawIdentifier,
      email: rawIdentifier.includes('@') ? rawIdentifier : `${rawIdentifier}@munazzam.local`,
      password_hash,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.users.push(newUser);

    // Auto-create cloud organization for this account
    const newOrgId = 'org_' + Date.now() + Math.random().toString(36).substr(2, 5);
    const newOrg = {
      id: newOrgId,
      user_id: newUser.id,
      name: rawIdentifier.includes('@') ? rawIdentifier.split('@')[0] : rawIdentifier,
      college_name: '',
      logo: '',
      motto: '',
      academic_year: '',
      mission: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.organizations.push(newOrg);
    writeDB(db);

    const token = jwt.sign(
      { id: newUser.id, username: newUser.username, email: newUser.email, organization_id: newOrg.id },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      success: true,
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        organization_id: newOrg.id,
      },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: 'Unable to create account. Please try again.' });
  }
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const rawIdentifier = (req.body.username || req.body.email || '').trim();
    const password = req.body.password;

    if (!rawIdentifier || !password) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid username or password.',
      });
    }

    const normalized = rawIdentifier.toLowerCase();
    const db = readDB();
    const user = db.users.find((u) => {
      const uEmail = (u.email || '').trim().toLowerCase();
      const uUsername = (u.username || '').trim().toLowerCase();
      const uEmailPrefix = uEmail.includes('@') ? uEmail.split('@')[0] : '';
      const uId = (u.id || '').trim().toLowerCase();
      return (
        (uEmail && uEmail === normalized) ||
        (uUsername && uUsername === normalized) ||
        (uEmailPrefix && uEmailPrefix === normalized) ||
        (uId && uId === normalized)
      );
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid username or password.',
      });
    }

    let validPassword = false;
    const storedHash = user.password_hash || user.password;

    if (storedHash && (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$') || storedHash.startsWith('$2y$'))) {
      validPassword = await bcrypt.compare(password, storedHash);
    } else if (storedHash) {
      // Plaintext legacy fallback with auto-upgrade to bcrypt
      validPassword = password === storedHash;
      if (validPassword) {
        const salt = await bcrypt.genSalt(10);
        user.password_hash = await bcrypt.hash(password, salt);
        if (user.password) delete user.password;
        writeDB(db);
      }
    }

    if (!validPassword) {
      return res.status(401).json({
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid username or password.',
      });
    }

    // Retrieve or provision user's organization in cloud database
    let userOrg = db.organizations.find((o) => o.user_id === user.id);
    if (!userOrg) {
      userOrg = {
        id: 'org_' + Date.now() + Math.random().toString(36).substr(2, 5),
        user_id: user.id,
        name: user.username || user.email || 'My Organization',
        college_name: '',
        logo: '',
        motto: '',
        academic_year: '',
        mission: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.organizations.push(userOrg);
      writeDB(db);
    }

    const displayIdentifier = user.username || user.email;
    const token = jwt.sign(
      { id: user.id, username: displayIdentifier, email: displayIdentifier, organization_id: userOrg.id },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: displayIdentifier,
        email: displayIdentifier,
        organization_id: userOrg.id,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: 'An unexpected error occurred during login. Please try again.' });
  }
});

app.get('/api/auth/me', authenticateToken, (req: AuthRequest, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const db = readDB();
    const user = db.users.find((u) => u.id === req.user?.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Account not found. Please log in again.' });
    }
    const userOrg = db.organizations.find((o) => o.user_id === user.id);
    const displayIdentifier = user.username || user.email;
    res.json({
      success: true,
      user: {
        id: user.id,
        username: displayIdentifier,
        email: displayIdentifier,
        organization_id: userOrg ? userOrg.id : null,
      },
    });
  } catch (err) {
    console.error('Auth check error:', err);
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: 'Unable to verify session.' });
  }
});

// ==================== LOCAL DATA MIGRATION ENDPOINT ====================
app.post('/api/migration/sync-local', async (req: Request, res: Response) => {
  try {
    const {
      users = [],
      organizations = [],
      organizers = [],
      programs = [],
      accounts = [],
      incomes = [],
      expenses = [],
      loans = [],
      repayments = [],
      transfers = [],
      audit_logs = [],
    } = req.body;

    const db = readDB();
    let migratedUsers = 0;
    let migratedRecords = 0;

    // 1. Migrate users
    if (Array.isArray(users)) {
      for (const u of users) {
        if (!u.email) continue;
        const trimmed = u.email.trim();
        const existingUser = db.users.find((x) => x.email.toLowerCase() === trimmed.toLowerCase());
        if (!existingUser) {
          let password_hash = u.password_hash;
          if (!password_hash && u.password) {
            const salt = await bcrypt.genSalt(10);
            password_hash = await bcrypt.hash(u.password, salt);
          }
          if (password_hash) {
            db.users.push({
              id: u.id || ('usr_' + Date.now() + Math.random().toString(36).substr(2, 5)),
              email: trimmed,
              password_hash,
              created_at: u.created_at || new Date().toISOString(),
              updated_at: u.updated_at || new Date().toISOString(),
            });
            migratedUsers++;
          }
        }
      }
    }

    // 2. Migrate organizations
    if (Array.isArray(organizations)) {
      for (const org of organizations) {
        if (!org.id && !org.name) continue;
        const existing = db.organizations.find(
          (x) => x.id === org.id || (x.name === org.name && x.college_name === org.college_name)
        );
        if (!existing) {
          db.organizations.push(org);
          migratedRecords++;
        } else {
          if (org.logo && !existing.logo) existing.logo = org.logo;
          if (org.motto && !existing.motto) existing.motto = org.motto;
          if (org.mission && !existing.mission) existing.mission = org.mission;
          if (org.academic_year && !existing.academic_year) existing.academic_year = org.academic_year;
        }
      }
    }

    // 3. Migrate entity items
    const entityKeys: (keyof DBData)[] = [
      'organizers',
      'programs',
      'accounts',
      'incomes',
      'expenses',
      'loans',
      'repayments',
      'transfers',
      'audit_logs',
    ];

    const payload: Record<string, any[]> = {
      organizers,
      programs,
      accounts,
      incomes,
      expenses,
      loans,
      repayments,
      transfers,
      audit_logs,
    };

    for (const key of entityKeys) {
      const incomingList = payload[key];
      if (Array.isArray(incomingList)) {
        for (const item of incomingList) {
          if (!item.id || !item.organization_id) continue;
          const targetArray = db[key] as any[];
          const existingIndex = targetArray.findIndex((x) => x.id === item.id);
          if (existingIndex === -1) {
            targetArray.push(item);
            migratedRecords++;
          } else {
            targetArray[existingIndex] = { ...targetArray[existingIndex], ...item };
          }
        }
      }
    }

    writeDB(db);
    res.json({ success: true, migratedUsers, migratedRecords });
  } catch (err) {
    console.error('Migration error:', err);
    res.status(500).json({ error: 'Migration failed' });
  }
});

// Forgot Password endpoint
app.post('/api/auth/forgot-password', (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }
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
// Helper to verify organization exists and belongs to the authenticated user
function verifyOrgOwnership(db: DBData, orgId: string, userId?: string): boolean {
  const org = db.organizations.find((o) => o.id === orgId);
  if (!org) return false;
  // If org already has a designated user_id, ensure it matches
  if (org.user_id && userId && org.user_id !== userId) {
    return false;
  }
  return true;
}

// 1. Organizations (Shared Cloud Database for Organization Portal)
app.get('/api/organizations', authenticateToken, (req: AuthRequest, res: Response) => {
  const db = readDB();
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  // Retrieve organizations associated with this account ID
  let userOrgs = db.organizations.filter((o) => o.user_id === userId);

  // If this account has no organizations yet, check if there is an unassigned legacy organization
  // that can be claimed by this account so prior data is not orphaned
  if (userOrgs.length === 0) {
    const unassignedOrgs = db.organizations.filter(
      (o) => !o.user_id || !db.users.some((u) => u.id === o.user_id)
    );
    if (unassignedOrgs.length > 0) {
      unassignedOrgs[0].user_id = userId;
      writeDB(db);
      userOrgs = [unassignedOrgs[0]];
    }
  }

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

// Ensure all unhandled /api/* endpoints return structured JSON
app.all('/api/*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API_ENDPOINT_NOT_FOUND',
    message: `API endpoint ${req.method} ${req.path} was not found.`,
  });
});

// Express global error handler for API requests
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[API SERVER EXCEPTION]', err);
  if (req.path.startsWith('/api') && !res.headersSent) {
    const diagnosticMessage = err?.message || 'An unexpected error occurred on the server.';
    return res.status(500).json({
      success: false,
      error: 'SERVER_EXCEPTION',
      message: diagnosticMessage,
    });
  }
  next(err);
});

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

  if (process.env.VERCEL !== '1') {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

if (process.env.VERCEL !== '1') {
  startServer();
}

export default app;
export { app };
