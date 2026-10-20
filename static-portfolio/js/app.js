/* =================================================================
   app.js — Boot, routing, clock, skill filters
================================================================= */

'use strict';

let DATA = {};
let activeTab = 'HOME';
let activeSkillFilter = 'all';

const TABS = ['HOME', 'SKILLS', 'PROJECTS', 'BLOG', 'WORKSHOPS', 'CONTACT'];

/* ── Theme (dark / light) ── */
function getStoredTheme() {
  try { return localStorage.getItem('site-theme'); } catch (e) { return null; }
}
function storeTheme(t) {
  try { localStorage.setItem('site-theme', t); } catch (e) { /* ignore */ }
}
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.textContent = theme === 'light' ? '◐ NEXUS' : '◑ OFFICE';
  }
  if (typeof window._refreshPhaseWidget === 'function') window._refreshPhaseWidget();
}
function initTheme() {
  const saved = getStoredTheme();
  applyTheme(saved === 'light' ? 'light' : 'dark');
}
function attachThemeToggle() {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  btn.textContent = current === 'light' ? '◐ NEXUS' : '◑ OFFICE';
  btn.addEventListener('click', () => {
    const now = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    applyTheme(now);
    storeTheme(now);
  });
}

/* Apply saved theme immediately (before first paint of shell) to avoid flash */
initTheme();

/* ── Clock + Phase widget ── */
const PHASE_SVGS = {
  morning: `<svg width="40" height="40" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated;display:block;margin:auto">
    <rect x="7" y="0" width="2" height="2" fill="#FFB300"/>
    <rect x="7" y="14" width="2" height="2" fill="#FFB300"/>
    <rect x="0" y="7" width="2" height="2" fill="#FFB300"/>
    <rect x="14" y="7" width="2" height="2" fill="#FFB300"/>
    <rect x="2" y="2" width="2" height="2" fill="#FFB300"/>
    <rect x="12" y="2" width="2" height="2" fill="#FFB300"/>
    <rect x="2" y="12" width="2" height="2" fill="#FFB300"/>
    <rect x="12" y="12" width="2" height="2" fill="#FFB300"/>
    <rect x="5" y="3" width="6" height="1" fill="#FFD54F"/>
    <rect x="3" y="5" width="10" height="6" fill="#FFD54F"/>
    <rect x="5" y="11" width="6" height="1" fill="#FFD54F"/>
    <rect x="5" y="4" width="6" height="7" fill="#FFEE58"/>
    <rect x="4" y="5" width="8" height="5" fill="#FFEE58"/>
    <rect x="6" y="6" width="4" height="3" fill="#FFF9C4"/>
  </svg>`,
  afternoon: `<svg width="40" height="40" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated;display:block;margin:auto">
    <rect x="7" y="0" width="2" height="2" fill="#FFB300"/>
    <rect x="7" y="14" width="2" height="2" fill="#FFB300"/>
    <rect x="0" y="7" width="2" height="2" fill="#FFB300"/>
    <rect x="14" y="7" width="2" height="2" fill="#FFB300"/>
    <rect x="2" y="2" width="2" height="2" fill="#FFB300"/>
    <rect x="12" y="2" width="2" height="2" fill="#FFB300"/>
    <rect x="2" y="12" width="2" height="2" fill="#FFB300"/>
    <rect x="12" y="12" width="2" height="2" fill="#FFB300"/>
    <rect x="5" y="3" width="6" height="10" fill="#FFD54F"/>
    <rect x="3" y="5" width="10" height="6" fill="#FFD54F"/>
    <rect x="6" y="5" width="4" height="6" fill="#FFEE58"/>
    <rect x="5" y="6" width="6" height="4" fill="#FFEE58"/>
    <rect x="6" y="6" width="4" height="4" fill="#FFF9C4"/>
    <rect x="9" y="3" width="4" height="3" fill="#e0e8ff" opacity="0.9"/>
    <rect x="10" y="2" width="5" height="2" fill="#e0e8ff" opacity="0.8"/>
  </svg>`,
  golden: `<svg width="40" height="40" viewBox="0 0 20 16" xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated;display:block;margin:auto">
    <rect x="2" y="8" width="4" height="5" fill="#1a2a3a"/>
    <rect x="3" y="6" width="3" height="2" fill="#1a2a3a"/>
    <rect x="8" y="5" width="5" height="8" fill="#1a2a3a"/>
    <rect x="9" y="3" width="3" height="2" fill="#1a2a3a"/>
    <rect x="14" y="7" width="4" height="6" fill="#1a2a3a"/>
    <rect x="15" y="5" width="3" height="2" fill="#1a2a3a"/>
    <rect x="0" y="13" width="20" height="3" fill="#0d1117"/>
    <rect x="0" y="11" width="20" height="2" fill="#FF6D00" opacity="0.4"/>
    <rect x="3" y="9" width="14" height="2" fill="#FF6D00" opacity="0.25"/>
    <rect x="4" y="6" width="12" height="3" fill="#FFB300" opacity="0.18"/>
    <rect x="6" y="4" width="8" height="2" fill="#FFB300" opacity="0.12"/>
    <rect x="8" y="3" width="4" height="1" fill="#FF6D00" opacity="0.6"/>
    <rect x="7" y="2" width="6" height="2" fill="#FF8F00" opacity="0.7"/>
    <rect x="8" y="1" width="4" height="1" fill="#FFB300" opacity="0.5"/>
  </svg>`,
  earlynight: `<svg width="40" height="40" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated;display:block;margin:auto">
    <rect x="5" y="1" width="6" height="2" fill="#546E7A"/>
    <rect x="3" y="3" width="10" height="6" fill="#546E7A"/>
    <rect x="2" y="4" width="12" height="4" fill="#607D8B"/>
    <rect x="4" y="3" width="8" height="6" fill="#607D8B"/>
    <rect x="5" y="2" width="6" height="7" fill="#78909C"/>
    <rect x="4" y="9" width="8" height="2" fill="#546E7A"/>
    <rect x="8" y="2" width="3" height="3" fill="#B0BEC5" opacity="0.6"/>
    <rect x="6" y="4" width="2" height="2" fill="#CFD8DC" opacity="0.7"/>
    <rect x="1" y="1" width="1" height="1" fill="#00E5FF" opacity="0.8"/>
    <rect x="14" y="3" width="1" height="1" fill="#00E5FF" opacity="0.6"/>
    <rect x="13" y="11" width="1" height="1" fill="#E0E0E0" opacity="0.7"/>
    <rect x="0" y="13" width="16" height="3" fill="#0d1117"/>
  </svg>`,
  latenight: `<svg width="40" height="40" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated;display:block;margin:auto">
    <rect x="8" y="1" width="4" height="1" fill="#546E7A"/>
    <rect x="7" y="2" width="5" height="4" fill="#607D8B"/>
    <rect x="8" y="2" width="4" height="5" fill="#78909C"/>
    <rect x="9" y="3" width="3" height="4" fill="#90A4AE"/>
    <rect x="5" y="3" width="3" height="3" fill="#546E7A"/>
    <rect x="5" y="6" width="4" height="3" fill="#546E7A"/>
    <rect x="6" y="4" width="3" height="5" fill="#607D8B"/>
    <rect x="7" y="3" width="1" height="1" fill="#0d1117"/>
    <rect x="7" y="5" width="2" height="2" fill="#0d1117"/>
    <rect x="2" y="2" width="1" height="1" fill="#E0E0E0" opacity="0.9"/>
    <rect x="13" y="1" width="1" height="1" fill="#E0E0E0" opacity="0.7"/>
    <rect x="1" y="7" width="1" height="1" fill="#00E5FF" opacity="0.6"/>
    <rect x="14" y="9" width="1" height="1" fill="#E0E0E0" opacity="0.8"/>
    <rect x="4" y="12" width="1" height="1" fill="#00E5FF" opacity="0.5"/>
    <rect x="12" y="13" width="1" height="1" fill="#E0E0E0" opacity="0.6"/>
  </svg>`
};

function getSunMoonPhase() {
  const hour = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false }) | 0;
  if (hour >= 6 && hour < 12) return { svg: PHASE_SVGS.morning,    label: 'Morning Sun',      title: 'PHASE', bg: 'linear-gradient(135deg, #FFE082, #FFB300)',  color: '#3d2800' };
  if (hour >= 12 && hour < 17) return { svg: PHASE_SVGS.afternoon, label: 'Afternoon',        title: 'PHASE', bg: 'linear-gradient(135deg, #90CAF9, #2f7fe0)',  color: '#0d2b4d' };
  if (hour >= 17 && hour < 20) return { svg: PHASE_SVGS.golden,    label: 'Golden Hour',      title: 'PHASE', bg: 'linear-gradient(135deg, #FF8F00, #FF6D00)',  color: '#3d1a00' };
  if (hour >= 20 && hour < 22) return { svg: PHASE_SVGS.earlynight,label: 'Early Night',      title: 'PHASE', bg: 'linear-gradient(135deg, #546E7A, #263238)',  color: '#E0F7FA' };
  return { svg: PHASE_SVGS.latenight, label: 'Waning Crescent', title: 'PHASE', bg: 'linear-gradient(135deg, #1a2333, #0d1117)', color: '#B3E5FC' };
}

function startClock() {
  const tick = () => {
    const now = new Date();
    const opts = { timeZone: 'Asia/Kolkata', hour12: false };
    const dateStr = now.toLocaleDateString('en-IN', { ...opts, weekday:'short', day:'2-digit', month:'short', year:'numeric' });
    const timeStr = now.toLocaleTimeString('en-IN', opts);

    const el1 = document.getElementById('clock');
    const el2 = document.getElementById('sb-clock');
    if (el1) el1.textContent = dateStr;
    if (el2) el2.textContent = timeStr;

    // Update phase widget
    const phase = getSunMoonPhase();
    const wrap = document.getElementById('phase-wrap');
    const glyph = document.getElementById('phase-glyph');
    const label = document.getElementById('phase-label');
    const clock2 = document.getElementById('sb-clock');
    const title = document.getElementById('phase-panel-title');
    const isOffice = document.documentElement.getAttribute('data-theme') === 'light';
    if (wrap) { wrap.style.background = isOffice ? phase.bg : ''; }
    if (glyph) { glyph.innerHTML = phase.svg; }
    if (label) { label.textContent = phase.label; label.style.color = isOffice ? phase.color : ''; }
    if (clock2) { clock2.style.color = isOffice ? phase.color : ''; }
    if (title) title.textContent = '◆ ' + phase.title;
  };
  tick();
  setInterval(tick, 1000);
  window._refreshPhaseWidget = tick;
}

/* ── Neubrutalist square cursor ── */
function initCursor() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(pointer: fine)').matches) return;

  const el = document.createElement('div');
  el.id = 'nb-cursor';
  el.classList.add('nb-cursor-hidden');
  document.body.appendChild(el);
  document.body.classList.add('nb-cursor-active');

  document.addEventListener('mousemove', e => {
    el.style.left = `${e.clientX}px`;
    el.style.top  = `${e.clientY}px`;
    el.classList.remove('nb-cursor-hidden');
  });
  document.addEventListener('mousedown', () => el.classList.add('nb-cursor-down'));
  document.addEventListener('mouseup',   () => el.classList.remove('nb-cursor-down'));

  // Hide the cursor when the pointer leaves the viewport (e.g. into the
  // browser chrome/navbar) — mousemove alone leaves it stuck at the last edge.
  document.addEventListener('mouseout', e => {
    if (!e.relatedTarget && !e.toElement) el.classList.add('nb-cursor-hidden');
  });
  document.addEventListener('mouseleave', () => el.classList.add('nb-cursor-hidden'));
}

/* ── Retro pixel avatar ── */
function getPixelAvatarSVG() {
  return `<svg width="80" height="80" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
    <!-- Hair -->
    <rect x="20" y="8" width="40" height="8" fill="#2a1a0a"/>
    <rect x="16" y="12" width="8" height="12" fill="#2a1a0a"/>
    <rect x="56" y="12" width="8" height="12" fill="#2a1a0a"/>
    <rect x="20" y="16" width="40" height="4" fill="#3a2010"/>
    <!-- Face -->
    <rect x="20" y="20" width="40" height="28" fill="#c8845a"/>
    <!-- Eyes -->
    <rect x="26" y="26" width="8" height="8" fill="#1a0a00"/>
    <rect x="46" y="26" width="8" height="8" fill="#1a0a00"/>
    <rect x="28" y="27" width="3" height="3" fill="#fff"/>
    <rect x="48" y="27" width="3" height="3" fill="#fff"/>
    <!-- Eyebrows -->
    <rect x="24" y="23" width="12" height="3" fill="#2a1a0a"/>
    <rect x="44" y="23" width="12" height="3" fill="#2a1a0a"/>
    <!-- Nose -->
    <rect x="37" y="33" width="6" height="4" fill="#a86040"/>
    <!-- Mouth -->
    <rect x="30" y="39" width="20" height="3" fill="#8a3820"/>
    <rect x="32" y="42" width="16" height="2" fill="#c06050"/>
    <!-- Ears -->
    <rect x="14" y="24" width="6" height="8" fill="#c8845a"/>
    <rect x="60" y="24" width="6" height="8" fill="#c8845a"/>
    <!-- Neck -->
    <rect x="32" y="48" width="16" height="8" fill="#c8845a"/>
    <!-- Hoodie / Shirt -->
    <rect x="16" y="56" width="48" height="20" fill="#1a2a3a"/>
    <rect x="28" y="56" width="24" height="4" fill="#c8845a"/>
    <!-- Hoodie detail -->
    <rect x="20" y="60" width="40" height="3" fill="#253545"/>
    <!-- Terminal glow on shirt -->
    <rect x="30" y="64" width="20" height="8" fill="#0a1520"/>
    <rect x="32" y="66" width="4" height="2" fill="#00e5ff" opacity="0.8"/>
    <rect x="38" y="66" width="8" height="2" fill="#39b838" opacity="0.7"/>
    <rect x="32" y="69" width="12" height="2" fill="#00e5ff" opacity="0.5"/>
  </svg>`;
}

/* ── Visit counter animation ── */
function animateCounter() {
  const el = document.getElementById('ctr');
  if (!el) return;
  let n = 1330;
  const target = 1337;
  const iv = setInterval(() => {
    n++;
    el.textContent = String(n).padStart(7, '0');
    if (n >= target) clearInterval(iv);
  }, 90);
}

/* ── Render section ── */
function renderSection() {
  const main = document.getElementById('main');
  if (!main) return;

  let html = '';
  switch (activeTab) {
    case 'HOME':      html = renderHome(DATA, activeSkillFilter);      break;
    case 'SKILLS':    html = renderSkills(DATA, activeSkillFilter);    break;
    case 'PROJECTS':  html = renderProjects(DATA);                      break;
    case 'BLOG':      html = renderBlog(DATA);                          break;
    case 'WORKSHOPS': html = renderWorkshops(DATA);                     break;
    case 'CONTACT':   html = renderContact(DATA);                       break;
    default:          html = renderHome(DATA, activeSkillFilter);
  }
  main.innerHTML = html;
  attachSkillFilters();
}

/* ── Skill filter clicks ── */
function attachSkillFilters() {
  const container = document.getElementById('skill-filters');
  if (!container) return;
  container.addEventListener('click', e => {
    const btn = e.target.closest('.sf-btn');
    if (!btn) return;
    activeSkillFilter = btn.dataset.cat;
    renderSection();
  });
}

/* ── Build page shell ── */
function buildShell() {
  const p = DATA.personal;

  /* Header */
  document.getElementById('header').innerHTML = `
    <div class="logo-area">
      <div class="site-name">${p.handle.toUpperCase()}</div>
      <div class="site-tagline">
        &gt; <span class="hl">${esc(p.title)}</span>
      </div>
    </div>
    <div class="header-right">
      <button id="theme-toggle" class="theme-toggle-btn" type="button" title="Switch theme"></button>
      <div class="online-badge">I'm ONLINE!</div>
      <div class="header-clock">■ <span id="clock"></span></div>
    </div>`;

  attachThemeToggle();

  /* Nav */
  const nav = document.getElementById('nav');
  nav.innerHTML = TABS.map(t =>
    `<button class="nav-btn ${t === activeTab ? 'active' : ''}" data-tab="${t}">${t}</button>`
  ).join('');

  nav.addEventListener('click', e => {
    const btn = e.target.closest('.nav-btn');
    if (!btn) return;
    activeTab = btn.dataset.tab;
    activeSkillFilter = 'all';
    document.querySelectorAll('.nav-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.tab === activeTab)
    );
    renderSection();
  });

  /* Marquee */
  const marquee = document.createElement('div');
  marquee.className = 'marquee-wrap';
  const items = DATA.skills.slice(0, 16)
    .map(s => {
      const color = (DATA.skillCategories[s.cat] && DATA.skillCategories[s.cat].color) || 'teal';
      return `<span class="m-item ${color}">◆ ${s.name}</span>`;
    }).join('');
  marquee.innerHTML = `<span class="marquee-inner">${items}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${items}</span>`;
  document.getElementById('app').insertBefore(marquee, document.getElementById('main'));
}

/* ── Boot ── */
async function boot() {
  try {
    const res = await fetch('./data.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    DATA = await res.json();
  } catch (err) {
    document.getElementById('main').innerHTML = `
      <div class="panel" style="border-color:var(--red-dim)">
        <div class="pt" style="color:var(--red)">ERROR.LOG</div>
        <div class="prompt"><span class="ps">$</span> <span class="cmd">fetch</span> <span class="arg">./data.json</span></div>
        <p style="color:var(--red);margin-bottom:8px">⚠ Failed to load data.json: ${esc(err.message)}</p>
        <p style="font-size:11px;color:var(--text-dim)">
          Serve this folder over HTTP:<br>
          <code style="color:var(--teal)">python3 -m http.server 8080</code>
        </p>
      </div>`;
    return;
  }

  buildShell();
  renderSection();
  document.getElementById('sidebar').innerHTML = renderSidebar(DATA);
  document.getElementById('footer').innerHTML  = renderFooter(DATA);
  startClock();
  animateCounter();
  initCursor();
}

document.addEventListener('DOMContentLoaded', boot);
