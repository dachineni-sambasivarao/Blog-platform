// server.js
require('dotenv').config();

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set. Copy .env.example to .env and set a real secret.');
  process.exit(1);
}

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const commentRoutes = require('./routes/comments');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '1mb' }));

// Basic rate limiting to slow down brute-force / abuse. Tune for production.
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300 });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });
app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
// Comments nested under a post: GET/POST /api/posts/:postId/comments
app.use('/api/posts/:postId/comments', commentRoutes);
// Direct comment access for edit/delete: PUT/DELETE /api/comments/:id
app.use('/api/comments', commentRoutes);

// 404 handler
app.use((req, res) => res.status(404).json({ error: 'Not found.' }));

// Central error handler (catches thrown/rejected errors from route handlers)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error.' });
});

app.listen(PORT, () => {
  console.log(`Blog API listening on http://localhost:${PORT}`);
});
