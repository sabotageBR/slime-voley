// Carinhas das reacoes (emoji do jogo, nada do sistema): uma gota amarela com o rosto de cada
// reacao, no contorno de tinta das outras pecas, e o balao que sobe sobre o slime. Coordenadas do
// mundo (y para cima): a carinha cabe num circulo de raio 1 e e escalada por r. A barra do HUD usa
// as mesmas carinhas num canvas, pelo desenharCarinhaTela.

import { TINTA } from './fundo.js';

const AMARELO = '#ffd23a';
const LAGRIMA = '#4fc3ff';

/** Corpo de gota (com o biquinho de gosma no alto). */
function gota(ctx, cor) {
  ctx.beginPath();
  ctx.moveTo(-0.86, -0.5);
  ctx.quadraticCurveTo(-0.98, 0.55, -0.12, 0.86);
  ctx.quadraticCurveTo(0, 1.04, 0.12, 0.86);
  ctx.quadraticCurveTo(0.98, 0.55, 0.86, -0.5);
  ctx.quadraticCurveTo(0, -0.92, -0.86, -0.5);
  ctx.closePath();
  const g = ctx.createRadialGradient(-0.3, 0.4, 0.1, 0, 0, 1.1);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.25, cor);
  g.addColorStop(1, cor);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 0.09;
  ctx.strokeStyle = TINTA;
  ctx.stroke();
}

function linha(ctx, w = 0.09, cor = TINTA) {
  ctx.lineWidth = w;
  ctx.strokeStyle = cor;
  ctx.stroke();
}

/** Olhos fechados de riso (^ ^). */
function olhosRiso(ctx) {
  ctx.beginPath();
  for (const x of [-0.32, 0.32]) {
    ctx.moveTo(x + 0.15, 0.14);
    ctx.arc(x, 0.14, 0.15, 0, Math.PI);
  }
  linha(ctx, 0.1);
}

/** Olhos abertos (pontos com brilho). */
function olhos(ctx, y = 0.18, r = 0.11) {
  for (const x of [-0.32, 0.32]) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = TINTA;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x - r * 0.3, y + r * 0.35, r * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }
}

/** Boca aberta de riso (meio disco escuro com lingua). */
function bocaAberta(ctx, y = -0.12, r = 0.36) {
  ctx.beginPath();
  ctx.moveTo(-r, y);
  ctx.arc(0, y, r, Math.PI, Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = TINTA;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, y - r * 0.62, r * 0.42, Math.PI * 0.05, Math.PI * 0.95);
  ctx.fillStyle = '#ff6f8e';
  ctx.fill();
}

/** Sorriso fechado. */
function sorriso(ctx, y = -0.2, r = 0.3) {
  ctx.beginPath();
  ctx.arc(0, y + r * 0.3, r, Math.PI * 1.15, Math.PI * 1.85);
  linha(ctx, 0.1);
}

function coracao(ctx, x, y, s, cor = '#ff4f7b') {
  ctx.beginPath();
  ctx.moveTo(x, y - s * 0.9);
  ctx.bezierCurveTo(x - s * 1.4, y - s * 0.1, x - s * 0.9, y + s * 1.05, x, y + s * 0.45);
  ctx.bezierCurveTo(x + s * 0.9, y + s * 1.05, x + s * 1.4, y - s * 0.1, x, y - s * 0.9);
  ctx.closePath();
  ctx.fillStyle = cor;
  ctx.fill();
  ctx.lineWidth = 0.06;
  ctx.strokeStyle = TINTA;
  ctx.stroke();
}

function lagrima(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 1.3);
  ctx.quadraticCurveTo(x + s, y, x, y - s * 0.8);
  ctx.quadraticCurveTo(x - s, y, x, y + s * 1.3);
  ctx.fillStyle = LAGRIMA;
  ctx.fill();
  ctx.lineWidth = 0.05;
  ctx.strokeStyle = TINTA;
  ctx.stroke();
}

const ROSTOS = {
  rindo(ctx) {
    gota(ctx, AMARELO);
    olhosRiso(ctx);
    bocaAberta(ctx);
  },
  gargalhada(ctx) {
    gota(ctx, AMARELO);
    ctx.beginPath();
    ctx.moveTo(-0.48, 0.3); ctx.lineTo(-0.22, 0.17); ctx.lineTo(-0.48, 0.04);
    ctx.moveTo(0.48, 0.3); ctx.lineTo(0.22, 0.17); ctx.lineTo(0.48, 0.04);
    linha(ctx, 0.1);
    bocaAberta(ctx, -0.08, 0.42);
    lagrima(ctx, -0.74, 0.05, 0.13);
    lagrima(ctx, 0.74, 0.05, 0.13);
  },
  convencido(ctx) {
    gota(ctx, AMARELO);
    // palpebras a meio pau e uma sobrancelha erguida
    for (const x of [-0.32, 0.32]) {
      ctx.beginPath();
      ctx.arc(x, 0.13, 0.1, Math.PI, Math.PI * 2);
      ctx.fillStyle = TINTA;
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x - 0.17, 0.16); ctx.lineTo(x + 0.17, 0.16);
      linha(ctx, 0.08);
    }
    ctx.beginPath();
    ctx.moveTo(0.16, 0.42); ctx.quadraticCurveTo(0.32, 0.55, 0.5, 0.44);
    ctx.moveTo(-0.5, 0.36); ctx.lineTo(-0.16, 0.36);
    linha(ctx, 0.08);
    ctx.beginPath();
    ctx.moveTo(-0.28, -0.26); ctx.quadraticCurveTo(0.08, -0.4, 0.36, -0.14);
    linha(ctx, 0.1);
  },
  bravo(ctx) {
    gota(ctx, '#ff7a4a');
    ctx.beginPath();
    ctx.moveTo(-0.52, 0.42); ctx.lineTo(-0.16, 0.26);
    ctx.moveTo(0.52, 0.42); ctx.lineTo(0.16, 0.26);
    linha(ctx, 0.11);
    olhos(ctx, 0.12, 0.09);
    ctx.beginPath();
    ctx.arc(0, -0.5, 0.3, Math.PI * 0.18, Math.PI * 0.82);
    linha(ctx, 0.11);
  },
  chorando(ctx) {
    gota(ctx, AMARELO);
    ctx.beginPath();
    for (const x of [-0.32, 0.32]) {
      ctx.moveTo(x - 0.15, 0.2);
      ctx.arc(x, 0.2, 0.15, Math.PI, Math.PI * 2);
    }
    linha(ctx, 0.09);
    for (const x of [-0.34, 0.34]) {
      ctx.beginPath();
      ctx.roundRect(x - 0.07, -0.62, 0.14, 0.78, 0.07);
      ctx.fillStyle = LAGRIMA;
      ctx.fill();
    }
    ctx.beginPath();
    ctx.ellipse(0, -0.3, 0.18, 0.13, 0, 0, Math.PI * 2);
    ctx.fillStyle = TINTA;
    ctx.fill();
  },
  coracao(ctx) {
    gota(ctx, AMARELO);
    coracao(ctx, -0.32, 0.16, 0.2);
    coracao(ctx, 0.32, 0.16, 0.2);
    sorriso(ctx);
  },
  oculos(ctx) {
    gota(ctx, AMARELO);
    ctx.beginPath();
    ctx.roundRect(-0.62, 0.02, 0.52, 0.32, 0.12);
    ctx.roundRect(0.1, 0.02, 0.52, 0.32, 0.12);
    ctx.fillStyle = TINTA;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-0.1, 0.26); ctx.lineTo(0.1, 0.26);
    linha(ctx, 0.08);
    ctx.beginPath();
    ctx.moveTo(-0.5, 0.26); ctx.lineTo(-0.36, 0.3);
    ctx.moveTo(0.22, 0.26); ctx.lineTo(0.36, 0.3);
    linha(ctx, 0.05, 'rgba(255,255,255,0.8)');
    sorriso(ctx, -0.24, 0.32);
  },
  zzz(ctx) {
    gota(ctx, AMARELO);
    ctx.beginPath();
    ctx.moveTo(-0.46, 0.14); ctx.lineTo(-0.18, 0.14);
    ctx.moveTo(0.18, 0.14); ctx.lineTo(0.46, 0.14);
    linha(ctx, 0.09);
    ctx.beginPath();
    ctx.ellipse(0, -0.3, 0.11, 0.13, 0, 0, Math.PI * 2);
    ctx.fillStyle = TINTA;
    ctx.fill();
    // os Z (zigue-zagues), subindo para a direita
    ctx.beginPath();
    for (const [x, y, s] of [[0.5, 0.62, 0.16], [0.78, 0.92, 0.12]]) {
      ctx.moveTo(x - s, y + s); ctx.lineTo(x + s, y + s); ctx.lineTo(x - s, y - s); ctx.lineTo(x + s, y - s);
    }
    linha(ctx, 0.08, '#2a62d6');
  },
  fogo(ctx) {
    ctx.beginPath();
    ctx.moveTo(0, 1.0);
    ctx.quadraticCurveTo(0.95, 0.1, 0.62, -0.5);
    ctx.quadraticCurveTo(0, -1.0, -0.62, -0.5);
    ctx.quadraticCurveTo(-0.95, 0.1, -0.35, 0.55);
    ctx.quadraticCurveTo(-0.25, 0.2, 0, 1.0);
    ctx.closePath();
    ctx.fillStyle = '#ff6a1a';
    ctx.fill();
    ctx.lineWidth = 0.09;
    ctx.strokeStyle = TINTA;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, 0.45);
    ctx.quadraticCurveTo(0.5, -0.1, 0.32, -0.5);
    ctx.quadraticCurveTo(0, -0.75, -0.32, -0.5);
    ctx.quadraticCurveTo(-0.5, -0.1, 0, 0.45);
    ctx.fillStyle = AMARELO;
    ctx.fill();
    olhos(ctx, -0.05, 0.09);
    sorriso(ctx, -0.42, 0.22);
  },
  coroa(ctx) {
    gota(ctx, AMARELO);
    olhosRiso(ctx);
    sorriso(ctx, -0.22, 0.32);
    ctx.beginPath();
    ctx.moveTo(-0.42, 0.62); ctx.lineTo(-0.48, 1.05); ctx.lineTo(-0.22, 0.84); ctx.lineTo(0, 1.12);
    ctx.lineTo(0.22, 0.84); ctx.lineTo(0.48, 1.05); ctx.lineTo(0.42, 0.62);
    ctx.closePath();
    ctx.fillStyle = '#ffb02e';
    ctx.fill();
    ctx.lineWidth = 0.07;
    ctx.strokeStyle = TINTA;
    ctx.stroke();
  },
};

/**
 * Carinha de uma reacao no mundo (y para cima).
 * @param {CanvasRenderingContext2D} ctx @param {string} id @param {number} x @param {number} y @param {number} r
 */
export function desenharCarinha(ctx, id, x, y, r) {
  const d = ROSTOS[id];
  if (!d) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(r, r);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  d(ctx);
  ctx.restore();
}

/**
 * A mesma carinha num canvas de tela (y para baixo), ocupando o canvas.
 * @param {CanvasRenderingContext2D} ctx @param {string} id @param {number} lado px do canvas
 */
export function desenharCarinhaTela(ctx, id, lado) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, lado, lado);
  ctx.setTransform(lado / 2.4, 0, 0, -lado / 2.4, lado / 2, lado * 0.52);
  desenharCarinha(ctx, id, 0, 0, 1);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

/**
 * Balao da reacao sobre o slime: entra estufando, balanca e some nos ultimos 0,3 s. O raio e
 * 1,32 u ou rMin (u: o minimo em pixels que a cena pede para a tela), vezes `escala`.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ id: string, x: number, y: number, t: number, dur: number, rMin?: number, escala?: number }} b  (x, y) = ponta do balao
 * @param {number} tr traco em u
 */
export function desenharBalao(ctx, b, tr) {
  const k = b.t < 0.12 ? (b.t / 0.12) * 1.15 : b.t < 0.22 ? 1.15 - ((b.t - 0.12) / 0.1) * 0.15 : 1;
  const a = Math.min(1, (b.dur - b.t) / 0.3);
  if (k <= 0 || a <= 0) return;
  const R = Math.max(1.32, b.rMin || 0) * (b.escala || 1) * k;
  const cy = b.y + 0.55 + R;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(b.x, cy);
  ctx.rotate(Math.sin(b.t * 7) * 0.06);
  ctx.beginPath();
  ctx.arc(0, 0, R, Math.PI * 1.62, Math.PI * 1.38 + Math.PI * 2);
  ctx.lineTo(0, -R - 0.5 * k);
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.lineWidth = tr * 1.4;
  ctx.strokeStyle = TINTA;
  ctx.stroke();
  desenharCarinha(ctx, b.id, 0, 0.02, R * 0.78);
  ctx.restore();
}
