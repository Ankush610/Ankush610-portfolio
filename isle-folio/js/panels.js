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
// webfonts that arrive late: repaint everything once
document.fonts && document.fonts.ready.then(() => allPanels.forEach(p => p.redraw()));

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
