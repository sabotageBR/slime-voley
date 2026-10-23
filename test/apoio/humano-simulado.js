// Novato simulado (desenho §2.8; M2d, 2026-10-22): um jogador humano de mentira que dirige o slime 0
// de uma partida 'cpu' pela mesma entrada do main.js (p.intencao e p.interacao), para valerem as
// protecoes, as assistencias (ima, devolucao), o anjo e a cortada guiada. Por baixo, uma IA de
// src/jogo/ia.js com a velocidade do humano e um talento h (0 = PERFIS.fraco, 1 = PERFIS.bom), mais
// os erros de gente: pulo fora de hora, pulo a toa, saque de dois toques com erro de tempo (as vezes
// esquece o 2o toque, as vezes bate cedo), cortada quase sempre por toque e leitura incerta da mira
// do rival. Rng proprio (semente ^ hashTexto('novato')): nunca consome o rng da partida, e a mesma
// semente da a mesma partida.
//
// Uso (tools/calibrar.mjs, test/novato.test.js):
//   const n = criarNovato(semente, { h: 0.4 });
//   n.jogar(p); p.passo(); n.observar(p.eventos); p.eventos.length = 0;
// Fica fora do src/ (a build nunca leva) e segue a pureza do jogo: sem Math.random nem relogio.

import { criarIA, irPara } from '../../src/jogo/ia.js';
import { criarRng, hashTexto } from '../../src/core/rng.js';
import { VEL, PASSO, LARG } from '../../src/fisica/volei.js';
import { SAQUE, posicaoParaRumo } from '../../src/jogo/regras.js';
import { tem } from '../../src/jogo/medidor.js';

/**
 * As pontas do talento: o fraco e o humano do desenho §2.8. vel: a fracao da velocidade que o dedo
 * usa (o stick nem sempre vai ao fim); distraido: a chance por jogada de nem se mexer; leMira: a de
 * ler a reticula da cortada do rival.
 */
export const PERFIS = Object.freeze({
  fraco: Object.freeze({ reacao: 0.7, erro: 3.6, pulo: 0.1, foraDeHora: 0.5, leMira: 0.2, vel: 0.65, distraido: 0.2 }),
  bom: Object.freeze({ reacao: 0.28, erro: 1.2, pulo: 0.3, foraDeHora: 0.2, leMira: 0.8, vel: 1, distraido: 0.02 }),
});

/**
 * Parametros do novato, ajustados (2026-10-22) para reproduzir a 0.2.0 no Player Fit Test: 30% de
 * vitoria contra o Pingo na 2a partida, cerca de 33% de m3 a m10 no funil com desistencia, a 1a
 * partida em cerca de 1 min e os saques por gameplay (40% com um perfeito, 56% com um bom, quase
 * todos com um fraco: 87% dos saques saem fracos). Congelados: a calibragem da Copa mexe na CPU,
 * nunca aqui (docs/marcos/M2d.md; o calibrar troca pela linha de comando).
 * h0/espalha: o talento da populacao (cada vida sorteia h0 +- espalha); aprende: quanto h sobe
 * por partida jogada. puloAToa: chance por jogada de pular sem plano. fora: o desvio do pulo fora de
 * hora (s), cedo: a fracao dos cedos. saque: espera antes do 1o toque, chance de esquecer o 2o,
 * chance de bater cedo (fraco), vies e desvio do 2o toque (s), chance de andar para mirar.
 * cortada: chance de tentar por jogada, chance de segurar (em vez do toque), quanto segura e a
 * chance de mexer a mira segurando. inicio: espera do toque que libera o saque (partida nova).
 */
export const NOVATO = Object.freeze({
  h0: 0.33,
  espalha: 0.3,
  aprende: 0.085,
  puloAToa: 0.08,
  fora: Object.freeze([0.08, 0.3]),
  cedo: 0.6,
  saque: Object.freeze({ espera: Object.freeze([0.4, 1.5]), esquece: 0.05, cedo: 0.6, vies: 0.22, desvio: 0.12, anda: 0.3 }),
  cortada: Object.freeze({ chance: 0.5, segura: 0.15, tSegura: Object.freeze([0.6, 1.0]), mexe: 0.5 }),
  inicio: Object.freeze([0.5, 1.5]),
  via: 'toque',
});

/**
 * Funde parametros parciais (um nivel de objetos aninhados) sobre NOVATO.
 * @param {any} [o]
 */
export function paramsNovato(o = {}) {
  const r = { ...NOVATO, ...o };
  for (const k of ['saque', 'cortada']) r[k] = { ...NOVATO[k], ...(o[k] || {}) };
  return r;
}

/**
 * O talento de uma vida (0..1): h0 com o espalhamento da semente e o que aprendeu em `partidas`.
 * @param {number} semente @param {any} [params] @param {number} [partidas]
 */
export function talentoDaVida(semente, params = NOVATO, partidas = 0) {
  const r = criarRng((semente ^ hashTexto('talento')) >>> 0);
  const h = params.h0 + (r() * 2 - 1) * params.espalha + params.aprende * partidas;
  return Math.max(0, Math.min(1, h));
}

/**
 * @param {number} semente
 * @param {any} [o] parametros parciais do NOVATO; h fixa o talento (senao, talentoDaVida)
 */
export function criarNovato(semente, o = {}) {
  const P = paramsNovato(o);
  const h = o.h ?? talentoDaVida(semente, P);
  const rng = criarRng((semente ^ hashTexto('novato')) >>> 0);
  const lerp = (k) => PERFIS.fraco[k] + (PERFIS.bom[k] - PERFIS.fraco[k]) * h;
  const T = { reacao: lerp('reacao'), erro: lerp('erro'), pulo: lerp('pulo'), foraDeHora: lerp('foraDeHora'), leMira: lerp('leMira'), vel: lerp('vel'), distraido: lerp('distraido') };
  const ia = criarIA({ vel: VEL * T.vel, reacao: T.reacao, erro: T.erro, pulo: T.pulo, corta: 0, saqueErro: 0 }, rng, {});
  const entre = (a) => a[0] + (a[1] - a[0]) * rng();
  /** normal aproximada (soma de 3 uniformes), desvio 1 */
  const normal = () => (rng() + rng() + rng() - 1.5) * 2;

  const nulo = !!o.nulo;
  /** espera do toque que libera (partida nova, portao, volta de pausa) */
  let tEspera = 0;
  let esperaAlvo = entre(P.inicio);
  /** jogada: o desvio do pulo (s; + cedo), se pula a toa, se ja pulou, se tenta a cortada */
  let jog = { d: 0, aToa: false, pulou: false, corta: false, leu: false, parado: false };
  /** saque: a fase vista, a espera do 1o toque, quando bate o 2o (s de levantada; null: esquece) e o rumo */
  let sq = { fase: '', t: 0, espera: entre(P.saque.espera), tBater: /** @type {number|null} */ (0), bateu: false, anda: false, rumo: 0 };
  /** a casa da recepcao (sorteada a cada saque do rival) */
  let casa = -6.5;
  /** botao: segurado ate tSolta (s de jogo-real); quanto ja segurou na cortada */
  let tBotao = 0;
  let cort = { decidida: false, segura: false, tSegura: 0, t: 0, mexe: 0 };
  let ultimoTMundo = 0;
  /** contagens (o calibrar le) */
  const stats = { saques: { perfeito: 0, bom: 0, fraco: 0, simples: 0 }, cortadas: 0, toques: 0, gestos: { toque: 0, segurou: 0 }, pulos: 0 };

  function novaJogada() {
    ia.jogada();
    const fora = rng() < T.foraDeHora;
    const d = fora ? entre(P.fora) * (rng() < P.cedo ? 1 : -1) : 0;
    jog = { d, aToa: rng() < P.puloAToa, pulou: false, corta: rng() < P.cortada.chance, leu: rng() < T.leMira, parado: rng() < T.distraido };
  }

  function novoSaque() {
    const s = P.saque;
    sq = { fase: 'pronto', t: 0, espera: entre(s.espera), tBater: 0, bateu: false, anda: rng() < s.anda, rumo: rng() * 2 - 1 };
  }

  /** Plano do 2o toque do saque (s de levantada), sorteado no 1o toque; null = esquece. */
  function planoBatida(TS) {
    const s = P.saque;
    const r = rng();
    if (r < s.esquece) return null;
    if (r < s.esquece + s.cedo) return SAQUE.ignora + 0.01 + rng() * Math.max(0.01, TS.ideal - 0.2 - SAQUE.ignora - 0.01);
    return TS.ideal + s.vies + normal() * s.desvio;
  }

  return {
    get h() { return h; },
    get talento() { return T; },
    get stats() { return stats; },
    /**
     * A entrada deste passo real (antes do p.passo()).
     * @param {any} p a partida
     */
    jogar(p) {
      const s = p.slimes[0];
      const it = { eixo: 0, botao: false, borda: false, miraDx: 0, via: P.via };
      // dt do slime 0 neste passo (o canal dele: mundo, ou defensor na cortada do rival)
      const Tp = p.tempo;
      const canal = p.cortada && p.cortada.i !== 0 ? Tp.escala.defensor : Tp.escala.mundo;
      const dtM = Tp.hitstop > 0 ? 0 : (PASSO * canal) / 1000;
      ultimoTMundo = Tp.tMundo;
      // o toque que libera (partida nova, portao): o mesmo toque ja levanta o saque
      if (p.esperaToque) {
        tEspera += PASSO;
        if (tEspera >= esperaAlvo) {
          tEspera = 0;
          esperaAlvo = entre(P.inicio);
          p.interacao();
          if (p.estado === 'saque' && p.sacador === 0) { it.borda = true; it.botao = true; sq.fase = 'levantando'; sq.tBater = planoBatida(p.temposSaque); sq.bateu = false; }
        }
        p.intencao(0, it);
        return;
      }
      if (nulo && !(p.estado === 'saque' && p.sacador === 0)) { p.intencao(0, it); return; }
      const est = p.estado;
      if (est === 'saque') {
        if (p.sacador === 0) this.sacar(p, it);
        else it.eixo = irPara(s.x, casa, 11, s.vx);
      } else if (est === 'jogo') {
        this.rali(p, it, dtM);
      }
      p.intencao(0, it);
    },

    /** O saque do novato: espera, levanta, (anda) e bate no instante sorteado. */
    sacar(p, it) {
      const s = p.slimes[0];
      const Sq = p.saque;
      if (Sq.fase === 'pronto') {
        if (sq.fase !== 'pronto') novoSaque();
        sq.t += PASSO;
        if (sq.t >= sq.espera) {
          it.borda = true;
          it.botao = true;
          p.interacao();
          sq.fase = 'levantando';
          sq.tBater = planoBatida(p.temposSaque);
          sq.bateu = false;
        }
        return;
      }
      if (Sq.fase === 'levantada') {
        sq.fase = 'levantada';
        if (sq.anda) it.eixo = irPara(s.x, posicaoParaRumo(Sq.x0, s.lado, sq.rumo), 11, s.vx);
        if (!p.saqueSimples && !sq.bateu && sq.tBater !== null && Sq.tL >= sq.tBater) {
          it.borda = true;
          it.botao = true;
          p.interacao();
          sq.bateu = true;
        }
      }
    },

    /** O rali: a IA anda e planeja; o pulo sai na hora dela, mais o desvio da jogada; a cortada. */
    rali(p, it, dtM) {
      const s = p.slimes[0];
      const rali = p.rali;
      const cortRival = p.cortada && p.cortada.i !== 0 ? p.cortada : null;
      const ctx = {
        bola: p.bola, eu: s, outro: p.slimes[1], meus: rali.lado === s.lado ? rali.toques : 0, estado: p.estado,
        souSacador: p.sacador === 0, mira: cortRival && jog.leu ? { x: cortRival.alvoX } : null,
        vento: p.ginasio.vento, teto: p.ginasio.teto, tJogo: p.tempo.tJogo,
      };
      // a propria cortada: soltar (o toque) ou segurar, as vezes mexendo a mira
      const minha = p.cortada && p.cortada.i === 0 ? p.cortada : null;
      if (minha) {
        if (!cort.decidida) {
          cort = { decidida: true, segura: rng() < P.cortada.segura, tSegura: entre(P.cortada.tSegura), t: 0, mexe: rng() < P.cortada.mexe ? (Math.abs(p.slimes[1].x) > 8 ? -1 : 1) : 0 };
          stats.cortadas++;
          stats.gestos[cort.segura ? 'segurou' : 'toque']++;
        }
        cort.t += PASSO;
        if (cort.segura && cort.t < cort.tSegura) {
          it.botao = true;
          if (cort.mexe) it.miraDx = 0.05 * cort.mexe;
        }
        return;
      }
      cort.decidida = false;
      if (cortRival && !jog.leu) return;
      const r = ia.pensar(ctx, dtM);
      if (jog.parado) return;
      it.eixo = r.eixo * T.vel;
      // ainda segurando o botao (a pressao da cortada abre a janela por uns passos)
      if (tBotao > 0) {
        tBotao -= PASSO;
        it.botao = true;
      }
      const e = ia.estado;
      // pulo: na hora da IA mais o desvio da jogada (cedo +, tarde -); um por jogada
      if (s.noChao && !jog.pulou) {
        const quer = e.meu && (e.pula || jog.aToa);
        if (quer && e.tq > 0 && e.tq < e.tPulo + 0.02 + jog.d && Math.abs(s.x - e.alvo) < 0.9) {
          it.borda = true;
          it.botao = true;
          tBotao = 0.08;
          jog.pulou = true;
          stats.pulos++;
          p.interacao();
        }
      }
      // cortada: no ar, com o medidor (ou a gratis), a bola do meu lado e perto acima
      const Jm = p.jogadores[0];
      if (!s.noChao && jog.corta && (tem(Jm.med, 'cortada') || Jm.cortadaGratis) && p.bola.x * s.lado > 0) {
        const dy = p.bola.y - s.y;
        if (Math.abs(p.bola.x - s.x) < 3.2 && dy > 0 && dy < 5.5) {
          it.borda = true;
          it.botao = true;
          tBotao = 0.15;
          jog.corta = false;
          p.interacao();
        }
      }
      void LARG;
    },

    /** Le os eventos do passo (jogada nova e as contagens). @param {any[]} eventos */
    observar(eventos) {
      for (const e of eventos) {
        if (e.tipo === 'contagem' || e.tipo === 'saque' || e.tipo === 'cortada-solta') novaJogada();
        else if (e.tipo === 'saque-valendo') {
          novaJogada();
          casa = -6.5 + (rng() * 2 - 1) * 1.2;
          sq.fase = '';
        }
        if (e.tipo === 'saque' && e.i === 0) stats.saques[e.simples ? 'simples' : e.tipoSaque]++;
        if (e.tipo === 'contagem' && e.i === 0) stats.toques++;
      }
      void ultimoTMundo;
    },
  };
}

/**
 * Joga uma partida inteira com o novato (ou ate `tMax` s de jogo-real).
 * @param {(o: any) => any} criarPartida
 * @param {any} opcoes as da partida (modo 'cpu' e juiz desligado por padrao)
 * @param {ReturnType<typeof criarNovato>} novato
 * @param {{ tMax?: number }} [o]
 */
export function jogarPartida(criarPartida, opcoes, novato, o = {}) {
  const p = criarPartida({ modo: 'cpu', juiz: false, ...opcoes });
  const tMax = o.tMax ?? 900;
  const pontosCpu = /** @type {Record<string, number>} */ ({});
  const pontosNovato = /** @type {Record<string, number>} */ ({});
  let k = 0;
  const N = Math.round(tMax / PASSO);
  for (; k < N && p.estado !== 'fim'; k++) {
    novato.jogar(p);
    p.passo();
    novato.observar(p.eventos);
    for (const e of p.eventos) {
      if (e.tipo !== 'ponto') continue;
      const m = e.causa || e.motivo;
      if (e.i === 1) pontosCpu[m] = (pontosCpu[m] || 0) + 1;
      else pontosNovato[m] = (pontosNovato[m] || 0) + 1;
    }
    p.eventos.length = 0;
  }
  const r = p.resumo(0);
  return { venceu: r.venceu, acabou: p.estado === 'fim', placar: [...p.placar], t: k * PASSO, resumo: r, pontosCpu, pontosNovato, anjos: p.anjo.usados, partida: p };
}
