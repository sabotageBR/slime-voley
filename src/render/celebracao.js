// Comemoracao do ponto (porte de stringcut/src/render/transicoes.js): o RITMO do Blumgi Soccer
// (docs/referencias/blumgi-soccer-gol.md) com a forma da gosma. Tudo e funcao pura do tempo t
// (s de jogo-real desde o ponto) e da semente: o ?quadro=ms congela qualquer instante.
//
// COMPLETA (1,8 s): close de 1 a 1,40 (paisagem) ou 1,25 (retrato) em 160 ms, focado a 65% do
// caminho ate o impacto, com tremor; confete em cone (60% gotinhas, 40% quadradinhos, 4 tons do
// time); palavra de gosma (face branca, contorno e extrusao na cor escura do time, gotas que
// escorrem) dos 150 ms ate 1,1 s, quando amassa e e lancada para cima; placar gigante de 1,25 a
// 1,6 s. CURTA (1,0 s): close de 1,12, 40% do confete e a palavra media perto do impacto.

import { aplicar, paraTela } from './camera.js';
import { TINTA } from './fundo.js';
import { desenharTaca } from './chave.js';

const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const easeOut = (u) => 1 - Math.pow(1 - clamp(u), 3);
const easeIn = (u) => Math.pow(clamp(u), 3);
const backOut = (u) => { const c = 1.9; const x = clamp(u) - 1; return 1 + (c + 1) * x * x * x + c * x * x; };

function rng(s) {
  let a = s >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Cor (hex) misturada com branco (f > 0) ou escurecida (f < 0). */
export function tonalidade(hex, f) {
  const n = parseInt((hex || '#888888').slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

/**
 * @typedef {Object} Festa
 * @property {number} t          s desde o ponto
 * @property {'completa'|'curta'} tipo
 * @property {number} lado       quem marcou (-1/1)
 * @property {string} texto      palavra ja traduzida ('' = sem palavra)
 * @property {number} x          onde a bola caiu (u)
 * @property {string} cor        cor do time de quem marcou
 * @property {number[]} placar
 * @property {number} semente
 * @property {boolean} [cpu]     ponto da CPU (assimetrica, sem confete forte)
 * @property {boolean} [fim]     ultimo ponto da partida
 * @property {string} [textoFim] VITORIA!/DERROTA
 * @property {boolean} [derrota]
 * @property {number} [trauma]   0,35 | 0,55 (ace/bomba) | 0,7 (super)
 * @property {boolean} [campeao] a final da Copa vencida pelo jogador: o letreiro, o foco e a taca
 */

/**
 * Pedido de camera da comemoracao.
 * @param {Festa} f @param {boolean} retrato
 * @returns {{ zoom: number, foco: number[] }}
 */
export function cameraFesta(f, retrato) {
  const t = f.t;
  const foco = [f.x, 1.6];
  if (f.tipo === 'curta') {
    if (t < 0.04 || t > 0.75) return { zoom: 1, foco };
    const z = t < 0.2 ? easeOut((t - 0.04) / 0.16) : t > 0.55 ? 1 - easeOut((t - 0.55) / 0.2) : 1;
    return { zoom: 1 + 0.12 * z, foco };
  }
  const zMax = retrato ? 1.25 : 1.4;
  if (t < 0.04) return { zoom: 1, foco };
  if (t < 0.2) return { zoom: 1 + (zMax - 1) * easeOut((t - 0.04) / 0.16), foco };
  if (t < 1.0) return { zoom: zMax + 0.04 * ((t - 0.2) / 0.8), foco };
  if (t < 1.38) return { zoom: 1 + (zMax + 0.04 - 1) * (1 - easeOut((t - 1.0) / 0.38)), foco };
  return { zoom: 1, foco };
}

/** Quantidade de confete por qualidade (completa / curta). */
export const CONFETE = Object.freeze({ alta: [160, 64], media: [100, 40], baixa: [60, 24], minima: [40, 16] });

/**
 * Confete em cone (u, mundo): sai do impacto para cima, +-60 graus, g = 14, vida 1,6 a 2,2 s.
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('./camera.js').Camera} cam
 * @param {number} dpr @param {Festa} f @param {number} n
 */
function confete(ctx, cam, dpr, f, n, tons) {
  const t = f.t - 0.09;
  if (t < 0 || t > 2.3) return;
  aplicar(ctx, cam, dpr);
  const r = rng(f.semente);
  const g = 14;
  for (let i = 0; i < n; i++) {
    const ang = Math.PI / 2 + (r() * 2 - 1) * (Math.PI / 3);
    const v = 8 + r() * 9;
    const vida = 1.6 + r() * 0.6;
    const ehGota = r() < 0.6;
    const tam = 0.13 + r() * 0.13;
    const cor = tons[Math.floor(r() * tons.length)];
    const giro = r() * TAU;
    const vg = 4 + r() * 8;
    if (t > vida) continue;
    // arrasto leve: x satura, y com gravidade
    const k = 1.1;
    const e = Math.exp(-k * t);
    const fx = (1 - e) / k;
    const x = f.x + Math.cos(ang) * v * fx + Math.sin(t * 5 + i) * 0.12;
    const y = 0.3 + Math.sin(ang) * v * fx - (g / k) * (t - fx);
    if (y < -0.2) continue;
    ctx.globalAlpha = t > vida - 0.4 ? clamp((vida - t) / 0.4) : 1;
    ctx.fillStyle = cor;
    if (ehGota) {
      // gotinha: circulo com contorno de tinta e brilho
      ctx.beginPath();
      ctx.arc(x, y, tam * 0.75, 0, TAU);
      ctx.fill();
      ctx.lineWidth = Math.max(0.025, 1.1 / cam.s);
      ctx.strokeStyle = TINTA;
      ctx.stroke();
    } else {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(giro + t * vg);
      ctx.scale(1, Math.cos(t * (8 + vg) + i));
      ctx.fillRect(-tam / 2, -tam / 2, tam, tam * 0.7);
      ctx.restore();
    }
  }
  ctx.globalAlpha = 1;
}

/** Palavra de gosma: face branca, contorno e extrusao (6 camadas) na cor escura, gotas escorrendo. */
export function palavraGosma(ctx, txt, x, y, tam, cor, alfa = 1, escorre = 0) {
  const escura = tonalidade(cor, -0.55);
  ctx.save();
  ctx.globalAlpha = alfa;
  ctx.font = `700 ${tam}px Fredoka, "Arial Rounded MT Bold", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  const camadas = 6;
  const passo = Math.max(0.8, tam * 0.012);
  for (let k = camadas; k >= 1; k--) {
    ctx.strokeStyle = escura;
    ctx.lineWidth = tam * 0.17;
    ctx.strokeText(txt, x, y + k * passo);
    ctx.fillStyle = escura;
    ctx.fillText(txt, x, y + k * passo);
  }
  ctx.strokeStyle = TINTA;
  ctx.lineWidth = tam * 0.2;
  ctx.strokeText(txt, x, y);
  ctx.strokeStyle = cor;
  ctx.lineWidth = tam * 0.13;
  ctx.strokeText(txt, x, y);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(txt, x, y);
  // gotas que escorrem da base das letras
  if (escorre > 0) {
    const w = ctx.measureText(txt).width;
    const r = rng(txt.length * 31 + 7);
    const n = 3 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) {
      const gx = x - w / 2 + w * (0.12 + 0.76 * r());
      const comp = tam * (0.18 + 0.32 * r()) * escorre;
      const gy = y + tam * 0.36 + camadas * passo;
      const gr = tam * (0.05 + 0.03 * r());
      ctx.fillStyle = cor;
      ctx.strokeStyle = TINTA;
      ctx.lineWidth = Math.max(1.2, tam * 0.025);
      ctx.beginPath();
      ctx.moveTo(gx - gr, gy - gr);
      ctx.lineTo(gx - gr * 0.7, gy + comp);
      ctx.arc(gx, gy + comp, gr * 0.75, Math.PI, 0, true);
      ctx.lineTo(gx + gr, gy - gr);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** Tamanho que cabe: a palavra ocupa no maximo `maxW` px. */
export function cabe(ctx, txt, tam, maxW) {
  ctx.font = `700 ${tam}px Fredoka, system-ui, sans-serif`;
  const w = ctx.measureText(txt).width * 1.18;
  return w > maxW ? tam * (maxW / w) : tam;
}

/**
 * Desenha a comemoracao: confete (mundo, pela camera) e palavra/placar gigante (tela).
 * @param {CanvasRenderingContext2D} ctx  o canvas de cima do HUD (ou o topo)
 * @param {import('./camera.js').Camera} cam
 * @param {number} dpr @param {number} W @param {number} H
 * @param {Festa} f
 * @param {{ quadra: { x: number, y: number, w: number, h: number }, qualidade: string, retrato: boolean }} o
 */
export function desenharFesta(ctx, cam, dpr, W, H, f, o) {
  const completa = f.tipo === 'completa';
  const tons = [f.cor, tonalidade(f.cor, 0.35), tonalidade(f.cor, 0.65), tonalidade(f.cor, -0.25), '#ffffff'];
  const q = CONFETE[o.qualidade] || CONFETE.media;
  if (f.campeao) { desenharCampeao(ctx, cam, dpr, W, H, f, o, q[0], tons); return; }
  if (!f.cpu && !f.derrota) confete(ctx, cam, dpr, f, completa ? q[0] : Math.round(q[0] * 0.4), tons);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const Q = o.quadra;
  // palavra
  const txt = f.fim ? f.textoFim || '' : f.texto;
  if (txt) {
    const t0 = 0.15;
    const sai = f.fim ? 2.3 : completa ? 1.1 : 0.72;
    const t = f.t - t0;
    if (t >= 0 && t <= sai - t0 + 0.32) {
      const base = completa || f.fim ? Math.min(Q.w * 0.18, Q.h * 0.26, 150) : Math.min(Q.w * 0.1, Q.h * 0.16, 80);
      const tam = cabe(ctx, txt, base, Q.w * 0.7);
      const u = t / 0.28;
      let esc = u < 1 ? 1.2 * backOut(u) - (u > 0.7 ? 0.2 * ((u - 0.7) / 0.3) : 0) : 1;
      esc = Math.max(0, esc);
      let rot = u < 1 ? (-6 + 6 * easeOut(u)) * (Math.PI / 180) : Math.sin(t * 5) * 2 * (Math.PI / 180);
      const [ix] = paraTela(cam, f.x, 0);
      let x = completa || f.fim ? Q.x + Q.w / 2 + (ix - (Q.x + Q.w / 2)) * 0.25 : Math.max(Q.x + tam * 1.6, Math.min(Q.x + Q.w - tam * 1.6, ix));
      let y = completa || f.fim ? Q.y + Q.h * 0.36 : Q.y + Q.h * 0.42;
      let sy = 1;
      const tSai = t - (sai - t0);
      if (tSai > 0) {
        // amassa e e lancada para cima
        const v = tSai / 0.3;
        sy = v < 0.3 ? 1 - 0.35 * (v / 0.3) : 0.65 + 0.6 * (v - 0.3);
        y -= easeIn(v) * (Q.h * 0.5 + tam);
        rot += v * 0.2 * f.lado;
      }
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.scale(esc * (2 - sy) * 0.5 + esc * 0.5, esc * sy);
      palavraGosma(ctx, txt, 0, 0, tam, f.derrota ? '#7a7f95' : f.cor, clamp(u * 3), completa ? clamp((t - 0.25) / 0.5) : clamp((t - 0.2) / 0.4) * 0.6);
      ctx.restore();
    }
  }
  // placar gigante
  if (completa && !f.fim && f.t >= 1.25 && f.t <= 1.75) {
    const t = f.t - 1.25;
    const a = t < 0.12 ? easeOut(t / 0.12) : t > 0.35 ? 1 - easeIn((t - 0.35) / 0.15) : 1;
    const tam = Math.min(Q.w * 0.16, Q.h * 0.24, 130);
    const txtP = `${f.placar[0]} · ${f.placar[1]}`;
    ctx.save();
    ctx.translate(Q.x + Q.w / 2, Q.y + Q.h * 0.4);
    ctx.scale(0.8 + 0.2 * a, 0.8 + 0.2 * a);
    palavraGosma(ctx, txtP, 0, 0, tam, f.cor, a, 0);
    ctx.restore();
  }
}

const OURO = '#ffc83a';

/** Enquadramento do campeao: o slime do jogador grande, embaixo, com espaco para o letreiro e a taca. */
export const QUADRO_CAMPEAO = Object.freeze({ esq: 3.6, dir: 3.6, baixo: -0.4, cima: 6.2, entra: 0.25, dur: 0.9 });

/** Quanto a camera ja fechou no campeao (0..1) no instante t da festa. @param {number} t */
export const focoCampeao = (t) => { const u = clamp((t - QUADRO_CAMPEAO.entra) / QUADRO_CAMPEAO.dur); return u * u * (3 - 2 * u); };

/**
 * Titulo da Copa (pedido de 2026-10-22: "um letreiro bem grande escrito campeao e ele em foco"):
 * holofote no slime do jogador (a camera ja fechou nele, cena.js), confete em cone e chuva de
 * confete dourado pela tela, a taca descendo sobre a cabeca dele e o letreiro gigante, que fica.
 * @param {{ foco?: number[], cabeca?: number[] }} o foco e cabeca: px CSS do slime do jogador
 */
function desenharCampeao(ctx, cam, dpr, W, H, f, o, n, tons) {
  const t = f.t;
  confete(ctx, cam, dpr, f, n, tons);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const k = focoCampeao(t);
  // holofote: escurece tudo fora do slime
  if (o.foco && k > 0) {
    const [fx, fy] = o.foco;
    const r1 = Math.max(70, cam.s * 2.1);
    const g = ctx.createRadialGradient(fx, fy, r1 * 0.6, fx, fy, r1 + Math.max(W, H) * 0.6);
    g.addColorStop(0, 'rgba(14,10,30,0)');
    g.addColorStop(0.3, `rgba(14,10,30,${0.45 * k})`);
    g.addColorStop(1, `rgba(14,10,30,${0.72 * k})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  // chuva de confete (px da tela): dourado, a cor do jogador e branco
  if (t > 0.3) {
    const r = rng(f.semente ^ 0x9e3779b9);
    const cores = [OURO, OURO, f.cor, tonalidade(f.cor, 0.45), '#ffffff'];
    const tt = t - 0.3;
    for (let i = 0; i < n; i++) {
      const x0 = r() * W;
      const vel = 70 + r() * 110;
      const atraso = r() * 1.2;
      const tam = 5 + r() * 6;
      const cor = cores[Math.floor(r() * cores.length)];
      const giro = 3 + r() * 6;
      const u = tt - atraso;
      if (u < 0) continue;
      const y = -20 + ((u * vel) % (H + 40));
      const x = x0 + Math.sin(u * 2 + i) * 14;
      ctx.save();
      ctx.globalAlpha = clamp(u * 3);
      ctx.translate(x, y);
      ctx.rotate(u * giro + i);
      ctx.scale(1, Math.cos(u * giro * 1.3 + i));
      ctx.fillStyle = cor;
      ctx.fillRect(-tam / 2, -tam * 0.35, tam, tam * 0.7);
      ctx.restore();
    }
  }
  // o letreiro gigante (no terco de cima): entra com mola e fica, balancando de leve
  const txt = f.textoFim || '';
  const tam = txt ? cabe(ctx, txt, Math.min(H * 0.24, 220), W * 0.9) : 0;
  const yTxt = Math.max(H * 0.25, tam * 0.62 + 46);
  // a taca desce e quica sobre a cabeca do campeao (nunca atras do letreiro, nem quando ele pula)
  if (o.cabeca && t > 0.9) {
    const s = Math.max(48, Math.min(140, cam.s * 1.25));
    const u = (t - 0.9) / 0.55;
    const [cx, cy] = o.cabeca;
    const alvo = Math.max(cy - s * 1.02, yTxt + tam * 0.5 + 8) + Math.sin(t * 3) * s * 0.03;
    const y = u < 1 ? -s + (alvo + s) * backOut(u) : alvo;
    desenharTaca(ctx, cx, y, s, 0.6 + 0.4 * Math.sin(t * 4));
  }
  if (txt && t >= 0.15) {
    const u = (t - 0.15) / 0.35;
    const esc = (u < 1 ? backOut(u) : 1) * (1 + 0.03 * Math.sin(t * 4));
    const y = yTxt;
    ctx.save();
    ctx.translate(W / 2, y);
    ctx.rotate(Math.sin(t * 2.4) * 2.2 * (Math.PI / 180));
    ctx.scale(esc, esc);
    palavraGosma(ctx, txt, 0, 0, tam, OURO, clamp(u * 3), clamp((t - 0.4) / 0.6));
    ctx.restore();
  }
}

/** Quanto a camera fecha no slime do jogador na transicao direta (o presente), no instante t. @param {number} t */
export const focoPresente = (t) => {
  const u = clamp((t - 0.4) / 0.55);
  const v = clamp((t - 1.85) / 0.35);
  return u * u * (3 - 2 * u) * (1 - v * v * (3 - 2 * v)) * 0.8;
};

/**
 * O presente da 1a vitoria na quadra (a transicao direta da 1a para a 2a partida, M2d): um holofote
 * leve no slime do jogador, o "NOVO!" dourado com o nome do item embaixo (o item desce na cabeca dele,
 * src/render/acessorios.js) e, se subiu de nivel, o "NIVEL 2!".
 * @param {{ foco?: number[], t: number, titulo: string, novo: string, nivel: string }} o foco: px CSS
 */
export function desenharPresente(ctx, cam, dpr, W, H, o) {
  const t = o.t;
  if (t < 0.4) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const k = focoPresente(t) / 0.8;
  if (o.foco && k > 0) {
    const [fx, fy] = o.foco;
    const r1 = Math.max(70, cam.s * 2.3);
    const g = ctx.createRadialGradient(fx, fy, r1 * 0.6, fx, fy, r1 + Math.max(W, H) * 0.6);
    g.addColorStop(0, 'rgba(14,10,30,0)');
    g.addColorStop(0.35, `rgba(14,10,30,${0.3 * k})`);
    g.addColorStop(1, `rgba(14,10,30,${0.5 * k})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  const fora = clamp((t - 1.95) / 0.25);
  const txt = o.novo ? o.titulo : '';
  const tam = txt ? cabe(ctx, txt, Math.min(H * 0.14, 120), W * 0.8) : 0;
  const y = Math.max(H * 0.2, tam * 0.62 + 40);
  if (txt && t >= 1.0) {
    const u = (t - 1.0) / 0.3;
    const esc = (u < 1 ? backOut(u) : 1) * (1 + 0.03 * Math.sin(t * 5));
    ctx.save();
    ctx.translate(W / 2, y);
    ctx.scale(esc, esc);
    palavraGosma(ctx, txt, 0, 0, tam, OURO, clamp(u * 3) * (1 - fora), 0);
    ctx.restore();
    const tam2 = cabe(ctx, o.novo, tam * 0.42, W * 0.8);
    palavraGosma(ctx, o.novo, W / 2, y + tam * 0.62, tam2, '#ffffff', clamp((t - 1.15) * 4) * (1 - fora), 0);
  }
  if (o.nivel && t >= 1.35) {
    const tam3 = cabe(ctx, o.nivel, Math.min(H * 0.06, 44), W * 0.6);
    palavraGosma(ctx, o.nivel, W / 2, y + tam * 1.1 + tam3, tam3, '#b38cff', clamp((t - 1.35) * 4) * (1 - fora), 0);
  }
}

/**
 * O letreiro da fase quando a 2a partida entra na transicao direta ("OITAVAS!"): entra com mola,
 * fica e sai amassando para cima, no terco de cima da quadra.
 * @param {{ quadra: { x: number, y: number, w: number, h: number } }} o
 */
export function desenharLetreiro(ctx, dpr, t, o, txt, cor) {
  if (t < 0 || t > 1.6 || !txt) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const Q = o.quadra;
  const tam = cabe(ctx, txt, Math.min(Q.w * 0.14, Q.h * 0.2, 110), Q.w * 0.9);
  const u = t / 0.3;
  const sai = clamp((t - 1.3) / 0.3);
  const esc = u < 1 ? 1.25 * backOut(u) : 1;
  ctx.save();
  ctx.translate(Q.x + Q.w / 2, Q.y + Q.h * 0.34 - sai * Q.h * 0.08);
  ctx.scale(esc * (1 - sai * 0.3), esc * (1 + sai * 0.4));
  palavraGosma(ctx, txt, 0, 0, tam, cor, clamp(u * 3) * (1 - sai), clamp((t - 0.2) / 0.5));
  ctx.restore();
}

/**
 * Inicio da partida e volta da pausa: placar "0 · 0" e "VAI!" (nunca "READY?").
 * @param {CanvasRenderingContext2D} ctx @param {number} dpr @param {number} t s desde o inicio
 * @param {{ quadra: { x: number, y: number, w: number, h: number } }} o
 * @param {string} txt VAI! / GO! / ¡YA! @param {number[]} placar @param {string} cor
 */
export function desenharInicio(ctx, dpr, t, o, txt, placar, cor) {
  if (t < 0 || t > 1.3) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const Q = o.quadra;
  const tam = Math.min(Q.w * 0.15, Q.h * 0.22, 120);
  if (t < 0.6) {
    const a = t < 0.1 ? t / 0.1 : t > 0.45 ? 1 - (t - 0.45) / 0.15 : 1;
    palavraGosma(ctx, `${placar[0]} · ${placar[1]}`, Q.x + Q.w / 2, Q.y + Q.h * 0.38, tam * 0.8, cor, clamp(a), 0);
  } else {
    const u = (t - 0.6) / 0.25;
    const esc = u < 1 ? 1.3 * backOut(u) : 1;
    const a = t > 1.1 ? 1 - (t - 1.1) / 0.2 : 1;
    ctx.save();
    ctx.translate(Q.x + Q.w / 2, Q.y + Q.h * 0.38);
    ctx.scale(esc, esc);
    palavraGosma(ctx, txt, 0, 0, tam, cor, clamp(a), clamp((t - 0.7) / 0.3));
    ctx.restore();
  }
}
