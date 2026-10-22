// Pele do slime: particulas so de desenho (o campo P2G e o shader da gosma desenham a partir
// delas), em arrays proprios. A fisica e a cupula analitica (src/fisica/volei.js); a pele segue
// a cupula com mola de forma, atrasa um pouco nos trancos (a gelatina balanca), faz a covinha
// no contato com a bola e nunca tem gravidade nem paredes proprias.

import { eixosVisuais, RB } from '../fisica/volei.js';

/** Passo do reticulado (u) por qualidade: 59 particulas no raio 2 (minima: 44). */
export const PASSO_PELE = Object.freeze({ normal: 0.31, minima: 0.36 });

/**
 * Recuo do contorno de particulas para dentro da cupula (u, no raio 2). Com o nucleo do campo
 * (src/render/cena.js, RAIO_CAMPO) o isocontorno da gosma cai em cima da cupula fisica (topo a
 * menos de 0,05 u de b nas duas qualidades; test/pele.test.js): a bola encosta na gosma.
 */
export const RECUO_CONTORNO = 0.22;

/**
 * Pontos de repouso da meia-lua de raio R (relativos ao centro da base): o contorno com passo
 * fixo (a cupula fica redonda) e o miolo em reticulado hexagonal (porte de meiaLua() do prototipo).
 * @param {number} R
 * @param {number} passo
 * @returns {number[]} [x0, y0, x1, y1, ...]
 */
export function meiaLua(R, passo) {
  const pts = [];
  const r = R - RECUO_CONTORNO * (R / 2);
  const y0 = 0.15;
  const a0 = Math.asin(y0 / r);
  const nArco = Math.floor(((Math.PI - 2 * a0) * r) / passo);
  for (let k = 0; k <= nArco; k++) {
    const a = a0 + (k * (Math.PI - 2 * a0)) / nArco;
    pts.push(Math.cos(a) * r, Math.sin(a) * r);
  }
  const xb = Math.cos(a0) * r;
  for (let k = -Math.floor(xb / passo); k <= Math.floor(xb / passo); k++) {
    if (Math.abs(k * passo) <= xb - passo) pts.push(k * passo, y0);
  }
  const h = (passo * Math.sqrt(3)) / 2;
  const longe = (x, y) => {
    for (let k = 0; k < pts.length; k += 2) {
      const dx = pts[k] - x;
      const dy = pts[k + 1] - y;
      if (dx * dx + dy * dy < passo * passo * 0.995) return false;
    }
    return true;
  };
  for (let j = 1; ; j++) {
    const y = y0 + j * h;
    if (y > r - passo * 0.8) break;
    const desl = j % 2 ? passo / 2 : 0;
    const n = Math.ceil(r / passo) + 1;
    for (let i = -n; i <= n; i++) {
      const x = i * passo + desl;
      if (x * x + y * y < (r - passo * 0.75) * (r - passo * 0.75) && longe(x, y)) pts.push(x, y);
    }
  }
  return pts;
}

/** Mola de forma (1/s2) e amortecimento (1/s): ~7,6 Hz, balanca 2 ou 3 vezes. */
const K = 2300;
const C = 26;

/**
 * @typedef {Object} Pele
 * @property {number} n
 * @property {Float64Array} ox  repouso (u, relativo a base) no raio de referencia
 * @property {Float64Array} oy
 * @property {Float64Array} x
 * @property {Float64Array} y
 * @property {Float64Array} vx
 * @property {Float64Array} vy
 * @property {number} R0  raio de referencia do reticulado
 * @property {number} passo  passo do reticulado (o nucleo do campo escala com ele)
 * @property {{ x: number, y: number, nx: number, ny: number, f: number }} covinha
 */

/**
 * @param {import('../fisica/volei.js').Slime} s
 * @param {number} [passo]
 * @returns {Pele}
 */
export function criarPele(s, passo = PASSO_PELE.normal) {
  const pts = meiaLua(s.R, passo);
  const n = pts.length / 2;
  const p = {
    n, R0: s.R, passo,
    ox: new Float64Array(n), oy: new Float64Array(n),
    x: new Float64Array(n), y: new Float64Array(n), vx: new Float64Array(n), vy: new Float64Array(n),
    covinha: { x: 0, y: 0, nx: 0, ny: 1, f: 0 },
  };
  for (let i = 0; i < n; i++) {
    p.ox[i] = pts[i * 2];
    p.oy[i] = pts[i * 2 + 1];
  }
  assentar(p, s);
  return p;
}

/** A pele exatamente na forma da cupula, parada (troca de partida, replay). */
export function assentar(p, s) {
  const [a, b] = eixosVisuais(s);
  const fx = a / p.R0;
  const fy = b / p.R0;
  for (let i = 0; i < p.n; i++) {
    p.x[i] = s.x + p.ox[i] * fx;
    p.y[i] = s.y + p.oy[i] * fy;
    p.vx[i] = 0;
    p.vy[i] = 0;
  }
  p.covinha.f = 0;
}

/**
 * Covinha do toque: as particulas perto do ponto de contato afundam pela normal e voltam.
 * @param {Pele} p @param {number} x @param {number} y @param {number} nx @param {number} ny @param {number} forca 0..1,5
 */
export function marcarCovinha(p, x, y, nx, ny, forca) {
  const c = p.covinha;
  c.x = x; c.y = y; c.nx = nx; c.ny = ny;
  c.f = Math.max(c.f, Math.min(1.5, forca));
  // empurra de leve as particulas da regiao (a mola as traz de volta balancando)
  const r2 = (RB + 0.6) * (RB + 0.6);
  for (let i = 0; i < p.n; i++) {
    const dx = p.x[i] - x;
    const dy = p.y[i] - y;
    const d2 = dx * dx + dy * dy;
    if (d2 > r2) continue;
    const w = 1 - d2 / r2;
    p.vx[i] -= nx * 9 * forca * w;
    p.vy[i] -= ny * 9 * forca * w;
  }
}

/**
 * Um passo da pele atras da cupula.
 * @param {Pele} p @param {import('../fisica/volei.js').Slime} s @param {number} dt
 */
export function passoPele(p, s, dt) {
  const [a, b] = eixosVisuais(s);
  const fx = a / p.R0;
  const fy = b / p.R0;
  const c = p.covinha;
  const fundo = c.f > 0.01 ? c.f * 0.32 : 0;
  const amort = Math.exp(-C * dt);
  for (let i = 0; i < p.n; i++) {
    let tx = s.x + p.ox[i] * fx;
    let ty = s.y + p.oy[i] * fy;
    if (fundo) {
      const dx = tx - c.x;
      const dy = ty - c.y;
      const d2 = dx * dx + dy * dy;
      const r2 = 1.1 * 1.1;
      if (d2 < r2) {
        const w = (1 - d2 / r2) * fundo;
        tx -= c.nx * w;
        ty -= c.ny * w;
      }
    }
    p.vx[i] = (p.vx[i] + (tx - p.x[i]) * K * dt) * amort;
    p.vy[i] = (p.vy[i] + (ty - p.y[i]) * K * dt) * amort;
    p.x[i] += p.vx[i] * dt;
    p.y[i] += p.vy[i] * dt;
    // nunca abaixo do chao
    if (p.y[i] < 0.05) { p.y[i] = 0.05; if (p.vy[i] < 0) p.vy[i] = 0; }
  }
  if (c.f > 0) c.f = Math.max(0, c.f - dt * 4.5);
}
