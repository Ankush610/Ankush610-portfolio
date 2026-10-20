/* Canvas-drawn text panels: every readable thing in the world is a texture drawn here. */
import { THREE } from './engine.js';
import * as engine from './engine.js';

/* ---------- Canvas-text panels (all readable content is drawn into textures) ---------- */
export const FD = '"Young Serif", Georgia, serif', FB = 'Figtree, system-ui, sans-serif', FM = '"JetBrains Mono", ui-monospace, monospace';
export const COL = {ink:'#ece7da', muted:'#9aa4bd', ember:'#f0b54a', moss:'#8fc27e', line:'rgba(173,186,222,.22)', paperInk:'#2a2219', brown:'#9a5c1c'};
export const CAT = {amber:'#f0b54a', green:'#8fc27e', cyan:'#6fd3e6', pink:'#e891bd', orange:'#f2925a', red:'#ec6f66', purple:'#b296f0'};
const allPanels = [];
// 1 world unit = 100 logical canvas px
export function canvasTex(w, h, draw){
  const W = w*100, H = h*100, s = Math.min(2.2, 2048/Math.max(W, H));
  const c = document.createElement('canvas'); c.width = Math.ceil(W*s); c.height = Math.ceil(H*s);
  const ctx = c.getContext('2d'), tex = new THREE.CanvasTexture(c);
  tex.anisotropy = engine.ANISO;
  const rec = {tex, state:{}};
  rec.redraw = (st = rec.state) => { rec.state = st; ctx.setTransform(s,0,0,s,0,0); ctx.clearRect(0,0,W,H); ctx.textBaseline = 'top'; ctx.textAlign = 'left'; draw(ctx, W, H, st); tex.needsUpdate = true; };
  rec.redraw({}); allPanels.push(rec);
  return rec;
}
export function panel(w, h, draw){
  const p = canvasTex(w, h, draw);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({map:p.tex, transparent:true}));
  m.userData.panel = p;
  return m;
}
export const setPanel = (m, patch) => m.userData.panel.redraw(Object.assign({}, m.userData.panel.state, patch));
// webfonts that arrive late: repaint everything once. EB Garamond is only used on canvases, so it's asked for explicitly
document.fonts && document.fonts.ready.then(() => allPanels.forEach(p => p.redraw()));
document.fonts && Promise.all(['400 16px "EB Garamond"', 'italic 400 16px "EB Garamond"', '600 16px "EB Garamond"'].map(f => document.fonts.load(f))).then(() => allPanels.forEach(p => p.redraw()), () => {});

export function rr(ctx, x, y, w, h, r){ ctx.beginPath(); ctx.moveTo(x+r, y); ctx.arcTo(x+w, y, x+w, y+h, r); ctx.arcTo(x+w, y+h, x, y+h, r); ctx.arcTo(x, y+h, x, y, r); ctx.arcTo(x, y, x+w, y, r); ctx.closePath(); }
export function wrap(ctx, text, maxW){
  const lines = []; let line = '';
  for(const w of String(text).split(/\s+/)){ const t = line ? line + ' ' + w : w; if(line && ctx.measureText(t).width > maxW){ lines.push(line); line = w; } else line = t; }
  if(line) lines.push(line); return lines;
}
export function para(ctx, text, x, y, maxW, lh, max){
  let lines = wrap(ctx, text, maxW);
  if(max && lines.length > max){ lines = lines.slice(0, max); lines[max-1] = lines[max-1].replace(/\s*\S*$/, '') + '…'; }
  lines.forEach((l, i) => ctx.fillText(l, x, y + i*lh)); return y + lines.length*lh;
}
export function clip(ctx, text, maxW){ if(ctx.measureText(text).width <= maxW) return text; while(text.length > 1 && ctx.measureText(text + '…').width > maxW) text = text.slice(0, -1); return text + '…'; }
export function fitFont(ctx, text, maxW, size, weight, fam, min=10){ do { ctx.font = `${weight} ${size}px ${fam}`; } while(ctx.measureText(text).width > maxW && --size > min); }
export function pills(ctx, tags, x, y, maxW, color, size=13){
  const h = size + 11, gap = 6; let cx = x, cy = y;
  ctx.font = `600 ${size}px ${FM}`;
  tags.forEach(t => {
    const tw = ctx.measureText(t).width + 16;
    if(cx + tw > x + maxW && cx > x){ cx = x; cy += h + gap; }
    rr(ctx, cx, cy, tw, h, 6); ctx.lineWidth = 1.5; ctx.strokeStyle = color; ctx.stroke();
    ctx.fillStyle = color; ctx.fillText(t, cx + 8, cy + 6); cx += tw + gap;
  });
  return cy + h;
}
export function card(ctx, W, H, st, o={}){
  const i = 6; rr(ctx, i, i, W - i*2, H - i*2, o.r ?? 16);
  ctx.fillStyle = o.bg || 'rgba(13,19,36,.95)'; ctx.fill();
  if(st.focus){ ctx.save(); ctx.shadowColor = 'rgba(240,181,74,.9)'; ctx.shadowBlur = 12; ctx.lineWidth = 4; ctx.strokeStyle = COL.ember; ctx.stroke(); ctx.restore(); }
  else { ctx.lineWidth = o.lw || 2; ctx.strokeStyle = o.border || COL.line; ctx.stroke(); }
}
export function eyebrow(ctx, text, x, y, color=COL.ember, size=13){ ctx.font = `700 ${size}px ${FM}`; ctx.fillStyle = color; ctx.fillText(String(text).toUpperCase(), x, y); }
export const shortUrl = u => u.replace(/^https?:\/\/(www\.)?/, '').replace(/\.git$/, '').replace(/\/$/, '');
export function openLink(u){ window.open(u, '_blank', 'noopener'); }

// book pages: an old-style face for the text, warm ink, a red for drop caps, a faded brown for running heads and rules
export const FP = '"EB Garamond", Georgia, serif', INK = '#2b2119', RED = '#8a2a1e', SEP = '#8c7556';
/* printed-page helpers (canvas px): the Lorehall's book pages and the Hearthstone's lectern leaves */
export function paper(ctx, W, H, k){   // aged stock, darker to the edges, a few foxing spots fixed per page so redraws don't shimmer
  ctx.fillStyle = '#efe4c8'; ctx.fillRect(0, 0, W, H);
  const e = ctx.createRadialGradient(W/2, H/2, Math.min(W, H)*0.35, W/2, H/2, Math.max(W, H)*0.75);
  e.addColorStop(0, 'rgba(120,90,50,0)'); e.addColorStop(1, 'rgba(120,90,50,.3)'); ctx.fillStyle = e; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(140,100,50,.13)';
  for(let i=0;i<14;i++){ const h = n => Math.abs(Math.sin((i + 1)*(k + 3)*n)*43758.5453 % 1); ctx.beginPath(); ctx.arc(h(12.99)*W, h(78.23)*H, 1 + h(39.4)*3, 0, 7); ctx.fill(); }
}
export function rules(ctx, W, H, on){   // printed double frame; gilt when the book has focus
  ctx.strokeStyle = on ? '#b07a22' : 'rgba(110,80,50,.42)';
  ctx.lineWidth = on ? 2.5 : 1; ctx.strokeRect(12, 12, W - 24, H - 24);
  ctx.lineWidth = on ? 1.2 : 0.6; ctx.strokeRect(16.5, 16.5, W - 33, H - 33);
}
export function fleuron(ctx, cx, y, w, color){   // rule — lozenge — rule, with a dot at each end
  ctx.strokeStyle = ctx.fillStyle = color; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(cx - w/2, y); ctx.lineTo(cx - 8, y); ctx.moveTo(cx + 8, y); ctx.lineTo(cx + w/2, y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, y - 4); ctx.lineTo(cx + 5, y); ctx.lineTo(cx, y + 4); ctx.lineTo(cx - 5, y); ctx.closePath(); ctx.fill();
  [-1, 1].forEach(s => { ctx.beginPath(); ctx.arc(cx + s*(w/2 + 3), y, 1.5, 0, 7); ctx.fill(); });
}
export function caps(ctx, text, x, y, size, color, maxW){   // letterspaced small capitals
  ctx.font = `600 ${size}px ${FP}`; ctx.fillStyle = color; ctx.letterSpacing = '1.5px';
  ctx.fillText(maxW ? clip(ctx, text.toUpperCase(), maxW) : text.toUpperCase(), x, y); ctx.letterSpacing = '0px';
}
// gold leaf: a vertical gradient for gilded letters between y0 and y1
export const gilt = (ctx, y0, y1) => { const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, '#f6dc96'); g.addColorStop(0.55, '#d4a548'); g.addColorStop(1, '#9c7128'); return g; };
// wood grain for carved boards (Beacon Point, Oakreach)
export function grain(ctx, W, H, base){
  ctx.fillStyle = base; ctx.fillRect(0, 0, W, H); ctx.strokeStyle = 'rgba(0,0,0,.22)'; ctx.lineWidth = 1;
  for(let i = 0; i*3 < H; i++){ ctx.beginPath(); for(let x = 0; x <= W; x += 16) ctx.lineTo(x, i*3 + Math.sin(x*0.03 + i*0.9)*1.1); ctx.stroke(); }
}
