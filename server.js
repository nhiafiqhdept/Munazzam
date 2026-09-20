var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server.ts
var server_exports = {};
__export(server_exports, {
  app: () => app,
  default: () => server_default
});
module.exports = __toCommonJS(server_exports);
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_bcryptjs = __toESM(require("bcryptjs"), 1);
var import_jsonwebtoken = __toESM(require("jsonwebtoken"), 1);
var import_multer = __toESM(require("multer"), 1);
var import_vite = require("vite");
var app = (0, import_express.default)();
var PORT = 3e3;
var JWT_SECRET = process.env.JWT_SECRET || "org_management_secure_jwt_secret_key_2026";
app.use(import_express.default.json({ limit: "100mb" }));
app.use(import_express.default.urlencoded({ extended: true, limit: "100mb" }));
app.use((req, res, next) => {
  if (req.url.startsWith("/api")) {
    console.log(`[API REQUEST] ${req.method} ${req.url}`);
  }
  next();
});
var uploadsDir = import_path.default.join(process.cwd(), "uploads");
try {
  if (!import_fs.default.existsSync(uploadsDir)) {
    import_fs.default.mkdirSync(uploadsDir, { recursive: true });
  }
} catch {
  uploadsDir = import_path.default.join("/tmp", "uploads");
  try {
    if (!import_fs.default.existsSync(uploadsDir)) {
      import_fs.default.mkdirSync(uploadsDir, { recursive: true });
    }
  } catch (err) {
    console.warn("Could not initialize uploads directory:", err);
  }
}
app.use("/uploads", import_express.default.static(uploadsDir));
var storage = import_multer.default.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = import_path.default.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  }
});
var upload = (0, import_multer.default)({ storage });
var LOCAL_DB_FILE = import_path.default.join(process.cwd(), "server_database.json");
var TMP_DB_FILE = import_path.default.join("/tmp", "server_database.json");
var memoryCache = null;
function ensureCollections(data) {
  const collections = [
    "users",
    "organizations",
    "organizers",
    "programs",
    "accounts",
    "incomes",
    "expenses",
    "loans",
    "repayments",
    "transfers",
    "audit_logs"
  ];
  for (const c of collections) {
    if (!Array.isArray(data[c])) {
      data[c] = [];
    }
  }
  return data;
}
function getDBFilePath() {
  if (import_fs.default.existsSync(TMP_DB_FILE)) {
    return TMP_DB_FILE;
  }
  if (import_fs.default.existsSync(LOCAL_DB_FILE)) {
    return LOCAL_DB_FILE;
  }
  return TMP_DB_FILE;
}
function readDB() {
  if (memoryCache) {
    return memoryCache;
  }
  const fileToRead = getDBFilePath();
  try {
    if (import_fs.default.existsSync(fileToRead)) {
      const data = import_fs.default.readFileSync(fileToRead, "utf-8");
      const parsed = JSON.parse(data);
      memoryCache = ensureCollections(parsed);
      return memoryCache;
    }
  } catch (err) {
    console.warn("Notice reading primary DB file:", err);
  }
  if (fileToRead === TMP_DB_FILE && import_fs.default.existsSync(LOCAL_DB_FILE)) {
    try {
      const data = import_fs.default.readFileSync(LOCAL_DB_FILE, "utf-8");
      const parsed = JSON.parse(data);
      memoryCache = ensureCollections(parsed);
      return memoryCache;
    } catch {
    }
  }
  memoryCache = ensureCollections({});
  return memoryCache;
}
function writeDB(data) {
  memoryCache = ensureCollections(data);
  const content = JSON.stringify(memoryCache, null, 2);
  try {
    const tmpFile = `${TMP_DB_FILE}.${Date.now()}.${Math.random().toString(36).substr(2, 5)}.tmp`;
    import_fs.default.writeFileSync(tmpFile, content, "utf-8");
    import_fs.default.renameSync(tmpFile, TMP_DB_FILE);
  } catch (err) {
    console.warn("Persistence notice (/tmp write):", err);
  }
  try {
    const localTmp = `${LOCAL_DB_FILE}.${Date.now()}.${Math.random().toString(36).substr(2, 5)}.tmp`;
    import_fs.default.writeFileSync(localTmp, content, "utf-8");
    import_fs.default.renameSync(localTmp, LOCAL_DB_FILE);
  } catch {
  }
}
var authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }
  import_jsonwebtoken.default.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token." });
    }
    req.user = user;
    next();
  });
};
app.post("/api/migration/sync-local", async (req, res) => {
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
      audit_logs = []
    } = req.body;
    const db = readDB();
    let migratedUsers = 0;
    let migratedRecords = 0;
    if (Array.isArray(users)) {
      for (const u of users) {
        if (!u.email) continue;
        const trimmed = u.email.trim();
        const existingUser = db.users.find((x) => x.email.toLowerCase() === trimmed.toLowerCase());
        if (!existingUser) {
          let password_hash = u.password_hash;
          if (!password_hash && u.password) {
            const salt = await import_bcryptjs.default.genSalt(10);
            password_hash = await import_bcryptjs.default.hash(u.password, salt);
          }
          if (password_hash) {
            db.users.push({
              id: u.id || "usr_" + Date.now() + Math.random().toString(36).substr(2, 5),
              email: trimmed,
              password_hash,
              created_at: u.created_at || (/* @__PURE__ */ new Date()).toISOString(),
              updated_at: u.updated_at || (/* @__PURE__ */ new Date()).toISOString()
            });
            migratedUsers++;
          }
        }
      }
    }
    if (Array.isArray(organizations)) {
      for (const org of organizations) {
        if (!org.id && !org.name) continue;
        const existing = db.organizations.find(
          (x) => x.id === org.id || x.name === org.name && x.college_name === org.college_name
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
    const entityKeys = [
      "organizers",
      "programs",
      "accounts",
      "incomes",
      "expenses",
      "loans",
      "repayments",
      "transfers",
      "audit_logs"
    ];
    const payload = {
      organizers,
      programs,
      accounts,
      incomes,
      expenses,
      loans,
      repayments,
      transfers,
      audit_logs
    };
    for (const key of entityKeys) {
      const incomingList = payload[key];
      if (Array.isArray(incomingList)) {
        for (const item of incomingList) {
          if (!item.id || !item.organization_id) continue;
          const targetArray = db[key];
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
    console.error("Migration error:", err);
    res.status(500).json({ error: "Migration failed" });
  }
});
app.post("/api/upload", authenticateToken, upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded." });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ url: fileUrl });
});
function verifyOrgOwnership(db, orgId, userId) {
  const org = db.organizations.find((o) => o.id === orgId);
  if (!org) return false;
  if (org.user_id && userId && org.user_id !== userId) {
    return false;
  }
  return true;
}
app.get("/api/organizations", authenticateToken, (req, res) => {
  const db = readDB();
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized." });
  }
  let userOrgs = db.organizations.filter((o) => o.user_id === userId);
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
app.post("/api/organizations", authenticateToken, (req, res) => {
  const db = readDB();
  const { name, college_name, logo, motto, academic_year, mission } = req.body;
  if (!name) {
    return res.status(400).json({ error: "Organization name is required." });
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const newOrg = {
    id: "org_" + Date.now() + Math.random().toString(36).substr(2, 5),
    user_id: req.user?.id,
    name,
    college_name: college_name || "",
    logo: logo || "",
    motto: motto || "",
    academic_year: academic_year || "",
    mission: mission || "",
    created_at: now,
    updated_at: now
  };
  db.organizations.push(newOrg);
  writeDB(db);
  res.json(newOrg);
});
app.put("/api/organizations/:id", authenticateToken, (req, res) => {
  const db = readDB();
  const orgId = req.params.id;
  if (!verifyOrgOwnership(db, orgId, req.user.id)) {
    return res.status(403).json({ error: "Unauthorized access to organization." });
  }
  const orgIndex = db.organizations.findIndex((o) => o.id === orgId);
  if (orgIndex === -1) {
    return res.status(404).json({ error: "Organization not found." });
  }
  const updatedOrg = {
    ...db.organizations[orgIndex],
    ...req.body,
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  db.organizations[orgIndex] = updatedOrg;
  writeDB(db);
  res.json(updatedOrg);
});
app.delete("/api/organizations/:id", authenticateToken, (req, res) => {
  const db = readDB();
  const orgId = req.params.id;
  if (!verifyOrgOwnership(db, orgId, req.user.id)) {
    return res.status(403).json({ error: "Unauthorized access to organization." });
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
function setupEntityEndpoints(app2, entityName, defaultSortKey = "created_at") {
  app2.get(`/api/${entityName}`, authenticateToken, (req, res) => {
    const db = readDB();
    const orgId = req.query.organization_id;
    if (!orgId || !verifyOrgOwnership(db, orgId, req.user.id)) {
      return res.status(403).json({ error: "Valid organization ID required." });
    }
    const items = db[entityName].filter((item) => item.organization_id === orgId);
    res.json(items);
  });
  app2.post(`/api/${entityName}`, authenticateToken, (req, res) => {
    const db = readDB();
    const { organization_id, ...rest } = req.body;
    if (!organization_id || !verifyOrgOwnership(db, organization_id, req.user.id)) {
      return res.status(403).json({ error: "Valid organization ID required." });
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const newItem = {
      id: entityName.slice(0, 3) + "_" + Date.now() + Math.random().toString(36).substr(2, 5),
      organization_id,
      ...rest,
      created_at: now,
      updated_at: now
    };
    db[entityName].push(newItem);
    writeDB(db);
    res.json(newItem);
  });
  app2.put(`/api/${entityName}/:id`, authenticateToken, (req, res) => {
    const db = readDB();
    const itemId = req.params.id;
    const items = db[entityName];
    const itemIndex = items.findIndex((i) => i.id === itemId);
    if (itemIndex === -1) {
      return res.status(404).json({ error: "Item not found." });
    }
    const item = items[itemIndex];
    if (!verifyOrgOwnership(db, item.organization_id, req.user.id)) {
      return res.status(403).json({ error: "Unauthorized." });
    }
    const updatedItem = {
      ...item,
      ...req.body,
      organization_id: item.organization_id,
      // prevent org mismatch
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    items[itemIndex] = updatedItem;
    writeDB(db);
    res.json(updatedItem);
  });
  app2.delete(`/api/${entityName}/:id`, authenticateToken, (req, res) => {
    const db = readDB();
    const itemId = req.params.id;
    const items = db[entityName];
    const item = items.find((i) => i.id === itemId);
    if (!item) {
      return res.status(404).json({ error: "Item not found." });
    }
    if (!verifyOrgOwnership(db, item.organization_id, req.user.id)) {
      return res.status(403).json({ error: "Unauthorized." });
    }
    db[entityName] = items.filter((i) => i.id !== itemId);
    writeDB(db);
    res.json({ success: true });
  });
}
setupEntityEndpoints(app, "organizers");
setupEntityEndpoints(app, "programs");
setupEntityEndpoints(app, "accounts");
setupEntityEndpoints(app, "incomes");
setupEntityEndpoints(app, "expenses");
setupEntityEndpoints(app, "loans");
setupEntityEndpoints(app, "repayments");
setupEntityEndpoints(app, "transfers");
setupEntityEndpoints(app, "audit_logs");
async function startServer() {
  app.all("/api/*", (req, res) => {
    res.status(404).json({
      success: false,
      error: "API_ENDPOINT_NOT_FOUND",
      message: `API endpoint ${req.method} ${req.path} was not found.`
    });
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_fs.default.existsSync(import_path.default.join(process.cwd(), "dist", "index.html")) ? import_path.default.join(process.cwd(), "dist") : import_path.default.join(process.cwd(), "build");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.use((err, req, res, next) => {
    console.error("[API SERVER EXCEPTION]", err);
    if (req.path.startsWith("/api") && !res.headersSent) {
      const diagnosticMessage = err?.message || "An unexpected error occurred on the server.";
      return res.status(500).json({
        success: false,
        error: "SERVER_EXCEPTION",
        message: diagnosticMessage
      });
    }
    next(err);
  });
  if (process.env.VERCEL !== "1") {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}
if (process.env.VERCEL !== "1") {
  startServer();
}
var server_default = app;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  app
});
//# sourceMappingURL=server.cjs.map
