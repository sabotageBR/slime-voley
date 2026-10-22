// Falas dos slimes (pedido de 2026-10-22: "para deixar a gameplay mais empolgante"): um catalogo
// fixo de frases curtas por gatilho (ace, bomba, bloqueio, virada, match point, manchete, bolada no
// juiz...), com chance, recarga por slime e um intervalo geral. Puro (rng proprio): a partida
// chama disparar() e emite { tipo: 'fala', i, id }; o main.js traduz (src/i18n/textos.js,
// fala.<id>), desenha o balao de texto e toca o balbucio sintetizado (src/som/falas.js, frase
// `voz`, no tom de cada slime). Nada de texto livre.

import { criarRng, hashTexto } from '../core/rng.js';

/** Tempos (s de jogo-real). */
export const FALA = Object.freeze({
  /** o balao fica isto sobre o slime */
  dur: 1.5,
  /** o mesmo slime so fala de novo depois disto */
  recarga: 3.5,
  /** entre duas falas quaisquer */
  intervalo: 1.0,
});

/**
 * Gatilhos: chance, as falas possiveis (ids ASCII; texto em fala.<id>) e a frase do balbucio.
 * @type {Readonly<Record<string, { chance: number, ids: readonly string[], voz: string }>>}
 */
export const FALAS = Object.freeze({
  ace: { chance: 0.85, ids: ['nemViu', 'saqueBruto'], voz: 'uhuu' },
  bomba: { chance: 0.8, ids: ['bomba', 'tomaEssa'], voz: 'iupi' },
  bloqueio: { chance: 0.8, ids: ['aquiNao', 'paredao'], voz: 'oba' },
  virada: { chance: 0.9, ids: ['virou'], voz: 'uhuu' },
  ponto: { chance: 0.3, ids: ['isso', 'uhuu', 'facil'], voz: 'iupi' },
  presente: { chance: 0.5, ids: ['valeuRede'], voz: 'oba' },
  erro: { chance: 0.5, ids: ['ops'], voz: 'eek' },
  perdeu: { chance: 0.3, ids: ['aff', 'quase', 'sorte'], voz: 'aww' },
  matchPoint: { chance: 0.7, ids: ['faltaUma'], voz: 'missao' },
  aindaNao: { chance: 0.5, ids: ['aindaNao'], voz: 'abaixa' },
  rali: { chance: 0.6, ids: ['naoCai', 'ufa'], voz: 'uau' },
  saque: { chance: 0.45, ids: ['laVai'], voz: 'vai' },
  manchete: { chance: 0.75, ids: ['defendi', 'nadaPassa'], voz: 'oba' },
  cortada: { chance: 0.5, ids: ['laVaiBomba'], voz: 'fogo' },
  poder: { chance: 0.6, ids: ['poder'], voz: 'uau' },
  gelo: { chance: 0.8, ids: ['brrr'], voz: 'eek' },
  fogo: { chance: 0.75, ids: ['queimou'], voz: 'eek' },
  juiz: { chance: 0.85, ids: ['foiMalJuiz'], voz: 'socorro' },
  inicio: { chance: 1, ids: ['boraJogar'], voz: 'pronto' },
  inicioRei: { chance: 1, ids: ['souRei'], voz: 'venceu' },
  inicioDistraida: { chance: 1, ids: ['jaE'], voz: 'eek' },
  provoca: { chance: 0.45, ids: ['fraquinho', 'deJoelhos'], voz: 'venceu' },
});

/** Todas as falas (ids). */
export const IDS_FALA = Object.freeze([...new Set(Object.values(FALAS).flatMap((g) => g.ids))]);

/** A frase do balbucio de uma fala. @param {string} id */
export function vozDaFala(id) {
  for (const g of Object.values(FALAS)) if (g.ids.includes(id)) return g.voz;
  return 'oba';
}

/** @param {number} semente */
export function criarFalas(semente = 1) {
  return { rng: criarRng(((semente >>> 0) ^ hashTexto('falas')) >>> 0), recarga: [0, 0], geral: 0 };
}

/** Relogios (s de jogo-real). @param {ReturnType<typeof criarFalas>} f @param {number} dt */
export function passoFalas(f, dt) {
  f.recarga[0] = Math.max(0, f.recarga[0] - dt);
  f.recarga[1] = Math.max(0, f.recarga[1] - dt);
  f.geral = Math.max(0, f.geral - dt);
}

/**
 * Tenta uma fala do gatilho para o slime i. Devolve o id ou null (sem sorte, na recarga ou no
 * intervalo). O sorteio so acontece fora da recarga (o rng nao anda a toa).
 * @param {ReturnType<typeof criarFalas>} f @param {string} gatilho @param {0|1} i
 */
export function disparar(f, gatilho, i) {
  const g = FALAS[gatilho];
  if (!g || f.recarga[i] > 0 || f.geral > 0) return null;
  if (f.rng() >= g.chance) return null;
  const id = g.ids[Math.min(g.ids.length - 1, Math.floor(f.rng() * g.ids.length))];
  f.recarga[i] = FALA.recarga;
  f.geral = FALA.intervalo;
  return id;
}
