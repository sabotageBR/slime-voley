// Cortada em Camera Lenta (PT "Cortada Câmera Lenta", EN "Slow-Mo Spike", ES "Remate en Cámara
// Lenta"): o power-up de corte com a camera lenta do Blumgi Soccer (pedido do usuario).
//
// O TEMPO e a SENSACAO vem da captura (docs/referencias/blumgi-camera-lenta.md: mundo a ~0,06,
// entrada e saida em ~1 quadro, chutador congelado, linha que cresce com a forca, anel de impacto
// de 1,7x a 2,5x a bola em ~230 ms). A FORMA e nossa: um feixe reto na cor do time da bola ate a
// reticula (pedido de 2026-10-22; src/render/quadra.js), coroa de respingo, rastro de gotas.
//
// Puro: a partida chama elegivel(), iniciar(), passo() e mirar(); este modulo nunca toca no DOM.
// Estados: entrando -> mirando -> soltando -> (fim; a bola fica 'cortada' ate o primeiro contato).

import { prever, eixos, limitesX, RB, REDE_H, REDE_R, LARG, G_BOLA, limitar } from '../fisica/volei.js';

/**
 * Parametros (os valores medidos estao em docs/referencias). Mutavel de proposito: o
 * laboratorio do M1 (src/ui/lab.js) ajusta ao vivo; o jogo nunca escreve aqui.
 */
export const CORTADA = {
  /** escala do mundo na mira (milesimos): medido 0,06 no Blumgi */
  escalaMundo: 60,
  /** o defensor anda mais rapido que o mundo: a telegrafia funciona e a cortada nao e ponto certo */
  escalaDefensor: 300,
  /** rampas (s de jogo-real): o Blumgi entra e sai em ~1 quadro; aqui 60/40 ms tiram o tranco */
  entrada: 0.06,
  saida: 0.04,
  /** tempo maximo da mira: 1,2 s; 0,7 no 2P; 3,0 na primeira vez do tutorial */
  tMira: 1.2,
  tMira2P: 0.7,
  tMiraTutorial: 3.0,
  /**
   * o humano fica pelo menos isto na mira (gatilho "novo"): soltar antes (o toque simples) segura a
   * camera lenta ate aqui e corta com a mira padrao. No Player Fit Test de 2026-10-21, 36% das
   * partidas tiveram cortada solta em menos de 0,26 s, sem ver a camera lenta (a CPU segura 0,4-0,6 s)
   */
  tMinToque: 0.5,
  /** a bola anda no maximo isto de mundo durante a mira inteira (s) */
  orcamentoBola: 0.06,
  /** elegibilidade */
  alcance: 1.6,
  alcanceNivel: 0.1,
  alcanceLevantada: 0.4,
  alcanceTutorial: 2.4,
  yMin: 4.0,
  noArMin: 0.06,
  /** ponto de batida: acima da cupula e a frente (rumo a rede) */
  batidaAcima: 0.9,
  batidaFrente: 0.4,
  /** soltura */
  hitstop: 0.05,
  bote: 2.0,
  vCortada: 29,
  pushIn: 1.04,
  /**
   * desenho (medidos: anel 1,7x-2,5x da bola, 230 ms). gotas/gotaMin/gotaMax so servem a thumb
   * (tools/thumb.html desenha setas nos pontos de gotasDaMira); o jogo desenha o feixe reto.
   */
  gotas: 9,
  coroa: { r0: 0.5, r1: 2.8, dur: 0.23 },
  rastro: { cada: 0.03, max: 8, vida: 0.24 },
  /** raio das gotas da mira (u): a primeira e a ultima antes da gota que aponta */
  gotaMin: 0.13,
  gotaMax: 0.28,
  /** a variante "segura": soltar em menos de 200 ms sem mexer a mira devolve os 100 */
  devolucao: 0.2,
};

/**
 * @typedef {Object} Cortada
 * @property {'entrando'|'mirando'|'soltando'} fase
 * @property {number} i       quem corta (0 esquerda, 1 direita)
 * @property {number} t       s de jogo-real na fase
 * @property {number} tTotal  s de jogo-real desde o inicio
 * @property {number} tMax    mira maxima
 * @property {number} alvoX   reticula (x no piso do outro lado)
 * @property {number} bx      ponto de batida
 * @property {number} by
 * @property {number} vx      velocidade resolvida
 * @property {number} vy
 * @property {boolean} mexeu  o jogador mexeu na mira
 * @property {number} mexido  quanto a mira andou (u)
 * @property {boolean} toque  o humano soltou antes do tMinToque (o toque simples)
 * @property {boolean} gratis veio do power-up (nao gastou medidor)
 * @property {number[]} caminho trajetoria prevista (x, y, ...)
 */

/**
 * As condicoes juntas (sem o medidor: quem chama confere).
 * @param {{ slime: import('../fisica/volei.js').Slime, bola: import('../fisica/volei.js').Bola, meus: number, recepcaoSaque: boolean, bolaEspecial: boolean, toqueAnteriorMeu: boolean, nivel: number, tutorial: boolean }} c
 */
export function elegivel(c) {
  const { slime: s, bola: b } = c;
  if (s.noChao || s.tAr < CORTADA.noArMin) return false;
  if (c.meus >= 3) return false;
  if (c.recepcaoSaque || c.bolaEspecial) return false;
  if (b.y < CORTADA.yMin) return false;
  if (b.x * s.lado <= 0) return false;
  const [a, bb] = eixos(s);
  let alc = c.tutorial ? CORTADA.alcanceTutorial : CORTADA.alcance + CORTADA.alcanceNivel * Math.max(0, c.nivel - 1);
  if (c.toqueAnteriorMeu) alc += CORTADA.alcanceLevantada;
  // distancia da bola ate a cupula (aproximada pelo topo e pelos lados)
  const dx = Math.max(0, Math.abs(b.x - s.x) - a);
  const dy = Math.max(0, b.y - (s.y + bb));
  const d = Math.hypot(dx, dy) - RB;
  return d <= alc;
}

/** Ponto de batida: acima da cupula e a frente. @param {import('../fisica/volei.js').Slime} s */
export function pontoBatida(s) {
  const [, b] = eixos(s);
  const frente = -s.lado;
  return [s.x + frente * CORTADA.batidaFrente, s.y + b + CORTADA.batidaAcima + RB * 0.4];
}

/** Faixa da reticula no piso do outro lado: da rede + 1 ate LARG - 0,6. @param {number} lado de quem corta */
export function faixaAlvo(lado) {
  const o = -lado;
  const a = o * (REDE_R + 1.0);
  const b = o * (LARG - 0.6);
  return a < b ? [a, b] : [b, a];
}

/**
 * Mira padrao: no fundo, a 3 u ou mais da posicao prevista do rival; senao, o ponto mais longe.
 * @param {number} lado @param {number} rivalX @param {number} rivalVx
 */
export function miraPadrao(lado, rivalX, rivalVx) {
  const [x0, x1] = faixaAlvo(lado);
  const prev = rivalX + rivalVx * 0.3;
  const fundo = -lado * (LARG - 1.6);
  if (Math.abs(fundo - prev) >= 3) return limitar(fundo, x0, x1);
  const perto = -lado * (REDE_R + 2.2);
  if (Math.abs(perto - prev) >= 3) return limitar(perto, x0, x1);
  return Math.abs(x0 - prev) > Math.abs(x1 - prev) ? x0 : x1;
}

/**
 * Mira guiada (M2d): a ponta da faixa mais longe de onde o rival vai estar. E a mira inicial da
 * cortada do humano (quem so toca corta com ela; quem segura mexe a partir dela) e a da cortada
 * guiada da 1a partida. Com a mira padrao (o fundo), a CPU lia a reticula e ja estava embaixo: o
 * novato simulado tentava duas cortadas por partida e quase nenhuma virava ponto.
 * @param {number} lado de quem corta @param {number} rivalX @param {number} [rivalVx]
 */
export function miraGuiada(lado, rivalX, rivalVx = 0) {
  const [x0, x1] = faixaAlvo(lado);
  const prev = rivalX + rivalVx * 0.3;
  return Math.abs(x0 - prev) > Math.abs(x1 - prev) ? x0 : x1;
}

/**
 * Resolve o tiro: o angulo mais ingreme (de -75 a +30 graus da horizontal, rumo ao outro lado)
 * cuja velocidade (bisseccao analitica, com vento) leva a bola ao alvo, sem passar de V_CORTADA,
 * cruzando a rede acima de REDE_H + RB + 0,25 e sem raspar o topo do poste em nenhum ponto do
 * voo (o tiro curto que desce logo depois da rede batia nela). Sem solucao, levanta o arco.
 * @param {number} bx @param {number} by @param {number} alvoX @param {number} lado de quem corta
 * @param {{ vento?: number }} [o]
 * @returns {{ vx: number, vy: number, ok: boolean }}
 */
export function resolverTiro(bx, by, alvoX, lado, o = {}) {
  const w = o.vento || 0;
  const dir = -lado;
  const g = G_BOLA;
  const livre = REDE_H + RB + 0.25;
  // topo do poste (capsula de raio REDE_R ate REDE_H - REDE_R) e a folga minima do centro da bola
  const topoPoste = REDE_H - REDE_R;
  const folga = REDE_R + RB + 0.08;
  /**
   * O voo (vx, vy) por t s passa longe do poste? Distancia do centro ao segmento do poste em 20
   * amostras do trecho em que a bola esta a menos de `folga` dele em x (o vento entra so no x).
   */
  const limpo = (vx, vy, t) => {
    if (vx === 0) return Math.abs(bx) > folga;
    let tA = (-folga - bx) / vx;
    let tB = (folga - bx) / vx;
    if (tA > tB) [tA, tB] = [tB, tA];
    tA = Math.max(0, tA - 0.05);
    tB = Math.min(t, tB + 0.05);
    for (let k = 0; k <= 20 && tA <= tB; k++) {
      const tk = tA + ((tB - tA) * k) / 20;
      const xk = bx + vx * tk + 0.5 * w * tk * tk;
      const yk = by + vy * tk - (g * tk * tk) / 2;
      const dy = yk > topoPoste ? yk - topoPoste : 0;
      if (xk * xk + dy * dy < folga * folga) return false;
    }
    return true;
  };
  /** queda, altura na rede e se o voo passa longe do poste, para (v, ang) */
  const voo = (v, ang) => {
    const vx = Math.cos(ang) * v * dir;
    const vy = Math.sin(ang) * v;
    // y(t) = by + vy t - g t^2/2 = RB
    const disc = vy * vy + 2 * g * (by - RB);
    if (disc < 0) return null;
    const t = (vy + Math.sqrt(disc)) / g;
    const x = bx + vx * t + 0.5 * w * t * t;
    // altura ao cruzar x = 0 (sem vento na conta da rede: o vento e pequeno)
    let yRede = Infinity;
    if (vx !== 0) {
      const tr = -bx / vx;
      if (tr > 0 && tr < t) yRede = by + vy * tr - (g * tr * tr) / 2;
    }
    return { x, yRede, limpo: () => limpo(vx, vy, t) };
  };
  for (let graus = -75; graus <= 30; graus += 2) {
    const ang = (graus * Math.PI) / 180;
    let lo = 2;
    let hi = CORTADA.vCortada;
    const fLo = voo(lo, ang);
    const fHi = voo(hi, ang);
    if (!fLo || !fHi) continue;
    // a distancia cresce com v (tiro para baixo/rasante)
    const dLo = (fLo.x - alvoX) * dir;
    const dHi = (fHi.x - alvoX) * dir;
    if (dLo > 0 || dHi < 0) continue;
    for (let k = 0; k < 22; k++) {
      const mid = (lo + hi) / 2;
      const f = voo(mid, ang);
      if (!f) break;
      if ((f.x - alvoX) * dir < 0) lo = mid; else hi = mid;
    }
    const v = (lo + hi) / 2;
    const f = voo(v, ang);
    if (!f || f.yRede < livre || !f.limpo()) continue;
    return { vx: Math.cos(ang) * v * dir, vy: Math.sin(ang) * v, ok: true };
  }
  // sem solucao: lob ate o alvo, o mais baixo que passa limpo (o alvo colado na rede pede o arco
  // que desce quase na vertical)
  for (let t = 1.1; t <= 2.4; t += 0.1) {
    const vy = (RB - by + (g * t * t) / 2) / t;
    const vx = (alvoX - bx - 0.5 * w * t * t) / t;
    if (limpo(vx, vy, t)) return { vx, vy, ok: false };
  }
  const t = 2.4;
  return { vx: (alvoX - bx - 0.5 * w * t * t) / t, vy: (RB - by + (g * t * t) / 2) / t, ok: false };
}

/**
 * Comeca a cortada (a partida ja conferiu elegivel() e o medidor).
 * @param {number} i @param {import('../fisica/volei.js').Slime} s
 * @param {{ tMax: number, alvoX: number, gratis: boolean, vento?: number }} o
 * @returns {Cortada}
 */
export function iniciar(i, s, o) {
  const [bx, by] = pontoBatida(s);
  const c = { fase: /** @type {'entrando'} */ ('entrando'), i, t: 0, tTotal: 0, tMax: o.tMax, alvoX: o.alvoX, bx, by, vx: 0, vy: 0, mexeu: false, mexido: 0, toque: false, gratis: o.gratis, caminho: [] };
  resolver(c, s.lado, o.vento);
  return c;
}

/** Recalcula o tiro e a trajetoria prevista. @param {Cortada} c @param {number} lado @param {number} [vento] */
export function resolver(c, lado, vento = 0) {
  const r = resolverTiro(c.bx, c.by, c.alvoX, lado, { vento });
  c.vx = r.vx;
  c.vy = r.vy;
  c.caminho.length = 0;
  prever({ x: c.bx, y: c.by, vx: r.vx, vy: r.vy, estado: 'cortada', semLimite: true, fundo: [false, false] }, { tMax: 2, vento, semVmax: true, caminho: c.caminho, cada: 2 });
}

/**
 * Move a reticula (u no piso), presa na faixa.
 * @param {Cortada} c @param {number} lado @param {number} dx (u, + = mais fundo) @param {number} [vento]
 */
export function mirar(c, lado, dx, vento = 0) {
  if (!dx) return;
  const [x0, x1] = faixaAlvo(lado);
  const antes = c.alvoX;
  c.alvoX = limitar(c.alvoX + dx * -lado, x0, x1);
  const d = Math.abs(c.alvoX - antes);
  if (d > 0) { c.mexeu = true; c.mexido += d; }
  resolver(c, lado, vento);
}

/** Reticula num x absoluto (mouse). @param {Cortada} c @param {number} lado @param {number} x */
export function mirarEm(c, lado, x, vento = 0) {
  const [x0, x1] = faixaAlvo(lado);
  const nx = limitar(x, x0, x1);
  if (Math.abs(nx - c.alvoX) < 0.02) return;
  c.mexido += Math.abs(nx - c.alvoX);
  c.mexeu = true;
  c.alvoX = nx;
  resolver(c, lado, vento);
}

/**
 * Escala do mundo (milesimos) na fase atual, com as rampas.
 * @param {any} c @param {{ escalaMundo?: number, escalaDefensor?: number, entrada?: number, saida?: number }} [aj]
 * @returns {{ mundo: number, defensor: number, bola: number }}
 */
export function escalas(c, aj = {}) {
  const em = aj.escalaMundo ?? CORTADA.escalaMundo;
  const ed = aj.escalaDefensor ?? CORTADA.escalaDefensor;
  const ent = aj.entrada ?? CORTADA.entrada;
  const bola = Math.round((CORTADA.orcamentoBola / c.tMax) * 1000);
  if (c.fase === 'entrando') {
    const k = ent > 0 ? Math.min(1, c.t / ent) : 1;
    const e = 1 - Math.pow(1 - k, 3);
    return { mundo: Math.round(1000 + (em - 1000) * e), defensor: Math.round(1000 + (ed - 1000) * e), bola: 0 };
  }
  if (c.fase === 'mirando') return { mundo: em, defensor: ed, bola };
  // soltando: depois do hitstop, o mundo volta ao normal em `saida` s
  const sai = aj.saida ?? CORTADA.saida;
  const k = sai > 0 ? Math.max(0, Math.min(1, (c.t - CORTADA.hitstop) / sai)) : 1;
  return { mundo: Math.round(em + (1000 - em) * k), defensor: Math.round(ed + (1000 - ed) * k), bola: 1000 };
}

/** Pontos ao longo da trajetoria: [x, y, r] x n (so a thumb usa: as setas dela vao nestes pontos). */
export function gotasDaMira(c) {
  const n = CORTADA.gotas;
  const v = Math.hypot(c.vx, c.vy);
  const L = 2.5 + 4.5 * Math.min(1, v / CORTADA.vCortada);
  const out = [];
  const pts = c.caminho;
  let acum = 0;
  let px = c.bx;
  let py = c.by;
  let k = 0;
  const passo = L / n;
  for (let j = 0; j + 1 < pts.length && k < n; j += 2) {
    const x = pts[j];
    const y = pts[j + 1];
    acum += Math.hypot(x - px, y - py);
    px = x;
    py = y;
    if (acum >= passo * (k + 1)) {
      const f = (k + 1) / n;
      out.push(x, y, CORTADA.gotaMin + (CORTADA.gotaMax - CORTADA.gotaMin) * f);
      k++;
    }
  }
  return out;
}

export { limitesX };
