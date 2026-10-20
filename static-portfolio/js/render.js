/* =================================================================
   render.js — Pure HTML render functions for each section
================================================================= */

'use strict';

/* ── Tiny helpers ── */
const esc = s => String(s)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

function tags(arr, cls = '') {
  return arr.map(t => `<span class="tag ${esc(cls)}">${esc(t)}</span>`).join('');
}

function prompt(cmd, arg = '') {
  return `<div class="prompt typewriter">
    <span class="ps">$</span>
    <span class="cmd"> ${esc(cmd)}</span>
    <span class="arg"> ${esc(arg)}</span>
  </div>`;
}

/* ── Dynamic stats ── */
function computeStats(DATA) {
  let yoe = 0;
  if (DATA.personal.careerStart) {
    const [y, m] = DATA.personal.careerStart.split('-').map(Number);
    const start  = new Date(y, (m || 1) - 1, 1);
    const months = (Date.now() - start) / (1000 * 60 * 60 * 24 * 30.44);
    yoe = Math.floor(months / 12);
  }

  return {
    yoe:      yoe >= 1 ? `${yoe}+` : '<1',
  };
}

/* ── Tab switcher called from clickable stat boxes & inline onclick ── */
function switchTab(tab, anchorId) {
  activeTab = tab;
  activeSkillFilter = 'all';
  document.querySelectorAll('.nav-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === tab)
  );
  renderSection();
  if (anchorId) {
    requestAnimationFrame(() => {
      setTimeout(() => {
        const el = document.getElementById(anchorId);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    });
  }
}

/* per-category colour helpers */
const CAT_COLOR = {
  lang:'amber', ml:'green', llm:'teal', dev:'pink',
  ops:'orange', sys:'red', data:'purple'
};
const CAT_GLYPHS = {
  lang:'◆', ml:'⬡', llm:'◈', dev:'▪', ops:'■', sys:'▣', data:'◉'
};
const CAT_CSS_COLORS = {
  lang:'var(--amber)', ml:'var(--green)', llm:'var(--teal)',
  dev:'var(--pink)', ops:'var(--orange)', sys:'var(--red)', data:'var(--purple)'
};
const CAT_BORDER = {
  lang:'var(--amber-dim)', ml:'var(--green-dim)', llm:'var(--teal-dim)',
  dev:'var(--pink-dim)', ops:'var(--orange-dim)', sys:'var(--red-dim)', data:'var(--purple-dim)'
};

/* ── HOME ── */
function renderHome(DATA, activeSkillFilter) {
  const p   = DATA.personal;
  const ini = p.name.split(' ').map(w => w[0]).join('');

  const statsData = computeStats(DATA);
  const statItems = [
    ...(p.stats || []).map(s => ({ ...s, anchor: null })),
    { number: statsData.yoe, label: 'Yrs Exp', tab: 'HOME', anchor: 'section-experience' },
  ];
  const stats = statItems.map(s => `
    <div class="stat-box stat-clickable" onclick="switchTab('${s.tab}'${s.anchor ? `,'${s.anchor}'` : ''})" title="View ${s.label}">
      <span class="stat-num">${esc(s.number)}</span>
      <div class="stat-lbl">${esc(s.label)}</div>
    </div>`).join('');

  const focus = p.focusAreas.map(f => `
    <div class="focus-card">
      <span class="focus-glyph">${f.glyph}</span>
      <div class="focus-title">${esc(f.title)}</div>
      <div class="focus-desc">${esc(f.desc)}</div>
    </div>`).join('');

  const exp = DATA.experience.map(e => `
    <div class="timeline-item">
      <div class="timeline-dot"></div>
      <div>
        <div class="tl-header">
          <span class="tl-title">${esc(e.title)}</span>
          <span class="tl-date">${esc(e.period)}</span>
        </div>
        <div class="tl-company">&gt; ${esc(e.company)}</div>
        <div class="tl-desc">${esc(e.description)}</div>
        ${e.highlights ? `<ul class="tl-list">${e.highlights.map(h => `<li>${esc(h)}</li>`).join('')}</ul>` : ''}
        <div class="tag-row">${tags(e.skills, 'cyan')}</div>
      </div>
    </div>`).join('');

  const edu = DATA.education.map(e => `
    <div class="timeline-item">
      <div class="timeline-dot"></div>
      <div>
        <div class="tl-header">
          <span class="tl-title">${esc(e.title)}</span>
          <span class="tl-date">${esc(e.period)}</span>
        </div>
        <div class="tl-company">&gt; ${esc(e.company)}</div>
        <div class="tl-desc">${esc(e.description)}</div>
        <div class="tag-row">${tags(e.skills)}</div>
      </div>
    </div>`).join('');

  return `
    <div class="panel stagger">
      <div class="pt"><span class="pg">☽</span> PROFILE.SYS</div>
      <div class="profile-wrap">
        <div class="avatar">${esc(ini)}</div>
        <div>
          <div class="profile-name">${esc(p.name)}<span class="cursor"></span></div>
          <div class="profile-role">&gt;&gt; ${esc(p.title)} &nbsp;·&nbsp; ${esc(p.subtitle)}</div>
          <div class="profile-desc">${esc(p.description)}</div>
          <a class="cv-btn" href="${esc(DATA.resume)}" target="_blank" rel="noopener">[ ↓ DOWNLOAD CV ]</a>
        </div>
      </div>
    </div>

    <div class="stats-row stagger">${stats}</div>

    <div class="panel stagger">
      <div class="pt"><span class="pg">◈</span> FOCUS_AREAS.DAT</div>
      <div class="focus-grid">${focus}</div>
    </div>

    <div class="panel stagger" id="section-experience">
      <div class="pt"><span class="pg">▣</span> EXPERIENCE.LOG</div>
      ${prompt('cat', './experience/*.log')}
      <div>${exp}</div>
    </div>

    <div class="panel stagger">
      <div class="pt"><span class="pg">▣</span> EDUCATION.LOG</div>
      ${prompt('cat', './education/*.log')}
      <div>${edu}</div>
    </div>`;
}

/* ── SKILLS ── */
function renderSkills(DATA, activeSkillFilter) {
  const cats = DATA.skillCategories;

  const filterBtns = [
    `<button class="sf-btn ${activeSkillFilter==='all'?'active-filter':''}" data-cat="all">ALL</button>`,
    ...Object.entries(cats).map(([k, v]) => {
      const active = activeSkillFilter === k;
      const style = active
        ? `style="color:${CAT_CSS_COLORS[k]};border-color:${CAT_BORDER[k]};background:rgba(0,0,0,0.3);"`
        : `style="border-color:${CAT_BORDER[k]};"`;
      return `<button class="sf-btn ${active?'active-filter':''}" data-cat="${k}" ${style}>${esc(v.label.toUpperCase())}</button>`;
    })
  ].join('');

  const chip = s => {
      const flickerN = Math.random() < 0.30 ? Math.ceil(Math.random()*4) : 0;
      const flickerCls = flickerN ? ` flicker-${flickerN}` : '';
      const dur  = (3 + Math.random()*6).toFixed(1) + 's';
      const delay= (Math.random()*8).toFixed(1) + 's';
      const style= flickerN ? ` style="--flicker-dur:${dur};--flicker-delay:${delay}"` : '';
      return `
        <div class="skill-chip cat-${esc(s.cat)}${flickerCls}"${style}>
          <span class="glph">${CAT_GLYPHS[s.cat] || '◆'}</span>
          ${esc(s.name)}
        </div>`;
  };
  const grid = list => `<div class="skills-grid stagger">${list.map(chip).join('')}</div>`;
  const body = activeSkillFilter === 'all'
    ? Object.entries(cats).map(([k, v]) => {
        const list = DATA.skills.filter(s => s.cat === k);
        return list.length ? `<div class="skill-group-title cat-${k}">${esc(v.label)} <small>${list.length}</small></div>${grid(list)}` : '';
      }).join('')
    : grid(DATA.skills.filter(s => s.cat === activeSkillFilter));

  return `
    <div class="panel">
      <div class="pt"><span class="pg">◆</span> SKILLS.DAT <small>— ${DATA.skills.length} modules</small></div>
      ${prompt('ls', '-la ./skills/ --sort=category')}
      <div class="skill-filters" id="skill-filters">${filterBtns}</div>
      <div id="skills-grid">${body}</div>
    </div>`;
}

/* ── PROJECTS ── */
function renderProjects(DATA) {
  const cards = DATA.projects.map(p => {
    const isPublic = p.link && p.link.trim() !== '';
    const statusLabel = isPublic ? 'PUBLIC' : 'PRIVATE';
    const statusClass = isPublic ? 'public' : 'private';
    const cardAttrs = isPublic
      ? `class="proj-card proj-card-clickable" onclick="window.open('${esc(p.link)}','_blank','noopener')" title="Open repository" role="link" tabindex="0"`
      : `class="proj-card proj-card-private"`;
    return `
    <div ${cardAttrs}>
      <div class="proj-header">
        <div class="proj-title">◈ ${esc(p.title)}</div>
        <span class="proj-status ${statusClass}">${statusLabel}</span>
      </div>
      <div class="proj-desc">${esc(p.description)}</div>
      <div class="proj-footer">
        <div class="tag-row">${tags(p.technologies, 'amber')}</div>
      </div>
    </div>`;
  }).join('');

  return `
    <div class="panel">
      <div class="pt"><span class="pg">◈</span> PROJECTS.DIR <small>— ${DATA.projects.length} entries</small></div>
      ${prompt('find', './projects -maxdepth 1 -type d')}
      <div class="proj-grid stagger">${cards}</div>
    </div>`;
}

/* ── BLOG ── */
function renderBlog(DATA) {
  const pubs = DATA.publications.map(p => `
    <div class="pub-card pub-card-clickable" onclick="window.open('${esc(p.link)}','_blank','noopener')" title="Read article" role="link" tabindex="0">
      <div class="pub-card-header">
        <div class="pub-title" style="flex:1">${esc(p.title)}</div>
        <span class="pub-read-badge">READ →</span>
      </div>
      <div class="pub-meta">
        <span class="m-hi">${esc(p.platform)}</span> &nbsp;·&nbsp;
        ${esc(p.date)} &nbsp;·&nbsp;
        <span class="m-hi">${esc(p.readTime)}</span>
      </div>
      <div class="pub-desc">${esc(p.description)}</div>
      <div class="pub-footer">
        <div class="tag-row">${tags(p.tags, 'pink')}</div>
      </div>
    </div>`).join('');

  const achs = DATA.achievements.map(a => `
    <div class="ach-card">
      <span class="ach-glyph">★</span>
      <div class="ach-body">
        <div class="ach-title">${esc(a.title)}</div>
        <div class="ach-meta">${esc(a.org)} &mdash; ${esc(a.date)}</div>
      </div>
    </div>`).join('');

  return `
    <div class="panel">
      <div class="pt"><span class="pg">◉</span> PUBLICATIONS.RSS</div>
      ${prompt('curl', `-s ${DATA.contact.medium} | parse --feed`)}
      <div class="stagger" style="display:flex;flex-direction:column;gap:10px">${pubs}</div>
    </div>
    <div class="panel">
      <div class="pt"><span class="pg">★</span> ACHIEVEMENTS.LOG</div>
      <div class="stagger" style="display:flex;flex-direction:column;gap:6px">${achs}</div>
    </div>`;
}

/* ── WORKSHOPS ── */
function renderWorkshops(DATA) {
  const cards = DATA.workshops.map(w => `
    <div class="ws-card ws-card-clickable" onclick="window.open('${esc(w.link)}','_blank','noopener')" title="Open repository" role="link" tabindex="0">
      <div class="ws-card-header">
        <div class="ws-title" style="flex:1">▣ ${esc(w.title)}</div>
        <span class="ws-public-badge">PUBLIC</span>
      </div>
      <div class="ws-desc">${esc(w.description)}</div>
      <div class="ws-footer">
        <div class="tag-row">${tags(w.topics, 'purple')}</div>
      </div>
    </div>`).join('');

  const talks = (DATA.talks || []).map(t => `
    <div class="ach-card talk-card">
      <span class="ach-glyph">▸</span>
      <div class="ach-body">
        <div class="ach-title">${esc(t.title)}</div>
        <div class="ach-meta">${esc(t.org)}${t.date ? ` &mdash; ${esc(t.date)}` : ''}</div>
      </div>
    </div>`).join('');

  return `
    <div class="panel">
      <div class="pt"><span class="pg">▣</span> WORKSHOPS.REPO</div>
      ${prompt('git', 'clone --depth=1 workshops/')}
      <div class="stagger" style="display:flex;flex-direction:column;gap:10px">${cards}</div>
    </div>
    <div class="panel">
      <div class="pt"><span class="pg">▸</span> TALKS.LOG <small>— ${(DATA.talks || []).length} sessions</small></div>
      <div class="stagger" style="display:flex;flex-direction:column;gap:6px">${talks}</div>
    </div>`;
}

/* ── CONTACT ── */
function renderContact(DATA) {
  const c = DATA.contact;
  const rows = [
    { icon:'@',   label:'EMAIL',    val: c.email,    href: `https://mail.google.com/mail/?view=cm&to=${c.email}` },
    { icon:'⌖',   label:'LOCATION', val: c.location, href: null },
    { icon:'in',  label:'LINKEDIN', val: c.linkedin.replace('https://www.linkedin.com/in/', 'linkedin/').replace(/\/$/, ''), href: c.linkedin },
    { icon:'{}',  label:'GITHUB',   val: c.github.replace('https://github.com/', 'github/'),  href: c.github },
    { icon:'↓',   label:'RESUME',   val: 'Download CV (PDF)', href: DATA.resume },
  ].map(r => `
    <div class="contact-row">
      <div class="contact-icon">${r.icon}</div>
      <div>
        <div class="contact-label">${r.label}</div>
        ${r.href
          ? `<a href="${esc(r.href)}" target="_blank" rel="noopener" class="contact-val">${esc(r.val)}</a>`
          : `<div class="contact-val">${esc(r.val)}</div>`}
      </div>
    </div>`).join('');

  return `
    <div class="panel">
      <div class="pt"><span class="pg">☾</span> CONTACT.SH</div>
      ${prompt('./reach_out.sh', '--mode=collaborate')}
      <div class="contact-intro">${esc(c.intro)}</div>
      <div class="contact-list stagger">${rows}</div>
    </div>`;
}

/* ── FOOTER ── */
function renderFooter(DATA) {
  const p = DATA.personal;
  const c = DATA.contact;
  const handle = p.handle || p.name.toLowerCase().replace(' ', '.');
  return `
    <span>${esc(handle.toUpperCase())}</span> &nbsp;·&nbsp;
    <span style="color:var(--teal)">${esc(p.title)} · ${esc(c.location)}</span> &nbsp;·&nbsp;
    <a href="https://mail.google.com/mail/?view=cm&to=${esc(c.email)}" target="_blank" rel="noopener">contact</a> &nbsp;·&nbsp;
    <a href="${esc(c.github)}" target="_blank" rel="noopener">github</a>`;
}

function renderSidebar(DATA) {
  const c = DATA.contact;
  const p = DATA.personal;

  const navLinks = [
    { label:'GitHub',   href: c.github },
    { label:'LinkedIn', href: c.linkedin },
    { label:'Medium',   href: c.medium },
    { label:'Resume',   href: DATA.resume },
    { label:'E-mail',   href: `https://mail.google.com/mail/?view=cm&to=${c.email}` },
  ].map(l => `
    <a class="sb-link" href="${esc(l.href)}" target="_blank" rel="noopener">
      <span class="arr">›</span> ${esc(l.label)}
    </a>`).join('');

  const currentJob = DATA.experience.find(e => /present/i.test(e.period));

  const recentPubs = DATA.publications.slice(0, 2).map(pub => `
    <div class="sb-recent-pub">
      <div class="sb-pub-title">${pub.title.length > 52 ? esc(pub.title.substring(0,52))+'…' : esc(pub.title)}</div>
      <div class="sb-pub-meta">${esc(pub.date)} · ${esc(pub.readTime)}</div>
    </div>`).join('');

  return `
    <div class="panel">
      <div class="sb-title">★ LINKS</div>
      ${navLinks}
    </div>

    <div class="panel">
      <div class="sb-title">◉ STATUS</div>
      <div class="sb-status-lines">
        &gt; Working at <span class="hi">${esc(currentJob?.company ?? 'CDAC Pune')}</span><br>
        &gt; Building <span class="hi">AI/ML</span> systems<br>
        &gt; Open to <span class="hi2">collab</span><br>
        &gt; Writing on <span class="hi2">Medium</span>
      </div>
    </div>

    <div class="panel">
      <div class="sb-title" id="phase-panel-title">☽ PHASE</div>
      <div class="moon-wrap" id="phase-wrap">
        <span class="moon-glyph" id="phase-glyph">☾</span>
        <div class="moon-label"><span id="phase-label">Waning Crescent</span><br><span id="sb-clock" style="color:var(--teal)"></span></div>
      </div>
    </div>

    <div class="panel">
      <div class="sb-title">◈ RECENT POSTS</div>
      ${recentPubs}
    </div>

    <div class="panel">
      <div class="sb-title">▪ QUICK FACTS</div>
      <div class="sb-status-lines">
        ◆ ${esc(c.location)}<br>
        ◆ AI &amp; HPC enthusiast<br>
        ◆ Driven, Focused, Relentless<br>
        ◆ Writes on Medium
      </div>
    </div>`;
}
