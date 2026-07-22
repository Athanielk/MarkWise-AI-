/* MarkWise AI Frontend - shared utilities, auth, API */
const MarkWise = (() => {
  const API = '/api';
  const state = { user: null, currentAssessment: null };

  /* ------------ API helpers ------------ */
  async function api(path, opts = {}) {
    const res = await fetch(API + path, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(opts.headers||{}) },
      ...opts,
      body: opts.body && typeof opts.body === 'object' && !(opts.body instanceof FormData) ? JSON.stringify(opts.body) : opts.body,
    });
    if (res.headers.get('content-type')?.includes('application/json')) {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      return data;
    }
    return res;
  }

  async function upload(path, files, fieldName='files') {
    const fd = new FormData();
    if (Array.isArray(files)) files.forEach(f => fd.append(fieldName, f));
    else fd.append(fieldName, files);
    const res = await fetch(API + path, { method: 'POST', body: fd, credentials: 'include' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return data;
  }

  /* ------------ Toast ------------ */
  function toast(msg, type='info', ms=2800) {
    const t = document.createElement('div');
    t.className = 'toast ' + type;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), ms);
  }

  function showLoading(text='Processing...') {
    const o = document.getElementById('loadingOverlay');
    if (!o) return;
    document.getElementById('loadingText').textContent = text;
    o.style.display = 'flex';
  }
  function hideLoading() { const o = document.getElementById('loadingOverlay'); if (o) o.style.display='none'; }

  /* ------------ Auth page ------------ */
  function initAuth() {
    // If already logged in, redirect
    api('/auth/me').then(() => location.href = '/dashboard.html').catch(()=>{});

    const tabs = document.querySelectorAll('.auth-tab');
    tabs.forEach(t => t.addEventListener('click', () => {
      tabs.forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      const tab = t.dataset.tab;
      document.getElementById('loginForm').style.display = tab==='login'?'block':'none';
      document.getElementById('registerForm').style.display = tab==='register'?'block':'none';
    }));

    // Login
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const identifier = document.getElementById('loginId').value.trim();
      const password = document.getElementById('loginPass').value;
      const alertBox = document.getElementById('loginAlert');
      alertBox.innerHTML = '';
      try {
        await api('/auth/login', { method: 'POST', body: { identifier, password } });
        toast('Welcome back!', 'success');
        setTimeout(() => location.href = '/dashboard.html', 500);
      } catch (err) {
        alertBox.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
      }
    });

    // Register
    document.getElementById('registerForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('regName').value.trim();
      const email = document.getElementById('regEmail').value.trim();
      const phone = document.getElementById('regPhone').value.trim();
      const password = document.getElementById('regPass').value;
      const alertBox = document.getElementById('regAlert');
      alertBox.innerHTML = '';
      if (!email && !phone) { alertBox.innerHTML = `<div class="alert alert-error">Please provide an email or phone number.</div>`; return; }
      try {
        await api('/auth/register', { method: 'POST', body: { name, email, phone, password } });
        toast('Account created!', 'success');
        setTimeout(() => location.href = '/dashboard.html', 500);
      } catch (err) {
        alertBox.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
      }
    });

    // Forgot
    document.getElementById('forgotLink').addEventListener('click', async (e) => {
      e.preventDefault();
      const id = prompt('Enter your email or phone number:');
      if (!id) return;
      try {
        await api('/auth/forgot', { method:'POST', body:{ identifier: id } });
        toast('Reset link sent (demo mode)', 'success');
      } catch (err) { toast(err.message, 'error'); }
    });

    document.getElementById('phoneLoginBtn').addEventListener('click', () => {
      document.getElementById('loginId').value = '+27';
      document.getElementById('loginId').focus();
    });
  }

  /* ------------ Dashboard app init ------------ */
  async function initApp() {
    try {
      const me = await api('/auth/me');
      state.user = me.user;
    } catch {
      location.href = '/index.html';
      return;
    }

    const userNameEl = document.getElementById('userName');
    const avatarEl = document.getElementById('userAvatar');
    if (userNameEl) userNameEl.textContent = state.user.name;
    if (avatarEl) avatarEl.textContent = state.user.name.split(' ').pop()?.[0] || state.user.name[0];

    // Logout
    const logout = async () => { await api('/auth/logout', { method: 'POST' }); location.href='/index.html'; };
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    document.getElementById('logoutBtn2')?.addEventListener('click', logout);

    // Mobile menu
    document.getElementById('menuToggle')?.addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
    });

    // User dropdown
    document.getElementById('userDropdown')?.addEventListener('click', () => {
      document.getElementById('userDropdown').classList.toggle('open');
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#userDropdown')) document.getElementById('userDropdown')?.classList.remove('open');
      if (!e.target.closest('#notifWrap')) document.getElementById('notifWrap')?.classList.remove('open');
    });
    document.getElementById('notifBtn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      document.getElementById('notifWrap').classList.toggle('open');
    });

    // Navigation
    document.querySelectorAll('[data-route]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const route = link.dataset.route;
        document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
        link.classList.add('active');
        document.getElementById('sidebar').classList.remove('open');
        Router.go(route);
      });
    });

    // Load notifications
    loadNotifications();

    // Initial route from hash or dashboard
    const hash = location.hash.replace('#','') || 'dashboard';
    Router.go(hash);
  }

  async function loadNotifications() {
    try {
      const d = await api('/dashboard');
      const panel = document.getElementById('notifPanel');
      const count = document.getElementById('notifCount');
      if (!panel) return;
      count.textContent = d.notifications.length;
      panel.innerHTML = d.notifications.length
        ? d.notifications.map(n => `<div class="notif-item ${n.read?'':'unread'}">${n.message}<div class="time">${timeAgo(n.created_at)}</div></div>`).join('')
        : '<div class="notif-item">No new notifications</div>';
    } catch {}
  }

  /* ------------ Router ------------ */
  const views = {};
  function registerView(name, renderer) { views[name] = renderer; }

  async function go(route) {
    location.hash = route;
    const titles = {
      dashboard:'Dashboard', assessments:'Assessments', upload:'Upload Scripts', moderation:'Moderation / Review',
      results:'Results Dashboard', questions:'Question Analysis', reports:'Reports',
      notifications:'Notifications', settings:'Settings', help:'Help & Support', setup:'Assessment Setup'
    };
    document.getElementById('pageTitle').textContent = titles[route] || 'Dashboard';
    const view = document.getElementById('view');
    view.innerHTML = '<div class="spinner"></div>';
    try {
      const renderer = views[route] || views.dashboard;
      await renderer(view);
    } catch (err) {
      view.innerHTML = `<div class="card"><div class="alert alert-error">${err.message}</div></div>`;
    }
  }

  const Router = { registerView, go };

  /* ------------ Utils ------------ */
  function timeAgo(ts) {
    const diff = (Date.now() - new Date(ts).getTime())/1000;
    if (diff<60) return 'Just now';
    if (diff<3600) return Math.floor(diff/60)+'m ago';
    if (diff<86400) return Math.floor(diff/3600)+'h ago';
    return Math.floor(diff/86400)+'d ago';
  }
  function fmtPct(n) { return Math.round(n*10)/10 + '%'; }
  function initials(name) { return name.split(' ').map(s=>s[0]).slice(0,2).join(''); }
  function confClass(c) { return c >= 0.8 ? 'conf-high' : c >= 0.65 ? 'conf-mid' : 'conf-low'; }
  function confLabel(c) { return Math.round(c*100) + '%'; }
  function confColor(c) { return c>=0.8 ? 'var(--success)' : c>=0.65 ? 'var(--warning)' : 'var(--danger)'; }

  // Expose
  window.MarkWise = { api, upload, toast, showLoading, hideLoading, initAuth, initApp, registerView, go, Router, state, timeAgo, fmtPct, confClass, confLabel, confColor, initials };
  return window.MarkWise;
})();

// Auto-init app on dashboard pages
if (document.getElementById('view')) {
  document.addEventListener('DOMContentLoaded', MarkWise.initApp);
}
