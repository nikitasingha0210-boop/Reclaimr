/* ═══════════════════════════════════════════════
   RECLAIM'R FRONTEND — SCRIPT
   Connects the UI to the real backend API for
   authentication and lost/found item management.
═══════════════════════════════════════════════ */

/* ─────────────────────────────────────────────
   API CONFIG
   Change API_BASE_URL if your backend runs
   somewhere other than localhost:5000, or if you
   deploy frontend + backend under the same domain.
───────────────────────────────────────────── */
const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:5000/api'
  : '/api';

// Maps the lowercase values used in the search/filter dropdown
// to the exact category names stored in the database (backend enum).
const CATEGORY_MAP = {
  electronics: 'Electronics',
  documents: 'Documents',
  clothing: 'Clothing',
  keys: 'Keys',
  bags: 'Bags',
  jewelry: 'Jewelry',
  other: 'Other',
};

/* ─────────────────────────────────────────────
   APP STATE
───────────────────────────────────────────── */
let allItems = [];          // items currently loaded from the backend
let filteredItems = [];     // items after filter/search is applied
let currentFilter = 'all';
let displayedCount = 6;
let currentTab = 'lost';
let uploadedImageBase64 = null;

// Auth state, restored from localStorage on page load
let authToken = localStorage.getItem('reclaimr_token') || null;
let currentUser = JSON.parse(localStorage.getItem('reclaimr_user') || 'null');

/* ─────────────────────────────────────────────
   INIT
───────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  updateAuthUI();
  loadItems();
  animateStats();
  initNavScroll();
  initFilterBtns();
  initScrollFade();
  initDragDrop();
  setTodayDate();

  document.getElementById('loadMoreBtn').addEventListener('click', () => { displayedCount += 3; renderItems(); });
  document.getElementById('loginBtn').addEventListener('click', () => openAuth('login'));
  document.getElementById('signupBtn').addEventListener('click', () => openAuth('signup'));

  const si = document.getElementById('globalSearch');
  if (si) si.addEventListener('keydown', e => { if (e.key === 'Enter') performSearch(); });
});

/* ─────────────────────────────────────────────
   API HELPER
   Wraps fetch() so every call gets consistent
   headers, JSON parsing and error handling.
───────────────────────────────────────────── */
async function apiRequest(endpoint, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && authToken) headers.Authorization = `Bearer ${authToken}`;

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (networkError) {
    // Backend unreachable (not running, wrong URL, CORS, etc.)
    throw new Error('Could not reach the server. Please make sure the backend is running.');
  }

  let data;
  try {
    data = await response.json();
  } catch (parseError) {
    throw new Error('Unexpected response from the server.');
  }

  if (!response.ok || data.success === false) {
    throw new Error(data.message || 'Something went wrong.');
  }

  return data;
}

/* ═══════════════════════════════════════════════
   AUTHENTICATION
═══════════════════════════════════════════════ */

function openAuth(tab) {
  document.getElementById('authOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  switchAuth(tab);
}

function closeAuth() {
  document.getElementById('authOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

function switchAuth(tab) {
  document.getElementById('loginForm').classList.toggle('hidden', tab !== 'login');
  document.getElementById('signupForm').classList.toggle('hidden', tab !== 'signup');
  document.getElementById('loginTabBtn').classList.toggle('active', tab === 'login');
  document.getElementById('signupTabBtn').classList.toggle('active', tab === 'signup');
}

// Called by the "Login" button inside the auth modal
async function handleLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!email || !password) {
    showToast('Please enter your email and password.', true);
    return;
  }

  try {
    const data = await apiRequest('/auth/login', { method: 'POST', body: { email, password } });
    setSession(data.token, data.user);
    closeAuth();
    showToast(`Welcome back, ${data.user.name}! 👋`);
  } catch (error) {
    showToast(error.message, true);
  }
}

// Called by the "Create Account" button inside the auth modal
async function handleSignup() {
  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;

  if (!name || !email || !password) {
    showToast('Please fill all fields.', true);
    return;
  }
  if (password.length < 6) {
    showToast('Password must be at least 6 characters.', true);
    return;
  }

  try {
    const data = await apiRequest('/auth/signup', { method: 'POST', body: { name, email, password } });
    setSession(data.token, data.user);
    closeAuth();
    showToast(`Account created. Welcome, ${data.user.name}! 🎉`);
  } catch (error) {
    showToast(error.message, true);
  }
}

function setSession(token, user) {
  authToken = token;
  currentUser = user;
  localStorage.setItem('reclaimr_token', token);
  localStorage.setItem('reclaimr_user', JSON.stringify(user));
  updateAuthUI();
  renderItems(); // re-render so "your item" actions (claim/delete) show correctly
}

function logout() {
  authToken = null;
  currentUser = null;
  localStorage.removeItem('reclaimr_token');
  localStorage.removeItem('reclaimr_user');
  updateAuthUI();
  renderItems();
  showToast("You've been logged out.");
}

// Toggles the navbar between "Login/Sign Up" and "Logged in as ..." states
function updateAuthUI() {
  const loggedIn = !!authToken && !!currentUser;

  document.getElementById('loginBtn').classList.toggle('hidden', loggedIn);
  document.getElementById('signupBtn').classList.toggle('hidden', loggedIn);

  const userChip = document.getElementById('userChip');
  const mobileUserChip = document.getElementById('mobileUserChip');
  const mobileAuthActions = document.getElementById('mobileAuthActions');

  if (userChip) {
    userChip.classList.toggle('hidden', !loggedIn);
    if (loggedIn) document.getElementById('userChipName').textContent = currentUser.name;
  }
  if (mobileUserChip && mobileAuthActions) {
    mobileUserChip.classList.toggle('hidden', !loggedIn);
    mobileAuthActions.classList.toggle('hidden', loggedIn);
    if (loggedIn) document.getElementById('mobileUserChipName').textContent = currentUser.name;
  }
}

/* ═══════════════════════════════════════════════
   ITEMS — LOAD, FILTER, RENDER
═══════════════════════════════════════════════ */

// Fetches items from the backend, optionally filtered
async function loadItems() {
  const grid = document.getElementById('itemsGrid');
  grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-muted);"><i class="fas fa-spinner fa-spin" style="font-size:1.8rem;margin-bottom:14px;display:block;"></i>Loading items…</div>`;

  try {
    const searchVal = document.getElementById('globalSearch').value.trim();
    const catVal = document.getElementById('searchCategory').value;

    const params = new URLSearchParams();
    if (currentFilter && currentFilter !== 'all') params.set('status', currentFilter);
    if (catVal && CATEGORY_MAP[catVal]) params.set('category', CATEGORY_MAP[catVal]);
    if (searchVal) params.set('search', searchVal);

    const data = await apiRequest(`/items?${params.toString()}`);
    allItems = data.items;
    filteredItems = [...allItems];
    renderItems();
  } catch (error) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-muted);"><i class="fas fa-triangle-exclamation" style="font-size:2rem;margin-bottom:16px;display:block;"></i>${error.message}</div>`;
  }
}

function renderItems() {
  const grid = document.getElementById('itemsGrid');
  grid.innerHTML = '';
  const toShow = filteredItems.slice(0, displayedCount);

  if (toShow.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-muted);"><i class="fas fa-box-open" style="font-size:2.5rem;margin-bottom:16px;display:block;"></i>No items found. Try a different filter or search term.</div>`;
    document.getElementById('loadMoreBtn').style.display = 'none';
    return;
  }

  toShow.forEach((item, idx) => grid.appendChild(createCard(item, idx)));
  document.getElementById('loadMoreBtn').style.display = filteredItems.length > displayedCount ? 'inline-flex' : 'none';
}

function createCard(item, idx) {
  const div = document.createElement('div');
  div.className = 'item-card';
  div.style.animationDelay = `${idx * 0.07}s`;
  div.dataset.id = item._id;

  const statusClass = item.status === 'found' ? 'tag-found' : item.status === 'lost' ? 'tag-lost' : 'tag-claimed';
  const statusLabel = item.status === 'found' ? 'Found' : item.status === 'lost' ? 'Lost' : 'Claimed';
  const desc = item.desc || '';

  div.innerHTML = `
    <div class="card-image">
      ${item.image ? `<img src="${item.image}" alt="${item.title}" style="width:100%;height:100%;object-fit:cover;" />` : `<i class="fas ${item.icon}" style="color:var(--text-muted);font-size:2.2rem;"></i>`}
      <span class="card-status-tag ${statusClass}">${statusLabel}</span>
    </div>
    <div class="card-body">
      <div class="card-title">${item.title}</div>
      <div class="card-meta">
        <span><i class="fas fa-tag"></i> ${item.category}</span>
        <span><i class="fas fa-location-dot"></i> ${item.location}</span>
        <span><i class="fas fa-calendar"></i> ${formatDate(item.date)}</span>
      </div>
      <p class="card-desc">${desc.length > 90 ? desc.slice(0, 90) + '…' : desc}</p>
      <div class="card-actions">
        ${item.status !== 'claimed'
          ? `<button class="card-btn-contact" onclick="contactOwner(event,'${item._id}')"><i class="fas fa-envelope"></i> Contact</button>`
          : `<button class="card-btn-contact" style="background:var(--text-muted);cursor:default;" disabled>Claimed</button>`}
        <button class="card-btn-detail" onclick="openModal('${item._id}')">Details</button>
      </div>
    </div>`;
  return div;
}

/* ─────────────────────────────────────────────
   FILTER & SEARCH
   Every filter/search change re-queries the
   backend so results always reflect the database.
───────────────────────────────────────────── */
function initFilterBtns() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      displayedCount = 6;
      loadItems();
    });
  });
}

function performSearch() {
  displayedCount = 6;
  loadItems();
  scrollToSection('browse');
}

/* ═══════════════════════════════════════════════
   ITEM DETAIL MODAL
═══════════════════════════════════════════════ */
function openModal(id) {
  const item = allItems.find(i => i._id === id);
  if (!item) return;

  const overlay = document.getElementById('modalOverlay');
  const content = document.getElementById('modalContent');
  const bgClass = item.status === 'found' ? 'found-bg' : 'lost-bg';
  const statusClass = item.status === 'found' ? 'tag-found' : item.status === 'lost' ? 'tag-lost' : 'tag-claimed';
  const statusLabel = item.status === 'found' ? '✓ Found' : item.status === 'lost' ? '! Lost' : 'Claimed';

  // The reporter can claim (resolve) or delete their own listing
  const isOwner = currentUser && item.reportedBy && (item.reportedBy === currentUser.id || item.reportedBy._id === currentUser.id);

  let actionsHtml = '';
  if (item.status !== 'claimed') {
    actionsHtml += `<button class="btn-primary btn-full" onclick="contactOwner(event,'${item._id}')"><i class="fas fa-envelope"></i> Contact Reporter</button>`;
  } else {
    actionsHtml += `<button class="btn-primary btn-full" style="background:var(--text-muted);cursor:default;" disabled>Already Claimed</button>`;
  }
  if (isOwner) {
    if (item.status !== 'claimed') {
      actionsHtml += `<button class="btn-outline" onclick="claimItem('${item._id}')" style="flex-shrink:0;padding:9px 14px;"><i class="fas fa-check"></i> Mark Claimed</button>`;
    }
    actionsHtml += `<button class="btn-outline" onclick="deleteItem('${item._id}')" style="flex-shrink:0;padding:9px 14px;color:#c0392b;border-color:#c0392b;"><i class="fas fa-trash"></i> Delete</button>`;
  }
  actionsHtml += `<button class="btn-outline" onclick="closeModal()" style="flex-shrink:0;padding:9px 14px;">Close</button>`;

  content.innerHTML = `
    ${item.image ? `<img src="${item.image}" alt="${item.title}" style="width:100%;max-height:220px;object-fit:cover;border-radius:var(--radius-md);margin-bottom:18px;" />` : `<div class="modal-item-icon ${bgClass}"><i class="fas ${item.icon}"></i></div>`}
    <h2 class="modal-title">${item.title}</h2>
    <div class="modal-status"><span class="card-status-tag ${statusClass}" style="position:static;font-size:0.78rem;">${statusLabel}</span></div>
    <div class="modal-details">
      <div class="modal-detail-row"><i class="fas fa-tag"></i><strong>Category:</strong> ${item.category}</div>
      <div class="modal-detail-row"><i class="fas fa-location-dot"></i><strong>Location:</strong> ${item.location}</div>
      <div class="modal-detail-row"><i class="fas fa-calendar"></i><strong>Date:</strong> ${formatDate(item.date)}</div>
    </div>
    <p class="modal-desc-label">Description</p>
    <p class="modal-desc">${item.desc || 'No description provided.'}</p>
    <div class="modal-actions">${actionsHtml}</div>`;

  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

/* ═══════════════════════════════════════════════
   REPORT A LOST / FOUND ITEM
═══════════════════════════════════════════════ */
function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.form-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
}

async function submitReport(e) {
  e.preventDefault();

  // Reporting requires an account so the item can be linked to its owner
  if (!authToken) {
    showToast('Please login to report an item.', true);
    openAuth('login');
    return;
  }

  const title = document.getElementById('itemName').value.trim();
  const category = document.getElementById('itemCategory').value;
  const date = document.getElementById('itemDate').value;
  const location = document.getElementById('itemLocation').value.trim();
  const desc = document.getElementById('itemDesc').value.trim();
  const contact = document.getElementById('itemEmail').value.trim();

  if (!title || !category || !date || !location || !contact) {
    showToast('Please fill all required fields.', true);
    return;
  }

  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalBtnHtml = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting…';

  try {
    await apiRequest('/items', {
      method: 'POST',
      auth: true,
      body: {
        title,
        status: currentTab,
        category,
        location,
        date,
        desc,
        contact,
        image: uploadedImageBase64,
      },
    });

    document.getElementById('reportForm').reset();
    document.getElementById('filePreview').classList.add('hidden');
    uploadedImageBase64 = null;
    setTodayDate();

    showToast('Report submitted successfully! 🎉');
    displayedCount = 6;
    await loadItems();
    setTimeout(() => scrollToSection('browse'), 1000);
  } catch (error) {
    showToast(error.message, true);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnHtml;
  }
}

// Mark an item as claimed/resolved (reporter only)
async function claimItem(id) {
  try {
    await apiRequest(`/items/${id}/claim`, { method: 'PATCH', auth: true });
    showToast('Item marked as claimed. Glad it was resolved! 🎉');
    closeModal();
    await loadItems();
  } catch (error) {
    showToast(error.message, true);
  }
}

// Delete a listing (reporter only)
async function deleteItem(id) {
  if (!confirm('Delete this listing? This cannot be undone.')) return;
  try {
    await apiRequest(`/items/${id}`, { method: 'DELETE', auth: true });
    showToast('Listing deleted.');
    closeModal();
    await loadItems();
  } catch (error) {
    showToast(error.message, true);
  }
}

// Opens the reporter's email client with a prefilled message
function contactOwner(e, id) {
  e.stopPropagation();
  const item = allItems.find(i => i._id === id);
  if (!item) return;
  window.open(`mailto:${item.contact}?subject=${encodeURIComponent("Regarding: " + item.title + " on Reclaim'r")}&body=${encodeURIComponent("Hi,\n\nI saw your listing on Reclaim'r for \"" + item.title + "\" at " + item.location + ".\n\nI'd like to discuss this further.\n\nThanks!")}`);
}

/* ─────────────────────────────────────────────
   FILE UPLOAD (photo attached to a report)
───────────────────────────────────────────── */
function handleFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { showToast('File too large. Max 5MB.', true); return; }

  const reader = new FileReader();
  reader.onload = ev => {
    uploadedImageBase64 = ev.target.result; // base64 string, sent to backend as `image`
    const preview = document.getElementById('filePreview');
    preview.innerHTML = `<img src="${ev.target.result}" alt="Preview" />`;
    preview.classList.remove('hidden');
  };
  reader.readAsDataURL(file);
}

function initDragDrop() {
  const area = document.getElementById('uploadArea');
  if (!area) return;
  area.addEventListener('dragover', e => { e.preventDefault(); area.style.borderColor = 'var(--accent)'; area.style.background = 'var(--accent-light)'; });
  area.addEventListener('dragleave', () => { area.style.borderColor = ''; area.style.background = ''; });
  area.addEventListener('drop', e => {
    e.preventDefault(); area.style.borderColor = ''; area.style.background = '';
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) handleFile({ target: { files: [file] } });
  });
}

/* ─────────────────────────────────────────────
   NAV SCROLL & MOBILE MENU
───────────────────────────────────────────── */
function initNavScroll() {
  const navbar = document.getElementById('navbar');
  const sections = ['home', 'browse', 'report', 'how-it-works', 'faq'];
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
    let current = '';
    sections.forEach(id => { const el = document.getElementById(id); if (el && window.scrollY >= el.offsetTop - 120) current = id; });
    document.querySelectorAll('.nav-link').forEach(link => { link.classList.remove('active'); if (link.getAttribute('href') === `#${current}`) link.classList.add('active'); });
  });
  document.getElementById('hamburger').addEventListener('click', () => document.getElementById('mobileMenu').classList.add('open'));
  document.getElementById('closeMobile').addEventListener('click', () => document.getElementById('mobileMenu').classList.remove('open'));
  document.querySelectorAll('.mobile-link').forEach(link => link.addEventListener('click', () => document.getElementById('mobileMenu').classList.remove('open')));
}

function scrollToSection(id) { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: 'smooth' }); }

/* ─────────────────────────────────────────────
   STATS ANIMATION
───────────────────────────────────────────── */
function animateStats() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = +el.dataset.target;
        let current = 0;
        const timer = setInterval(() => {
          current = Math.min(current + target / 60, target);
          el.textContent = Math.floor(current).toLocaleString();
          if (current >= target) clearInterval(timer);
        }, 18);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('.stat-num[data-target]').forEach(n => observer.observe(n));
}

/* ─────────────────────────────────────────────
   SCROLL FADE-IN
───────────────────────────────────────────── */
function initScrollFade() {
  const targets = document.querySelectorAll('.step-card, .testimonial-card, .faq-item, .section-header, .report-info');
  targets.forEach(el => el.classList.add('fade-in'));
  const io = new IntersectionObserver(entries => { entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } }); }, { threshold: 0.12 });
  targets.forEach(t => io.observe(t));
}

/* ─────────────────────────────────────────────
   FAQ TOGGLE
───────────────────────────────────────────── */
function toggleFaq(btn) {
  const item = btn.closest('.faq-item');
  const isOpen = item.classList.contains('open');
  document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
  if (!isOpen) item.classList.add('open');
}

/* ─────────────────────────────────────────────
   TOAST
───────────────────────────────────────────── */
function showToast(msg, isError = false) {
  const toast = document.getElementById('toast');
  document.getElementById('toastMsg').textContent = msg;
  toast.querySelector('.toast-icon').style.color = isError ? '#e07070' : '#6dcf95';
  toast.querySelector('.toast-icon').className = `fas ${isError ? 'fa-circle-exclamation' : 'fa-circle-check'} toast-icon`;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3500);
}

/* ─────────────────────────────────────────────
   UTILS
───────────────────────────────────────────── */
function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function setTodayDate() {
  const d = document.getElementById('itemDate');
  if (d) { const today = new Date().toISOString().split('T')[0]; d.value = today; d.max = today; }
}