// Miniatura 2D de um slime vestido (os cartoes do vestiario: skins prontas, padroes, acessorios):
// a cupula na cor do corpo, o padrao aproximado em 2D, a estampa (bandeira, pintura, arquetipo), o
// rosto classico e os acessorios (os mesmos desenhos do jogo: src/render/rostos.js e
// acessorios.js). No jogo a gosma e o shader (src/render/composicao.js); aqui so o retrato.

import { aplicar } from './camera.js';
import { TINTA } from './fundo.js';
import { desenharRostos } from './rostos.js';
import { desenharAcessoriosDe } from './acessorios.js';
import { desenharEstampa, EST_W, EST_H } from './estampas.js';

const R = 2;
let cvTmp = null;

/** Padrao do shader aproximado em 2D, dentro da cupula (coordenadas do mundo, y para cima). */
function padrao2d(g, p, cor2) {
  g.fillStyle = cor2;
  g.strokeStyle = cor2;
  if (p === 1) { for (let y = 0.2; y < 2.2; y += 0.5) for (let x = -2.2 + ((y * 2) % 1) * 0.25; x < 2.2; x += 0.5) { g.beginPath(); g.arc(x, y, 0.1, 0, Math.PI * 2); g.fill(); } }
  else if (p === 2) { g.lineWidth = 0.22; for (let k = -6; k < 6; k++) { g.beginPath(); g.moveTo(k * 0.6 - 2, -0.2); g.lineTo(k * 0.6 + 0.4, 2.4); g.stroke(); } }
  else if (p === 3) { g.lineWidth = 0.14; for (let y = 0.3; y < 2.2; y += 0.55) { g.beginPath(); for (let x = -2.2; x <= 2.2; x += 0.1) g.lineTo(x, y + Math.sin(x * 2.3) * 0.12); g.stroke(); } }
  else if (p === 4) { const s = 0.5; for (let y = 0; y < 2.2; y += s) for (let x = -2.2; x < 2.2; x += s) if ((Math.round((x + 2.2) / s) + Math.round(y / s)) % 2) g.fillRect(x, y, s, s); }
  else if (p === 5 || p === 14) {
    if (p === 14) { const gr = g.createLinearGradient(0, 0, 0, 2); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, cor2); g.globalAlpha = 0.6; g.fillStyle = gr; g.fillRect(-2.2, 0, 4.4, 2.2); g.globalAlpha = 1; g.fillStyle = '#ffffff'; }
    for (const [x, y] of [[-1.2, 0.6], [-0.4, 1.4], [0.6, 0.5], [1.3, 1.1], [0.1, 1.85], [-1.5, 1.3], [1.6, 0.3]]) { g.beginPath(); g.arc(x, y, 0.08, 0, Math.PI * 2); g.fill(); }
  } else if (p === 6) { const gr = g.createLinearGradient(0, 0, 0, 2); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, cor2); g.fillStyle = gr; g.fillRect(-2.2, 0, 4.4, 2.2); }
  else if (p === 7 || p === 11) {
    const cs = ['#ff8ac0', '#ffd23a', '#5c9eff', '#8be66a', '#ffffff', cor2];
    for (let k = 0; k < 26; k++) { const x = -1.9 + ((k * 0.73) % 3.8); const y = 0.15 + ((k * 0.41) % 1.8); g.save(); g.translate(x, y); g.rotate(k); g.fillStyle = cs[k % cs.length]; g.fillRect(-0.12, -0.04, 0.24, 0.08); g.restore(); }
  } else if (p === 8) { for (const [x, y, r] of [[-1, 0.5, 0.35], [0.7, 1.2, 0.42], [1.4, 0.4, 0.25], [-0.3, 1.6, 0.3]]) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); } }
  else if (p === 9) { g.lineWidth = 0.06; for (const [x, y, r] of [[-1, 0.6, 0.25], [0.6, 1.3, 0.3], [1.3, 0.5, 0.2], [-0.4, 1.5, 0.18]]) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke(); } }
  else if (p === 10) { g.lineWidth = 0.06; for (let y = 0.2; y < 2.2; y += 0.42) for (let x = -2.2 + ((y * 2.4) % 1) * 0.3; x < 2.2; x += 0.6) { g.beginPath(); g.arc(x, y, 0.3, Math.PI * 1.05, Math.PI * 1.95, true); g.stroke(); } }
  else if (p === 12) { g.lineWidth = 0.08; for (let k = 0; k < 9; k++) { const a = (k / 9) * Math.PI; g.beginPath(); g.moveTo(0, 0.88); g.lineTo(Math.cos(a) * 2.2, 0.88 + Math.sin(a) * 2.2); g.stroke(); } }
  else if (p === 13) { ['#9b5de5', '#3b8cf2', '#28a55a', '#ffd23a', '#ff8a2a', '#ee3b45'].forEach((c, i) => { g.fillStyle = c; g.fillRect(-2.2, i * (2.1 / 6), 4.4, 2.1 / 6 + 0.01); }); }
  else if (p === 15) { for (let y = 0.15; y < 2.2; y += 0.77) g.fillRect(-2.2, y, 4.4, 0.32); }
  else if (p === 16) g.fillRect(0, -0.1, 2.3, 2.4);
}

/**
 * Desenha o slime vestido no canvas inteiro (px do canvas).
 * @param {CanvasRenderingContext2D} g
 * @param {number} w @param {number} h
 * @param {{ hex: string, padrao: number, cor2: string, estampa: string, cabeca: string, rosto: string, boca: string }} v
 * @param {{ pais?: string, pintura?: CanvasImageSource|null, semRosto?: boolean }} [o]
 */
export function desenharMiniSlime(g, w, h, v, o = {}) {
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, w, h);
  const cam = { s: Math.min(w / 5.0, h / 3.7), cx: 0, cy: 1.4, sx: w / 2, sy: h / 2 };
  aplicar(g, cam, 1);
  const traco = Math.max(0.04, 1.6 / cam.s);
  // sombra
  g.fillStyle = 'rgba(40, 20, 10, 0.18)';
  g.beginPath(); g.ellipse(0, 0, 2.1, 0.22, 0, 0, Math.PI * 2); g.fill();
  // corpo, padrao e estampa dentro da cupula
  g.beginPath(); g.ellipse(0, 0, R, R, 0, 0, Math.PI); g.closePath();
  g.fillStyle = v.hex;
  g.fill();
  g.save();
  g.clip();
  if (v.padrao) padrao2d(g, v.padrao, v.cor2);
  if (v.estampa) {
    if (!cvTmp) { cvTmp = document.createElement('canvas'); cvTmp.width = EST_W; cvTmp.height = EST_H; }
    const gt = cvTmp.getContext('2d');
    if (gt && desenharEstampa(gt, v.estampa, o)) {
      g.save();
      g.translate(-R, R);
      g.scale((2 * R) / EST_W, -R / EST_H);
      g.drawImage(cvTmp, 0, 0);
      g.restore();
    }
  }
  // volume: claro em cima a esquerda, sombra embaixo
  const gr = g.createRadialGradient(-0.7, 1.4, 0.2, 0, 0.8, 2.4);
  gr.addColorStop(0, 'rgba(255,255,255,0.28)');
  gr.addColorStop(0.6, 'rgba(255,255,255,0)');
  gr.addColorStop(1, 'rgba(0,0,0,0.18)');
  g.fillStyle = gr;
  g.fillRect(-2.2, -0.1, 4.4, 2.3);
  g.restore();
  g.lineWidth = traco * 1.6;
  g.strokeStyle = TINTA;
  g.lineJoin = 'round';
  g.beginPath(); g.ellipse(0, 0, R, R, 0, 0, Math.PI); g.closePath(); g.stroke();
  // rosto e acessorios (os do jogo)
  const s = { ativo: true, idx: 0, n: 60, a11: 1, a12: 0, a21: 0, a22: 1, raio0: 0.925 * R, cx: 0, cy: 0.44 * R, dados: { expr: '', hex: v.hex, acessorios: { cabeca: v.cabeca, rosto: v.rosto, boca: v.boca } } };
  if (!o.semRosto) desenharRostos(g, { slimes: [s] }, cam, 1, 0, { minN: 0, estilo: 'classico', olhar: null });
  aplicar(g, cam, 1);
  desenharAcessoriosDe(g, s, traco, 0);
  g.restore();
}
