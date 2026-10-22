// Icones dos power-ups e o que eles desenham na quadra (bolha, gelo, aviso), tudo em codigo, com
// o contorno de tinta das outras pecas. Coordenadas do mundo (y para cima): cada icone cabe num
// circulo de raio 1 centrado em (0, 0) e e escalado por r. O HUD (DOM) usa os mesmos icones num
// canvas pequeno, pelo desenharIconeTela.

import { TINTA } from './fundo.js';
import { desenharCarinhaTela } from './carinhas.js';
import { paraTela } from './camera.js';

/** Cor principal de cada power-up (chips do HUD e brilho da bolha). */
export const COR_PODER = Object.freeze({
  cortadaGratis: '#ff8a2a', puloMola: '#3fd66b', gosmao: '#ff5fa2', segmento: '#ffd23a',
  congelar: '#7fdcff', fogo: '#ff6a1a', turbo: '#36c3ff', ima: '#ee3b45',
  encolher: '#a07cff', pisoMola: '#2fc7a0', cola: '#8be04e', pesada: '#6b7088',
});

/** Caminho de uma cupula (meia elipse sobre a base). */
function cupula(ctx, cx, cy, a, b) {
  ctx.beginPath();
  ctx.ellipse(cx, cy, a, b, 0, 0, Math.PI);
  ctx.closePath();
}

/** Mola em zigue-zague vertical de y0 a y1. */
function mola(ctx, x, y0, y1, w, n) {
  ctx.beginPath();
  ctx.moveTo(x, y0);
  for (let k = 1; k <= n; k++) ctx.lineTo(x + (k % 2 ? w : -w), y0 + ((y1 - y0) * k) / (n + 1));
  ctx.lineTo(x, y1);
}

/** Seta de (x0, y0) a (x1, y1) com ponta. */
function seta(ctx, x0, y0, x1, y1, p) {
  const a = Math.atan2(y1 - y0, x1 - x0);
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.moveTo(x1 - Math.cos(a - 0.6) * p, y1 - Math.sin(a - 0.6) * p);
  ctx.lineTo(x1, y1);
  ctx.lineTo(x1 - Math.cos(a + 0.6) * p, y1 - Math.sin(a + 0.6) * p);
}

/** Traco grosso colorido com borda de tinta. */
function tracar(ctx, cor, w) {
  ctx.strokeStyle = TINTA;
  ctx.lineWidth = w + 0.14;
  ctx.stroke();
  ctx.strokeStyle = cor;
  ctx.lineWidth = w;
  ctx.stroke();
}

function preencher(ctx, cor) {
  ctx.fillStyle = cor;
  ctx.fill();
  ctx.strokeStyle = TINTA;
  ctx.lineWidth = 0.09;
  ctx.stroke();
}

/** Desenhos em coordenadas unitarias (y para cima). */
const DESENHOS = {
  cortadaGratis(ctx, c) {
    seta(ctx, -0.55, 0.55, 0.45, -0.45, 0.42);
    tracar(ctx, c, 0.26);
    ctx.beginPath();
    ctx.arc(-0.55, 0.55, 0.2, 0, Math.PI * 2);
    preencher(ctx, '#ffffff');
  },
  puloMola(ctx, c) {
    mola(ctx, 0, -0.7, 0.05, 0.32, 5);
    tracar(ctx, c, 0.15);
    seta(ctx, 0, 0.1, 0, 0.72, 0.32);
    tracar(ctx, c, 0.2);
  },
  gosmao(ctx, c) {
    cupula(ctx, 0, -0.6, 0.82, 0.9);
    preencher(ctx, c);
    ctx.beginPath();
    ctx.moveTo(-0.22, -0.05); ctx.lineTo(0.22, -0.05);
    ctx.moveTo(0, -0.27); ctx.lineTo(0, 0.17);
    tracar(ctx, '#ffffff', 0.13);
  },
  segmento(ctx, c) {
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.roundRect(-0.78 + k * 0.54, -0.2, 0.46, 0.4, 0.16);
      preencher(ctx, k === 2 ? c : '#ffffff');
    }
    ctx.beginPath();
    ctx.moveTo(0.54, 0.42); ctx.lineTo(0.54, 0.86);
    ctx.moveTo(0.32, 0.64); ctx.lineTo(0.76, 0.64);
    tracar(ctx, c, 0.13);
  },
  congelar(ctx, c) {
    ctx.beginPath();
    for (let k = 0; k < 3; k++) {
      const a = (k * Math.PI) / 3 + Math.PI / 2;
      const ux = Math.cos(a) * 0.82;
      const uy = Math.sin(a) * 0.82;
      ctx.moveTo(-ux, -uy);
      ctx.lineTo(ux, uy);
      for (const s of [1, -1]) {
        const px = ux * 0.55 * s;
        const py = uy * 0.55 * s;
        ctx.moveTo(px + Math.cos(a + 0.9 * s) * 0.24 * s, py + Math.sin(a + 0.9 * s) * 0.24 * s);
        ctx.lineTo(px, py);
        ctx.lineTo(px + Math.cos(a - 0.9 * s) * 0.24 * s, py + Math.sin(a - 0.9 * s) * 0.24 * s);
      }
    }
    tracar(ctx, c, 0.14);
  },
  fogo(ctx, c) {
    ctx.beginPath();
    ctx.moveTo(0, 0.9);
    ctx.quadraticCurveTo(0.75, 0.05, 0.5, -0.45);
    ctx.quadraticCurveTo(0, -0.95, -0.5, -0.45);
    ctx.quadraticCurveTo(-0.75, 0.05, 0, 0.9);
    preencher(ctx, c);
    ctx.beginPath();
    ctx.moveTo(0, 0.25);
    ctx.quadraticCurveTo(0.35, -0.2, 0.22, -0.48);
    ctx.quadraticCurveTo(0, -0.7, -0.22, -0.48);
    ctx.quadraticCurveTo(-0.35, -0.2, 0, 0.25);
    ctx.fillStyle = '#ffd23a';
    ctx.fill();
  },
  turbo(ctx, c) {
    ctx.beginPath();
    for (const dx of [-0.42, 0.12]) {
      ctx.moveTo(dx - 0.18, 0.55);
      ctx.lineTo(dx + 0.3, 0);
      ctx.lineTo(dx - 0.18, -0.55);
    }
    tracar(ctx, c, 0.22);
  },
  ima(ctx, c) {
    ctx.beginPath();
    ctx.arc(0, 0.05, 0.5, Math.PI, 0, true);
    tracar(ctx, c, 0.34);
    for (const x of [-0.5, 0.5]) {
      ctx.beginPath();
      ctx.moveTo(x, 0.05);
      ctx.lineTo(x, 0.62);
      tracar(ctx, '#e8ecf5', 0.34);
    }
  },
  encolher(ctx, c) {
    cupula(ctx, 0, -0.45, 0.36, 0.42);
    preencher(ctx, c);
    seta(ctx, -0.95, 0.35, -0.45, 0.05, 0.22);
    seta(ctx, 0.95, 0.35, 0.45, 0.05, 0.22);
    tracar(ctx, c, 0.13);
  },
  pisoMola(ctx, c) {
    ctx.beginPath();
    ctx.moveTo(-0.85, -0.7); ctx.lineTo(0.85, -0.7);
    tracar(ctx, c, 0.16);
    mola(ctx, 0, -0.62, 0.15, 0.28, 4);
    tracar(ctx, c, 0.13);
    ctx.beginPath();
    ctx.arc(0, 0.48, 0.3, 0, Math.PI * 2);
    preencher(ctx, '#ffffff');
  },
  cola(ctx, c) {
    ctx.beginPath();
    ctx.moveTo(0, 0.9);
    ctx.quadraticCurveTo(0.7, 0.05, 0.55, -0.3);
    ctx.quadraticCurveTo(0.45, -0.6, 0.3, -0.35);
    ctx.lineTo(0.22, -0.85);
    ctx.quadraticCurveTo(0.1, -0.95, 0, -0.55);
    ctx.quadraticCurveTo(-0.15, -0.75, -0.3, -0.5);
    ctx.quadraticCurveTo(-0.7, -0.3, -0.55, 0.05);
    ctx.quadraticCurveTo(-0.45, 0.4, 0, 0.9);
    preencher(ctx, c);
  },
  pesada(ctx, c) {
    ctx.beginPath();
    ctx.arc(0, 0.42, 0.34, Math.PI * 1.05, Math.PI * -0.05, true);
    tracar(ctx, c, 0.2);
    ctx.beginPath();
    ctx.arc(0, -0.25, 0.62, 0, Math.PI * 2);
    preencher(ctx, c);
    ctx.beginPath();
    ctx.arc(-0.2, -0.05, 0.16, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fill();
  },
};

/**
 * Icone de um power-up no mundo (y para cima).
 * @param {CanvasRenderingContext2D} ctx @param {string} id @param {number} x @param {number} y @param {number} r
 */
export function desenharIcone(ctx, id, x, y, r) {
  const d = DESENHOS[id];
  if (!d) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(r, r);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  d(ctx, COR_PODER[id] || '#ffffff');
  ctx.restore();
}

/**
 * O mesmo icone num canvas de tela (y para baixo), ocupando o canvas inteiro.
 * @param {CanvasRenderingContext2D} ctx @param {string} id @param {number} lado px do canvas
 */
export function desenharIconeTela(ctx, id, lado) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, lado, lado);
  ctx.setTransform(lado / 2.3, 0, 0, -lado / 2.3, lado / 2, lado / 2);
  desenharIcone(ctx, id, 0, 0, 1);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

/**
 * Premio da trilha num canvas de tela: reacao (carinha), power-up (icone), skin (cupula na cor da
 * skin) ou Gotas (a gota azul da moeda).
 * @param {CanvasRenderingContext2D} ctx @param {{ tipo: string, id?: string }} pr @param {number} lado
 * @param {string} [cor] cor da skin
 */
export function desenharPremioTela(ctx, pr, lado, cor) {
  if (pr.tipo === 'reacao' && pr.id) { desenharCarinhaTela(ctx, pr.id, lado); return; }
  if (pr.tipo === 'powerup' && pr.id) { desenharIconeTela(ctx, pr.id, lado); return; }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, lado, lado);
  ctx.setTransform(lado / 2.3, 0, 0, -lado / 2.3, lado / 2, lado / 2);
  ctx.lineJoin = 'round';
  if (pr.tipo === 'skin') {
    cupula(ctx, 0, -0.62, 0.95, 1.2);
    preencher(ctx, cor || '#f28c3f');
    for (const x of [-0.3, 0.3]) {
      ctx.beginPath();
      ctx.arc(x, 0.05, 0.17, 0, Math.PI * 2);
      preencher(ctx, '#ffffff');
      ctx.beginPath();
      ctx.arc(x + 0.04, 0.02, 0.08, 0, Math.PI * 2);
      ctx.fillStyle = TINTA;
      ctx.fill();
    }
  } else {
    // gota da moeda
    ctx.beginPath();
    ctx.moveTo(0, 0.95);
    ctx.quadraticCurveTo(0.75, 0.05, 0.6, -0.4);
    ctx.quadraticCurveTo(0.35, -0.9, 0, -0.9);
    ctx.quadraticCurveTo(-0.35, -0.9, -0.6, -0.4);
    ctx.quadraticCurveTo(-0.75, 0.05, 0, 0.95);
    preencher(ctx, '#36c3ff');
    ctx.beginPath();
    ctx.ellipse(-0.25, -0.25, 0.14, 0.24, -0.4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fill();
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

const RAIO_BOLHA = 0.9;
/** Altura da bolha agora (ela balanca). */
const yBolha = (b, t) => b.y + Math.sin(t * 2.2) * 0.15;
/** Alfa da bolha: fantasma piscando no aviso; viva, pisca nos ultimos 2 s. */
function alfaBolha(b, t, vida) {
  if (b.fase === 'aviso') return 0.35 + 0.25 * Math.sin(t * 16);
  return vida - b.t < 2 && Math.sin(t * 18) < -0.2 ? 0.45 : 1;
}

/**
 * Nome do power-up numa etiqueta logo abaixo da bolha (pedido de 2026-10-22), em px da tela,
 * acompanhando o balanco e o pisca dela; presa dentro da tela.
 * @param {CanvasRenderingContext2D} ctx o topo
 * @param {{ id: string, x: number, y: number, fase: string, t: number }} b
 * @param {number} t @param {number} vida @param {string} texto ja traduzido
 * @param {import('./camera.js').Camera} cam @param {number} dpr @param {number} W largura (px CSS)
 */
export function desenharNomeBolha(ctx, b, t, vida, texto, cam, dpr, W) {
  if (!texto) return;
  const px = Math.round(Math.max(13, Math.min(20, cam.s * 0.5)));
  const [x, y] = paraTela(cam, b.x, yBolha(b, t) - RAIO_BOLHA);
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.globalAlpha = b.fase === 'aviso' ? Math.min(1, alfaBolha(b, t, vida) * 1.6) : alfaBolha(b, t, vida);
  ctx.font = `700 ${px}px Fredoka, system-ui, sans-serif`;
  const w = ctx.measureText(texto).width + px * 0.9;
  const h = px * 1.35;
  const cx = Math.max(w / 2 + 6, Math.min(W - w / 2 - 6, x));
  const y0 = y + px * 0.3;
  ctx.beginPath();
  ctx.roundRect(cx - w / 2, y0, w, h, h / 2);
  ctx.fillStyle = COR_PODER[b.id] || '#ffffff';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = TINTA;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = px * 0.24;
  ctx.strokeText(texto, cx, y0 + h / 2 + 1);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(texto, cx, y0 + h / 2 + 1);
  ctx.restore();
}

/**
 * Bolha de power-up: fantasma piscando no aviso; viva, balanca e pisca nos ultimos 2 s.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ id: string, x: number, y: number, fase: string, t: number }} b
 * @param {number} t s (jogo) @param {number} tr traco em u @param {number} vida s de vida da bolha
 */
export function desenharBolha(ctx, b, t, tr, vida) {
  const R = RAIO_BOLHA;
  const y = yBolha(b, t);
  const cor = COR_PODER[b.id] || '#ffffff';
  ctx.save();
  ctx.globalAlpha = alfaBolha(b, t, vida);
  if (b.fase === 'aviso') {
    ctx.setLineDash([0.22, 0.16]);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = tr * 1.6;
    ctx.beginPath();
    ctx.arc(b.x, y, R, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    desenharIcone(ctx, b.id, b.x, y, R * 0.55);
    ctx.restore();
    return;
  }
  const g = ctx.createRadialGradient(b.x - R * 0.3, y + R * 0.35, R * 0.1, b.x, y, R);
  g.addColorStop(0, 'rgba(255,255,255,0.55)');
  g.addColorStop(0.7, 'rgba(255,255,255,0.18)');
  g.addColorStop(1, cor);
  ctx.beginPath();
  ctx.arc(b.x, y, R, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = tr * 1.2;
  ctx.strokeStyle = TINTA;
  ctx.stroke();
  ctx.lineWidth = tr * 0.9;
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  ctx.arc(b.x, y, R - tr * 1.1, 0, Math.PI * 2);
  ctx.stroke();
  desenharIcone(ctx, b.id, b.x, y, R * 0.6);
  // brilho
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = tr * 1.6;
  ctx.beginPath();
  ctx.arc(b.x, y, R * 0.72, Math.PI * 0.6, Math.PI * 0.9);
  ctx.stroke();
  ctx.restore();
}

/**
 * Gelo num slime: bloco translucido (preso) ou poca escorregadia sob ele (escorrega).
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ x: number, y: number, a: number, b: number, fase: string, t: number }} s
 * @param {number} tr
 */
export function desenharGelo(ctx, s, tr) {
  ctx.save();
  if (s.fase === 'preso') {
    const m = 0.28;
    ctx.beginPath();
    ctx.roundRect(s.x - s.a - m, s.y - 0.08, 2 * (s.a + m), s.b + m + 0.3, 0.35);
    ctx.fillStyle = 'rgba(170, 230, 255, 0.5)';
    ctx.fill();
    ctx.lineWidth = tr * 1.3;
    ctx.strokeStyle = TINTA;
    ctx.stroke();
    ctx.lineWidth = tr * 1.1;
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath();
    ctx.moveTo(s.x - s.a * 0.7, s.y + s.b * 0.9);
    ctx.lineTo(s.x - s.a * 0.25, s.y + s.b + 0.15);
    ctx.moveTo(s.x - s.a * 0.85, s.y + s.b * 0.45);
    ctx.lineTo(s.x - s.a * 0.55, s.y + s.b * 0.75);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.ellipse(s.x, 0.04, s.a * 1.35, 0.22, 0, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(170, 230, 255, ${0.55 * (1 - Math.min(1, s.t / 1.5))})`;
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Aviso de efeito contra o rival: o icone piscando sobre a cabeca dele.
 * @param {CanvasRenderingContext2D} ctx @param {{ x: number, y: number, id: string }} a @param {number} t
 */
export function desenharAviso(ctx, a, t) {
  ctx.save();
  ctx.globalAlpha = 0.55 + 0.45 * Math.sin(t * 22);
  desenharIcone(ctx, a.id, a.x, a.y + Math.sin(t * 6) * 0.08, 0.55);
  ctx.restore();
}
