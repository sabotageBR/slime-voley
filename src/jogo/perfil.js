// Perfil do jogador (decisao de 2026-10-21): nivel por XP, a trilha de premios conhecidos de
// antemao e as Gotas (a moeda unica do desenho §3.7). Puro: recebe e devolve objetos, quem grava
// e o main.js. Proibido pelo desenho: segunda moeda, caixa aleatoria e recompensa diaria; aqui todo
// premio aparece na trilha antes de chegar.

import { INICIAIS as POWERUPS_INICIAIS } from './powerups.js';
import { REACOES_INICIAIS } from './reacoes.js';

/** XP por partida. */
export const XP = Object.freeze({ vitoria: 30, derrota: 12, ponto: 2, ace: 3, bomba: 3, rali10: 5 });

/** Gotas por partida (desenho §3.7). */
export const GOTAS = Object.freeze({ ponto: 1, vitoria: 20, porCopa: 5, derrota: 8, ace: 2, bomba: 2, rali10: 3, virada: 5, perfeita: 10 });

/** Do nivel n para o n+1. @param {number} n */
export const xpParaSubir = (n) => 50 + 25 * (Math.max(1, n) - 1);

/**
 * @typedef {{ tipo: 'reacao'|'powerup'|'skin'|'gotas', id?: string, gotas?: number }} Premio
 */

/** A trilha: o que cada nivel libera. Depois do fim, 60 Gotas por nivel. */
export const TRILHA = Object.freeze({
  2: [{ tipo: 'reacao', id: 'oculos' }],
  3: [{ tipo: 'skin', id: 'listrado' }],
  4: [{ tipo: 'powerup', id: 'turbo' }],
  5: [{ tipo: 'reacao', id: 'zzz' }],
  6: [{ tipo: 'skin', id: 'faixa' }],
  7: [{ tipo: 'powerup', id: 'ima' }, { tipo: 'powerup', id: 'encolher' }],
  8: [{ tipo: 'reacao', id: 'fogo' }],
  9: [{ tipo: 'skin', id: 'metades' }],
  10: [{ tipo: 'powerup', id: 'pisoMola' }, { tipo: 'powerup', id: 'cola' }],
  11: [{ tipo: 'reacao', id: 'coroa' }],
  12: [{ tipo: 'skin', id: 'xadrez' }],
  13: [{ tipo: 'powerup', id: 'pesada' }],
});
export const GOTAS_POR_NIVEL = 60;

/** @param {number} n @returns {Premio[]} */
export function premiosDoNivel(n) {
  return /** @type {Premio[]} */ (TRILHA[n] || (n > 13 ? [{ tipo: 'gotas', gotas: GOTAS_POR_NIVEL }] : []));
}

/**
 * Perfil salvo, com os padroes (o save antigo, sem nivel nem liberados, continua valendo).
 * @param {any} salvo
 */
export function normalizarPerfil(salvo) {
  const s = salvo && typeof salvo === 'object' ? salvo : {};
  const lib = s.liberados && typeof s.liberados === 'object' ? s.liberados : {};
  const lista = (v, base) => [...new Set([...base, ...(Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [])])];
  const p = {
    partidas: num(s.partidas), vitorias: num(s.vitorias), fase: num(s.fase),
    controle: typeof s.controle === 'string' ? s.controle : '',
    som: s.som !== false, vibrar: s.vibrar !== false,
    gotas: num(s.gotas),
    nivel: Math.max(1, num(s.nivel) || 1),
    xp: num(s.xp),
    skin: typeof s.skin === 'string' && s.skin ? s.skin : 'laranjinha',
    liberados: {
      reacoes: lista(lib.reacoes, REACOES_INICIAIS),
      powerups: lista(lib.powerups, POWERUPS_INICIAIS),
      skins: lista(lib.skins, ['laranjinha']),
    },
  };
  // o que a trilha ja deu ate o nivel atual fica liberado (save mexido ou trilha nova), sem trocar a skin
  for (let n = 2; n <= p.nivel; n++) {
    for (const pr of premiosDoNivel(n)) {
      const l = pr.tipo === 'reacao' ? p.liberados.reacoes : pr.tipo === 'powerup' ? p.liberados.powerups : pr.tipo === 'skin' ? p.liberados.skins : null;
      if (l && pr.id && !l.includes(pr.id)) l.push(pr.id);
    }
  }
  return p;
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/**
 * Quanto a partida rendeu.
 * @param {{ venceu: boolean, copa?: number, pontos: number, aces: number, bombas: number, ralis10: number, viradas: number, perdidos: number }} r
 * @returns {{ xp: number, gotas: number }}
 */
export function rendimento(r) {
  const copa = r.copa || 1;
  const xp = (r.venceu ? XP.vitoria : XP.derrota) + XP.ponto * r.pontos + XP.ace * r.aces + XP.bomba * r.bombas + XP.rali10 * r.ralis10;
  let gotas = r.venceu ? GOTAS.vitoria + GOTAS.porCopa * copa : GOTAS.derrota;
  gotas += GOTAS.ponto * r.pontos + GOTAS.ace * r.aces + GOTAS.bomba * r.bombas + GOTAS.rali10 * r.ralis10 + GOTAS.virada * r.viradas;
  if (r.venceu && r.perdidos === 0) gotas += GOTAS.perfeita;
  return { xp, gotas };
}

/**
 * Soma XP e Gotas e sobe de nivel, liberando a trilha (a skin nova ja fica equipada). Devolve um
 * perfil novo e o que mudou, para o cartao animar.
 * @param {ReturnType<typeof normalizarPerfil>} p @param {{ xp: number, gotas: number }} g
 */
export function aplicarGanho(p, g) {
  const n = structuredClone(p);
  const antes = { nivel: n.nivel, xp: n.xp, req: xpParaSubir(n.nivel) };
  n.xp += g.xp;
  n.gotas += g.gotas;
  /** @type {{ nivel: number, premios: Premio[] }[]} */
  const subiu = [];
  while (n.xp >= xpParaSubir(n.nivel)) {
    n.xp -= xpParaSubir(n.nivel);
    n.nivel++;
    const premios = premiosDoNivel(n.nivel);
    for (const pr of premios) liberar(n, pr);
    subiu.push({ nivel: n.nivel, premios });
  }
  return { perfil: n, antes, depois: { nivel: n.nivel, xp: n.xp, req: xpParaSubir(n.nivel) }, subiu, ganho: g };
}

/** @param {ReturnType<typeof normalizarPerfil>} n @param {Premio} pr */
function liberar(n, pr) {
  if (pr.tipo === 'gotas') n.gotas += pr.gotas || 0;
  else if (pr.tipo === 'reacao' && pr.id && !n.liberados.reacoes.includes(pr.id)) n.liberados.reacoes.push(pr.id);
  else if (pr.tipo === 'powerup' && pr.id && !n.liberados.powerups.includes(pr.id)) n.liberados.powerups.push(pr.id);
  else if (pr.tipo === 'skin' && pr.id) {
    if (!n.liberados.skins.includes(pr.id)) n.liberados.skins.push(pr.id);
    n.skin = pr.id;
  }
}

/**
 * Os proximos marcos da trilha a partir do nivel atual (para o cartao).
 * @param {number} nivel @param {number} [quantos]
 */
export function proximosMarcos(nivel, quantos = 4) {
  const l = [];
  for (let n = nivel + 1; l.length < quantos && n < nivel + 40; n++) {
    const pr = premiosDoNivel(n);
    if (pr.length) l.push({ nivel: n, premios: pr });
  }
  return l;
}
