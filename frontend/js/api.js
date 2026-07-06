// api.js — thin wrapper around fetch() for talking to the backend REST API.

const API_BASE = window.API_BASE || 'http://localhost:4000/api';

const TOKEN_KEY = 'blog_token';
const USER_KEY = 'blog_user';

const Auth = {
  getToken() { return localStorage.getItem(TOKEN_KEY); },
  getUser() {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  setSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
  isLoggedIn() { return !!Auth.getToken(); },
};

async function apiFetch(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = Auth.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (networkErr) {
    throw new Error('Could not reach the server. Is the backend running?');
  }

  if (res.status === 204) return null;

  let data = null;
  try { data = await res.json(); } catch (_) { /* empty body */ }

  if (!res.ok) {
    const message = (data && data.error) || `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  return data;
}

const Api = {
  register: (username, email, password) =>
    apiFetch('/auth/register', { method: 'POST', body: { username, email, password } }),

  login: (username, password) =>
    apiFetch('/auth/login', { method: 'POST', body: { username, password } }),

  me: () => apiFetch('/auth/me', { auth: true }),

  listPosts: (page = 1, limit = 10) => apiFetch(`/posts?page=${page}&limit=${limit}`),

  getPost: (id) => apiFetch(`/posts/${id}`),

  createPost: (title, content) =>
    apiFetch('/posts', { method: 'POST', auth: true, body: { title, content } }),

  updatePost: (id, title, content) =>
    apiFetch(`/posts/${id}`, { method: 'PUT', auth: true, body: { title, content } }),

  deletePost: (id) => apiFetch(`/posts/${id}`, { method: 'DELETE', auth: true }),

  listComments: (postId) => apiFetch(`/posts/${postId}/comments`),

  addComment: (postId, content) =>
    apiFetch(`/posts/${postId}/comments`, { method: 'POST', auth: true, body: { content } }),

  updateComment: (id, content) =>
    apiFetch(`/comments/${id}`, { method: 'PUT', auth: true, body: { content } }),

  deleteComment: (id) => apiFetch(`/comments/${id}`, { method: 'DELETE', auth: true }),
};
