// Juiz da rede (pedido de 2026-10-22): um humano pequeno, de bigode, numa cadeirinha atras do
// poste. Puro (rng proprio, sem DOM): a cabeca e os olhos acompanham a bola, no ponto ele aponta
// quem ganhou e, quando a bola passa por ele, as vezes leva a bolada. Ele fica atras da rede, em
// profundidade: a bola so pega quando passa "no plano dele" (sorteio). A bola NUNCA desvia (decisao
// do usuario: "quase nao desvia"): a fisica, a IA e o hash() da partida nao mudam; o juiz so sofre
// as consequencias (test/juiz.test.js).
//
// Reacoes da bolada (sorteadas; as fortes derrubam): tombo (cai da cadeira e sobe pela escadinha),
// pendurado (fica pendurado na cadeira e se puxa), piao (gira e fica tonto), galo (cresce um galo),
// apito (o apito voa e ele pega no ar), bone (o bone voa e cai de volta na cabeca), bigode (entorta
// e ele arruma), cartao (cartao amarelo para a bola). Em todas ele volta ao posto em <= 2,5 s.

import { criarRng, hashTexto } from '../core/rng.js';
import { RB } from '../fisica/volei.js';

/** Medidas (u) e chances. */
export const JUIZ = Object.freeze({
  x: 0,
  /** plataforma da cadeira (os pes), logo acima do topo do poste */
  piso: 2.62,
  /** circulo do corpo para a bolada (cabeca + tronco), acima dos pes */
  corpoDy: 0.72,
  corpoR: 0.6,
  /** chance de a bola que passa por ele pegar "no plano dele" (forte: rapida, cortada ou poder) */
  chance: 0.04,
  chanceForte: 0.09,
  vForte: 20,
  g: 26,
  /** quanto a cabeca demora a seguir o olhar (1/s) */
  segue: 7,
  /** nenhuma reacao passa disto ate ele estar de volta no posto */
  durMax: 2.5,
});

export const REACOES_FORTES = Object.freeze(['tombo', 'pendurado', 'piao', 'galo']);
export const REACOES_FRACAS = Object.freeze(['bigode', 'bone', 'apito', 'cartao', 'galo', 'piao']);

/**
 * @typedef {Object} Juiz
 * @property {'posto'|'bolada'} fase
 * @property {string} reacao
 * @property {number} t      s de mundo na reacao
 * @property {number} dur
 * @property {number} x      pes
 * @property {number} y
 * @property {number} ang    giro do corpo (rad, em volta do meio do corpo)
 * @property {number} vx
 * @property {number} vy
 * @property {number} angV
 * @property {number} giro   meia-volta do piao (cos do giro no desenho)
 * @property {{ x: number, y: number, ang: number }} ant  posicao no passo anterior (interpolacao)
 * @property {number} olhar  -1..1 (para onde a cabeca vira, em x)
 * @property {number} olharY -1..1
 * @property {number} aponta -1, 0 ou 1 (o braco aponta o lado de quem ganhou o ponto)
 * @property {number} braco  0..1 (o braco subindo)
 * @property {number} piscar s
 * @property {boolean} dentro a bola estava dentro do corpo no passo anterior
 * @property {null|{ tipo: string, x: number, y: number, vx: number, vy: number, ang: number, angV: number }} objeto apito ou bone voando
 * @property {number} bigode  angulo do bigode torto
 * @property {number} galo    0..1
 * @property {number} tonto   s de estrelinhas
 * @property {number} cartao  0..1 (cartao amarelo erguido)
 * @property {number} lado    para onde foi empurrado (-1 ou 1)
 * @property {number} sub     subfase do tombo (0 voando, 1 deitado, 2 levantando, 3 subindo)
 * @property {number} tSub
 * @property {number} boladas
 */

/** @param {number} semente @returns {Juiz & { rng: () => number }} */
export function criarJuiz(semente = 1) {
  return {
    rng: criarRng(((semente >>> 0) ^ hashTexto('juiz')) >>> 0),
    fase: 'posto', reacao: '', t: 0, dur: 0,
    x: JUIZ.x, y: JUIZ.piso, ang: 0, vx: 0, vy: 0, angV: 0, giro: 0,
    ant: { x: JUIZ.x, y: JUIZ.piso, ang: 0 },
    olhar: 0, olharY: 0, aponta: 0, braco: 0, piscar: 0, dentro: false,
    objeto: null, bigode: 0, galo: 0, tonto: 0, cartao: 0, lado: 1, sub: 0, tSub: 0, boladas: 0,
  };
}

const lim = (v, a, b) => (v < a ? a : v > b ? b : v);
/** aproxima v de alvo com taxa k (1/s) */
const seguir = (v, alvo, k, dt) => v + (alvo - v) * Math.min(1, k * dt);

/** Sorteia a reacao e prepara o corpo. */
function levarBolada(j, bola, forte) {
  const lista = forte ? REACOES_FORTES : REACOES_FRACAS;
  const r = lista[Math.min(lista.length - 1, Math.floor(j.rng() * lista.length))];
  const lado = bola.vx === 0 ? (j.rng() < 0.5 ? -1 : 1) : Math.sign(bola.vx);
  j.fase = 'bolada';
  j.reacao = r;
  j.t = 0;
  j.lado = lado;
  j.boladas++;
  j.piscar = 0.3;
  j.vx = 0; j.vy = 0; j.angV = 0;
  j.sub = 0;
  j.tSub = 0;
  if (r === 'tombo') {
    j.vx = lado * (1.6 + 0.08 * Math.min(20, Math.abs(bola.vx)));
    j.vy = 4.5;
    j.angV = lado * -2.3;
    j.dur = JUIZ.durMax;
  } else if (r === 'pendurado') {
    j.vx = lado * 1.2;
    j.vy = 1;
    j.dur = 2.2;
  } else if (r === 'piao') {
    j.angV = 0;
    j.dur = 1.9;
  } else if (r === 'galo') {
    j.angV = lado * -5;
    j.dur = 1.8;
  } else if (r === 'apito') {
    j.objeto = { tipo: 'apito', x: j.x + 0.12, y: j.y + 1.05, vx: lado * 0.9, vy: 7.5, ang: 0, angV: 12 };
    j.angV = lado * -4;
    j.dur = 1.6;
  } else if (r === 'bone') {
    j.objeto = { tipo: 'bone', x: j.x, y: j.y + 1.5, vx: lado * 0.7, vy: 6.5, ang: 0, angV: lado * -9 };
    j.angV = lado * -4;
    j.dur = 1.5;
  } else if (r === 'bigode') {
    j.bigode = lado * 0.55;
    j.angV = lado * -4;
    j.dur = 1.4;
  } else {
    // cartao
    j.angV = lado * -6;
    j.dur = 1.9;
  }
  return r;
}

/** De volta ao posto (o fim de toda reacao). */
function noPosto(j) {
  j.fase = 'posto';
  j.reacao = '';
  j.x = JUIZ.x; j.y = JUIZ.piso; j.ang = 0; j.vx = 0; j.vy = 0; j.angV = 0; j.giro = 0;
  j.objeto = null; j.bigode = 0; j.galo = 0; j.cartao = 0;
}

/** Um passo da reacao (s de mundo). */
function passoBolada(j, dt) {
  j.t += dt;
  const t = j.t;
  const r = j.reacao;
  if (r === 'tombo') {
    // cai da cadeira girando, fica deitado, levanta, anda ate a escadinha e sobe
    if (j.sub === 0) {
      j.vy -= JUIZ.g * dt;
      j.x += j.vx * dt;
      j.y += j.vy * dt;
      j.ang += j.angV * dt;
      if (j.y <= 0) { j.y = 0; j.vy = 0; j.vx = 0; j.angV = 0; j.ang = j.lado * -1.45; j.tonto = 0.9; j.sub = 1; j.tSub = t; }
    } else if (j.sub === 1) {
      if (t - j.tSub >= 0.5) { j.sub = 2; j.tSub = t; }
    } else if (j.sub === 2) {
      j.ang = seguir(j.ang, 0, 14, dt);
      j.x = seguir(j.x, JUIZ.x, 9, dt);
      if (t - j.tSub >= 0.35) { j.sub = 3; j.tSub = t; j.ang = 0; }
    } else {
      j.x = seguir(j.x, JUIZ.x, 12, dt);
      j.y = Math.min(JUIZ.piso, j.y + (JUIZ.piso / 0.5) * dt);
      if (j.y >= JUIZ.piso) { noPosto(j); return; }
    }
  } else if (r === 'pendurado') {
    // escorrega da plataforma, fica pendurado por uma mao balancando e se puxa de volta
    const borda = JUIZ.x + j.lado * 0.38;
    if (t < 0.25) {
      j.x = seguir(j.x, borda, 14, dt);
      j.y = seguir(j.y, JUIZ.piso - 1.5, 12, dt);
      j.ang = seguir(j.ang, j.lado * 0.5, 10, dt);
    } else if (t < 1.6) {
      j.x = borda;
      j.y = JUIZ.piso - 1.5;
      j.ang = j.lado * 0.5 * Math.cos((t - 0.25) * 7) * Math.exp(-(t - 0.25) * 1.6);
    } else {
      j.x = seguir(j.x, JUIZ.x, 10, dt);
      j.y = seguir(j.y, JUIZ.piso, 10, dt);
      j.ang = seguir(j.ang, 0, 10, dt);
    }
  } else if (r === 'piao') {
    // gira como piao (meias-voltas que vao parando) e fica tonto
    const w = 22 * Math.max(0, 1 - t / 1.1);
    j.giro += w * dt;
    if (t > 1.1 && j.tonto <= 0 && j.galo === 0) j.tonto = 0.8;
    if (t > 1.1) j.giro = seguir(j.giro, Math.round(j.giro / Math.PI) * Math.PI, 10, dt);
  } else {
    // as outras: tranco no corpo que volta balancando
    j.ang += j.angV * dt;
    j.angV += (-j.ang * 140 - j.angV * 9) * dt;
    if (r === 'galo') {
      j.galo = t < 0.15 ? t / 0.15 : t > j.dur - 0.3 ? Math.max(0, (j.dur - t) / 0.3) : 1;
      if (t > 0.1 && t < 0.2) j.tonto = 1.2;
    } else if (r === 'bigode') {
      // sacode a cabeca e arruma o bigode com a mao
      if (t > 0.85) j.bigode = seguir(j.bigode, 0, 9, dt);
    } else if (r === 'cartao') {
      j.cartao = t < 0.35 ? 0 : t < 0.55 ? (t - 0.35) / 0.2 : t > j.dur - 0.25 ? Math.max(0, (j.dur - t) / 0.25) : 1;
    }
  }
  // apito ou bone voando: cai de volta (na mao ou na cabeca)
  const o = j.objeto;
  if (o) {
    o.vy -= JUIZ.g * 0.8 * dt;
    o.x += o.vx * dt;
    o.y += o.vy * dt;
    o.ang += o.angV * dt;
    const alvoX = j.x;
    o.vx += (alvoX - o.x) * 3 * dt;
    const pega = o.tipo === 'apito' ? j.y + 0.95 : j.y + 1.42;
    if (o.vy < 0 && o.y <= pega) j.objeto = null;
  }
  if (t >= j.dur) noPosto(j);
}

/**
 * Um passo do juiz (s de mundo: entra na camera lenta e no hitstop).
 * @param {ReturnType<typeof criarJuiz>} j
 * @param {number} dt
 * @param {{ bola: { x: number, y: number, vx: number, vy: number }, ativa: boolean, forte: boolean, ponto: null | { lado: number } }} c
 *   ativa: a bola esta em jogo (rali); forte: cortada ou bola de poder; ponto: o lado de quem ganhou
 * @returns {Array<{ tipo: 'juiz-bolada', reacao: string, x: number, y: number, v: number }>}
 */
export function passoJuiz(j, dt, c) {
  const evs = [];
  j.ant.x = j.x; j.ant.y = j.y; j.ant.ang = j.ang;
  const b = c.bola;
  // para onde olha: a bola (ou, no ponto, o lado de quem ganhou)
  const cy = j.y + 1.2;
  const ax = c.ponto ? c.ponto.lado * 6 : b.x;
  const ay = c.ponto ? cy : b.y;
  j.olhar = seguir(j.olhar, lim((ax - j.x) / 3.5, -1, 1), JUIZ.segue, dt);
  j.olharY = seguir(j.olharY, lim((ay - cy) / 4, -1, 1), JUIZ.segue, dt);
  j.aponta = c.ponto && j.fase === 'posto' ? c.ponto.lado : 0;
  j.braco = seguir(j.braco, j.aponta ? 1 : 0, 12, dt);
  if (j.piscar > 0) j.piscar = Math.max(0, j.piscar - dt);
  if (j.tonto > 0) j.tonto = Math.max(0, j.tonto - dt);
  if (j.fase === 'bolada') {
    passoBolada(j, dt);
    j.dentro = false;
    return evs;
  }
  // a bola passando pelo corpo (borda de entrada): pega no plano dele so as vezes
  const dx = b.x - JUIZ.x;
  const dy = b.y - (JUIZ.piso + JUIZ.corpoDy);
  const rr = JUIZ.corpoR + RB;
  const dentro = c.ativa && dx * dx + dy * dy < rr * rr;
  if (dentro && !j.dentro) {
    const v = Math.hypot(b.vx, b.vy);
    const forte = c.forte || v >= JUIZ.vForte;
    if (j.rng() < (forte ? JUIZ.chanceForte : JUIZ.chance)) {
      const reacao = levarBolada(j, b, forte);
      evs.push({ tipo: 'juiz-bolada', reacao, x: b.x, y: b.y, v });
    } else {
      // passou raspando: so pisca
      j.piscar = 0.22;
    }
  }
  j.dentro = dentro;
  return evs;
}

/**
 * Bolada garantida (roteiro de teste e GIF), com a reacao pedida (ou a sorteada das fortes).
 * @param {ReturnType<typeof criarJuiz>} j @param {string} [reacao]
 */
export function forcarBolada(j, reacao = '', bola = { x: -0.5, y: 3.4, vx: 14, vy: -2 }) {
  const forte = !reacao || REACOES_FORTES.includes(reacao);
  const lista = forte ? REACOES_FORTES : REACOES_FRACAS;
  const r0 = j.rng;
  if (reacao) {
    const k = lista.indexOf(reacao);
    j.rng = () => (k + 0.5) / lista.length;
  }
  levarBolada(j, bola, forte);
  j.rng = r0;
  return j.reacao;
}
