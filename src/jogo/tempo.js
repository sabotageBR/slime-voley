// Tres relogios e os canais de escala da camera lenta (fundacao da cortada lenta).
//
// - Mundo: fisica, IA, buffers do pulo, pele, plateia e vfx de mundo. Anda em passos fixos de
//   1/120 s, mas cada CANAL tem a propria escala em milesimos (escalaMil) e um acumulador
//   inteiro: a cada passo real o canal soma a escala e roda tantos passos de mundo quantos
//   couberem. Com tudo em 1000, cada passo real e exatamente um passo de mundo (o hash() e o
//   mesmo de rodar sem relogio). Na mira, o mundo anda a 0,06, o defensor a 0,30 e a bola quase
//   para; como a bola e o defensor nao interagem com ninguem durante a mira, separar os canais
//   nao quebra o determinismo.
// - Jogo-real: curvas da camera lenta e do hitstop, tempo da mira, comemoracao e transicoes.
//   Para na pausa e no anuncio.
// - Parede: so a UI de pausa e o carregamento (fica no main.js, pelo performance.now).

/** Canais de escala. 'defensor' e o slime que nao esta mirando; 'bola' e a bola. */
export const CANAIS = Object.freeze(['mundo', 'defensor', 'bola']);

/**
 * @typedef {Object} Tempo
 * @property {{ mundo: number, defensor: number, bola: number }} escala  milesimos (1000 = normal)
 * @property {{ mundo: number, defensor: number, bola: number }} acc     acumuladores inteiros
 * @property {number} tJogo    s de jogo-real
 * @property {number} tMundo   s de mundo (canal mundo)
 * @property {number} hitstop  s de jogo-real com tudo parado
 */

/** @returns {Tempo} */
export function criarTempo() {
  return { escala: { mundo: 1000, defensor: 1000, bola: 1000 }, acc: { mundo: 0, defensor: 0, bola: 0 }, tJogo: 0, tMundo: 0, hitstop: 0 };
}

/** Escala de todos os canais (inteiro em milesimos). @param {Tempo} T @param {number} mil */
export function escalarTudo(T, mil) {
  const v = Math.max(0, Math.round(mil));
  T.escala.mundo = v;
  T.escala.defensor = v;
  T.escala.bola = v;
}

/**
 * Um passo real: avanca o jogo-real e diz quantos passos de mundo cada canal roda.
 * @param {Tempo} T
 * @param {number} dtReal  o passo fixo (1/120 s)
 * @returns {{ mundo: number, defensor: number, bola: number }}
 */
export function passoReal(T, dtReal) {
  T.tJogo += dtReal;
  const n = { mundo: 0, defensor: 0, bola: 0 };
  if (T.hitstop > 0) {
    T.hitstop = Math.max(0, T.hitstop - dtReal);
    return n;
  }
  for (const c of CANAIS) {
    T.acc[c] += T.escala[c];
    const k = Math.floor(T.acc[c] / 1000);
    T.acc[c] -= k * 1000;
    n[c] = k;
  }
  T.tMundo += n.mundo * dtReal;
  return n;
}

/**
 * Fracao (0..1) do canal entre o ultimo passo de mundo e o proximo, para interpolar o desenho.
 * @param {Tempo} T @param {'mundo'|'defensor'|'bola'} c @param {number} alfaLaco fracao do passo real
 */
export function alfaCanal(T, c, alfaLaco) {
  if (T.hitstop > 0) return 1;
  return Math.max(0, Math.min(1, (T.acc[c] + T.escala[c] * alfaLaco) / 1000));
}
