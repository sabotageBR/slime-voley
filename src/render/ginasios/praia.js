// Ginasio 1: Praia do Saque. Fundo distante (arte do Grok, assada e com desfoque de
// profundidade, em paralaxe 0,25; sem ela, o ceu, o mar e a ilha em codigo), biruta que mostra o
// vento, pipas, caranguejo e a arquibancada de madeira atras da quadra. Px CSS na tela inteira.

import { paraTela } from '../camera.js';
import { TINTA } from '../fundo.js';

const h = (k) => { const s = Math.sin(k * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

/** Paletas do fundo em codigo por direcao (A gel, B vinil, C TV). */
const PAL = {
  a: { ceu: ['#53c3ff', '#9fe0ff', '#e4f8ff'], mar: ['#1f97d4', '#35b6e3', '#63d7ee'], areia: '#fbe3a6', sol: '#ffd23a' },
  b: { ceu: ['#6ec8ff', '#b4e6ff', '#fff1d6'], mar: ['#1aa3c9', '#3cc3d9', '#7fe1e6'], areia: '#ffe2a8', sol: '#ffb43a' },
  c: { ceu: ['#0d1b3d', '#1b3570', '#2f5aa8'], mar: ['#0b2a5a', '#103a75', '#174b8f'], areia: '#1e3f7a', sol: '#ffd23a' },
};

/** Nuvem chapada (px CSS). */
function nuvem(ctx, x, y, r, tr, cor = '#ffffff') {
  ctx.beginPath();
  ctx.moveTo(x - r * 2.2, y);
  ctx.arc(x - r * 1.2, y, r * 0.9, Math.PI, Math.PI * 1.75);
  ctx.arc(x, y - r * 0.35, r * 1.15, Math.PI * 1.15, Math.PI * 1.9);
  ctx.arc(x + r * 1.25, y, r * 0.85, Math.PI * 1.3, 0);
  ctx.lineTo(x + r * 2.1, y);
  ctx.closePath();
  ctx.fillStyle = cor;
  ctx.fill();
  if (tr) {
    ctx.lineWidth = tr;
    ctx.strokeStyle = TINTA;
    ctx.stroke();
  }
}

/**
 * Fundo da praia (tela inteira, px CSS).
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('../camera.js').Camera} cam
 * @param {number} dpr @param {number} W @param {number} H @param {number} t
 * @param {{ id: string }} est
 * @param {{ arte?: CanvasImageSource|null, vento?: number, lotacao?: number }} o
 */
export function desenharFundo(ctx, cam, dpr, W, H, t, est, o = {}) {
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const P = PAL[est.id] || PAL.a;
  const u = cam.s;
  const yChao = paraTela(cam, 0, 0)[1];
  const yH = paraTela(cam, 0, 7.2)[1];
  const tr = est.id === 'c' ? 0 : Math.max(1.4, Math.min(2.6, u * 0.07));
  if (o.arte) {
    // fundo distante em paralaxe 0,25 (cobre a tela ate o chao)
    const img = /** @type {any} */ (o.arte);
    const iw = img.width || 1;
    const ih = img.height || 1;
    const alvoH = Math.max(yChao + u * 0.6, H * 0.55);
    const esc = Math.max(W * 1.15 / iw, alvoH / ih);
    const w = iw * esc;
    const hh = ih * esc;
    const px = (W - w) / 2 - (cam.cx * u) * 0.25;
    const py = yChao + u * 0.6 - hh + (cam.cy - 8) * u * 0.25 * 0.4;
    ctx.drawImage(img, px, py, w, hh);
    if (py > 0) {
      ctx.fillStyle = P.ceu[0];
      ctx.fillRect(0, 0, W, py + 1);
    }
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, yH);
    g.addColorStop(0, P.ceu[0]);
    g.addColorStop(0.7, P.ceu[1]);
    g.addColorStop(1, P.ceu[2]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, yH + 1);
    if (est.id === 'c') {
      // TV: estrelas e o halo dos refletores
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      for (let k = 0; k < 40; k++) ctx.fillRect(h(k) * W, h(k + 9) * yH * 0.8, 1.5, 1.5);
      for (const fx of [0.12, 0.88]) {
        const rg = ctx.createRadialGradient(W * fx, yH * 0.25, 2, W * fx, yH * 0.25, u * 6);
        rg.addColorStop(0, 'rgba(255,250,220,0.75)');
        rg.addColorStop(1, 'rgba(255,250,220,0)');
        ctx.fillStyle = rg;
        ctx.fillRect(0, 0, W, yH);
      }
    } else {
      const [sx, sy] = paraTela(cam, 9.5, 13.5);
      const rs = Math.max(16, u * 1.35);
      ctx.fillStyle = 'rgba(255, 244, 170, 0.5)';
      ctx.beginPath();
      ctx.arc(sx, sy, rs * (1.55 + 0.05 * Math.sin(t * 2)), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = P.sol;
      ctx.beginPath();
      ctx.arc(sx, sy, rs, 0, Math.PI * 2);
      ctx.fill();
      if (tr) { ctx.lineWidth = tr; ctx.strokeStyle = TINTA; ctx.stroke(); }
      const [xe] = paraTela(cam, -24, 0);
      const [xd] = paraTela(cam, 24, 0);
      const vao = Math.max(W + u * 8, xd - xe);
      for (let k = 0; k < 4; k++) {
        const r = Math.max(9, u * (0.7 + h(k) * 0.4));
        const x = ((h(k + 3) * vao + t * u * (0.22 + h(k + 7) * 0.2)) % vao) - u * 4;
        const y = paraTela(cam, 0, 10 + h(k + 11) * 5)[1];
        nuvem(ctx, x, y, r, tr * 0.8);
      }
    }
    // mar em faixas
    const yB = paraTela(cam, 0, 4.2)[1];
    ctx.fillStyle = P.mar[0];
    ctx.fillRect(0, yH, W, yB - yH + 1);
    const f = (yB - yH) / 3;
    ctx.fillStyle = P.mar[1];
    ctx.fillRect(0, yH + f, W, yB - yH - f + 1);
    ctx.fillStyle = P.mar[2];
    ctx.fillRect(0, yH + f * 2, W, yB - yH - f * 2 + 1);
    if (tr) { ctx.fillStyle = TINTA; ctx.fillRect(0, yH - tr * 0.4, W, tr * 0.8); }
    // marolas
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = Math.max(1.4, u * 0.06);
    ctx.beginPath();
    for (let k = 0; k < 16; k++) {
      const wy = yH + (0.25 + h(k + 40) * 0.6) * (yB - yH);
      const wx = (h(k + 20) * (W + u * 4) + Math.sin(t * 0.8 + k) * u * 0.4) % (W + u * 4) - u * 2;
      const l = u * (0.35 + h(k + 60) * 0.45);
      ctx.moveTo(wx - l, wy);
      ctx.quadraticCurveTo(wx, wy - u * 0.14, wx + l, wy);
    }
    ctx.stroke();
    // areia do fundo ate o chao
    ctx.fillStyle = P.areia;
    ctx.fillRect(0, yB, W, yChao - yB + 1);
  }
  ctx.restore();
}

/**
 * Arquibancada de madeira atras da quadra (px CSS) e os slimes da plateia em cima dela.
 * Chamada depois do fundo, antes do piso.
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('../camera.js').Camera} cam
 * @param {number} dpr @param {number} W @param {number} t
 * @param {{ id: string }} est
 */
export function desenharArquibancada(ctx, cam, dpr, W, t, est) {
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const u = cam.s;
  const yChao = paraTela(cam, 0, 0)[1];
  const tr = est.id === 'c' ? 1 : Math.max(1.2, Math.min(2.4, u * 0.065));
  const degraus = 3;
  const alt = u * 0.9;
  const cor = est.id === 'c' ? ['#13285a', '#183268'] : est.id === 'b' ? ['#ff9f5a', '#ffb877'] : ['#c98a52', '#dba06a'];
  for (let k = degraus - 1; k >= 0; k--) {
    const y = yChao - alt * (k + 1) - u * 0.15;
    ctx.fillStyle = cor[k % 2];
    ctx.fillRect(0, y, W, alt + 1);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(0, y + alt - 3, W, 3);
    if (tr) {
      ctx.fillStyle = TINTA;
      ctx.fillRect(0, y - tr / 2, W, tr);
    }
  }
  ctx.restore();
}

/** Biruta (o vento: o pano estica e aponta). Em u. */
export function desenharBiruta(ctx, x, y, vento, t, tr) {
  ctx.lineWidth = tr;
  ctx.strokeStyle = TINTA;
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, y);
  ctx.stroke();
  const k = Math.min(1, Math.abs(vento) / 1.5);
  const dir = vento >= 0 ? 1 : -1;
  const comp = 0.5 + 0.9 * k;
  const queda = (1 - k) * 0.5;
  for (let s = 0; s < 4; s++) {
    const a = s / 4;
    const b = (s + 1) / 4;
    const on = Math.sin(t * 6 + s) * 0.04 * k;
    ctx.fillStyle = s % 2 ? '#ffffff' : '#ff5a3a';
    ctx.beginPath();
    ctx.moveTo(x + dir * comp * a, y - queda * a + 0.18 * (1 - a * 0.4) + on);
    ctx.lineTo(x + dir * comp * b, y - queda * b + 0.18 * (1 - b * 0.4) + on);
    ctx.lineTo(x + dir * comp * b, y - queda * b - 0.18 * (1 - b * 0.4) + on);
    ctx.lineTo(x + dir * comp * a, y - queda * a - 0.18 * (1 - a * 0.4) + on);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}
