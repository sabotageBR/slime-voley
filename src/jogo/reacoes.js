// Reacoes (emoji) depois do ponto (decisao de 2026-10-21): o catalogo (6 da base + 4 da trilha),
// a expressao que o rosto do slime faz junto e a escolha da CPU (pura, com o rng que a partida
// passar). Sem texto livre: so estas, desenhadas no estilo gosma (src/render/carinhas.js).

/**
 * @typedef {Object} Reacao
 * @property {string} id
 * @property {string} expr   expressao do rosto (src/render/rostos.js)
 * @property {number} nivel  nivel do jogador que libera (1 = inicio)
 */

/** @type {readonly Reacao[]} */
export const REACOES = Object.freeze([
  Object.freeze({ id: 'rindo', expr: 'feliz', nivel: 1 }),
  Object.freeze({ id: 'gargalhada', expr: 'feliz', nivel: 1 }),
  Object.freeze({ id: 'convencido', expr: 'contente', nivel: 1 }),
  Object.freeze({ id: 'bravo', expr: 'furioso', nivel: 1 }),
  Object.freeze({ id: 'chorando', expr: 'choro', nivel: 1 }),
  Object.freeze({ id: 'coracao', expr: 'feliz', nivel: 1 }),
  Object.freeze({ id: 'oculos', expr: 'contente', nivel: 2 }),
  Object.freeze({ id: 'zzz', expr: 'apatico', nivel: 5 }),
  Object.freeze({ id: 'fogo', expr: 'feliz', nivel: 8 }),
  Object.freeze({ id: 'coroa', expr: 'contente', nivel: 11 }),
]);

export const REACOES_INICIAIS = Object.freeze(REACOES.filter((r) => r.nivel <= 1).map((r) => r.id));

/** @param {string} id */
export const reacao = (id) => REACOES.find((r) => r.id === id) || null;

/** Tempos (s de jogo-real) e chances da CPU. */
export const REACAO = Object.freeze({
  /** o balao fica isto sobre o slime */
  dur: 1.6,
  /** a CPU reage sozinha depois do ponto com esta chance, entre atraso[0] e atraso[1] s */
  chanceCpu: 0.35,
  atraso: Object.freeze([0.5, 0.9]),
  /** e responde a reacao do jogador com esta chance, depois deste tempo */
  chanceResposta: 0.35,
  resposta: 0.6,
});

/**
 * Chance de a CPU reagir, pela personalidade do rival.
 * @param {{ perso?: readonly string[], chefe?: boolean }} riv
 */
export function chanceReacaoCpu(riv) {
  if (riv.chefe) return 0.5;
  if ((riv.perso || []).includes('distraida')) return 0.2;
  return REACAO.chanceCpu;
}

/**
 * Reacao da CPU pelo contexto: quem ganhou o ponto e a reacao que ela responde.
 * @param {() => number} r @param {{ ganhou: boolean, resposta?: string }} c
 */
export function escolherReacaoCpu(r, c) {
  if (c.resposta === 'coracao') return 'coracao';
  const l = c.ganhou ? ['convencido', 'rindo', 'gargalhada'] : ['bravo', 'chorando'];
  return l[Math.min(l.length - 1, Math.floor(r() * l.length))];
}
