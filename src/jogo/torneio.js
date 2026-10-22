// Copa Gosma (pedido de 2026-10-22; decisao do usuario, revista no mesmo dia: mata-mata de 32 em
// todas as Copas, dos 16-avos a final, 5 partidas): a chave com os rivais do Circuito e os
// figurantes, cada um com a bandeira de um pais, e o jogador com a dele. O nome e nosso: nunca o do torneio de selecoes de futebol (marca de terceiros; a
// lista do estilo.test barra o nome ate em comentario).
//
// Puro e deterministico: o save guarda so { n, tam, semente, fase, placares, pais } e a chave inteira
// sai daqui (vagas, jogos simulados, campeao). O caminho do jogador e fixo pela ordem dos rivais
// da Copa (src/jogo/rivais.js COPAS: o ultimo e o chefe, na final), como no arco do desenho §3.9;
// os rivais do caminho sempre vencem os seus jogos simulados (sao os mais fortes da chave). Os
// outros jogos saem por sorteio pelo nivel T, e cada rodada so aparece quando o jogador vence a
// dele. Perder nao elimina: a revanche e a mesma fase (o jogador nunca fica sem jogo).

import { criarRng, hashTexto } from '../core/rng.js';
import { RIVAIS, COPAS, rival as acharRival } from './rivais.js';
import { PAISES, embaralharPaises, ehPais } from './paises.js';

/** Nomes das fases (chaves de texto copa.<fase>), da primeira rodada a final. */
export const FASES = Object.freeze({ 32: Object.freeze(['dezesseisavos', 'oitavas', 'quartas', 'semi', 'final']) });
/** Tamanho da chave (o save de antes da chave de 32 recomeca a Copa dele: normalizarCopa). */
export const TAM_COPA = 32;
export const NUM_COPAS = COPAS.length;
/** Gotas pelo titulo de cada Copa (desenho §3.7: 1o titulo de cada Copa). */
export const GOTAS_TITULO = 50;

const ORDEM_NIVEL = ['T0', 'T1', 'T1+', 'T2', 'T3', 'T4', 'T5'];

/**
 * @typedef {{ n: number, tam: number, semente: number, fase: number, placares: number[][], pais: string }} EstadoCopa
 * @typedef {{ id: string, pais: string, jogador: boolean }} Vaga
 * @typedef {{ a: number, b: number, venc: number, placar: number[]|null, doJogador: boolean }} Jogo
 *   a, b: indices das vagas; venc: o indice de quem venceu (-1 = ainda nao jogado)
 */

/** Uma copa nova. @param {number} n @param {number} semente @param {string} [pais] @returns {EstadoCopa} */
export function novaCopa(n, semente, pais = '') {
  return { n: Math.max(1, Math.min(NUM_COPAS, n | 0 || 1)), tam: TAM_COPA, semente: semente >>> 0, fase: 0, placares: [], pais: ehPais(pais) ? pais.toUpperCase() : '' };
}

/**
 * O save, validado (sem copa: a Copa 1). O de outra chave (sem tam, de quando a Copa 1 era de 8 e
 * as outras de 16) recomeca a mesma Copa na primeira rodada.
 * @param {any} s @param {number} [semente] @returns {EstadoCopa}
 */
export function normalizarCopa(s, semente = 1) {
  if (!s || typeof s !== 'object') return novaCopa(1, semente);
  const c = novaCopa(Number(s.n) || 1, Number(s.semente) >>> 0 || semente, typeof s.pais === 'string' ? s.pais : '');
  if (Number(s.tam) !== TAM_COPA) return c;
  const rodadas = FASES[TAM_COPA].length;
  c.fase = Math.max(0, Math.min(rodadas, Number(s.fase) | 0));
  const pl = Array.isArray(s.placares) ? s.placares : [];
  c.placares = pl.slice(0, c.fase).map((p) => (Array.isArray(p) && p.length === 2 ? [Math.max(0, p[0] | 0), Math.max(0, p[1] | 0)] : [7, 0]));
  while (c.placares.length < c.fase) c.placares.push([7, 0]);
  return c;
}

/** Os rivais do caminho do jogador (um por rodada; o ultimo e o chefe). @param {number} n */
export function caminhoDaCopa(n) {
  return COPAS[Math.max(0, Math.min(NUM_COPAS, n) - 1)].rivais;
}

/** Placar plausivel de um jogo simulado (vai-a-2 no alvo 7, ou 9 nas finais das Copas 2-4). */
function placarSimulado(r, final, n) {
  const alvo = final && n >= 2 ? 9 : 7;
  const perdedor = Math.floor(r() * (alvo - 1));
  return [perdedor >= alvo - 2 ? perdedor + 2 : alvo, perdedor];
}

/**
 * A chave inteira derivada do estado.
 * @param {EstadoCopa} c
 * @returns {{ n: number, tam: number, fases: readonly string[], vagas: Vaga[], rodadas: Jogo[][], fase: number, campeao: boolean, adversario: string, nomeFase: string }}
 */
export function chaveDaCopa(c) {
  const tam = TAM_COPA;
  const fases = FASES[tam];
  const caminho = caminhoDaCopa(c.n);
  const rng = criarRng(((c.semente >>> 0) ^ hashTexto('copa' + c.n)) >>> 0);
  // vagas: o jogador na 0; o rival da rodada r abre a metade que encontra o jogador nela (vaga 2^r)
  /** @type {(string|null)[]} */
  const ids = new Array(tam).fill(null);
  ids[0] = 'jogador';
  caminho.forEach((id, r) => { ids[1 << r] = id; });
  const outros = RIVAIS.map((x) => x.id).filter((id) => !caminho.includes(id));
  for (let i = outros.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [outros[i], outros[j]] = [outros[j], outros[i]];
  }
  let k = 0;
  for (let i = 0; i < tam; i++) if (!ids[i]) ids[i] = outros[k++];
  // bandeiras: os rivais com paises sorteados (sem repetir; nunca a do jogador)
  const paises = embaralharPaises(rng, c.pais ? [c.pais] : []);
  let kp = 0;
  /** @type {Vaga[]} */
  const vagas = ids.map((id) => (id === 'jogador' ? { id, pais: c.pais, jogador: true } : { id: /** @type {string} */ (id), pais: paises[kp++ % paises.length], jogador: false }));
  // rodadas: o jogo m da rodada r recebe os vencedores dos jogos 2m e 2m+1 da anterior; so as
  // rodadas antes da fase atual estao jogadas (a atual mostra os confrontos, as outras ficam em aberto)
  /** @type {Jogo[][]} */
  const rodadas = [];
  /** @type {number[]} */
  let anteriores = [];
  for (let r = 0; r < fases.length; r++) {
    /** @type {Jogo[]} */
    const jogos = [];
    for (let m = 0; m < tam >> (r + 1); m++) {
      const a = r === 0 ? 2 * m : anteriores[2 * m];
      const b = r === 0 ? 2 * m + 1 : anteriores[2 * m + 1];
      /** @type {Jogo} */
      const jogo = { a, b, venc: -1, placar: null, doJogador: m === 0 };
      if (r < c.fase && a >= 0 && b >= 0) {
        if (m === 0) {
          jogo.venc = 0;
          jogo.placar = c.placares[r] || [7, 0];
        } else {
          // o sorteio de cada jogo e proprio (estavel, nao depende da ordem de leitura da chave)
          const rj = criarRng(((c.semente >>> 0) ^ hashTexto(`copa${c.n}r${r}m${m}`)) >>> 0);
          const ia = vagas[a].id;
          const ib = vagas[b].id;
          let venceA;
          if (caminho.includes(ia)) venceA = true;
          else if (caminho.includes(ib)) venceA = false;
          else {
            const la = ORDEM_NIVEL.indexOf(acharRival(ia).nivel);
            const lb = ORDEM_NIVEL.indexOf(acharRival(ib).nivel);
            venceA = rj() < 1 / (1 + Math.exp(-(la - lb) * 0.8));
          }
          const pl = placarSimulado(rj, r === fases.length - 1, c.n);
          jogo.venc = venceA ? a : b;
          jogo.placar = venceA ? pl : [pl[1], pl[0]];
        }
      }
      jogos.push(jogo);
    }
    rodadas.push(jogos);
    anteriores = jogos.map((x) => x.venc);
  }
  const campeao = c.fase >= fases.length;
  const adversario = campeao ? '' : caminho[c.fase];
  return { n: c.n, tam, fases, vagas, rodadas, fase: c.fase, campeao, adversario, nomeFase: campeao ? 'campeao' : fases[c.fase] };
}

/**
 * O jogador venceu a partida da fase atual: avanca (a rodada inteira se revela).
 * @param {EstadoCopa} c @param {number[]} placar [jogador, rival]
 * @returns {EstadoCopa}
 */
export function registrarVitoria(c, placar) {
  const rodadas = FASES[TAM_COPA].length;
  if (c.fase >= rodadas) return c;
  return { ...c, fase: c.fase + 1, placares: [...c.placares, [placar[0] | 0, placar[1] | 0]] };
}

/** Depois do titulo: a proxima Copa (a ultima se repete com outra chave). @param {EstadoCopa} c @param {number} semente */
export function proximaCopa(c, semente) {
  return novaCopa(Math.min(NUM_COPAS, c.n + 1), semente, c.pais);
}

/** Troca a selecao do jogador (vestiario): a chave sorteia os rivais sem a bandeira dele. */
export function trocarPais(c, pais) {
  return { ...c, pais: ehPais(pais) ? pais.toUpperCase() : '' };
}

export { PAISES };
