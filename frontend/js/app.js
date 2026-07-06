// app.js — tiny hash-based router + view renderers. No framework, no build step.

const appEl = document.getElementById('app');
const toastEl = document.getElementById('toast');

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showToast(message, isError = false) {
  toastEl.textContent = message;
  toastEl.className = 'toast' + (isError ? ' toast--error' : '');
  toastEl.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { toastEl.hidden = true; }, 3200);
}

function formatDate(isoString) {
  // SQLite datetime('now') returns "YYYY-MM-DD HH:MM:SS" (UTC, no offset marker)
  const iso = isoString.includes('T') ? isoString : isoString.replace(' ', 'T') + 'Z';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return isoString;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function excerpt(content, len = 220) {
  const trimmed = content.trim();
  return trimmed.length > len ? trimmed.slice(0, len).trimEnd() + '…' : trimmed;
}

function updateNav() {
  const loggedIn = Auth.isLoggedIn();
  document.querySelectorAll('.auth-only').forEach((el) => { el.hidden = !loggedIn; });
  document.querySelectorAll('.guest-only').forEach((el) => { el.hidden = loggedIn; });
  if (loggedIn) {
    const user = Auth.getUser();
    document.getElementById('nav-username').textContent = user?.username || '—';
  }
}

document.getElementById('logout-btn').addEventListener('click', () => {
  Auth.clearSession();
  updateNav();
  showToast('Logged out.');
  location.hash = '#/';
});

function requireLoginOrRedirect() {
  if (!Auth.isLoggedIn()) {
    showToast('Please log in first.', true);
    location.hash = '#/login';
    return false;
  }
  return true;
}

/* ------------------------- Views ------------------------- */

async function renderHome(params) {
  const page = parseInt(params.get('page'), 10) || 1;
  appEl.innerHTML = `<p class="empty-state">Loading posts…</p>`;
  try {
    const { posts, pagination } = await Api.listPosts(page, 10);

    if (posts.length === 0) {
      appEl.innerHTML = `
        <div class="empty-state">
          <p>No posts yet. Be the first to write one.</p>
          <p><a href="#/new" data-link>Start writing →</a></p>
        </div>`;
      bindLinks();
      return;
    }

    const items = posts.map((p) => `
      <li class="post-entry">
        <p class="post-entry__byline">${escapeHtml(p.author_username)} · ${formatDate(p.created_at)}</p>
        <h2 class="post-entry__title"><a href="#/posts/${p.id}" data-link>${escapeHtml(p.title)}</a></h2>
        <p class="post-entry__excerpt">${escapeHtml(excerpt(p.content))}</p>
        <p class="post-entry__meta">${p.comment_count} comment${p.comment_count === 1 ? '' : 's'}</p>
      </li>
    `).join('');

    const prevDisabled = pagination.page <= 1;
    const nextDisabled = pagination.page >= pagination.totalPages;

    appEl.innerHTML = `
      <ul class="post-list">${items}</ul>
      <div class="pagination">
        <a href="#/?page=${pagination.page - 1}" data-link ${prevDisabled ? 'aria-disabled="true" style="pointer-events:none;opacity:0.4"' : ''}>← Newer</a>
        <span>Page ${pagination.page} of ${pagination.totalPages}</span>
        <a href="#/?page=${pagination.page + 1}" data-link ${nextDisabled ? 'aria-disabled="true" style="pointer-events:none;opacity:0.4"' : ''}>Older →</a>
      </div>
    `;
    bindLinks();
  } catch (err) {
    appEl.innerHTML = `<div class="error-banner">${escapeHtml(err.message)}</div>`;
  }
}

const AUTH_QUOTES = {
  login: {
    quote: 'The blank page is not empty. It is waiting.',
    cite: 'Every writer, eventually',
  },
  register: {
    quote: 'Write it down before the thought decides to leave.',
    cite: 'Marginalia',
  },
};

function renderAuthForm(mode) {
  const isLogin = mode === 'login';
  const { quote, cite } = AUTH_QUOTES[mode];

  appEl.innerHTML = `
    <div class="auth-shell">
      <aside class="auth-hero">
        <div>
          <p class="auth-hero__mark">&ldquo;</p>
          <p class="auth-hero__quote">${escapeHtml(quote)}</p>
          <p class="auth-hero__cite">— ${escapeHtml(cite)}</p>
        </div>
        <p class="auth-hero__brand">Marginalia</p>
      </aside>

      <div class="auth-card">
        <h1>${isLogin ? 'Welcome back' : 'Create your account'}</h1>
        <p class="auth-card__subtitle">
          ${isLogin ? 'Log in to write, edit, and join the conversation.' : 'Takes about thirty seconds. No email verification to fuss with.'}
        </p>
        <div id="form-error"></div>
        <form id="auth-form">
          ${isLogin ? `
            <div class="field">
              <label for="username">Username or email</label>
              <input id="username" name="username" required autocomplete="username" placeholder="alice">
            </div>
          ` : `
            <div class="field">
              <label for="username">Username</label>
              <input id="username" name="username" required autocomplete="username" pattern="[a-zA-Z0-9_]{3,20}" placeholder="alice">
              <p class="field-hint">3–20 characters: letters, numbers, underscores.</p>
            </div>
            <div class="field">
              <label for="email">Email</label>
              <input id="email" name="email" type="email" required autocomplete="email" placeholder="alice@example.com">
            </div>
          `}
          <div class="field">
            <label for="password">Password</label>
            <input id="password" name="password" type="password" required minlength="8" autocomplete="${isLogin ? 'current-password' : 'new-password'}" placeholder="••••••••">
            ${!isLogin ? '<p class="field-hint">At least 8 characters.</p>' : ''}
          </div>
          <button type="submit" class="btn btn--block">${isLogin ? 'Log in' : 'Sign up'}</button>
        </form>
        <p class="form-footer">
          ${isLogin ? `New here? <a href="#/register" data-link>Create an account</a>`
                    : `Already have an account? <a href="#/login" data-link>Log in</a>`}
        </p>
      </div>
    </div>
  `;
  bindLinks();

  document.getElementById('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    document.getElementById('form-error').innerHTML = '';

    try {
      let result;
      if (isLogin) {
        result = await Api.login(form.username.value.trim(), form.password.value);
      } else {
        result = await Api.register(form.username.value.trim(), form.email.value.trim(), form.password.value);
      }
      Auth.setSession(result.token, result.user);
      updateNav();
      showToast(isLogin ? `Welcome back, ${result.user.username}.` : `Account created. Welcome, ${result.user.username}.`);
      location.hash = '#/';
    } catch (err) {
      document.getElementById('form-error').innerHTML = `<div class="error-banner">${escapeHtml(err.message)}</div>`;
    } finally {
      submitBtn.disabled = false;
    }
  });
}

function renderPostForm(existingPost) {
  if (!requireLoginOrRedirect()) return;
  const isEdit = !!existingPost;

  appEl.innerHTML = `
    <div class="panel panel--wide">
      <h1>${isEdit ? 'Edit post' : 'Write a new post'}</h1>
      <div id="form-error"></div>
      <form id="post-form">
        <div class="field">
          <label for="title">Title</label>
          <input id="title" name="title" required maxlength="200" value="${isEdit ? escapeHtml(existingPost.title) : ''}">
        </div>
        <div class="field">
          <label for="content">Content</label>
          <textarea id="content" name="content" required rows="12">${isEdit ? escapeHtml(existingPost.content) : ''}</textarea>
        </div>
        <button type="submit" class="btn">${isEdit ? 'Save changes' : 'Publish'}</button>
        ${isEdit ? `<a href="#/posts/${existingPost.id}" data-link class="btn btn--ghost" style="margin-left:0.75rem;text-decoration:none;display:inline-block">Cancel</a>` : ''}
      </form>
    </div>
  `;
  bindLinks();

  document.getElementById('post-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    document.getElementById('form-error').innerHTML = '';

    try {
      let post;
      if (isEdit) {
        ({ post } = await Api.updatePost(existingPost.id, form.title.value.trim(), form.content.value));
        showToast('Post updated.');
      } else {
        ({ post } = await Api.createPost(form.title.value.trim(), form.content.value));
        showToast('Post published.');
      }
      location.hash = `#/posts/${post.id}`;
    } catch (err) {
      document.getElementById('form-error').innerHTML = `<div class="error-banner">${escapeHtml(err.message)}</div>`;
      submitBtn.disabled = false;
    }
  });
}

async function renderPostDetail(id) {
  appEl.innerHTML = `<p class="empty-state">Loading post…</p>`;
  try {
    const [{ post }, { comments }] = await Promise.all([Api.getPost(id), Api.listComments(id)]);
    const currentUser = Auth.getUser();
    const isOwner = currentUser && currentUser.id === post.user_id;

    const commentsHtml = comments.length
      ? comments.map((c) => renderComment(c, currentUser)).join('')
      : `<p class="empty-state" style="padding:1.5rem 0">No comments yet. Add the first one.</p>`;

    appEl.innerHTML = `
      <article>
        <a href="#/" data-link style="font-family:var(--font-mono);font-size:0.78rem;color:var(--ink-soft);text-decoration:none">← All posts</a>
        <h1 class="post-detail__title">${escapeHtml(post.title)}</h1>
        <p class="post-detail__byline">By ${escapeHtml(post.author_username)} · ${formatDate(post.created_at)}${post.updated_at !== post.created_at ? ' · edited ' + formatDate(post.updated_at) : ''}</p>
        <div class="post-detail__content">${escapeHtml(post.content)}</div>
        ${isOwner ? `
          <div class="post-detail__actions">
            <a href="#/posts/${post.id}/edit" data-link>Edit</a>
            <button id="delete-post-btn" class="link-btn">Delete</button>
          </div>` : ''}
      </article>

      <section class="comments">
        <h2>Comments (${comments.length})</h2>
        <div id="comments-list">${commentsHtml}</div>
        ${Auth.isLoggedIn() ? `
          <form id="comment-form" class="comment-form">
            <div class="field">
              <label for="comment-content">Add a comment</label>
              <textarea id="comment-content" required maxlength="2000" rows="3" placeholder="Share your thoughts…"></textarea>
            </div>
            <button type="submit" class="btn">Post comment</button>
          </form>
        ` : `<p class="field-hint"><a href="#/login" data-link>Log in</a> to leave a comment.</p>`}
      </section>
    `;
    bindLinks();

    if (isOwner) {
      document.getElementById('delete-post-btn').addEventListener('click', async () => {
        if (!confirm('Delete this post? This cannot be undone.')) return;
        try {
          await Api.deletePost(post.id);
          showToast('Post deleted.');
          location.hash = '#/';
        } catch (err) {
          showToast(err.message, true);
        }
      });
    }

    const commentForm = document.getElementById('comment-form');
    if (commentForm) {
      commentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const textarea = document.getElementById('comment-content');
        const btn = commentForm.querySelector('button[type="submit"]');
        btn.disabled = true;
        try {
          await Api.addComment(post.id, textarea.value.trim());
          showToast('Comment posted.');
          renderPostDetail(id); // re-render to show the new comment
        } catch (err) {
          showToast(err.message, true);
          btn.disabled = false;
        }
      });
    }

    bindCommentActions(post.id, currentUser);
  } catch (err) {
    appEl.innerHTML = `<div class="error-banner">${escapeHtml(err.message)}</div>`;
  }
}

function renderComment(c, currentUser) {
  const isOwner = currentUser && currentUser.id === c.user_id;
  return `
    <div class="comment" data-comment-id="${c.id}">
      <p class="comment__meta">
        <strong>${escapeHtml(c.author_username)}</strong> · ${formatDate(c.created_at)}${c.updated_at !== c.created_at ? ' · edited' : ''}
      </p>
      <p class="comment__body" data-role="body">${escapeHtml(c.content)}</p>
      ${isOwner ? `
        <div class="comment__actions">
          <button class="link-btn" data-action="edit">Edit</button>
          <button class="link-btn" data-action="delete">Delete</button>
        </div>` : ''}
    </div>
  `;
}

function bindCommentActions(postId, currentUser) {
  document.querySelectorAll('.comment').forEach((el) => {
    const commentId = el.dataset.commentId;
    const editBtn = el.querySelector('[data-action="edit"]');
    const deleteBtn = el.querySelector('[data-action="delete"]');

    if (deleteBtn) {
      deleteBtn.addEventListener('click', async () => {
        if (!confirm('Delete this comment?')) return;
        try {
          await Api.deleteComment(commentId);
          showToast('Comment deleted.');
          renderPostDetail(postId);
        } catch (err) {
          showToast(err.message, true);
        }
      });
    }

    if (editBtn) {
      editBtn.addEventListener('click', () => {
        const bodyEl = el.querySelector('[data-role="body"]');
        const original = bodyEl.textContent;
        bodyEl.outerHTML = `
          <div data-role="body-edit">
            <textarea class="edit-textarea" rows="3" style="width:100%;font:inherit;padding:0.5rem;border:1px solid var(--line);border-radius:3px">${escapeHtml(original)}</textarea>
            <div style="margin-top:0.4rem;display:flex;gap:0.6rem">
              <button class="btn" data-action="save-edit" style="padding:0.35rem 0.8rem;font-size:0.82rem">Save</button>
              <button class="btn btn--ghost" data-action="cancel-edit" style="padding:0.35rem 0.8rem;font-size:0.82rem">Cancel</button>
            </div>
          </div>`;

        el.querySelector('[data-action="cancel-edit"]').addEventListener('click', () => renderPostDetail(postId));
        el.querySelector('[data-action="save-edit"]').addEventListener('click', async () => {
          const newContent = el.querySelector('.edit-textarea').value.trim();
          if (!newContent) return showToast('Comment cannot be empty.', true);
          try {
            await Api.updateComment(commentId, newContent);
            showToast('Comment updated.');
            renderPostDetail(postId);
          } catch (err) {
            showToast(err.message, true);
          }
        });
      });
    }
  });
}

/* ------------------------- Router ------------------------- */

function bindLinks() {
  document.querySelectorAll('[data-link]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (href && href.startsWith('#/')) {
        // let default hash navigation happen; nothing to prevent
      }
    });
  });
}

async function router() {
  const hash = location.hash || '#/';
  const [pathPart, queryPart] = hash.slice(1).split('?');
  const params = new URLSearchParams(queryPart || '');
  const segments = pathPart.split('/').filter(Boolean);

  updateNav();
  window.scrollTo(0, 0);

  if (segments.length === 0) {
    return renderHome(params);
  }
  if (segments[0] === 'login') return renderAuthForm('login');
  if (segments[0] === 'register') return renderAuthForm('register');
  if (segments[0] === 'new') return renderPostForm(null);

  if (segments[0] === 'posts' && segments[1]) {
    const postId = segments[1];
    if (segments[2] === 'edit') {
      if (!requireLoginOrRedirect()) return;
      try {
        const { post } = await Api.getPost(postId);
        const currentUser = Auth.getUser();
        if (!currentUser || currentUser.id !== post.user_id) {
          showToast('You can only edit your own posts.', true);
          return (location.hash = `#/posts/${postId}`);
        }
        return renderPostForm(post);
      } catch (err) {
        appEl.innerHTML = `<div class="error-banner">${escapeHtml(err.message)}</div>`;
        return;
      }
    }
    return renderPostDetail(postId);
  }

  appEl.innerHTML = `<div class="empty-state">Page not found. <a href="#/" data-link>Go home</a></div>`;
  bindLinks();
}

window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', router);
