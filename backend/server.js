const express = require('express');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const cors = require('cors');
const cookieParser = require('cookie-parser');
const http = require('http');
const { Server } = require('socket.io');
const dbConnection = require('./configs/db-config');

// ── Constants ──────────────────────────────────────────────────
const DEFAULT_PORT = 5500;
const MAX_PORT_ATTEMPTS = 10;
const DB_MAX_RETRIES = 5;
const DB_RETRY_BASE_DELAY_MS = 5000;

// ── App & Server ───────────────────────────────────────────────
const app = express();
const server = http.createServer(app);

// ── CORS ───────────────────────────────────────────────────────
const normalizeOrigin = (origin = '') => origin.trim().replace(/\/+$/, '');

const allowedOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map(normalizeOrigin)
  .filter(Boolean);

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  return allowedOrigins.includes(normalizeOrigin(origin));
};

const corsOriginHandler = (origin, callback) => {
  if (isAllowedOrigin(origin)) return callback(null, true);
  return callback(new Error(`CORS blocked for origin: ${origin}`));
};

const corsOptions = {
  origin: corsOriginHandler,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// ── Middleware ──────────────────────────────────────────────────
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// ── Static Files ───────────────────────────────────────────────
app.use('/storage', express.static(path.join(__dirname, 'public', 'storage')));

// ── Routes ─────────────────────────────────────────────────────
const authRoute         = require('./routes/auth-route');
const employeeRoute     = require('./routes/employee-route');
const adminRoute        = require('./routes/admin-route');
const taskRoute         = require('./routes/task-route');
const userListRoute     = require('./routes/user-list-route');
const problemRoute      = require('./routes/problem-route');
const leaderRoute       = require('./routes/leader-route');
const employerRoute     = require('./routes/employer-route');
const chatRoute         = require('./routes/chat-route');
const notificationRoute = require('./routes/notification-route');
const invitationRoute   = require('./routes/invitation-route');
const uploadRoute       = require('./routes/upload-route');
const userController    = require('./controllers/user-controller');
const { auth }          = require('./middlewares/auth-middleware');
const asyncMiddleware   = require('./middlewares/async-middleware');
const errorMiddleware   = require('./middlewares/error-middleware');

app.use('/api/auth', authRoute);
app.use('/api/upload', uploadRoute);
app.use('/api/employee', employeeRoute);
app.use('/api/admin', adminRoute);
app.use('/api/tasks', taskRoute);
app.use('/api/users', userListRoute);
app.get('/api/search', auth, asyncMiddleware(userController.globalSearch));
app.use('/api/problems', problemRoute);
app.use('/api/problem', problemRoute);         // legacy singular path
app.use('/api/leaders', leaderRoute);
app.use('/api/leader', leaderRoute);           // legacy singular path
app.use('/api/employers', employerRoute);
app.use('/api/chat', chatRoute);
app.use('/api/notifications', notificationRoute);
app.use('/api/invitations', invitationRoute);

app.use(errorMiddleware);

app.get('/', (_req, res) => res.json({ status: 'OfficeOS Backend Running' }));
app.get('/api/test', (_req, res) => res.json({ message: 'API is working' }));

// ── Socket.IO ──────────────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: corsOriginHandler, credentials: true }
});

io.on('connection', (socket) => {
  socket.on('disconnect', () => {});
});

// ── Database Connection ────────────────────────────────────────
const connectDatabase = async () => {
  for (let attempt = 1; attempt <= DB_MAX_RETRIES; attempt++) {
    try {
      console.log(`Connecting to MongoDB... (Attempt ${attempt}/${DB_MAX_RETRIES})`);
      await dbConnection();
      console.log('Database connection established');
      return true;
    } catch (err) {
      console.error(`Database connection failed (Attempt ${attempt}/${DB_MAX_RETRIES}):`, err.message);
      if (attempt < DB_MAX_RETRIES) {
        const waitMs = DB_RETRY_BASE_DELAY_MS * attempt;
        console.log(`Retrying in ${waitMs / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, waitMs));
      }
    }
  }
  console.error('Failed to connect to database after all retries.');
  return false;
};

// ── Server Startup ─────────────────────────────────────────────
const startServer = (port, attempt = 1) => {
  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE' && attempt < MAX_PORT_ATTEMPTS) {
      const nextPort = port + 1;
      console.log(`Port ${port} in use. Trying ${nextPort} (attempt ${attempt + 1}/${MAX_PORT_ATTEMPTS})`);
      setTimeout(() => startServer(nextPort, attempt + 1), 100);
    } else {
      console.error('Server startup failed:', err.message);
      process.exit(1);
    }
  });

  server.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`Routes available at http://localhost:${port}/api/*`);
  });
};

(async () => {
  await connectDatabase();
  startServer(Number(process.env.PORT) || DEFAULT_PORT);
})();
