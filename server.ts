import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
} from 'firebase/firestore';

let serverFirestore: any = null;
function getServerFirestore() {
  if (serverFirestore) return serverFirestore;
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
      serverFirestore = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    }
  } catch (err) {
    console.warn('Could not initialize server Firestore instance:', err);
  }
  return serverFirestore;
}

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'org_management_secure_jwt_secret_key_2026';

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Request Logger for API routes
app.use((req, res, next) => {
  if (req.url.startsWith('/api')) {
    console.log(`[API REQUEST] ${req.method} ${req.url}`);
  }
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
  program_permissions: any[];
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
    'program_permissions',
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

// ==================== FILE UPLOAD ROUTE ====================
app.post('/api/upload', authenticateToken, upload.single('file') as any, (req: Request, res: Response) => {
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
setupEntityEndpoints(app, 'program_permissions');

// ==================== PUBLIC UNRESTRICTED COLLEGE PERMISSION REVIEW API ====================
// Public, unauthenticated token lookup - allows external Principals to review permission requests safely
app.get('/api/public/college-permission/:token', async (req: Request, res: Response) => {
  const { token } = req.params;
  if (!token) {
    return res.status(400).json({ success: false, errorCode: 'MISSING_TOKEN', message: 'Token is required' });
  }

  const dbFs = getServerFirestore();
  let perm: any = null;
  let docId = '';

  if (dbFs) {
    try {
      const q = query(collection(dbFs, 'program_permissions'), where('approvalToken', '==', token));
      const snap = await getDocs(q);
      if (!snap.empty) {
        docId = snap.docs[0].id;
        perm = { id: docId, ...snap.docs[0].data() };
      } else {
        const dSnap = await getDoc(doc(dbFs, 'program_permissions', token));
        if (dSnap.exists()) {
          docId = dSnap.id;
          perm = { id: docId, ...dSnap.data() };
        }
      }
    } catch (fsErr) {
      console.warn('Server GET Firestore lookup error, falling back to local DB:', fsErr);
    }
  }

  if (!perm) {
    const db = readDB();
    const permissions = db.program_permissions || [];
    const found = permissions.find(
      (p: any) => p.approvalToken === token || p.id === token || p.approval_token === token
    );
    if (found) {
      docId = found.id || token;
      perm = found;
    }
  }

  if (!perm) {
    return res.status(404).json({
      success: false,
      errorCode: 'PERMISSION_NOT_FOUND',
      message: 'Permission request not found or link has expired.'
    });
  }

  if (perm.tokenRevoked) {
    return res.status(403).json({
      success: false,
      errorCode: 'TOKEN_REVOKED',
      message: 'This approval link has been revoked.'
    });
  }

  if (perm.tokenExpiresAt) {
    const expiry = new Date(perm.tokenExpiresAt).getTime();
    if (!isNaN(expiry) && Date.now() > expiry) {
      return res.status(410).json({
        success: false,
        errorCode: 'TOKEN_EXPIRED',
        message: 'This approval link has expired.'
      });
    }
  }

  // Find associated organization info (name, college_name, logo)
  let matchingOrg: any = null;
  const targetOrgId = perm.organizationId || perm.organization_id || perm.accountId || '';
  if (dbFs && targetOrgId) {
    try {
      const orgSnap = await getDoc(doc(dbFs, 'organizations', targetOrgId));
      if (orgSnap.exists()) {
        matchingOrg = { id: orgSnap.id, ...orgSnap.data() };
      }
    } catch {}
  }

  if (!matchingOrg) {
    const db = readDB();
    const orgs = db.organizations || [];
    matchingOrg = orgs.find((o: any) => o.id === targetOrgId) || orgs[0] || null;
  }

  // Return strictly public-safe information
  const sanitized = {
    id: docId || perm.id,
    programId: perm.programId || perm.program_id || '',
    organizationId: perm.organizationId || perm.organization_id || '',
    organization: matchingOrg ? {
      id: matchingOrg.id,
      name: matchingOrg.name || '',
      college_name: matchingOrg.college_name || '',
      logo: matchingOrg.logo || '',
      tagline: matchingOrg.tagline || '',
    } : undefined,
    programName: perm.programName || perm.title || 'Untitled Program',
    conductedBy: perm.conductedBy || perm.organizer || '',
    category: perm.category || '',
    subCategory: perm.subCategory || '',
    date: perm.date || '',
    timeFrom: perm.timeFrom || '',
    timeTill: perm.timeTill || '',
    venue: perm.venue || '',
    audience: perm.audience || '',
    resourcePerson: perm.resourcePerson || '',
    expectedAttendance: perm.expectedAttendance ? Number(perm.expectedAttendance) : undefined,
    description: perm.description || '',
    permissionNotes: perm.permissionNotes || '',
    approvingAuthority: perm.approvingAuthority || 'Principal',
    status: perm.status || 'pending',
    submittedBy: perm.submittedBy,
    recommendedBy: perm.recommendedBy,
    approvedBy: perm.approvedBy,
    approvedAt: perm.approvedAt,
    approvalNotes: perm.approvalNotes,
    approvalMethod: perm.approvalMethod,
    approverDesignation: perm.approverDesignation,
    rejectedBy: perm.rejectedBy,
    rejectedAt: perm.rejectedAt,
    rejectionReason: perm.rejectionReason,
    changesRequestedBy: perm.changesRequestedBy,
    changesRequestedAt: perm.changesRequestedAt,
    changesRequiredNotes: perm.changesRequiredNotes,
    approvalToken: perm.approvalToken || perm.approval_token || token,
    tokenCreatedAt: perm.tokenCreatedAt,
    tokenExpiresAt: perm.tokenExpiresAt,
    tokenRevoked: Boolean(perm.tokenRevoked),
    history: perm.history || [],
    createdAt: perm.createdAt || perm.created_at,
    updatedAt: perm.updatedAt || perm.updated_at,
  };

  res.json({ success: true, permission: sanitized });
});

// Helper for handling public permission action decisions securely
async function processPublicPermissionAction(req: Request, res: Response) {
  try {
    const token = (
      req.body.token ||
      req.body.approvalToken ||
      req.body.secureApprovalToken ||
      req.params.token ||
      ''
    ).trim();

    const rawAction = (
      req.body.action ||
      req.body.decision ||
      ''
    ).toLowerCase().trim();

    const approverName = (
      req.body.approverName ||
      req.body.approver_name ||
      ''
    ).trim();

    const approverDesignation = (
      req.body.approverDesignation ||
      req.body.approver_designation ||
      ''
    ).trim();

    const notes = (
      req.body.approvalRemarks ||
      req.body.rejectionReason ||
      req.body.changesRequiredNotes ||
      req.body.notes ||
      ''
    ).trim();

    if (!token) {
      return res.status(400).json({
        success: false,
        errorCode: 'MISSING_TOKEN',
        message: 'A secure approval token is required.',
      });
    }

    let targetStatus = '';
    if (rawAction === 'approved' || rawAction === 'approve') {
      targetStatus = 'approved';
    } else if (rawAction === 'rejected' || rawAction === 'reject') {
      targetStatus = 'rejected';
    } else if (
      rawAction === 'changes_required' ||
      rawAction === 'changes_requested' ||
      rawAction === 'request_changes' ||
      rawAction === 'changes'
    ) {
      targetStatus = 'changes_required';
    } else {
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_ACTION',
        message: 'Invalid decision specified. Must be approved, rejected, or changes_required.',
      });
    }

    if (targetStatus === 'rejected' && !notes) {
      return res.status(400).json({
        success: false,
        errorCode: 'REASON_REQUIRED',
        message: 'Please provide an official reason for rejecting this permission request.',
      });
    }

    if (targetStatus === 'changes_required' && !notes) {
      return res.status(400).json({
        success: false,
        errorCode: 'REASON_REQUIRED',
        message: 'Please specify the changes or modifications required.',
      });
    }

    // Locate permission document in Firestore or fallback DB
    const dbFs = getServerFirestore();
    let docId = '';
    let permData: any = null;

    if (dbFs) {
      try {
        const q = query(
          collection(dbFs, 'program_permissions'),
          where('approvalToken', '==', token)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          docId = snap.docs[0].id;
          permData = snap.docs[0].data();
        } else {
          const dSnap = await getDoc(doc(dbFs, 'program_permissions', token));
          if (dSnap.exists()) {
            docId = dSnap.id;
            permData = dSnap.data();
          }
        }
      } catch (err) {
        console.warn('Firestore lookup notice during permission action:', err);
      }
    }

    let localDbIndex = -1;
    const db = readDB();
    const permissions = db.program_permissions || [];
    if (!permData) {
      localDbIndex = permissions.findIndex(
        (p: any) => p.approvalToken === token || p.id === token || p.approval_token === token
      );
      if (localDbIndex !== -1) {
        docId = permissions[localDbIndex].id || token;
        permData = permissions[localDbIndex];
      }
    }

    if (!permData) {
      return res.status(404).json({
        success: false,
        errorCode: 'PERMISSION_NOT_FOUND',
        message: 'Permission request not found or approval link is invalid.',
      });
    }

    // Validate token revocation
    if (permData.tokenRevoked) {
      return res.status(403).json({
        success: false,
        errorCode: 'TOKEN_REVOKED',
        message: 'This approval link has been revoked.',
      });
    }

    // Validate token expiration
    if (permData.tokenExpiresAt) {
      const expiry = new Date(permData.tokenExpiresAt).getTime();
      if (!isNaN(expiry) && Date.now() > expiry) {
        return res.status(410).json({
          success: false,
          errorCode: 'TOKEN_EXPIRED',
          message: 'This approval link has expired.',
        });
      }
    }

    // Prevent duplicate decisions if already finalized (approved or rejected)
    const currentStatus = permData.status || 'pending';
    if (currentStatus === 'approved' || currentStatus === 'rejected') {
      return res.status(400).json({
        success: false,
        errorCode: 'ALREADY_REVIEWED',
        message: `This permission request has already been ${currentStatus}.`,
      });
    }

    const finalDesignation = approverDesignation || permData.approvingAuthority || 'Principal';
    const finalApproverName = approverName || finalDesignation;
    const now = new Date().toISOString();

    let actionDescription = '';
    if (targetStatus === 'approved') {
      actionDescription = `Approved via Official Institutional Review Link by ${finalApproverName} (${finalDesignation})`;
    } else if (targetStatus === 'rejected') {
      actionDescription = `Rejected via Official Review Link by ${finalApproverName} (${finalDesignation}) - Reason: ${notes}`;
    } else {
      actionDescription = `Modifications requested via Official Review Link by ${finalApproverName} (${finalDesignation})`;
    }

    const newHistoryItem = {
      id: 'hist_' + Date.now(),
      timestamp: now,
      status: targetStatus,
      action: actionDescription,
      actorName: finalApproverName,
      actorRole: finalDesignation,
      notes: notes || '',
    };

    const updatedHistory = [
      ...(Array.isArray(permData.history) ? permData.history : []),
      newHistoryItem,
    ];

    const updates: Record<string, any> = {
      status: targetStatus,
      approvalMethod: 'public_link',
      approverDesignation: finalDesignation,
      history: updatedHistory,
      updatedAt: now,
      updated_at: now,
    };

    if (targetStatus === 'approved') {
      updates.approvedBy = finalApproverName;
      updates.approvedAt = now;
      updates.approvalNotes = notes || '';
    } else if (targetStatus === 'rejected') {
      updates.rejectedBy = finalApproverName;
      updates.rejectedAt = now;
      updates.rejectionReason = notes || '';
    } else if (targetStatus === 'changes_required') {
      updates.changesRequestedBy = finalApproverName;
      updates.changesRequestedAt = now;
      updates.changesRequiredNotes = notes || '';
    }

    // 1. Write updates securely to Firestore
    if (dbFs && docId) {
      try {
        await updateDoc(doc(dbFs, 'program_permissions', docId), updates);

        // Sync linked program document if present
        const progId = permData.programId || permData.program_id;
        if (progId) {
          await updateDoc(doc(dbFs, 'programs', progId), {
            permissionStatus: targetStatus,
            updatedAt: now,
          }).catch((err) => console.warn('Program doc status sync notice:', err));
        }
      } catch (fsWriteErr) {
        console.error('Error updating Firestore from server action endpoint:', fsWriteErr);
      }
    }

    // 2. Sync server local DB cache
    if (localDbIndex !== -1 || docId) {
      const idx =
        localDbIndex !== -1
          ? localDbIndex
          : permissions.findIndex((p: any) => p.id === docId);
      if (idx !== -1) {
        permissions[idx] = { ...permissions[idx], ...updates };
        db.program_permissions = permissions;
        writeDB(db);
      }
    }

    const mergedPerm = { ...permData, ...updates, id: docId };

    let successMsg = 'Permission decision recorded successfully.';
    if (targetStatus === 'approved') {
      successMsg = 'Permission for this program has been approved successfully.';
    } else if (targetStatus === 'rejected') {
      successMsg = 'Permission request has been rejected.';
    } else if (targetStatus === 'changes_required') {
      successMsg = 'Requested modifications sent back to the organizer successfully.';
    }

    return res.json({
      success: true,
      status: targetStatus,
      message: successMsg,
      permission: mergedPerm,
    });
  } catch (err: any) {
    console.error('Exception in public permission action handler:', err);
    return res.status(500).json({
      success: false,
      errorCode: 'SERVER_ERROR',
      message: err?.message || 'An unexpected error occurred while processing permission decision.',
    });
  }
}

// Support all route variations for public permission decision submissions
app.post('/api/public/college-permission/approve', processPublicPermissionAction);
app.post('/api/public/college-permission/action', processPublicPermissionAction);
app.post('/api/public/college-permission/:token/action', processPublicPermissionAction);

// ==================== VITE / STATIC SERVING ====================
async function startServer() {
  // Ensure unhandled /api/* endpoints return structured JSON 404
  app.all('/api/*', (req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: 'API_ENDPOINT_NOT_FOUND',
      message: `API endpoint ${req.method} ${req.path} was not found.`,
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = fs.existsSync(path.join(process.cwd(), 'dist', 'index.html'))
      ? path.join(process.cwd(), 'dist')
      : path.join(process.cwd(), 'build');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

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
