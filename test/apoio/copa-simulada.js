// Copa simulada (M2d): o novato simulado (humano-simulado.js) joga uma vida inteira na Copa 1 sobre o
// save de verdade (normalizarPerfil, registrarVitoria/registrarDerrota, aplicarGanho e a ida e volta
// em JSON), com as revanches. A partida de cada fase sai de partidaDaFase(), a mesma do main.js.
// O tools/calibrar.mjs --copa junta muitas vidas; o test/novato.test.js confere uma.

import { criarPartida } from '../../src/jogo/partida.js';
import { normalizarPerfil, rendimento, aplicarGanho } from '../../src/jogo/perfil.js';
import { novaCopa, chaveDaCopa, registrarVitoria, registrarDerrota, partidaDaFase } from '../../src/jogo/torneio.js';
import { hashTexto } from '../../src/core/rng.js';
import { criarNovato, talentoDaVida, paramsNovato, jogarPartida } from './humano-simulado.js';

/**
 * Uma vida na Copa 1.
 * @param {number} semente a vida (o talento e as sementes das partidas saem dela)
 * @param {any} [params] parametros parciais do novato (h fixa o talento)
 * @param {{ max?: number, semAlivio?: boolean, semAjuda?: boolean, copa?: number, ajuda?: number }} [o]
 *   max: partidas no maximo; semAlivio: as derrotas nao aliviam a CPU; semAjuda: sem anjo nem a
 *   ajuda ao jogador; ajuda: forca fixa da ajuda (para a calibragem)
 */
export function jogarCopa(semente, params = {}, o = {}) {
  const P = paramsNovato(params);
  const n = o.copa || 1;
  let perfil = normalizarPerfil({ copa: novaCopa(n, semente) });
  const max = o.max ?? 40;
  /** @type {any[]} */
  const partidas = [];
  let campeao = false;
  let tentativa = 0;
  let faseAntes = -1;
  while (perfil.partidas < max) {
    const ch = chaveDaCopa(perfil.copa);
    if (ch.campeao) { campeao = true; break; }
    const f = partidaDaFase(perfil.copa, perfil);
    if (perfil.copa.fase !== faseAntes) { faseAntes = perfil.copa.fase; tentativa = 0; }
    tentativa++;
    const h = params.h ?? talentoDaVida(semente, P, perfil.partidas);
    const sem = (hashTexto('vida' + semente) + perfil.partidas * 7919) >>> 0;
    const novato = criarNovato(sem, { ...params, h });
    const r = jogarPartida(criarPartida, {
      semente: sem, rival: f.rival, primeira: f.primeira, curta: f.curta,
      derrotas: o.semAlivio ? 0 : f.derrotas, anjo: o.semAjuda ? 0 : f.anjo, ajuda: o.semAjuda ? 0 : (o.ajuda ?? f.ajuda ?? 0),
      powerups: [...perfil.liberados.powerups],
    }, novato);
    partidas.push({
      n: perfil.partidas + 1, rival: f.rival, fase: perfil.copa.fase, tentativa, derrotas: f.derrotas,
      venceu: r.venceu, acabou: r.acabou, placar: r.placar, t: r.t, anjos: r.anjos, h,
      pontosCpu: r.pontosCpu, pontosNovato: r.pontosNovato, saques: novato.stats.saques,
      cortadas: novato.stats.cortadas, gestos: novato.stats.gestos, bombas: r.resumo.bombas,
    });
    perfil.partidas++;
    if (r.venceu) {
      perfil.vitorias++;
      perfil.copa = registrarVitoria(perfil.copa, r.placar);
    } else perfil.copa = registrarDerrota(perfil.copa);
    perfil = aplicarGanho(perfil, rendimento(r.resumo)).perfil;
    perfil = normalizarPerfil(JSON.parse(JSON.stringify(perfil)));
  }
  if (!campeao) campeao = chaveDaCopa(perfil.copa).campeao;
  return { semente, partidas, campeao, perfil };
}
