# Marginalia — Blog Platform with Comments

A full-stack blogging platform: users register and log in, write/edit/delete
posts, and comment on each other's posts. REST API backend with a database;
plain-JS frontend with no build step.

```
blog-platform/
├── backend/            Express REST API + SQLite database
│   ├── server.js
│   ├── db.js
│   ├── seed.js         optional demo data
│   ├── middleware/auth.js
│   └── routes/{auth,posts,comments}.js
└── frontend/           Static SPA (open directly or serve statically)
    ├── index.html
    ├── css/style.css
    └── js/{api,app}.js
```

## Stack & why

- **Backend:** Node.js + Express — minimal, well-documented, huge ecosystem.
- **Database:** SQLite via Node's **built-in** `node:sqlite` module (no
  extra package, no native compilation step — just a single `blog.db` file).
  Requires **Node.js 22.5 or newer**; check with `node -v`. You'll see a
  one-line `ExperimentalWarning: SQLite is an experimental feature` in the
  console when the server starts — that's expected and harmless. Swap for
  Postgres/MySQL later by changing `db.js` and the SQL if you outgrow it.
- **Auth:** JWT (JSON Web Tokens) + `bcryptjs` password hashing. Stateless,
  simple to reason about for a learning project.
- **Frontend:** Vanilla HTML/CSS/JS with a tiny hash-based router. No React/
  build tooling required — open `index.html` or serve the folder and it works.
  (The API is a normal REST API, so you could swap in React/Vue/Svelte later
  without touching the backend at all.)

## 1. Backend setup

```bash
cd backend
npm install
cp .env.example .env
# Open .env and set JWT_SECRET to a long random string, e.g.:
#   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

npm run seed     # optional: creates demo users "alice" / "bob", password "password123"
npm start        # starts the API on http://localhost:4000
```

Health check: `curl http://localhost:4000/api/health` → `{"status":"ok"}`

## 2. Frontend setup

No build step needed. Simplest option — serve the folder with any static
server (opening `index.html` directly via `file://` will hit CORS issues in
some browsers, so a static server is recommended):

```bash
cd frontend
npx serve .          # or: python3 -m http.server 5173
```

Then visit the URL it prints (e.g. `http://localhost:5173`).

If your frontend runs on a different origin/port than `http://localhost:4000`,
either:
- update `CORS_ORIGIN` in `backend/.env` to match, and/or
- set `window.API_BASE` before `api.js` loads in `index.html`, e.g.
  `<script>window.API_BASE = 'http://localhost:4000/api';</script>`.

## 3. Try it out

1. Go to **Sign up**, create an account.
2. Click **Write** to publish a post.
3. Open the post and add a comment.
4. Log in as a second user (or use the seeded `alice`/`bob` accounts) to see
   comments and posts from someone else's perspective — you'll only see
   Edit/Delete on content you own.

## API reference

| Method | Path                          | Auth | Description                       |
|--------|-------------------------------|------|------------------------------------|
| POST   | /api/auth/register            | –    | Create an account                  |
| POST   | /api/auth/login               | –    | Log in, returns a JWT              |
| GET    | /api/auth/me                  | ✔    | Current user's profile             |
| GET    | /api/posts                    | –    | List posts (paginated)             |
| GET    | /api/posts/:id                | –    | Get one post                       |
| POST   | /api/posts                    | ✔    | Create a post                      |
| PUT    | /api/posts/:id                | ✔ owner | Edit a post                     |
| DELETE | /api/posts/:id                | ✔ owner | Delete a post (comments cascade)|
| GET    | /api/posts/:id/comments       | –    | List comments on a post            |
| POST   | /api/posts/:id/comments       | ✔    | Add a comment                      |
| PUT    | /api/comments/:id             | ✔ owner | Edit a comment                  |
| DELETE | /api/comments/:id             | ✔ owner | Delete a comment                |

All authenticated requests need `Authorization: Bearer <token>`.

## Security notes (read before deploying anywhere real)

- Set a strong, random `JWT_SECRET` — never commit `.env`.
- The frontend stores the JWT in `localStorage` for simplicity, which is
  vulnerable to XSS-based token theft. For production, prefer an httpOnly
  cookie issued by the server, plus CSRF protection.
- Passwords are hashed with bcrypt (never stored in plain text).
- Basic rate limiting is applied to all `/api/*` routes and more strictly to
  `/api/auth/*` to slow down brute-force attempts.
- Add HTTPS (e.g. via a reverse proxy like Caddy/Nginx) before deploying.
- The `.env.example` values are placeholders only — always replace them.

## Troubleshooting

- **`npm install` fails with `gyp ERR! find VS` / asks for Visual Studio:**
  This shouldn't happen with the current `package.json` (no native modules
  left), but if you see it, run `node -v` and confirm you're on Node 22.5+.
  On an older Node version, either upgrade Node (recommended) or reintroduce
  `better-sqlite3` and install "Desktop development with C++" via the
  [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/).
- **`No such built-in module: node:sqlite`:** Your Node version predates
  built-in SQLite support. Upgrade to Node 22.5+ (ideally 22.13+/24+, where
  no CLI flag is needed at all).

## Ideas to extend

- Tags/categories and search
- Likes or reactions on posts and comments
- Markdown rendering for post content
- Image uploads for posts (e.g. via S3-compatible storage)
- Nested/threaded comment replies
- Email verification and password reset flow
