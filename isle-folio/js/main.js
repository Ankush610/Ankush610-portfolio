/* Entry point: load content, render the plain-text mirror, then boot the 3D world. */
import { loadData } from './data.js';
import { renderContent, showFail } from './content.js';

const FONTS = ['400 40px "Young Serif"', '400 20px Figtree', '600 20px Figtree', '700 20px Figtree', '500 14px "JetBrains Mono"', '700 14px "JetBrains Mono"'];
const fontsReady = () => Promise.race([
  Promise.all(FONTS.map(f => document.fonts.load(f))).catch(() => {}),
  new Promise(r => setTimeout(r, 2500))
]);

// errors before the world is up → show the plain-text portfolio instead of a black screen
window.addEventListener('error', e => { if(!window.__worldOk) showFail(`The 3D world could not start (${e.message || 'unknown error'}). Here is the portfolio as plain text.`); });

async function boot(){
  let data;
  // ?data=draft.json previews another content file without touching data.json
  try { data = await loadData(new URLSearchParams(location.search).get('data') || 'data.json'); }
  catch(e){ console.error(e); showFail('Could not load data.json. Serve this folder over HTTP (see README) instead of opening the file directly.'); return; }
  renderContent(data);
  document.title = `Isle Folio — ${data.personal.name}`;

  if(!window.THREE){ showFail('The 3D engine did not load. Here is the portfolio as plain text.'); return; }
  await fontsReady();
  const [{ initEngine }, { buildWorld }, { startApp }] = await Promise.all([import('./engine.js'), import('./world/build.js'), import('./app.js')]);
  try { initEngine(document.getElementById('world')); }
  catch(e){ showFail('Your browser has WebGL turned off, so the 3D world cannot draw. Here is the portfolio as plain text.'); return; }
  startApp(buildWorld());
  window.__worldOk = true;
  setTimeout(() => document.getElementById('loader').classList.add('done'), 350);
}

boot().catch(e => { console.error(e); showFail(`The 3D world could not start (${e.message}). Here is the portfolio as plain text.`); });
