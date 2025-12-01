import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import { createProxyMiddleware } from 'http-proxy-middleware';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Load env from server/.env first (preferred), then fallback to project root .env for local dev
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 4000;

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (server/.env preferred).');
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// CORS configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://kids-paradise-liart.vercel.app',
  'https://kidlit-library-quest.vercel.app'
];

// Add any custom origins from environment variable
if (process.env.CORS_ORIGIN) {
  allowedOrigins.push(...process.env.CORS_ORIGIN.split(',').map(s => s.trim()));
}

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if the origin is in the allowed list
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = `CORS policy: ${origin} not allowed`;
      console.error(msg);
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

// Apply CORS to all routes
app.use(cors(corsOptions));

// Serve static files from the client's dist directory
const clientDistPath = path.join(__dirname, '../client/dist');

// Check if the dist directory exists
const distExists = require('fs').existsSync(clientDistPath);

if (distExists) {
  console.log(`Serving static files from: ${clientDistPath}`);
  app.use(express.static(clientDistPath));
} else {
  console.warn(`WARNING: Client dist directory not found at: ${clientDistPath}`);
  console.warn('Make sure to build the client before starting the server');
}

// Handle API routes here
app.use('/api', (req, res, next) => {
  // Your API routes will go here
  next();
});

// For all other routes, serve the client's index.html
app.get('*', (req, res) => {
  if (distExists) {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  } else {
    res.status(500).send('Client files not found. Please build the client first.');
  }
});


// Handle preflight requests
app.options('*', cors(corsOptions));
app.use(express.json());
// Serve static files from Vite build directory in production
if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = path.resolve(__dirname, '../dist');
  app.use(express.static(clientBuildPath));
  
  // Handle SPA client-side routing - serve index.html for all other routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

// Basic request logger
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Gemini API endpoint
app.post('/api/generate-content', async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY is not set');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    console.log('Sending request to Gemini API...');
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: content }]
          }]
        })
      }
    );

    const responseText = await response.text();
    let data;
    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch (e) {
      console.error('Failed to parse Gemini API response:', e);
      return res.status(500).json({ 
        error: 'Invalid response from Gemini API',
        details: responseText
      });
    }

    if (!response.ok) {
      console.error('Gemini API error:', data);
      return res.status(response.status).json({ 
        error: 'Error from Gemini API',
        details: data
      });
    }

    console.log('Successfully got response from Gemini API');
    res.json(data);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/', (_req, res) => {
  res.json({ ok: true, service: 'kidlit-backend', routes: ['/api/health', '/api/students'] });
});

// Explicitly handle preflight for POST /api/students
app.options('/api/students', cors(corsOptions));

// Test route to verify path is correct
app.get('/api/students', (_req, res) => {
  res.json({ ok: true, hint: 'POST to this same path to create a student' });
});

app.post('/api/students', async (req, res) => {
  try {
    const { name, email, grade, password } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email and password are required' });
    }

    // 1) Create auth user
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name },
    });
    if (createErr) return res.status(400).json({ error: createErr.message });

    const user = created.user;
    if (!user) return res.status(500).json({ error: 'Failed to create user' });

    // 2) Insert profile
    const g = Number.isNaN(parseInt(String(grade), 10)) ? null : parseInt(String(grade), 10);
    const { error: profileErr } = await supabaseAdmin.from('profiles').insert({
      id: user.id,
      email,
      full_name: name,
      role: 'student',
      grade: g,
    });
    if (profileErr) return res.status(400).json({ error: profileErr.message });

    return res.json({ id: user.id, email, full_name: name, grade: g, role: 'student' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

if (process.env.VERCEL) {
  module.exports = app;
} else {
  // Start the server
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Serving static files from: ${clientDistPath}`);
  });

  // Handle server errors
  server.on('error', (error) => {
    console.error('Server error:', error);
  });
}

// Log unexpected exits to diagnose auto-closing
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down...');
  process.exit(0);
});
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down...');
  process.exit(0);
});
