// SAMPLE DATA
const sampleItems = [
  { id: 1, status: 'found', title: 'MacBook Air (Silver)', category: 'Electronics', location: 'Computer Lab B104', date: '2025-01-18', desc: 'Found near the printer station. Has a small sticker on the lid. Charger also found with it.', contact: 'found@campus.edu', icon: 'fa-laptop' },
  { id: 2, status: 'lost', title: 'Black Leather Wallet', category: 'Accessories', location: 'Main Cafeteria', date: '2025-01-17', desc: 'Black bifold wallet with student ID and some cash inside. Very important — contains ID card.', contact: 'student@campus.edu', icon: 'fa-wallet' },
  { id: 3, status: 'found', title: 'Sony WH-1000XM5 Headphones', category: 'Electronics', location: 'Library Reading Room', date: '2025-01-17', desc: 'Black over-ear headphones in original carry case. Found on a chair near the window seats.', contact: 'finder2@campus.edu', icon: 'fa-headphones' },
  { id: 4, status: 'lost', title: 'Room Key Bunch (3 keys)', category: 'Keys', location: 'Hostel Block C Corridor', date: '2025-01-16', desc: 'Three keys on a blue keychain with a small compass pendant. Really urgent!', contact: 'urgent@campus.edu', icon: 'fa-key' },
  { id: 5, status: 'found', title: 'iPhone 14 (Black)', category: 'Electronics', location: 'Sports Ground Stands', date: '2025-01-15', desc: 'Found after the cricket match. Has a cracked back case. Phone is locked.', contact: 'sports@campus.edu', icon: 'fa-mobile-screen' },
  { id: 6, status: 'claimed', title: 'Research Notebook', category: 'Documents', location: 'Science Block Lab 3', date: '2025-01-14', desc: 'A5 spiral notebook with chemistry formulas. Owner has claimed this item.', contact: 'claimed@campus.edu', icon: 'fa-book' },
  { id: 7, status: 'found', title: 'Blue Jansport Backpack', category: 'Bags', location: 'Ground Floor Lobby', date: '2025-01-14', desc: 'Blue backpack with textbooks inside. Has a name tag on the zipper — partially legible.', contact: 'lobby@campus.edu', icon: 'fa-bag-shopping' },
  { id: 8, status: 'lost', title: 'Student ID Card', category: 'Documents', location: 'Admin Block', date: '2025-01-13', desc: 'Student ID belonging to 3rd year student. If found please drop at Admin office.', contact: 'admin@campus.edu', icon: 'fa-id-card' },
  { id: 9, status: 'found', title: 'Dark Green Scarf', category: 'Clothing', location: 'Seminar Hall B', date: '2025-01-13', desc: 'Wool blend dark green scarf found on the chair at back row.', contact: 'hall@campus.edu', icon: 'fa-shirt' }
];

let currentFilter = 'all';
let displayedCount = 6;
let filteredItems = [...sampleItems];
let currentTab = 'lost';

document.addEventListener('DOMContentLoaded', () => {
  renderItems();
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

// RENDER ITEMS
function renderItems() {
  const grid = document.getElementById('itemsGrid');
  grid.innerHTML = '';
  const toShow = filteredItems.slice(0, displayedCount);
  if (toShow.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-muted);"><i class="fas fa-box-open" style="font-size:2.5rem;margin-bottom:16px;display:block;"></i>No items found. Try a different filter or search term.</div>`;
    return;
  }
  toShow.forEach((item, idx) => grid.appendChild(createCard(item, idx)));
  document.getElementById('loadMoreBtn').style.display = filteredItems.length > displayedCount ? 'inline-flex' : 'none';
}

function createCard(item, idx) {
  const div = document.createElement('div');
  div.className = 'item-card';
  div.style.animationDelay = `${idx * 0.07}s`;
  div.dataset.id = item.id;
  const statusClass = item.status === 'found' ? 'tag-found' : item.status === 'lost' ? 'tag-lost' : 'tag-claimed';
  const statusLabel = item.status === 'found' ? 'Found' : item.status === 'lost' ? 'Lost' : 'Claimed';
  div.innerHTML = `
    <div class="card-image">
      <i class="fas ${item.icon}" style="color:var(--text-muted);font-size:2.2rem;"></i>
      <span class="card-status-tag ${statusClass}">${statusLabel}</span>
    </div>
    <div class="card-body">
      <div class="card-title">${item.title}</div>
      <div class="card-meta">
        <span><i class="fas fa-tag"></i> ${item.category}</span>
        <span><i class="fas fa-location-dot"></i> ${item.location}</span>
        <span><i class="fas fa-calendar"></i> ${formatDate(item.date)}</span>
      </div>
      <p class="card-desc">${item.desc.length > 90 ? item.desc.slice(0, 90) + '…' : item.desc}</p>
      <div class="card-actions">
        ${item.status !== 'claimed'
          ? `<button class="card-btn-contact" onclick="contactOwner(event,${item.id})"><i class="fas fa-envelope"></i> Contact</button>`
          : `<button class="card-btn-contact" style="background:var(--text-muted);cursor:default;" disabled>Claimed</button>`}
        <button class="card-btn-detail" onclick="openModal(${item.id})">Details</button>
      </div>
    </div>`;
  return div;
}

// FILTER
function initFilterBtns() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      displayedCount = 6;
      applyFilter();
    });
  });
}

function applyFilter() {
  const searchVal = document.getElementById('globalSearch').value.toLowerCase().trim();
  const catVal = document.getElementById('searchCategory').value.toLowerCase();
  filteredItems = sampleItems.filter(item => {
    const matchFilter = currentFilter === 'all' || item.status === currentFilter;
    const matchSearch = !searchVal || item.title.toLowerCase().includes(searchVal) || item.desc.toLowerCase().includes(searchVal) || item.location.toLowerCase().includes(searchVal);
    const matchCat = !catVal || item.category.toLowerCase().includes(catVal);
    return matchFilter && matchSearch && matchCat;
  });
  renderItems();
}

function performSearch() { displayedCount = 6; applyFilter(); scrollToSection('browse'); }

// MODAL
function openModal(id) {
  const item = sampleItems.find(i => i.id === id);
  if (!item) return;
  const overlay = document.getElementById('modalOverlay');
  const content = document.getElementById('modalContent');
  const bgClass = item.status === 'found' ? 'found-bg' : 'lost-bg';
  const statusClass = item.status === 'found' ? 'tag-found' : item.status === 'lost' ? 'tag-lost' : 'tag-claimed';
  const statusLabel = item.status === 'found' ? '✓ Found' : item.status === 'lost' ? '! Lost' : 'Claimed';
  content.innerHTML = `
    <div class="modal-item-icon ${bgClass}"><i class="fas ${item.icon}"></i></div>
    <h2 class="modal-title">${item.title}</h2>
    <div class="modal-status"><span class="card-status-tag ${statusClass}" style="position:static;font-size:0.78rem;">${statusLabel}</span></div>
    <div class="modal-details">
      <div class="modal-detail-row"><i class="fas fa-tag"></i><strong>Category:</strong> ${item.category}</div>
      <div class="modal-detail-row"><i class="fas fa-location-dot"></i><strong>Location:</strong> ${item.location}</div>
      <div class="modal-detail-row"><i class="fas fa-calendar"></i><strong>Date:</strong> ${formatDate(item.date)}</div>
    </div>
    <p class="modal-desc-label">Description</p>
    <p class="modal-desc">${item.desc}</p>
    <div class="modal-actions">
      ${item.status !== 'claimed'
        ? `<button class="btn-primary btn-full" onclick="contactOwner(event,${item.id})"><i class="fas fa-envelope"></i> Contact Reporter</button>`
        : `<button class="btn-primary btn-full" style="background:var(--text-muted);cursor:default;" disabled>Already Claimed</button>`}
      <button class="btn-outline" onclick="closeModal()" style="flex-shrink:0;padding:9px 14px;">Close</button>
    </div>`;
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() { document.getElementById('modalOverlay').classList.remove('open'); document.body.style.overflow = ''; }

// AUTH
function openAuth(tab) { document.getElementById('authOverlay').classList.add('open'); document.body.style.overflow = 'hidden'; switchAuth(tab); }
function closeAuth() { document.getElementById('authOverlay').classList.remove('open'); document.body.style.overflow = ''; }
function switchAuth(tab) {
  document.getElementById('loginForm').classList.toggle('hidden', tab !== 'login');
  document.getElementById('signupForm').classList.toggle('hidden', tab !== 'signup');
  document.getElementById('loginTabBtn').classList.toggle('active', tab === 'login');
  document.getElementById('signupTabBtn').classList.toggle('active', tab === 'signup');
}
function fakeLogin() { closeAuth(); showToast("Welcome to Reclaim'r! 👋"); }

// FORM TAB
function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.form-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
}

// SUBMIT REPORT
function submitReport(e) {
  e.preventDefault();
  const name = document.getElementById('itemName').value.trim();
  const category = document.getElementById('itemCategory').value;
  const date = document.getElementById('itemDate').value;
  const location = document.getElementById('itemLocation').value.trim();
  const desc = document.getElementById('itemDesc').value.trim();
  const email = document.getElementById('itemEmail').value.trim();
  if (!name || !category || !date || !location || !email) { showToast('Please fill all required fields.', true); return; }
  const icons = { Electronics: 'fa-laptop', Documents: 'fa-file', Clothing: 'fa-shirt', Keys: 'fa-key', Bags: 'fa-bag-shopping', Jewelry: 'fa-gem', Other: 'fa-box' };
  sampleItems.unshift({ id: Date.now(), status: currentTab, title: name, category, location, date, desc: desc || 'No description provided.', contact: email, icon: icons[category] || 'fa-box' });
  filteredItems = [...sampleItems];
  renderItems();
  document.getElementById('reportForm').reset();
  document.getElementById('filePreview').classList.add('hidden');
  showToast('Report submitted successfully! 🎉');
  setTimeout(() => scrollToSection('browse'), 1500);
}

// CONTACT
function contactOwner(e, id) {
  e.stopPropagation();
  const item = sampleItems.find(i => i.id === id);
  if (!item) return;
  window.open(`mailto:${item.contact}?subject=${encodeURIComponent("Regarding: " + item.title + " on Reclaim'r")}&body=${encodeURIComponent("Hi,\n\nI saw your listing on Reclaim'r for \"" + item.title + "\" at " + item.location + ".\n\nI'd like to discuss this further.\n\nThanks!")}`);
}

// FILE UPLOAD
function handleFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { showToast('File too large. Max 5MB.', true); return; }
  const reader = new FileReader();
  reader.onload = ev => {
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

// NAV SCROLL
function initNavScroll() {
  const navbar = document.getElementById('navbar');
  const sections = ['home', 'browse', 'report', 'how-it-works'];
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

// STATS ANIMATION
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

// SCROLL FADE
function initScrollFade() {
  const targets = document.querySelectorAll('.step-card, .testimonial-card, .section-header, .report-info');
  targets.forEach(el => el.classList.add('fade-in'));
  const io = new IntersectionObserver(entries => { entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } }); }, { threshold: 0.12 });
  targets.forEach(t => io.observe(t));
}

// TOAST
function showToast(msg, isError = false) {
  const toast = document.getElementById('toast');
  document.getElementById('toastMsg').textContent = msg;
  toast.querySelector('.toast-icon').style.color = isError ? '#e07070' : '#6dcf95';
  toast.querySelector('.toast-icon').className = `fas ${isError ? 'fa-circle-exclamation' : 'fa-circle-check'} toast-icon`;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3500);
}

// UTILS
function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function setTodayDate() {
  const d = document.getElementById('itemDate');
  if (d) { const today = new Date().toISOString().split('T')[0]; d.value = today; d.max = today; }
}