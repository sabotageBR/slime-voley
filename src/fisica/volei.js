// Fisica do Volei de Gosma: pura, deterministica e sem DOM.
//
// - Slime: cupula eliptica (meia elipse em pe) com semi-eixos a = R(1 + 0,18 sigma) e
//   b = R(1 - 0,22 sigma). sigma e o amassado: positivo achata (pouso, toque forte, carga do
//   saque), negativo estica (impulso do pulo, pose da cortada). Mola de 6 Hz, zeta 0,35. Na
//   colisao sigma vale entre -0,6 e +0,6; o desenho (a pele) usa o valor cru, ate +-1.
// - A cupula achatada tem a normal mais vertical (a bola levanta); a esticada, mais deitada (a
//   bola sai rasante). Toque em x = 0,5a com a bola caindo na vertical: normal de 30/24/36 graus
//   (redonda/achatada/esticada); a saida sai da formula do reflexo com E_SLIME (com 0,80 seria
//   66/54/79 graus; com 0,90, calibrado no bot contra bot de 2026-10-20 para ralis de 5 a 9 s,
//   63/51/77), conferido no test/fisica.test.js.
// - Bola: circulo rigido com gravidade propria, 2 subpassos por passo de 1/120 s, limite de
//   velocidade pelo estado (VMAX), vento horizontal opcional.
// - Rede: poste em x = 0 ate REDE_H (capsula de raio REDE_R) para a bola; para os slimes, a rede
//   e uma parede ate o ceu. Placas no fim da quadra (x = +-PLACA_X, altura PLACA_H). Atras da
//   placa, a rede de protecao (x = +-FUNDO_X) segura a bola so quando o lado dela esta "ativo"
//   (quem decide e a partida: a bola que o proprio lado mandou para tras continua em jogo).
// - prever(): o mesmo integrador sem os slimes (IA, mira da cortada e sombra do saque).

/** Meia largura da quadra (u): piso de -LARG a LARG. */
export const LARG = 12;
/** Rede: altura do poste e raio. */
export const REDE_H = 2.5;
export const REDE_R = 0.15;
/** Placas do fim da quadra e a rede de protecao atras delas. */
export const PLACA_X = 12.4;
export const PLACA_H = 1.8;
export const PLACA_R = 0.12;
export const FUNDO_X = 12.6;
/** Raio de repouso do slime e do slime grande (power-up Gosmao). */
export const RAIO = 2.0;
/** Bola. */
export const RB = 0.75;
export const G_BOLA = 28;
/** Slime: gravidade, pulo (apice de 3,89 u, 0,68 s no ar), velocidade e aceleracoes. */
export const G_SLIME = 68;
export const PULO = 23;
export const VEL = 11;
export const ACEL_CHAO = 85;
export const FREIO = 130;
export const ACEL_AR = 45;
/** Restituicao e saida minima contra o slime; rede, placa e rede de fundo. */
export const E_SLIME = 0.9;
export const V_MIN = 8;
export const E_REDE = 0.45;
export const E_PLACA = 0.7;
export const E_FUNDO = 0.7;
/** Quanto da velocidade do slime entra no toque (x, y). */
export const SOMA_X = 0.75;
export const SOMA_Y = 0.7;
/** Mola do amassado: frequencia (Hz), amortecimento e limites (fisica e desenho). */
export const SIG_HZ = 6;
export const SIG_ZETA = 0.35;
export const SIG_FIS = 0.6;
export const SIG_VIS = 1;
/** Velocidade maxima da bola por estado. A cortada nao tem limite ate o primeiro contato (34 de seguranca). */
export const VMAX = Object.freeze({ normal: 25, cortada: 34, fogo: 31, meteoro: 32, jornadaSobe: 40, jornadaDesce: 30, raio: 27 });
/** Passo da logica e subpassos da bola. */
export const PASSO = 1 / 120;
export const SUB_BOLA = 2;

const W_SIG = 2 * Math.PI * SIG_HZ;

/** @param {number} v @param {number} a @param {number} b */
export const limitar = (v, a, b) => (v < a ? a : v > b ? b : v);

/**
 * @typedef {Object} Slime
 * @property {number} lado  -1 (esquerda) ou 1 (direita)
 * @property {number} x     centro da base
 * @property {number} y     altura da base (0 no chao)
 * @property {number} vx
 * @property {number} vy
 * @property {number} sig   amassado cru (o desenho usa; a colisao limita em SIG_FIS)
 * @property {number} sigV
 * @property {number} sigAlvo
 * @property {number} R     raio de repouso (Gosmao muda)
 * @property {boolean} noChao
 * @property {number} tAr   s desde que saiu do chao (coyote)
 * @property {number} multPulo
 * @property {boolean} congelado  pose da cortada: nao anda nem cai
 */

/**
 * @param {number} lado
 * @param {number} [x]
 * @returns {Slime}
 */
export function criarSlime(lado, x = lado * 6) {
  return { lado, x, y: 0, vx: 0, vy: 0, sig: 0, sigV: 0, sigAlvo: 0, R: RAIO, noChao: true, tAr: 0, multPulo: 1, congelado: false };
}

/** Semi-eixos da cupula para a colisao (sigma limitado). @param {Slime} s @returns {number[]} [a, b] */
export function eixos(s) {
  const q = limitar(s.sig, -SIG_FIS, SIG_FIS);
  return [s.R * (1 + 0.18 * q), s.R * (1 - 0.22 * q)];
}

/** Semi-eixos do desenho (sigma cru ate +-1). @param {Slime} s @returns {number[]} */
export function eixosVisuais(s) {
  const q = limitar(s.sig, -SIG_VIS, SIG_VIS);
  return [s.R * (1 + 0.18 * q), s.R * (1 - 0.22 * q)];
}

/**
 * Limites do centro do slime na propria metade (a rede e uma parede ate o ceu).
 * @param {Slime} s @returns {number[]} [x0, x1]
 */
export function limitesX(s) {
  const [a] = eixos(s);
  const perto = REDE_R + a + 0.02;
  const longe = PLACA_X - a * 0.95;
  return s.lado < 0 ? [-longe, -perto] : [perto, longe];
}

/** Soma um chute no amassado (pouso, toque). @param {Slime} s @param {number} d */
export function amassar(s, d) {
  s.sig = limitar(s.sig + d, -SIG_VIS, SIG_VIS);
}

/**
 * Um passo do slime.
 * @param {Slime} s
 * @param {{ eixo: number, pular: boolean }} it  eixo -1..1 (o stick), pular = pulo nesse passo
 * @param {number} dt
 * @param {{ vel?: number, atrito?: number }} [o]  vel: velocidade maxima (IA mais lenta, Turbo, Cola);
 *   atrito: fracao da aceleracao no chao (o escorregao do gelo)
 * @returns {null | 'pulo' | 'pouso'} o que aconteceu
 */
export function passoSlime(s, it, dt, o = {}) {
  let ev = null;
  // mola do amassado (roda ate congelado: a pose da mira estica e respira)
  const w = W_SIG;
  s.sigV += (-(w * w) * (s.sig - s.sigAlvo) - 2 * SIG_ZETA * w * s.sigV) * dt;
  s.sig = limitar(s.sig + s.sigV * dt, -SIG_VIS, SIG_VIS);
  if (s.congelado) return null;
  const vmax = o.vel ?? VEL;
  const alvo = limitar(it.eixo, -1, 1) * vmax;
  let acc;
  if (s.noChao) acc = (alvo === 0 || alvo * s.vx < 0 || Math.abs(alvo) < Math.abs(s.vx) ? FREIO : ACEL_CHAO) * (o.atrito ?? 1);
  else acc = ACEL_AR;
  const dv = alvo - s.vx;
  const passo = acc * dt;
  s.vx = Math.abs(dv) <= passo ? alvo : s.vx + Math.sign(dv) * passo;
  if (it.pular && s.noChao) {
    s.vy = PULO * s.multPulo;
    s.noChao = false;
    s.tAr = 0;
    s.sig = -0.6;
    s.sigV = 0;
    ev = 'pulo';
  }
  if (!s.noChao) {
    s.tAr += dt;
    s.vy -= G_SLIME * dt;
    s.y += s.vy * dt;
    if (s.y <= 0) {
      const forca = limitar(-s.vy / PULO, 0.2, 1.3);
      s.y = 0;
      s.vy = 0;
      s.noChao = true;
      amassar(s, 0.8 * forca);
      ev = 'pouso';
    }
  }
  s.x += s.vx * dt;
  const [x0, x1] = limitesX(s);
  if (s.x < x0) { s.x = x0; if (s.vx < 0) s.vx = 0; }
  if (s.x > x1) { s.x = x1; if (s.vx > 0) s.vx = 0; }
  return ev;
}

/**
 * @typedef {Object} Bola
 * @property {number} x
 * @property {number} y
 * @property {number} vx
 * @property {number} vy
 * @property {number} ang   giro (desenho)
 * @property {number} angV
 * @property {string} estado  normal | cortada | fogo | meteoro | jornada | raio
 * @property {boolean} semLimite  cortada antes do primeiro contato
 * @property {boolean[]} fundo  rede de protecao ativa [esquerda, direita]
 * @property {boolean} solta    false: parada (saque esperando), sem gravidade
 * @property {boolean[]} colide  colide com cada slime (a mira desliga)
 * @property {number} [gMult]  gravidade da bola x isto (power-up Bola Pesada; 1 = normal)
 */

/** @returns {Bola} */
export function criarBola() {
  return { x: 0, y: 8, vx: 0, vy: 0, ang: 0, angV: 0, estado: 'normal', semLimite: false, fundo: [true, true], solta: false, colide: [true, true] };
}

/** VMAX do estado da bola agora. @param {Bola} b */
export function vmaxDa(b) {
  if (b.estado === 'jornada') return b.vy > 0 ? VMAX.jornadaSobe : VMAX.jornadaDesce;
  return VMAX[b.estado] || VMAX.normal;
}

/**
 * Ponto da superficie da cupula mais perto de (px, py), com a normal para fora e a distancia
 * com sinal (negativa dentro). Cupula: meia elipse de semi-eixos a, b sobre a base (cx, cy).
 * @returns {{ d: number, nx: number, ny: number, qx: number, qy: number }}
 */
export function pertoCupula(cx, cy, a, b, px, py) {
  const rx = px - cx;
  const ry = py - cy;
  if (ry < 0) {
    // abaixo da base: o fundo chato (ou a quina)
    if (Math.abs(rx) <= a) return { d: -ry, nx: 0, ny: -1, qx: px, qy: cy };
    const qx = cx + Math.sign(rx) * a;
    const dx = px - qx;
    const dy = py - cy;
    const l = Math.hypot(dx, dy) || 1e-9;
    return { d: l, nx: dx / l, ny: dy / l, qx, qy: cy };
  }
  // Newton no parametro t da elipse (a, b): ponto (a cos t, b sin t), t em [0, pi]
  let t = Math.atan2(a * ry, b * rx);
  if (t < 0) t = 0;
  const k = b * b - a * a;
  for (let i = 0; i < 6; i++) {
    const c = Math.cos(t);
    const s = Math.sin(t);
    const f = k * s * c + a * rx * s - b * ry * c;
    const fl = k * (c * c - s * s) + a * rx * c + b * ry * s;
    if (Math.abs(fl) < 1e-12) break;
    const tn = t - f / fl;
    t = tn < 0 ? 0 : tn > Math.PI ? Math.PI : tn;
  }
  const c = Math.cos(t);
  const s = Math.sin(t);
  const qx = a * c;
  const qy = b * s;
  let nx = c / a;
  let ny = s / b;
  const ln = Math.hypot(nx, ny) || 1;
  nx /= ln;
  ny /= ln;
  const dist = Math.hypot(rx - qx, ry - qy);
  const dentro = (rx / a) * (rx / a) + (ry / b) * (ry / b) < 1;
  return { d: dentro ? -dist : dist, nx, ny, qx: cx + qx, qy: cy + qy };
}

/**
 * Contato da bola com um slime (um subpasso). Reflete relativo a cupula (com a velocidade do
 * slime somada) e garante a saida minima para cima.
 * @param {Bola} b
 * @param {Slime} s
 * @returns {null | { nx: number, ny: number, imp: number, x: number, y: number, vn: number }}
 */
export function bolaNoSlime(b, s) {
  const [a, bb] = eixos(s);
  if (b.x + RB < s.x - a - 0.1 || b.x - RB > s.x + a + 0.1 || b.y - RB > s.y + bb + 0.1 || b.y + RB < s.y - 0.1) return null;
  const p = pertoCupula(s.x, s.y, a, bb, b.x, b.y);
  if (p.d >= RB) return null;
  const pen = RB - p.d;
  const { nx, ny } = p;
  b.x += nx * pen;
  b.y += ny * pen;
  const ux = s.vx * SOMA_X;
  const uy = s.vy * SOMA_Y;
  const rvx = b.vx - ux;
  const rvy = b.vy - uy;
  const vn = rvx * nx + rvy * ny;
  if (vn >= 0) return null;
  const j = -(1 + E_SLIME) * vn;
  let vx = rvx + j * nx + ux;
  let vy = rvy + j * ny + uy;
  const sai = vx * nx + vy * ny;
  if (ny > 0.3 && sai < V_MIN) {
    vx += (V_MIN - sai) * nx;
    vy += (V_MIN - sai) * ny;
  }
  b.vx = vx;
  b.vy = vy;
  // giro pela tangente (so o desenho)
  b.angV += ((rvx * -ny + rvy * nx) * 0.6) / RB;
  return { nx, ny, imp: j, x: p.qx, y: p.qy, vn };
}

/**
 * Bola contra uma capsula vertical (poste da rede ou placa) de x fixo, de y0 a y1, raio r.
 * @returns {number} velocidade normal do choque (0 se nao bateu)
 */
function capsula(b, x, y0, y1, r, e) {
  const qy = limitar(b.y, y0, y1);
  const dx = b.x - x;
  const dy = b.y - qy;
  const rr = RB + r;
  const d2 = dx * dx + dy * dy;
  if (d2 >= rr * rr) return 0;
  const d = Math.sqrt(d2);
  let nx = b.vx > 0 ? -1 : 1;
  let ny = 0;
  if (d > 1e-6) { nx = dx / d; ny = dy / d; }
  b.x = x + nx * rr;
  b.y = qy + ny * rr;
  const vn = b.vx * nx + b.vy * ny;
  if (vn < 0) {
    b.vx -= (1 + e) * vn * nx;
    b.vy -= (1 + e) * vn * ny;
    return -vn;
  }
  return 0;
}

/**
 * @typedef {Object} OpcoesBola
 * @property {number} [vento]     aceleracao horizontal (u/s2)
 * @property {number} [teto]      altura do teto (Infinity: aberto)
 * @property {number} [eAlambrado] restituicao da placa (a Rua quica mais)
 */

/**
 * Um passo da bola (2 subpassos) contra rede, placas, rede de fundo, teto, chao e slimes.
 * @param {Bola} b
 * @param {Slime[]} slimes
 * @param {number} dt
 * @param {OpcoesBola} [o]
 * @param {any[]} [ev] eventos: { tipo: 'toque'|'rede'|'placa'|'fundo'|'teto'|'chao'|'cruzou'|'fora', ... }
 * @param {boolean[]} [passaSlime] quais slimes andaram neste passo (canais da camera lenta)
 */
export function passoBola(b, slimes, dt, o = {}, ev = [], passaSlime = null) {
  if (!b.solta) {
    b.ang += b.angV * dt;
    return ev;
  }
  const h = dt / SUB_BOLA;
  const vento = o.vento || 0;
  const teto = o.teto ?? Infinity;
  const ePlaca = o.eAlambrado ?? E_PLACA;
  for (let k = 0; k < SUB_BOLA; k++) {
    const x0 = b.x;
    b.vy -= G_BOLA * (b.gMult || 1) * h;
    b.vx += vento * h;
    b.x += b.vx * h;
    b.y += b.vy * h;
    for (let i = 0; i < slimes.length; i++) {
      if (!b.colide[i] || (passaSlime && !passaSlime[i])) continue;
      const c = bolaNoSlime(b, slimes[i]);
      if (c) {
        ev.push({ tipo: 'toque', i, ...c });
        if (b.semLimite) b.semLimite = false;
      }
    }
    const vr = capsula(b, 0, 0, REDE_H - REDE_R, REDE_R, E_REDE);
    if (vr) ev.push({ tipo: 'rede', v: vr, x: b.x, y: b.y });
    for (const lado of [-1, 1]) {
      const vp = capsula(b, lado * PLACA_X, 0, PLACA_H, PLACA_R, ePlaca);
      if (vp) ev.push({ tipo: 'placa', lado, v: vp, x: b.x, y: b.y });
    }
    // cruzou a rede (a partida zera os toques do lado)
    if ((x0 < 0) !== (b.x < 0)) ev.push({ tipo: 'cruzou', lado: b.x < 0 ? -1 : 1 });
    // passou da placa por cima: rede de protecao (lado ativo) ou fora
    for (const lado of [-1, 1]) {
      const i = lado < 0 ? 0 : 1;
      if (b.x * lado > FUNDO_X - RB && b.vx * lado > 0) {
        if (b.fundo[i]) {
          b.x = lado * (FUNDO_X - RB);
          ev.push({ tipo: 'fundo', lado, v: Math.abs(b.vx) });
          b.vx = -b.vx * E_FUNDO;
        }
      }
      if (!b.fundo[i] && b.x * lado > PLACA_X && b.y > PLACA_H && (x0 * lado <= PLACA_X)) ev.push({ tipo: 'fora', lado, x: b.x, y: b.y });
    }
    if (b.y > teto - RB) {
      b.y = teto - RB;
      if (b.vy > 0) { ev.push({ tipo: 'teto', v: b.vy }); b.vy = -b.vy * 0.6; }
    }
    if (b.y < RB) {
      b.y = RB;
      if (b.vy < 0) {
        ev.push({ tipo: 'chao', x: b.x, v: -b.vy });
        b.vy = -b.vy * 0.42;
        b.vx *= 0.7;
        if (b.vy < 1.2) b.vy = 0;
      }
      b.angV = -b.vx / RB;
    }
    if (!b.semLimite) {
      const vm = vmaxDa(b);
      const v2 = b.vx * b.vx + b.vy * b.vy;
      if (v2 > vm * vm) {
        const f = vm / Math.sqrt(v2);
        b.vx *= f;
        b.vy *= f;
      }
    } else {
      const v2 = b.vx * b.vx + b.vy * b.vy;
      if (v2 > VMAX.cortada * VMAX.cortada) {
        const f = VMAX.cortada / Math.sqrt(v2);
        b.vx *= f;
        b.vy *= f;
      }
    }
  }
  b.angV *= 0.995;
  b.ang += b.angV * dt;
  return ev;
}

/**
 * @typedef {Object} Previsao
 * @property {number} x   onde a bola chega
 * @property {number} y
 * @property {number} t   s ate la (Infinity se nao chegou no horizonte)
 * @property {number} vx
 * @property {number} vy
 * @property {string} motivo  'altura' | 'chao' | 'fora' | 'limite'
 */

/**
 * O mesmo integrador sem os slimes: onde a bola desce ate yAlvo (ou toca o chao).
 * @param {{ x: number, y: number, vx: number, vy: number, estado?: string, semLimite?: boolean, fundo?: boolean[] }} b0
 * @param {{ yAlvo?: number, tMax?: number, vento?: number, teto?: number, caminho?: number[], cada?: number, semVmax?: boolean, pararNaRede?: boolean }} [o]
 * @returns {Previsao}
 */
export function prever(b0, o = {}) {
  const b = { x: b0.x, y: b0.y, vx: b0.vx, vy: b0.vy, ang: 0, angV: 0, estado: b0.estado || 'normal', semLimite: !!(o.semVmax || b0.semLimite), fundo: b0.fundo ? [...b0.fundo] : [true, true], solta: true, colide: [false, false], gMult: b0.gMult || 1 };
  const yAlvo = o.yAlvo ?? RB;
  const tMax = o.tMax ?? 4;
  const cada = o.cada || 1;
  const n = Math.ceil(tMax / PASSO);
  const ev = [];
  for (let k = 0; k < n; k++) {
    const vy0 = b.vy;
    const y0 = b.y;
    ev.length = 0;
    passoBola(b, [], PASSO, o, ev);
    if (o.caminho && k % cada === 0) o.caminho.push(b.x, b.y);
    for (const e of ev) {
      if (e.tipo === 'fora') return { x: b.x, y: b.y, t: (k + 1) * PASSO, vx: b.vx, vy: b.vy, motivo: 'fora' };
      if (e.tipo === 'chao') return { x: b.x, y: RB, t: (k + 1) * PASSO, vx: b.vx, vy: vy0, motivo: 'chao' };
      if (o.pararNaRede && e.tipo === 'rede') return { x: b.x, y: b.y, t: (k + 1) * PASSO, vx: b.vx, vy: b.vy, motivo: 'rede' };
    }
    if (vy0 <= 0 && y0 >= yAlvo && b.y <= yAlvo && yAlvo > RB) return { x: b.x, y: b.y, t: (k + 1) * PASSO, vx: b.vx, vy: b.vy, motivo: 'altura' };
  }
  return { x: b.x, y: b.y, t: Infinity, vx: b.vx, vy: b.vy, motivo: 'limite' };
}
