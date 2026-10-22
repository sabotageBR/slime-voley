// Quadra do Volei de Gosma (em u, pela camera): piso e linhas, placas, parede de fundo, poste da
// rede, sombras; por cima dos slimes: bola, rastro, mira (feixe reto), reticula, coroa de respingo,
// anel de tempo e marcador do saque e a sombra-alvo. Tres direcoes visuais (checkpoint M1) pelo objeto ESTILOS:
// A (Gel Premium), B (Brinquedo de Vinil), C (Transmissao Esportiva). Tudo nitido em codigo.

import { aplicar, paraTela } from './camera.js';
import { TINTA } from './fundo.js';
import { LARG, REDE_H, REDE_R, PLACA_X, PLACA_H, FUNDO_X, RB } from '../fisica/volei.js';
import { CORTADA } from '../jogo/cortada.js';
import { desenharBolha, desenharGelo, desenharAviso } from './icones.js';
import { desenharBalao } from './carinhas.js';

/** Direcoes visuais. traco: contorno em px CSS. */
export const ESTILOS = Object.freeze({
  a: Object.freeze({
    id: 'a', traco: 1.9, brilhoSlime: 1, contornoBola: 1, sombra: 'rgba(90, 55, 20, 0.26)',
    linha: '#ffffff', piso: ['#f6d58e', '#ecc174', '#e3b35f'], placa: ['#ff7a59', '#ffd23a'], rede: '#ffffff', poste: '#f4f4f4', faixa: '#ff5a5a',
    bola: { base: '#ffffff', gomos: ['#ffb02e', '#2fb7e8'], brilho: 0.95, sombraInterna: 0.18 }, fundoRede: 'rgba(255,255,255,0.55)',
    parede: ['rgba(255,255,255,0.30)', 'rgba(255,255,255,0.45)', 'rgba(255,255,255,0.95)'],
  }),
  b: Object.freeze({
    id: 'b', traco: 2.3, brilhoSlime: 0.8, contornoBola: 1.2, sombra: 'rgba(60, 30, 10, 0.32)',
    linha: '#fffaf0', piso: ['#ffcf73', '#f2b34e', '#d9963a'], placa: ['#ff4f6b', '#36c3ff'], rede: '#fff6e0', poste: '#ff4f6b', faixa: '#ffffff',
    bola: { base: '#fff8ec', gomos: ['#ff4f6b', '#36c3ff'], brilho: 0.8, sombraInterna: 0.26 }, fundoRede: 'rgba(255,246,224,0.6)',
    parede: ['rgba(255,79,107,0.28)', 'rgba(255,246,224,0.55)', '#fff6e0'],
  }),
  c: Object.freeze({
    id: 'c', traco: 1.5, brilhoSlime: 1, contornoBola: 0.9, sombra: 'rgba(10, 20, 50, 0.3)',
    linha: '#ffffff', piso: ['#ecc883', '#cf9f5a', '#8f6a35'], placa: ['#11214a', '#ffd23a'], rede: '#ffffff', poste: '#dfe6f5', faixa: '#ffd23a',
    bola: { base: '#ffffff', gomos: ['#ffd23a', '#1e66d0'], brilho: 0.9, sombraInterna: 0.14 }, fundoRede: 'rgba(255,255,255,0.4)',
    parede: ['rgba(80,200,255,0.16)', 'rgba(140,230,255,0.35)', 'rgba(150,235,255,0.95)'],
  }),
});

/** Parede de fundo: espessura e altura desenhadas (u); a fisica nao tem teto. */
const PAREDE_E = 0.55;
const PAREDE_H = 60;

/** Pseudo-aleatorio fixo por indice. */
const h = (k) => { const s = Math.sin(k * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

/** Clareia ou escurece um hex (f > 0 clareia ate o branco; f < 0 escurece). */
export function tom(hex, f) {
  const n = parseInt((hex || '#888888').slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

/**
 * Piso da quadra (tela inteira abaixo do chao) com as linhas, as placas, a rede de protecao e o
 * poste. Atras dos slimes.
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('./camera.js').Camera} cam
 * @param {number} dpr @param {number} W @param {number} H @param {number} t
 * @param {any} est ESTILOS[x]
 * @param {{ sombras: Array<{x:number, y:number, a:number}>, bola: {x:number,y:number}, alvoSaque?: number|null, ginasio?: any }} vis
 */
export function desenharPiso(ctx, cam, dpr, W, H, t, est, vis) {
  const y0 = paraTela(cam, 0, 0)[1];
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const g = ctx.createLinearGradient(0, y0, 0, H);
  g.addColorStop(0, est.piso[0]);
  g.addColorStop(0.35, est.piso[1]);
  g.addColorStop(1, est.piso[2]);
  ctx.fillStyle = g;
  ctx.fillRect(0, y0, W, H - y0 + 1);
  if (est.id === 'c') {
    // refletores: dois cones de luz na areia
    for (const fx of [0.25, 0.75]) {
      const rg = ctx.createRadialGradient(W * fx, y0 + (H - y0) * 0.2, 4, W * fx, y0 + (H - y0) * 0.2, Math.max(W, H) * 0.45);
      rg.addColorStop(0, 'rgba(255,248,220,0.35)');
      rg.addColorStop(1, 'rgba(255,248,220,0)');
      ctx.fillStyle = rg;
      ctx.fillRect(0, y0, W, H - y0);
    }
  }
  {
    // graos de areia (um caminho so)
    ctx.fillStyle = est.id === 'b' ? 'rgba(150, 90, 30, 0.22)' : 'rgba(160, 110, 40, 0.2)';
    const u = cam.s;
    const passo = Math.max(14, u * 0.85);
    ctx.beginPath();
    for (let j = 0, y = y0 + passo * 0.6; y < H; j++, y += passo * 0.7) {
      for (let i = 0, x = (j % 2) * passo * 0.5; x < W; i++, x += passo) {
        const k = i * 31 + j * 17;
        const gx = x + h(k) * passo * 0.6;
        const gy = y + h(k + 5) * passo * 0.4;
        const r = Math.max(1, u * 0.045) * (0.6 + h(k + 9));
        ctx.moveTo(gx + r, gy);
        ctx.arc(gx, gy, r, 0, Math.PI * 2);
      }
    }
    ctx.fill();
  }
  ctx.restore();

  aplicar(ctx, cam, dpr);
  const tr = Math.max(0.035, est.traco / cam.s);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // parede de fundo (a bola nunca sai): painel translucido do chao ao alto, com a face clara
  // voltada para a quadra e as costuras do acolchoado; atras das placas
  for (const lado of [-1, 1]) {
    const x = lado * FUNDO_X;
    ctx.fillStyle = est.parede[0];
    ctx.fillRect(lado < 0 ? x - PAREDE_E : x, 0, PAREDE_E, PAREDE_H);
    ctx.strokeStyle = est.parede[1];
    ctx.lineWidth = tr * 0.7;
    ctx.beginPath();
    for (let y = 1.6; y < PAREDE_H; y += 1.6) {
      ctx.moveTo(x, y);
      ctx.lineTo(x + lado * PAREDE_E, y);
    }
    ctx.stroke();
    ctx.strokeStyle = est.parede[2];
    ctx.lineWidth = tr * 1.8;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, PAREDE_H);
    ctx.stroke();
  }
  // linhas da quadra (fundo e centro), em perspectiva rasa: uma faixa no chao
  ctx.fillStyle = est.linha;
  ctx.globalAlpha = 0.9;
  for (const x of [-LARG, LARG]) ctx.fillRect(x - 0.09, -0.32, 0.18, 0.3);
  ctx.fillRect(-LARG, -0.07, 2 * LARG, 0.07);
  ctx.globalAlpha = 1;
  // sombras dos slimes e da bola
  ctx.fillStyle = est.sombra;
  for (const s of vis.sombras) {
    const k = Math.max(0.35, 1 - s.y * 0.11);
    ctx.beginPath();
    ctx.ellipse(s.x, 0.02, s.a * 0.95 * k, 0.22 * k, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const b = vis.bola;
  if (b) {
    const k = Math.max(0.25, 1 - b.y / 14);
    ctx.globalAlpha = 0.45 + 0.55 * k;
    ctx.beginPath();
    ctx.ellipse(b.x, 0.02, RB * (0.55 + 0.75 * k), 0.13 + 0.09 * k, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  // placas (painel acolchoado)
  for (const lado of [-1, 1]) {
    const x = lado * PLACA_X;
    const w = 0.34;
    ctx.fillStyle = est.placa[0];
    ctx.beginPath();
    rr(ctx, x - w / 2, 0, w, PLACA_H, 0.12);
    ctx.fill();
    ctx.fillStyle = est.placa[1];
    ctx.fillRect(x - w / 2, PLACA_H * 0.55, w, PLACA_H * 0.16);
    ctx.lineWidth = tr;
    ctx.strokeStyle = TINTA;
    ctx.beginPath();
    rr(ctx, x - w / 2, 0, w, PLACA_H, 0.12);
    ctx.stroke();
  }
  // a rede (fundo de malha, visto quase de lado) e o poste
  ctx.fillStyle = est.fundoRede;
  ctx.fillRect(-0.32, 1.05, 0.64, REDE_H - 1.05);
  ctx.strokeStyle = est.id === 'c' ? 'rgba(20,30,60,0.35)' : 'rgba(23,22,28,0.3)';
  ctx.lineWidth = tr * 0.5;
  ctx.beginPath();
  for (let y = 1.15; y < REDE_H; y += 0.22) { ctx.moveTo(-0.32, y); ctx.lineTo(0.32, y); }
  for (let x = -0.32; x <= 0.33; x += 0.16) { ctx.moveTo(x, 1.05); ctx.lineTo(x, REDE_H); }
  ctx.stroke();
  // faixa branca no alto da rede
  ctx.fillStyle = est.rede;
  ctx.fillRect(-0.36, REDE_H - 0.28, 0.72, 0.2);
  ctx.lineWidth = tr * 0.8;
  ctx.strokeStyle = TINTA;
  ctx.strokeRect(-0.36, REDE_H - 0.28, 0.72, 0.2);
  // poste
  ctx.fillStyle = est.poste;
  ctx.beginPath();
  rr(ctx, -REDE_R, -0.25, 2 * REDE_R, REDE_H - REDE_R + 0.25, REDE_R);
  ctx.fill();
  ctx.fillStyle = est.faixa;
  for (let y = 0.3; y < REDE_H - 0.5; y += 0.6) ctx.fillRect(-REDE_R, y, 2 * REDE_R, 0.26);
  ctx.lineWidth = tr;
  ctx.strokeStyle = TINTA;
  ctx.beginPath();
  rr(ctx, -REDE_R, -0.25, 2 * REDE_R, REDE_H - REDE_R + 0.25, REDE_R);
  ctx.stroke();
  // ponta com bandeirinha
  ctx.fillStyle = est.placa[1];
  ctx.beginPath();
  ctx.arc(0, REDE_H - REDE_R, REDE_R * 1.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  const bal = Math.sin(t * 3.2) * 0.1;
  ctx.beginPath();
  ctx.moveTo(0, REDE_H + REDE_R * 0.2);
  ctx.lineTo(0, REDE_H + 1.0);
  ctx.stroke();
  ctx.fillStyle = est.placa[0];
  ctx.beginPath();
  ctx.moveTo(0, REDE_H + 1.0);
  ctx.quadraticCurveTo(0.38, REDE_H + 0.88 + bal, 0.72, REDE_H + 0.78 + bal * 1.6);
  ctx.quadraticCurveTo(0.36, REDE_H + 0.66 + bal, 0, REDE_H + 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // marca do saque (onde a bola vai cair) para quem recebe
  if (vis.alvoSaque !== null && vis.alvoSaque !== undefined) {
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = tr * 1.2;
    ctx.setLineDash([0.18, 0.14]);
    ctx.beginPath();
    ctx.ellipse(vis.alvoSaque, 0.02, 0.8, 0.18, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

/** Retangulo arredondado (caminho). */
function rr(ctx, x, y, w, hh, r) {
  const q = Math.min(r, w / 2, hh / 2);
  ctx.moveTo(x + q, y);
  ctx.arcTo(x + w, y, x + w, y + hh, q);
  ctx.arcTo(x + w, y + hh, x, y + hh, q);
  ctx.arcTo(x, y + hh, x, y, q);
  ctx.arcTo(x, y, x + w, y, q);
  ctx.closePath();
}

/** Bola de volei (em u): base clara, 2 gomos coloridos, costuras, brilho fixo. */
export function desenharBola(ctx, x, y, r, ang, tr, est, alfa = 1) {
  const B = est.bola;
  ctx.save();
  ctx.globalAlpha = alfa;
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = B.base;
  ctx.fill();
  ctx.save();
  ctx.clip();
  for (let k = 0; k < 3; k++) {
    const a = (k * Math.PI * 2) / 3;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * r * 1.35, Math.sin(a) * r * 1.35, r * 1.02, 0, Math.PI * 2);
    ctx.fillStyle = k < 2 ? B.gomos[k] : B.base;
    ctx.fill();
    ctx.lineWidth = tr * 0.55;
    ctx.strokeStyle = TINTA;
    ctx.stroke();
  }
  ctx.restore();
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = alfa;
  // volume: sombra embaixo a direita
  const g = ctx.createRadialGradient(x - r * 0.3, y + r * 0.35, r * 0.2, x, y, r * 1.05);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(20,10,40,${B.sombraInterna})`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = tr * est.contornoBola;
  ctx.strokeStyle = TINTA;
  ctx.stroke();
  ctx.strokeStyle = `rgba(255, 255, 255, ${B.brilho})`;
  ctx.lineCap = 'round';
  ctx.lineWidth = r * 0.2;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.62, Math.PI * 0.58, Math.PI * 0.9);
  ctx.stroke();
  ctx.restore();
}

/** Uma gota (em u), apontando na direcao (dx, dy): corpo redondo e ponta. */
function gota(ctx, x, y, r, dx, dy, cor, tr, ponta = 1.6) {
  const l = Math.hypot(dx, dy) || 1;
  const ux = dx / l;
  const uy = dy / l;
  const a = Math.atan2(uy, ux);
  ctx.beginPath();
  ctx.arc(x, y, r, a + Math.PI * 0.5, a + Math.PI * 1.5);
  ctx.quadraticCurveTo(x + ux * r * 0.4 - uy * r * 0.9, y + uy * r * 0.4 + ux * r * 0.9, x + ux * r * ponta, y + uy * r * ponta);
  ctx.quadraticCurveTo(x + ux * r * 0.4 + uy * r * 0.9, y + uy * r * 0.4 - ux * r * 0.9, x - uy * r, y + ux * r);
  ctx.closePath();
  ctx.fillStyle = cor;
  ctx.fill();
  ctx.lineWidth = tr;
  ctx.strokeStyle = TINTA;
  ctx.stroke();
  // brilho
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.arc(x - r * 0.35, y + r * 0.35, r * 0.28, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Reticula da cortada no piso (em perspectiva): sombra, anel na cor do time com tinta, 4 marcas,
 * miolo pulsando e uma onda que abre a cada 0,6 s; nos 0,3 s finais o anel pisca em branco.
 */
function desenharReticula(ctx, x, cor, t, tr, pulso, final) {
  const y = 0.05;
  const ach = 0.32;
  const elipse = (r) => { ctx.beginPath(); ctx.ellipse(x, y, r, r * ach, 0, 0, Math.PI * 2); };
  elipse(1.35 * pulso);
  ctx.fillStyle = 'rgba(40, 20, 10, 0.22)';
  ctx.fill();
  // onda que abre
  const k = (t / 0.6) % 1;
  ctx.globalAlpha = 0.6 * (1 - k);
  ctx.lineWidth = tr * 1.6;
  ctx.strokeStyle = cor;
  elipse(0.45 + 1.35 * k);
  ctx.stroke();
  ctx.globalAlpha = 1;
  // zona e anel
  const r = 1.05 * pulso;
  elipse(r);
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = cor;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.lineWidth = tr * 3.6;
  ctx.strokeStyle = TINTA;
  ctx.stroke();
  ctx.lineWidth = tr * 2.1;
  ctx.strokeStyle = final && Math.sin(t * 22) > 0 ? '#ffffff' : cor;
  ctx.stroke();
  elipse(r * 0.62);
  ctx.lineWidth = tr * 1.2;
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.stroke();
  // marcas (as de cima e de baixo achatadas pela perspectiva)
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, ach], [0, -ach]]) {
    ctx.beginPath();
    ctx.moveTo(x + dx * (r + 0.12), y + dy * (r + 0.12));
    ctx.lineTo(x + dx * (r + 0.46), y + dy * (r + 0.46));
    ctx.lineWidth = tr * 3.2;
    ctx.strokeStyle = TINTA;
    ctx.stroke();
    ctx.lineWidth = tr * 1.6;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
  }
  // miolo
  elipse(0.36 * (1 + 0.14 * Math.sin(t * 6)) * pulso);
  ctx.fillStyle = cor;
  ctx.fill();
  ctx.lineWidth = tr * 1.4;
  ctx.strokeStyle = TINTA;
  ctx.stroke();
}

/**
 * Feixe reto da mira (pedido de 2026-10-22: "direto e reto no objetivo"): sai da bola e acaba
 * numa ponta de flecha encostada na reticula. Halo na cor do time, corpo afilado (mais grosso
 * quanto mais forte o tiro) com contorno de tinta e nucleo claro, chevrons andando rumo ao alvo
 * (mais rapidos com a forca) e um risco de brilho na aba da ponta.
 */
function desenharFeixe(ctx, c, cor, t, tr, pulso, esc = 1) {
  const tx = c.alvoX;
  const ty = 0.12;
  let ux = tx - c.bx;
  let uy = ty - c.by;
  const dist = Math.hypot(ux, uy) || 1;
  ux /= dist;
  uy /= dist;
  const nx = -uy;
  const ny = ux;
  const f = Math.min(1, Math.hypot(c.vx, c.vy) / CORTADA.vCortada);
  const inicio = RB + 0.2;
  const cab = 1.45 * pulso * esc;
  const abaL = 0.82 * pulso * esc;
  const corpo = dist - inicio - cab * 0.7;
  if (corpo <= 0.2) return;
  const wA = 0.09 * esc;
  const wB = (0.22 + 0.1 * f) * esc;
  const ax = c.bx + ux * inicio;
  const ay = c.by + uy * inicio;
  const bx = tx - ux * cab * 0.7;
  const by = ty - uy * cab * 0.7;
  const hx = tx - ux * cab;
  const hy = ty - uy * cab;
  const contorno = () => {
    ctx.beginPath();
    ctx.moveTo(ax + nx * wA, ay + ny * wA);
    ctx.lineTo(bx + nx * wB, by + ny * wB);
    ctx.lineTo(hx + nx * abaL, hy + ny * abaL);
    ctx.lineTo(tx, ty);
    ctx.lineTo(hx - nx * abaL, hy - ny * abaL);
    ctx.lineTo(bx - nx * wB, by - ny * wB);
    ctx.lineTo(ax - nx * wA, ay - ny * wA);
    // tampa redonda do lado da bola (o arco passa por A - u)
    ctx.arc(ax, ay, wA, Math.atan2(-ny, -nx), Math.atan2(ny, nx), true);
    ctx.closePath();
  };
  // halo
  contorno();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = cor;
  ctx.globalAlpha = 0.14;
  ctx.lineWidth = 0.9 * esc;
  ctx.stroke();
  ctx.globalAlpha = 0.26;
  ctx.lineWidth = 0.45 * esc;
  ctx.stroke();
  ctx.globalAlpha = 1;
  // corpo: nasce claro na bola e fica cheio na ponta
  const g = ctx.createLinearGradient(ax, ay, tx, ty);
  g.addColorStop(0, tom(cor, 0.55));
  g.addColorStop(0.35, cor);
  g.addColorStop(1, cor);
  contorno();
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = tr * 1.4;
  ctx.strokeStyle = TINTA;
  ctx.stroke();
  // nucleo claro no corpo
  ctx.beginPath();
  ctx.moveTo(ax + nx * wA * 0.35, ay + ny * wA * 0.35);
  ctx.lineTo(bx + nx * wB * 0.32, by + ny * wB * 0.32);
  ctx.lineTo(bx - nx * wB * 0.32, by - ny * wB * 0.32);
  ctx.lineTo(ax - nx * wA * 0.35, ay - ny * wA * 0.35);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fill();
  // chevrons andando rumo ao alvo
  const esp = 0.8 * esc;
  const vel = 2.5 + 6 * f;
  const fase = (t * vel) % esp;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#ffffff';
  for (let s = fase + 0.25; s < corpo - 0.15; s += esp) {
    const k = s / corpo;
    const w = (wA + (wB - wA) * k) * 0.85;
    const px = ax + ux * s;
    const py = ay + uy * s;
    ctx.globalAlpha = Math.min(1, Math.sin(Math.PI * Math.min(1, k * 1.15)) * 1.2) * 0.95;
    ctx.lineWidth = Math.max(tr * 1.2, w * 0.45);
    ctx.beginPath();
    ctx.moveTo(px - ux * w * 0.9 + nx * w, py - uy * w * 0.9 + ny * w);
    ctx.lineTo(px, py);
    ctx.lineTo(px - ux * w * 0.9 - nx * w, py - uy * w * 0.9 - ny * w);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // brilho na aba de cima da ponta
  const lado = ny >= 0 ? 1 : -1;
  ctx.lineWidth = Math.max(tr * 1.2, 0.07);
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.moveTo(hx + nx * lado * abaL * 0.62 + ux * 0.12, hy + ny * lado * abaL * 0.62 + uy * 0.12);
  ctx.lineTo(tx - ux * cab * 0.32 + nx * lado * 0.08, ty - uy * cab * 0.32 + ny * lado * 0.08);
  ctx.stroke();
}

/**
 * Por cima dos slimes: rastro, bola, mira (feixe reto e reticula), coroa, anel do saque e efeitos.
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('./camera.js').Camera} cam
 * @param {number} dpr @param {number} t
 * @param {any} est
 * @param {any} vis  (montado no cena.js)
 */
export function desenharTopo(ctx, cam, dpr, t, est, vis) {
  aplicar(ctx, cam, dpr);
  const tr = Math.max(0.03, est.traco / cam.s);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const b = vis.bola;
  // rastro: bola rapida (circulos esmaecidos) ou turbinada (gotas que escorrem)
  for (const r of vis.rastro) {
    const k = 1 - r.idade / r.vida;
    if (k <= 0) continue;
    ctx.globalAlpha = Math.min(1, k * 0.9);
    if (r.gota) gota(ctx, r.x, r.y - (1 - k) * 0.35, RB * 0.42 * (0.5 + 0.5 * k), r.vx, r.vy, r.cor, tr * 0.8, 1.4);
    else {
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath();
      ctx.arc(r.x, r.y, RB * (0.55 + 0.4 * k), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  // saque: anel de tempo (fecha ate o instante ideal; dourado na janela do perfeito) e o
  // marcador de onde a bola vai cair no piso do rival
  const sq = vis.saque;
  if (sq) {
    const r0 = RB + 0.28;
    const ouro = sq.q === 'perfeito';
    ctx.lineWidth = tr * 1.2;
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.arc(b.x, b.y, r0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = tr * (ouro ? 3.2 : 2.2);
    ctx.strokeStyle = ouro ? '#ffd23a' : '#ffffff';
    ctx.globalAlpha = sq.depois ? 0.45 : 1;
    ctx.beginPath();
    ctx.arc(b.x, b.y, r0 + 1.8 * (1 - sq.k), 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = tr * 1.3;
    ctx.setLineDash([0.18, 0.14]);
    ctx.beginPath();
    ctx.ellipse(sq.alvo, 0.03, 0.8, 0.18, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    gota(ctx, sq.alvo, 0.75 + 0.08 * Math.sin(t * 7), 0.2, 0, -1, '#ffffff', tr * 0.9, 1.7);
  }
  if (vis.pulsoSaque > 0) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = tr * 1.4;
    ctx.globalAlpha = 0.45 + 0.45 * Math.sin(t * 8);
    ctx.beginPath();
    ctx.arc(b.x, b.y, RB + 0.3 + 0.12 * Math.sin(t * 8), 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  // mira da cortada: a reticula no piso e o feixe reto da bola ate ela
  const m = vis.mira;
  if (m) {
    const pulso = m.final ? 1 + 0.1 * Math.sin(t * 22) : 1 + 0.04 * Math.sin(t * Math.PI * 4);
    // tamanho minimo na tela: 1x no desktop, ~1,3x em paisagem, ate 1,8x no retrato
    const esc = Math.max(1, Math.min(1.8, 28 / cam.s));
    desenharReticula(ctx, m.c.alvoX, m.cor, t, tr, pulso * esc, m.final);
    if (m.feixe !== false) desenharFeixe(ctx, m.c, m.cor, t, tr, pulso, esc);
  }
  // power-ups: a bolha (atras da bola) e o gelo nos slimes
  if (vis.bolha) desenharBolha(ctx, vis.bolha, t, tr, vis.vidaBolha);
  for (const g of vis.gelos || []) desenharGelo(ctx, g, tr);
  // bola (a Bola de Fogo ganha um halo)
  if (b && vis.bolaAlfa > 0 && vis.bolaFogo) {
    const hg = ctx.createRadialGradient(b.x, b.y, RB * 0.6, b.x, b.y, RB * 2.1);
    hg.addColorStop(0, 'rgba(255,140,40,0.75)');
    hg.addColorStop(1, 'rgba(255,90,20,0)');
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.arc(b.x, b.y, RB * 2.1, 0, Math.PI * 2);
    ctx.fill();
  }
  if (b && vis.bolaAlfa > 0) desenharBola(ctx, b.x, b.y, RB, b.ang, tr * 1.15, est, vis.bolaAlfa);
  for (const a of vis.avisos || []) desenharAviso(ctx, a, t);
  for (const bl of vis.baloes || []) desenharBalao(ctx, bl, tr);
  // coroas de respingo (anel de gotas que abre) e anel fino de tinta
  for (const c of vis.coroas) {
    const k = c.idade / c.dur;
    if (k >= 1) continue;
    const e = 1 - Math.pow(1 - k, 3);
    const R = c.r0 + (c.r1 - c.r0) * e;
    const nG = c.n || 12;
    ctx.globalAlpha = Math.min(1, (1 - k) * 1.6);
    for (let j = 0; j < nG; j++) {
      const a = (j / nG) * Math.PI * 2 + c.giro;
      const rj = (0.16 + 0.08 * h(j + c.seed)) * c.esc * (1 - k * 0.6);
      gota(ctx, c.x + Math.cos(a) * R, c.y + Math.sin(a) * R * (c.chao ? 0.38 : 1), rj, Math.cos(a), Math.sin(a), c.cor, tr * 0.8, 1.7);
    }
    if (k > 0.15) {
      const k2 = (k - 0.15) / 0.85;
      ctx.globalAlpha = (1 - k2) * 0.8;
      ctx.lineWidth = tr * 1.4;
      ctx.strokeStyle = c.miolo || '#ffffff';
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, R * 0.9, R * 0.9 * (c.chao ? 0.38 : 1), 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  // contagem de toques (pontinhos) em cima de quem tocou
  const ct = vis.contagem;
  if (ct && ct.vida > 0) {
    ctx.globalAlpha = Math.min(1, ct.vida * 3);
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.arc(ct.x + (k - 1) * 0.42, ct.y, 0.15, 0, Math.PI * 2);
      ctx.fillStyle = k < ct.n ? (ct.n >= 3 ? '#ffd23a' : '#ffffff') : 'rgba(255,255,255,0.25)';
      ctx.fill();
      ctx.lineWidth = tr * 0.8;
      ctx.strokeStyle = TINTA;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}

export { CORTADA };
