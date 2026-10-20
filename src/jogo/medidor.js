// Medidor de Gosma: 3 segmentos de 100. Enche jogando (toque, bola passada, ponto ganho e,
// mais, ponto perdido), gasta na cortada lenta (100) e no super saque (200).

export const SEGMENTO = 100;
export const MAX = 300;
export const CUSTO = Object.freeze({ cortada: 100, super: 200 });
export const GANHO = Object.freeze({ toque: 6, passou: 4, ganhou: 12, perdeu: 18, perfeita: 35, travessia: 3 });

/** @typedef {{ v: number, mult: number }} Medidor */

/** @param {number} [mult] 2 na primeira partida da vida @returns {Medidor} */
export function criarMedidor(mult = 1) {
  return { v: 0, mult };
}

/** @param {Medidor} m @param {keyof typeof GANHO} oque @param {number} [n] */
export function ganhar(m, oque, n = 1) {
  m.v = Math.min(MAX, m.v + GANHO[oque] * n * m.mult);
}

/** Gasta se tiver; devolve se gastou. @param {Medidor} m @param {keyof typeof CUSTO} oque */
export function gastar(m, oque) {
  const c = CUSTO[oque];
  if (m.v < c) return false;
  m.v -= c;
  return true;
}

/** @param {Medidor} m @param {keyof typeof CUSTO} oque */
export const tem = (m, oque) => m.v >= CUSTO[oque];

/** Segmentos cheios (0..3). @param {Medidor} m */
export const segmentos = (m) => Math.floor(m.v / SEGMENTO);
