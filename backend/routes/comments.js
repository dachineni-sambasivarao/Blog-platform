// routes/comments.js
const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

// mergeParams lets us read :postId when this router is mounted under /api/posts/:postId/comments
const router = express.Router({ mergeParams: true });

const commentWithAuthor = `
  SELECT comments.*, users.username AS author_username
  FROM comments
  JOIN users ON users.id = comments.user_id
`;

// GET /api/posts/:postId/comments
router.get('/', (req, res) => {
  const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(req.params.postId);
  if (!post) return res.status(404).json({ error: 'Post not found.' });

  const comments = db
    .prepare(`${commentWithAuthor} WHERE post_id = ? ORDER BY comments.created_at ASC`)
    .all(req.params.postId);

  res.json({ comments });
});

// POST /api/posts/:postId/comments  (auth required)
router.post('/', requireAuth, (req, res) => {
  const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(req.params.postId);
  if (!post) return res.status(404).json({ error: 'Post not found.' });

  const { content } = req.body || {};
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Comment content is required.' });
  }
  if (content.length > 2000) {
    return res.status(400).json({ error: 'Comments must be 2000 characters or fewer.' });
  }

  const info = db
    .prepare('INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)')
    .run(req.params.postId, req.user.id, content.trim());

  const comment = db.prepare(`${commentWithAuthor} WHERE comments.id = ?`).get(info.lastInsertRowid);
  res.status(201).json({ comment });
});

// PUT /api/comments/:id  (auth required, must be the owner) — mounted separately, see server.js
router.put('/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Comment not found.' });
  if (existing.user_id !== req.user.id) {
    return res.status(403).json({ error: 'You can only edit your own comments.' });
  }

  const content = req.body?.content?.trim();
  if (!content) return res.status(400).json({ error: 'Comment content cannot be empty.' });

  db.prepare(`UPDATE comments SET content = ?, updated_at = datetime('now') WHERE id = ?`).run(
    content,
    req.params.id
  );

  const comment = db.prepare(`${commentWithAuthor} WHERE comments.id = ?`).get(req.params.id);
  res.json({ comment });
});

// DELETE /api/comments/:id  (auth required, must be the owner)
router.delete('/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Comment not found.' });
  if (existing.user_id !== req.user.id) {
    return res.status(403).json({ error: 'You can only delete your own comments.' });
  }

  db.prepare('DELETE FROM comments WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

module.exports = router;
