// routes/posts.js
const express = require('express');
const db = require('../db');
const { requireAuth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

const postWithAuthor = `
  SELECT posts.*, users.username AS author_username
  FROM posts
  JOIN users ON users.id = posts.user_id
`;

function getPostOr404(id, res) {
  const post = db.prepare(`${postWithAuthor} WHERE posts.id = ?`).get(id);
  if (!post) {
    res.status(404).json({ error: 'Post not found.' });
    return null;
  }
  return post;
}

// GET /api/posts?page=1&limit=10&author=someuser
router.get('/', optionalAuth, (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
  const offset = (page - 1) * limit;
  const author = req.query.author;

  let where = '';
  const params = [];
  if (author) {
    where = 'WHERE users.username = ?';
    params.push(author);
  }

  const posts = db
    .prepare(
      `${postWithAuthor} ${where} ORDER BY posts.created_at DESC LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset);

  const totalRow = db
    .prepare(`SELECT COUNT(*) AS count FROM posts JOIN users ON users.id = posts.user_id ${where}`)
    .get(...params);

  // attach comment counts
  const withCounts = posts.map((p) => {
    const { count } = db.prepare('SELECT COUNT(*) AS count FROM comments WHERE post_id = ?').get(p.id);
    return { ...p, comment_count: count };
  });

  res.json({
    posts: withCounts,
    pagination: {
      page,
      limit,
      total: totalRow.count,
      totalPages: Math.ceil(totalRow.count / limit) || 1,
    },
  });
});

// GET /api/posts/:id
router.get('/:id', (req, res) => {
  const post = getPostOr404(req.params.id, res);
  if (!post) return;
  res.json({ post });
});

// POST /api/posts  (auth required)
router.post('/', requireAuth, (req, res) => {
  const { title, content, published } = req.body || {};

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required.' });
  }
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Content is required.' });
  }
  if (title.length > 200) {
    return res.status(400).json({ error: 'Title must be 200 characters or fewer.' });
  }

  const info = db
    .prepare('INSERT INTO posts (user_id, title, content, published) VALUES (?, ?, ?, ?)')
    .run(req.user.id, title.trim(), content, published === false ? 0 : 1);

  const post = getPostOr404(info.lastInsertRowid, res);
  if (!post) return;
  res.status(201).json({ post });
});

// PUT /api/posts/:id  (auth required, must be the owner)
router.put('/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Post not found.' });
  if (existing.user_id !== req.user.id) {
    return res.status(403).json({ error: 'You can only edit your own posts.' });
  }

  const title = req.body?.title?.trim() ?? existing.title;
  const content = req.body?.content ?? existing.content;
  const published = req.body?.published === undefined ? existing.published : (req.body.published ? 1 : 0);

  if (!title) return res.status(400).json({ error: 'Title cannot be empty.' });
  if (!content) return res.status(400).json({ error: 'Content cannot be empty.' });

  db.prepare(
    `UPDATE posts SET title = ?, content = ?, published = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(title, content, published, req.params.id);

  const post = getPostOr404(req.params.id, res);
  if (!post) return;
  res.json({ post });
});

// DELETE /api/posts/:id  (auth required, must be the owner)
router.delete('/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Post not found.' });
  if (existing.user_id !== req.user.id) {
    return res.status(403).json({ error: 'You can only delete your own posts.' });
  }

  db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id); // comments cascade-delete
  res.status(204).send();
});

module.exports = router;
