// seed.js — optional: populates the database with demo users, posts, and comments.
// Run with: npm run seed
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./db');

const users = [
  { username: 'alice', email: 'alice@example.com', password: 'password123', bio: 'Writes about travel.' },
  { username: 'bob', email: 'bob@example.com', password: 'password123', bio: 'Coffee and code.' },
];

const insertUser = db.prepare(
  'INSERT OR IGNORE INTO users (username, email, password_hash, bio) VALUES (?, ?, ?, ?)'
);
const getUser = db.prepare('SELECT * FROM users WHERE username = ?');
const insertPost = db.prepare('INSERT INTO posts (user_id, title, content) VALUES (?, ?, ?)');
const insertComment = db.prepare('INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)');

for (const u of users) {
  insertUser.run(u.username, u.email, bcrypt.hashSync(u.password, 10), u.bio);
}

const alice = getUser.get('alice');
const bob = getUser.get('bob');

const post1 = insertPost.run(
  alice.id,
  'Ten Days in Kyoto',
  'Kyoto in autumn is something else entirely. The maple trees along the Philosopher\'s Path turn shades of crimson and gold, and the temples feel almost otherworldly in the early morning fog...'
);

const post2 = insertPost.run(
  bob.id,
  'Why I Switched to SQLite for Side Projects',
  'For years I reached for Postgres by default, even on tiny projects with a handful of users. Lately I have been reaching for SQLite instead, and it has made shipping so much faster...'
);

insertComment.run(post1.lastInsertRowid, bob.id, 'This makes me want to book a flight immediately!');
insertComment.run(post2.lastInsertRowid, alice.id, 'Completely agree — better-sqlite3 is so pleasant to use.');

console.log('Seed complete. Demo accounts (username / password):');
console.log('  alice / password123');
console.log('  bob   / password123');
