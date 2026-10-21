// Power-ups na quadra (bolhas): o catalogo aprovado em 2026-10-21, o sorteio e o relogio das
// bolhas. Puro e deterministico: rng proprio (semente ^ hashTexto('bolhas')), separado do das IAs,
// para ligar as bolhas nao mudar o jogo da CPU. A partida (src/jogo/partida.js) aplica os efeitos.
//
// Regras (desenho §2.7): 1 bolha por vez; a 1a aos 20 s de rali, depois a cada 22 +- 4 s; aviso de
// 0,8 s (fantasma, nao pega) e vida de 8 s; o relogio so anda no rali. Quem pega e a BOLA, e o
// poder vai para quem tocou nela por ultimo; a bola do saque nao pega. Contra a CPU, com diferenca
// de 2 pontos ou mais, 60% das bolhas nascem do lado de quem perde. Efeito contra o rival sempre
// pisca antes de valer (o gelo prende no maximo 0,6 s: regra do desenho).

import { criarRng, hashTexto } from '../core/rng.js';
import { LARG, RB } from '../fisica/volei.js';

/**
 * @typedef {Object} PowerUp
 * @property {string} id
 * @property {'seu'|'rival'|'bola'} tipo  em quem vale
 * @property {number} peso                sorteio entre os liberados
 * @property {number} nivel               nivel do jogador que libera (1 = inicio)
 * @property {number} [pontos]            dura este tanto de pontos (sem: na hora, ou 1 uso)
 */

/** @type {readonly PowerUp[]} */
export const CATALOGO = Object.freeze([
  Object.freeze({ id: 'cortadaGratis', tipo: 'seu', peso: 14, nivel: 1 }),
  Object.freeze({ id: 'puloMola', tipo: 'seu', peso: 9, nivel: 1, pontos: 2 }),
  Object.freeze({ id: 'gosmao', tipo: 'seu', peso: 8, nivel: 1, pontos: 2 }),
  Object.freeze({ id: 'segmento', tipo: 'seu', peso: 8, nivel: 1 }),
  Object.freeze({ id: 'congelar', tipo: 'rival', peso: 9, nivel: 1 }),
  Object.freeze({ id: 'fogo', tipo: 'bola', peso: 10, nivel: 1 }),
  Object.freeze({ id: 'turbo', tipo: 'seu', peso: 8, nivel: 4, pontos: 2 }),
  Object.freeze({ id: 'ima', tipo: 'seu', peso: 6, nivel: 7, pontos: 1 }),
  Object.freeze({ id: 'encolher', tipo: 'rival', peso: 6, nivel: 7, pontos: 2 }),
  Object.freeze({ id: 'pisoMola', tipo: 'seu', peso: 6, nivel: 10, pontos: 2 }),
  Object.freeze({ id: 'cola', tipo: 'rival', peso: 6, nivel: 10, pontos: 1 }),
  Object.freeze({ id: 'pesada', tipo: 'bola', peso: 5, nivel: 13 }),
]);

/** Os liberados desde o inicio (a trilha libera o resto: src/jogo/perfil.js). */
export const INICIAIS = Object.freeze(CATALOGO.filter((c) => c.nivel <= 1).map((c) => c.id));

/** @param {string} id */
export const powerUp = (id) => CATALOGO.find((c) => c.id === id) || null;

/** Bolhas: tempos (s de rali), lugar (u) e o raio de captura. */
export const BOLHA = Object.freeze({
  primeira: 20,
  cada: 22,
  folga: 4,
  aviso: 0.8,
  vida: 8,
  raio: 0.9,
  x: Object.freeze([2.5, LARG - 2]),
  y: Object.freeze([6, 10]),
  /** contra a CPU, com 2+ pontos de diferenca, esta fracao nasce do lado de quem perde */
  perdedor: 0.6,
});

/** Efeitos: multiplicadores e tempos (s de mundo). */
export const EFEITO = Object.freeze({
  /** aviso de todo efeito contra o rival */
  avisoRival: 0.5,
  gelo: Object.freeze({ preso: 0.6, escorrega: 1.5, atrito: 0.3 }),
  pulo: 1.3,
  gosmao: 1.25,
  encolher: 0.8,
  turbo: 1.35,
  cola: Object.freeze({ pulo: 0.75, vel: 0.8 }),
  fogo: Object.freeze({ vel: 1.3, empurrao: 7, sigma: 0.6, saida: 0.4 }),
  pesada: 1.5,
  /** o Piso Mola devolve a bola com esta velocidade para cima */
  pisoMola: 14,
  /** raio extra do ima do power-up (u) */
  ima: 0.6,
});

/**
 * Sorteio por peso entre os ids dados.
 * @param {readonly string[]} ids @param {() => number} r
 */
export function sortear(ids, r) {
  const lista = CATALOGO.filter((c) => ids.includes(c.id));
  const total = lista.reduce((s, c) => s + c.peso, 0);
  let x = r() * total;
  for (const c of lista) {
    x -= c.peso;
    if (x < 0) return c.id;
  }
  return lista[lista.length - 1].id;
}

/**
 * @typedef {Object} Bolha
 * @property {string} id
 * @property {number} x
 * @property {number} y
 * @property {'aviso'|'viva'} fase
 * @property {number} t   s na fase
 */

/**
 * Relogio e estado das bolhas de uma partida.
 * @param {{ semente?: number, liberados?: readonly string[] }} o
 */
export function criarBolhas(o = {}) {
  const rng = criarRng(((o.semente || 7) ^ hashTexto('bolhas')) >>> 0);
  const ids = (o.liberados || []).filter((id) => powerUp(id));
  let tRali = 0;
  let proxima = BOLHA.primeira;
  /** @type {Bolha|null} */
  let bolha = null;

  function encerrar() {
    bolha = null;
    tRali = 0;
    proxima = BOLHA.cada + (rng() * 2 - 1) * BOLHA.folga;
  }

  /** @param {{ placar: number[], contraCpu: boolean }} c */
  function nascer(c) {
    const dif = c.placar[0] - c.placar[1];
    let lado = rng() < 0.5 ? -1 : 1;
    if (c.contraCpu && Math.abs(dif) >= 2) {
      const perde = dif < 0 ? -1 : 1;
      lado = rng() < BOLHA.perdedor ? perde : -perde;
    }
    const [x0, x1] = BOLHA.x;
    const [y0, y1] = BOLHA.y;
    bolha = { id: sortear(ids, rng), x: lado * (x0 + (x1 - x0) * rng()), y: y0 + (y1 - y0) * rng(), fase: 'aviso', t: 0 };
  }

  return {
    get ativo() { return ids.length > 0; },
    get bolha() { return bolha; },
    /**
     * Um passo do relogio. Devolve os eventos ('bolha-aviso', 'bolha-nasce', 'bolha-pega',
     * 'bolha-some'); quem aplica o efeito e a partida.
     * @param {number} dt s de mundo
     * @param {{ jogo: boolean, pegavel: boolean, bola: { x: number, y: number }, placar: number[], contraCpu: boolean }} c
     */
    passo(dt, c) {
      /** @type {any[]} */
      const evs = [];
      if (!c.jogo || (!ids.length && !bolha)) return evs;
      if (!bolha) {
        tRali += dt;
        if (tRali >= proxima) {
          nascer(c);
          evs.push({ tipo: 'bolha-aviso', id: bolha.id, x: bolha.x, y: bolha.y });
        }
        return evs;
      }
      bolha.t += dt;
      if (bolha.fase === 'aviso') {
        if (bolha.t >= BOLHA.aviso) {
          bolha.fase = 'viva';
          bolha.t = 0;
          evs.push({ tipo: 'bolha-nasce', id: bolha.id, x: bolha.x, y: bolha.y });
        }
        return evs;
      }
      const d = Math.hypot(c.bola.x - bolha.x, c.bola.y - bolha.y);
      if (c.pegavel && d < RB + BOLHA.raio) {
        evs.push({ tipo: 'bolha-pega', id: bolha.id, x: bolha.x, y: bolha.y });
        encerrar();
      } else if (bolha.t >= BOLHA.vida) {
        evs.push({ tipo: 'bolha-some', id: bolha.id, x: bolha.x, y: bolha.y });
        encerrar();
      }
      return evs;
    },
    /** testes e roteiros: poe uma bolha viva agora */
    forcar(id, x, y) { bolha = { id, x, y, fase: 'viva', t: 0 }; },
  };
}
