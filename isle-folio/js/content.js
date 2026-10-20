/* Plain-HTML copy of the content: read by screen readers, shown on its own when the 3D world can't run. */
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const lnk = (u, t) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a>`;

export function renderContent(DATA){
  const P = DATA.personal, K = DATA.contact, li = a => `<ul>${a.map(x => `<li>${x}</li>`).join('')}</ul>`;
  document.getElementById('content').innerHTML = `
  <h1>${esc(P.name)}</h1><p>${esc(P.title)} · ${esc(P.subtitle)}</p><p>${esc(P.description)}</p>
  <h2>Focus areas</h2>${li(P.focusAreas.map(f => `<b>${esc(f.title)}</b>: ${esc(f.desc)}`))}
  <h2>Experience</h2>${DATA.experience.map(e => `<h3>${esc(e.title)}, ${esc(e.company)} (${esc(e.period)})</h3><p>${esc(e.description)}</p>${li(e.highlights.map(esc))}`).join('')}
  <h2>Education</h2>${li(DATA.education.map(e => `<b>${esc(e.title)}</b>, ${esc(e.company)} (${esc(e.period)}). ${esc(e.description)}`))}
  <h2>Projects</h2>${li(DATA.projects.map(p => `<b>${esc(p.title)}</b>: ${esc(p.description)} <i>${esc(p.technologies.join(', '))}</i>. ${p.link ? lnk(p.link, 'Source code') : 'Private.'}`))}
  <h2>Skills</h2>${li(Object.entries(DATA.skillCategories).map(([k, c]) => `<b>${esc(c.label)}</b>: ${esc(DATA.skills.filter(s => s.cat === k).map(s => s.name).join(', '))}`))}
  <h2>Writing</h2>${li(DATA.publications.map(b => `${lnk(b.link, b.title)} (${esc(b.platform)}, ${esc(b.date)}, ${esc(b.readTime)}): ${esc(b.description)}`))}
  <h2>Teaching</h2>${li(DATA.workshops.map(w => `${lnk(w.link, w.title)}: ${esc(w.description)}`))}
  <h3>Talks and sessions</h3>${li(DATA.talks.map(t => `${esc(t.title)}, ${esc(t.org)}${t.date ? ' (' + esc(t.date) + ')' : ''}`))}
  <h3>Recognition</h3>${li(DATA.achievements.map(a => `${esc(a.title)}, ${esc(a.org)} (${esc(a.date)})`))}
  ${(DATA.extracurricular || []).length ? `<h3>Extracurriculars</h3>${li(DATA.extracurricular.map(x => `${esc(x.title)}${x.org || x.role ? ', ' + esc(x.org || x.role) : ''}${x.date ? ' (' + esc(x.date) + ')' : ''}${x.description ? ': ' + esc(x.description) : ''}`))}` : ''}
  <h2>Contact</h2><p>${esc(K.intro)}</p>${li([`Email: <a href="mailto:${esc(K.email)}">${esc(K.email)}</a>`, K.linkedin && lnk(K.linkedin, 'LinkedIn'), K.github && lnk(K.github, 'GitHub'), K.medium && lnk(K.medium, 'Medium'), DATA.resume && lnk(DATA.resume, 'Résumé (PDF)'), esc(K.location)].filter(Boolean))}`;
}

export function showFail(msg){
  const l = document.getElementById('loader'); l.classList.remove('done'); l.textContent = msg;
  document.body.classList.add('fallback');
}
