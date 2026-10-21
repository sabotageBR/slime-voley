// Partida do Volei de Gosma: pura e deterministica (sorteio so pelo rng da semente, relogios do
// src/jogo/tempo.js, nada de DOM). O main.js passa as intencoes de cada jogador a cada passo real
// (1/120 s) e le os eventos (som, vfx, SDK) e o estadoVisual() (render).
//
// Estados: 'saque' (o sacador levanta e bate; o jogo espera sem limite) -> 'jogo' (rali) ->
// 'ponto' (comemoracao curta 1,0 s ou completa 1,8 s; o controle volta antes do saque) ->
// 'saque' ... -> 'fim'. A cortada lenta e um sub-estado do rali (this.cortada).
//
// Regras: rally point, quem ganha o ponto saca; 3 toques por lado (o 4o e falta). A bola nunca
// sai: bate na parede de fundo dos dois lados e volta (decisao de 2026-10-21). Com { fora: true }
// vale a regra antiga (fora so no ataque estourado, por cima da placa do lado que NAO tocou por
// ultimo), mantida para comparar.

import { criarSlime, criarBola, passoSlime, passoBola, eixos, prever, pertoCupula, amassar, limitesX, limitar, RB, PASSO, PULO, G_BOLA, G_SLIME, LARG, REDE_R, REDE_H, RAIO, VEL } from '../fisica/volei.js';
import { criarTempo, passoReal, escalarTudo } from './tempo.js';
import { criarPele, passoPele, assentar, marcarCovinha, PASSO_PELE } from './pele.js';
import { TEMPOS, SAQUE, temposSaque, qualidadeSaque, profundidadeSaque, alvoDaPartida, vencedor, pontoDaPartida, TOQUES } from './regras.js';
import { criarMedidor, ganhar, gastar, tem, CUSTO } from './medidor.js';
import { criarIA, irPara } from './ia.js';
import { BOT, paramsIA, rival as acharRival } from './rivais.js';
import * as Cort from './cortada.js';
import { criarBolhas, powerUp, EFEITO } from './powerups.js';
import { reacao as acharReacao, escolherReacaoCpu, chanceReacaoCpu, REACAO } from './reacoes.js';
import { criarRng, hashTexto } from '../core/rng.js';

/** Velocidade de saida que conta como BOMBA (com a bola descendo). */
const V_BOMBA = 24;
/** Tempos do levantamento do saque (apice, ideal, volta para a mao). */
const TS = temposSaque({ g: G_BOLA, gSlime: G_SLIME, pulo: PULO, rb: RB });
/** Assistencias. */
const IMA = Object.freeze({ toque: 0.25, teclado: 0.1 });

/**
 * @typedef {Object} Intencao
 * @property {number} eixo       -1..1
 * @property {boolean} botao     acao segurada (pulo/saque/cortada)
 * @property {boolean} borda     acao apertada neste passo
 * @property {boolean} [superBorda]
 * @property {number} [miraDx]   u para a reticula (+ = mais fundo)
 * @property {number|null} [miraX] reticula num x absoluto (mouse)
 * @property {'toque'|'teclado'|'mouse'} [via]
 */

/** @returns {Intencao} */
const intencaoVazia = () => ({ eixo: 0, botao: false, borda: false, superBorda: false, miraDx: 0, miraX: null, via: 'teclado' });

/**
 * @typedef {Object} OpcoesPartida
 * @property {number} [semente]
 * @property {'cpu'|'dois'|'demo'} [modo]     demo: os dois lados pela IA (prints, testes)
 * @property {string} [rival]                 id do rival (src/jogo/rivais.js)
 * @property {boolean} [primeira]             primeira partida da vida (alvo 5, imperdivel, onboarding)
 * @property {number} [copa]
 * @property {number} [partidaN]              quantas partidas o jogador ja comecou (protecao)
 * @property {{ vento?: number, teto?: number, eAlambrado?: number }} [ginasio]
 * @property {'novo'|'segura'} [gatilho]
 * @property {{ escalaMundo?: number, escalaDefensor?: number, entrada?: number }} [lenta]
 * @property {{ ima?: boolean, devolucao?: boolean }} [assist]
 * @property {number} [nivelCortada]
 * @property {number[]} [pig]                 pigmentos [jogador, rival]
 * @property {number} [alvo]
 * @property {boolean} [qualidadeMinima]      pele com menos particulas
 * @property {0|1} [sacaPrimeiro]
 * @property {boolean} [fora]                 regra antiga do fora (padrao: a bola nunca sai)
 * @property {string[]} [powerups]           ids liberados das bolhas (vazio: sem bolhas; nunca na 1a partida)
 */

/**
 * @param {OpcoesPartida} [o]
 */
export function criarPartida(o = {}) {
  const modo = o.modo || 'cpu';
  const rng = criarRng(o.semente || 7);
  const T = criarTempo();
  const riv = acharRival(o.rival || 'gota');
  const copa = o.copa || riv.copa || 1;
  const regras = alvoDaPartida({ primeira: !!o.primeira, chefe: !!riv.chefe, copa, modo: modo === 'dois' ? 'dois' : o.alvo ? 'rapida' : 'circuito', alvo: o.alvo });
  const ginasio = { vento: 0, teto: Infinity, eAlambrado: undefined, ...(o.ginasio || {}) };
  const gatilho = o.gatilho || 'novo';
  const assist = { ima: true, devolucao: true, ...(o.assist || {}) };
  const comFora = !!o.fora;
  const bolhas = criarBolhas({ semente: o.semente, liberados: o.primeira ? [] : o.powerups || [] });
  /** reacoes da CPU: rng proprio (nao mexe no das IAs) */
  const rngR = criarRng(((o.semente || 7) ^ hashTexto('reacoes')) >>> 0);
  /** reacao planejada da CPU: { t (s que faltam), id } */
  let reacaoCpu = /** @type {{ t: number, id: string }|null} */ (null);
  const passoPeleQ = o.qualidadeMinima ? PASSO_PELE.minima : PASSO_PELE.normal;
  /** @type {any[]} */
  const eventos = [];

  const slimes = [criarSlime(-1, -7), criarSlime(1, 7)];
  const peles = slimes.map((s) => criarPele(s, passoPeleQ));
  const bola = criarBola();

  let placar = [0, 0];
  const humano = [modo !== 'demo', modo === 'dois'];
  const params = () => paramsIA(riv, { placarCpu: placar[1], placarHumano: placar[0], partida: o.partidaN || 1 });
  const ias = [
    humano[0] ? null : criarIA(BOT, rng, {}),
    humano[1] ? null : criarIA(modo === 'demo' ? BOT : params(), rng, { perso: riv.perso }),
  ];

  const J = [0, 1].map((i) => ({
    i,
    lado: i === 0 ? -1 : 1,
    s: slimes[i],
    pele: peles[i],
    it: intencaoVazia(),
    med: criarMedidor(o.primeira ? 2 : 1),
    tUltToque: -9,
    bufferPulo: 0,
    /** apertou no ar (pressao nova) e segura: candidata a cortada */
    pressaoAr: false,
    tSeguraJanela: 0,
    /** bote da cortada: s restantes */
    bote: 0,
    pulos: 0,
    cortadas: 0,
    expr: '',
    tExpr: 0,
    cortadaGratis: false,
    /** power-ups com duracao: id -> pontos que faltam */
    efeitos: /** @type {Record<string, number>} */ ({}),
    /** efeito do rival piscando antes de valer: { id, t } */
    pendente: /** @type {{ id: string, t: number }|null} */ (null),
    /** gelo: preso (parado) -> escorrega */
    gelo: /** @type {{ fase: 'preso'|'escorrega', t: number }|null} */ (null),
    /** o proximo toque que cruza a rede leva este poder: fogo | pesada */
    bolaPoder: '',
    /** cargas do Piso Mola */
    pisoMola: 0,
    /** reacao (emoji) no balao: { id, t } */
    reacao: /** @type {{ id: string, t: number }|null} */ (null),
    /** ponto (pontoN) em que ja reagiu: 1 reacao por ponto */
    reagiuEm: -1,
  }));

  /** @type {'saque'|'jogo'|'ponto'|'fim'} */
  let estado = 'saque';
  let sacador = o.sacaPrimeiro ?? (o.primeira ? 1 : 0);
  /** o primeiro saque da partida (e depois de pausa/anuncio) espera um toque real */
  let esperaToque = true;
  let tSemInteracao = 0;
  /**
   * saque: pronto (a bola sobre a cabeca) -> levantada (tL s no ar; prof = |x| do alvo) -> batendo
   * (o 2o toque pulou com a qualidade q; bate no contato)
   */
  const saque = { valendo: true, t: 0, fase: /** @type {'pronto'|'levantada'|'batendo'} */ ('pronto'), tL: 0, x0: 0, y0: 0, prof: SAQUE.prof.medio, q: /** @type {'perfeito'|'bom'|'fraco'} */ ('bom'), erro: 0, tPulo: 0, cpuEm: 0, plano: { erro: 0, prof: SAQUE.prof.medio }, tipo: '' };
  /** rali */
  const rali = { toques: 0, lado: 0, ultimo: -1, ultimoLado: 0, travessias: 0, bateuRede: false, ultimaSaida: 0, ultimaVy: 0, ultimaCortada: false, ultimoNoAr: false, ultimoX: 0, ultimoContatoX: 0, tPresa: 0, recepcaoSaque: false, saqueDeQuem: 0 };
  /** comemoracao */
  const festa = { t: 0, tipo: 'curta', lado: 0, motivo: '', palavra: '', x: 0, dur: 1, controle: 0.5, deslize: [0.3, 0.5], fim: false };
  let maxAtras = [0, 0];
  /** numeros da partida por jogador (perfil: XP e Gotas) */
  const stats = { pontos: [0, 0], aces: [0, 0], bombas: [0, 0], viradas: [0, 0], ralis10: 0 };
  let pontoN = 0;
  /** @type {Cort.Cortada|null} */
  let cortada = null;
  let tCortadaSolta = -9;
  let tSaqueSolto = -9;
  /** primeira partida: a cortada guiada ja foi oferecida/feita */
  let tutorialCortada = o.primeira ? 'esperando' : 'feito';
  let tPartida = 0;
  let fimEmitido = false;
  let resultado = 0;
  const lenta = o.lenta || {};
  // onboarding: a Gota saca 0,6 s depois do primeiro toque
  let onboardingSaque = !!o.primeira;
  let primeiroToque = false;

  // ------------------------------------------------------------------ utilidades

  const outroI = (i) => 1 - i;
  const ev = (e) => { eventos.push(e); };
  const ladoDe = (x) => (x < 0 ? -1 : 1);
  const iDoLado = (lado) => (lado < 0 ? 0 : 1);

  function caretar(i, expr, t) {
    J[i].expr = expr;
    J[i].tExpr = t;
  }

  /** Paredes de fundo ativas: as duas (padrao) ou so a do lado que tocou por ultimo (regra do fora). */
  function atualizarFundo() {
    bola.fundo[0] = !comFora || rali.ultimoLado === -1;
    bola.fundo[1] = !comFora || rali.ultimoLado === 1;
  }

  /** Bola em cima do sacador (segurando o saque). */
  function bolaNoSacador() {
    const s = slimes[sacador];
    const [, b] = eixos(s);
    bola.solta = false;
    bola.x = s.x - s.lado * 0.25;
    bola.y = s.y + b + SAQUE.folga + Math.sin(T.tJogo * 3.2) * 0.12;
    bola.vx = 0;
    bola.vy = 0;
    bola.estado = 'normal';
    bola.semLimite = false;
    bola.colide[0] = true;
    bola.colide[1] = true;
    bola.angV = 1.5;
  }

  function novaJogadaIAs() {
    for (const a of ias) if (a) a.jogada();
  }

  /** Comeca o saque de `i` (ponto acabou ou partida nova). */
  function prepararSaque(i) {
    sacador = i;
    estado = 'saque';
    saque.valendo = true;
    saque.t = 0;
    saque.fase = 'pronto';
    saque.tL = 0;
    saque.prof = SAQUE.prof.medio;
    saque.cpuEm = TEMPOS.saqueCpu[0] + rng() * (TEMPOS.saqueCpu[1] - TEMPOS.saqueCpu[0]);
    if (ias[i]) {
      saque.plano = ias[i].planoSaque(slimes[outroI(i)].x);
      // primeira partida: a CPU saca sempre o bom, um pouco atrasado (nada de ace chapado)
      if (regras.imperdivel && humano[outroI(i)]) saque.plano.erro = 0.1;
    }
    rali.toques = 0;
    rali.lado = slimes[i].lado;
    rali.ultimo = -1;
    rali.ultimoLado = slimes[i].lado;
    rali.travessias = 0;
    rali.bateuRede = false;
    rali.ultimaCortada = false;
    rali.recepcaoSaque = false;
    atualizarFundo();
    bolaNoSacador();
    novaJogadaIAs();
    ev({ tipo: 'saque-valendo', i, espera: esperaToque });
  }

  /**
   * Velocidade para a bola sair de (x0, y0), passar no apice H e cair em xAlvo.
   * @returns {number[]} [vx, vy]
   */
  function arco(x0, y0, xAlvo, H, g = G_BOLA) {
    const vy = Math.sqrt(Math.max(0.5, 2 * g * Math.max(0.3, H - y0)));
    const t = (vy + Math.sqrt(vy * vy + 2 * g * Math.max(0, y0 - RB))) / g;
    return [(xAlvo - x0) / t, vy];
  }

  /** 1o toque do saque: a bola sobe (parabola cinematica, sem colidir com a cupula). */
  function levantar(i) {
    saque.fase = 'levantada';
    saque.tL = 0;
    saque.x0 = bola.x;
    saque.y0 = bola.y;
    saque.prof = SAQUE.prof.medio;
    amassar(slimes[i], 0.25);
    ev({ tipo: 'saque-levanta', i, x: bola.x, y: bola.y });
  }

  /** Bola do levantamento no instante tL; sem batida ela volta para a mao. */
  function passoLevantada(dtM) {
    saque.tL += dtM;
    if (saque.fase === 'levantada' && saque.tL >= TS.pega) {
      saque.fase = 'pronto';
      saque.tL = 0;
      bolaNoSacador();
      ev({ tipo: 'saque-pega', i: sacador });
      return;
    }
    const t = saque.tL;
    bola.x = saque.x0;
    bola.y = saque.y0 + TS.vy * t - (G_BOLA * t * t) / 2;
    bola.ang += 4 * dtM;
    // batendo: o pulo encontra a bola (topo da cupula), ou desiste depois de 0,7 s
    if (saque.fase === 'batendo') {
      saque.tPulo += dtM;
      const s = slimes[sacador];
      const [, b] = eixos(s);
      if (bola.y - RB <= s.y + b + 0.05 || saque.tPulo >= 0.7) executarSaque(sacador, saque.q, saque.prof, saque.erro);
    }
  }

  /** Mira do saque humano durante o levantamento: stick, arrasto ou o cursor no lado de la. */
  function mirarSaque(i, it) {
    const s = slimes[i];
    if (it.miraX !== null && it.miraX !== undefined && it.miraX * s.lado < 0) saque.prof = limitar(Math.abs(it.miraX), SAQUE.profMin, SAQUE.profMax);
    else if (Math.abs(it.eixo) >= 0.2) saque.prof = profundidadeSaque(it.eixo * -s.lado);
    if (it.miraDx) saque.prof = limitar(saque.prof + it.miraDx * 0.8, SAQUE.profMin, SAQUE.profMax);
  }

  /** 2o toque: o sacador pula; a qualidade sai do erro de tempo em relacao ao ideal. */
  function bater(i) {
    const s = slimes[i];
    saque.erro = saque.tL - TS.ideal;
    saque.q = qualidadeSaque(saque.erro, !!o.primeira);
    saque.fase = 'batendo';
    saque.tPulo = 0;
    s.vy = PULO * s.multPulo;
    s.noChao = false;
    s.tAr = 0;
    s.sig = -0.6;
    s.sigV = 0;
    ev({ tipo: 'pulo', i, x: s.x });
  }

  /**
   * Bate o saque de `i`: perfeito (VIAGEM, chapado), bom (arco normal) ou fraco (lob curto).
   * @param {number} i @param {'perfeito'|'bom'|'fraco'} q @param {number} prof @param {number} erro
   */
  function executarSaque(i, q, prof, erro) {
    const s = slimes[i];
    let alvo;
    let H = SAQUE.apice;
    let tipo = q;
    if (onboardingSaque && i === 1) {
      // lob roteirizado para o quarto da cupula do jogador voltado para a rede
      const h = slimes[0];
      const [a] = eixos(h);
      alvo = h.x + 0.45 * a;
      H = 9.0;
      tipo = 'roteiro';
      onboardingSaque = false;
    } else if (regras.imperdivel && !humano[i] && humano[outroI(i)] && placar[i] === regras.alvo - 1) {
      // protecao da primeira partida: a CPU nao fecha nem no saque (morre na rede)
      alvo = s.lado * (REDE_R + 0.9);
      H = bola.y + 0.8;
    } else {
      // perfeito: chapado a partir do contato; bom: arco normal; fraco: lob alto e curto
      if (q === 'perfeito') H = bola.y + SAQUE.subidaViagem;
      else if (q === 'fraco') { H = Math.max(SAQUE.apiceFraco, bola.y + 4); prof = Math.min(prof, SAQUE.profFraco); }
      else H = Math.max(SAQUE.apice, bola.y + 2.5);
      alvo = -s.lado * prof;
    }
    const [vx, vy] = arco(bola.x, bola.y, alvo, Math.max(H, bola.y + 0.3));
    bola.solta = true;
    bola.vx = vx;
    bola.vy = vy;
    bola.estado = 'normal';
    bola.angV = -s.lado * (q === 'perfeito' ? 10 : 6);
    estado = 'jogo';
    saque.valendo = false;
    saque.fase = 'pronto';
    saque.tipo = tipo;
    rali.recepcaoSaque = true;
    rali.saqueDeQuem = i;
    rali.ultimo = i;
    rali.ultimoLado = s.lado;
    rali.toques = 0;
    atualizarFundo();
    amassar(s, -0.35);
    tSaqueSolto = T.tMundo;
    novaJogadaIAs();
    ev({ tipo: 'saque', i, tipoSaque: tipo, alvo, x: bola.x, y: bola.y, erro });
  }

  // ------------------------------------------------------------------ pontos

  /**
   * Ponto para o lado `ladoV` (-1 esquerda, 1 direita).
   * @param {number} ladoV @param {string} motivo ponto | ace | bomba | bloqueio | fora | rede | toques4
   * @param {number} x onde caiu
   */
  function ponto(ladoV, motivo, x) {
    if (estado !== 'jogo') return;
    if (cortada) terminarCortada(true);
    const iv = iDoLado(ladoV);
    const ip = outroI(iv);
    const antes = [...placar];
    placar[iv]++;
    pontoN++;
    // maior desvantagem (para a VIRADA)
    for (const k of [0, 1]) maxAtras[k] = Math.max(maxAtras[k], placar[1 - k] - placar[k]);
    const virada = antes[iv] < antes[ip] && placar[iv] > placar[ip] && maxAtras[iv] >= 2;
    let palavra = motivo === 'toques4' ? 'toques4' : motivo;
    if (virada) palavra = 'virada';
    stats.pontos[iv]++;
    if (motivo === 'ace') stats.aces[iv]++;
    if (motivo === 'bomba') stats.bombas[iv]++;
    if (virada) stats.viradas[iv]++;
    if (rali.travessias >= 10) stats.ralis10++;
    else if (rali.travessias >= 10) palavra = 'rali';
    const mp = pontoDaPartida(placar, regras);
    const vence = vencedor(placar, regras);
    // festa completa: 1o ponto da partida, 3 primeiros da 1a partida, ace/bomba/super/bloqueio,
    // virada, rali longo, o ponto que da match point
    let completa = pontoN === 1 || (o.primeira && pontoN <= 3) || ['ace', 'bomba', 'bloqueio', 'fogo', 'raio', 'jornada', 'virada', 'rali'].includes(palavra) || (mp !== 0 && pontoDaPartida(antes, regras) === 0) || vence !== 0;
    // ponto da CPU: festa curta assimetrica, sem palavra
    const daCpu = !humano[iv] && humano[ip];
    if (daCpu) completa = vence !== 0 ? completa : false;
    festa.t = 0;
    festa.tipo = completa ? 'completa' : 'curta';
    festa.lado = ladoV;
    festa.motivo = motivo;
    festa.palavra = daCpu && vence === 0 ? '' : palavra;
    festa.x = x;
    festa.dur = completa ? TEMPOS.festaCompleta : TEMPOS.festaCurta;
    festa.controle = completa ? TEMPOS.controleCompleta : TEMPOS.controleCurta;
    festa.deslize = completa ? TEMPOS.deslizeCompleta : TEMPOS.deslizeCurta;
    festa.fim = vence !== 0;
    T.hitstop = completa ? TEMPOS.hitstopCompleta : TEMPOS.hitstopCurta;
    estado = 'ponto';
    sacador = iv;
    // elastico: a CPU ajusta entre pontos (funcao continua do placar, mesmo nivel)
    if (ias[1] && modo === 'cpu') ias[1].definirParams(params());
    // power-ups com duracao vencem por ponto (o ponto em que pegou conta)
    for (const Jx of J) {
      for (const id of Object.keys(Jx.efeitos)) {
        if (--Jx.efeitos[id] > 0) continue;
        delete Jx.efeitos[id];
        if (id === 'pisoMola') Jx.pisoMola = 0;
        ev({ tipo: 'powerup-fim', i: Jx.i, id });
      }
    }
    ganhar(J[iv].med, 'ganhou');
    ganhar(J[ip].med, 'perdeu');
    caretar(iv, 'feliz', 1.6);
    caretar(ip, placar[ip] + 3 <= placar[iv] ? 'chorinho' : 'emburrado', 1.6);
    if (vence !== 0) {
      caretar(iv, 'feliz', 99);
      caretar(ip, 'choro', 99);
      resultado = vence;
    }
    ev({ tipo: 'ponto', lado: ladoV, i: iv, motivo, palavra: festa.palavra, festa: festa.tipo, x, placar: [...placar], humano: humano[iv], cpu: daCpu, matchPoint: vence === 0 ? mp : 0, fim: vence !== 0, travessias: rali.travessias });
    if (vence === 0 && mp !== 0 && pontoDaPartida(antes, regras) !== mp) ev({ tipo: 'match-point', lado: mp });
    // a CPU as vezes reage sozinha ao ponto (convencida quando ganha, brava ou chorando quando perde)
    reacaoCpu = null;
    if (modo === 'cpu' && vence === 0 && rngR() < chanceReacaoCpu(riv)) {
      const [a0, a1] = REACAO.atraso;
      reacaoCpu = { t: a0 + (a1 - a0) * rngR(), id: escolherReacaoCpu(rngR, { ganhou: iv === 1 }) };
    }
  }

  /**
   * Reacao (emoji) de `i`: so fora do rali e 1 por ponto. O rosto faz a expressao junto e a CPU
   * as vezes responde.
   */
  function reagir(i, id) {
    const r = acharReacao(id);
    if (!r || pontoN === 0 || J[i].reagiuEm === pontoN) return false;
    if (estado !== 'ponto' && estado !== 'saque' && estado !== 'fim') return false;
    J[i].reagiuEm = pontoN;
    J[i].reacao = { id, t: 0 };
    caretar(i, r.expr, REACAO.dur);
    ev({ tipo: 'reacao', i, id, humano: humano[i] });
    const c = outroI(i);
    if (humano[i] && ias[c] && modo === 'cpu' && J[c].reagiuEm !== pontoN && !reacaoCpu && rngR() < REACAO.chanceResposta) {
      reacaoCpu = { t: REACAO.resposta, id: escolherReacaoCpu(rngR, { ganhou: sacador === c, resposta: id }) };
    }
    return true;
  }

  /** Baloes e a reacao planejada da CPU (jogo-real). */
  function passoReacoes(dtR) {
    for (const Jx of J) {
      if (!Jx.reacao) continue;
      Jx.reacao.t += dtR;
      if (Jx.reacao.t >= REACAO.dur) Jx.reacao = null;
    }
    if (reacaoCpu) {
      reacaoCpu.t -= dtR;
      if (reacaoCpu.t <= 0) {
        const id = reacaoCpu.id;
        reacaoCpu = null;
        if (ias[1]) reagir(1, id);
      }
    }
  }

  /** Motivo do ponto quando a bola toca o chao do lado `ladoChao`. */
  function motivoChao(ladoChao) {
    const ladoV = -ladoChao;
    if (rali.recepcaoSaque && rali.ultimoLado === ladoV && rali.saqueDeQuem === iDoLado(ladoV)) return 'ace';
    if (rali.ultimoLado === ladoV) {
      if (rali.ultimaCortada) return 'bomba';
      if (rali.ultimaSaida >= V_BOMBA && rali.ultimaVy < 0) return 'bomba';
      if (rali.ultimoNoAr && Math.abs(rali.ultimoContatoX) < 2.6 && rali.toques <= 1) return 'bloqueio';
      return 'ponto';
    }
    // caiu do lado de quem tocou por ultimo: erro (na rede, se bateu nela)
    if (rali.bateuRede) return 'rede';
    return 'ponto';
  }

  // ------------------------------------------------------------------ cortada lenta

  function tentarCortada(i, humanoOuCpu) {
    if (cortada || estado !== 'jogo') return false;
    const Jm = J[i];
    const s = slimes[i];
    const gratis = Jm.cortadaGratis;
    if (!gratis && !tem(Jm.med, 'cortada')) return false;
    const meus = rali.lado === s.lado ? rali.toques : 0;
    const ok = Cort.elegivel({
      slime: s, bola, meus,
      recepcaoSaque: rali.recepcaoSaque && rali.saqueDeQuem !== i,
      bolaEspecial: bola.estado !== 'normal',
      toqueAnteriorMeu: rali.ultimoLado === s.lado && rali.toques >= 1,
      nivel: o.nivelCortada || 1,
      tutorial: tutorialCortada === 'oferecida' && humano[i],
    });
    if (!ok) return false;
    if (!gratis) gastar(Jm.med, 'cortada');
    Jm.cortadaGratis = false;
    const outro = slimes[outroI(i)];
    const tMax = tutorialCortada === 'oferecida' && humano[i] ? Cort.CORTADA.tMiraTutorial : modo === 'dois' ? Cort.CORTADA.tMira2P : Cort.CORTADA.tMira;
    cortada = Cort.iniciar(i, s, { tMax, alvoX: Cort.miraPadrao(s.lado, outro.x, outro.vx), gratis, vento: ginasio.vento });
    cortada.cpuSegura = humanoOuCpu ? 0 : 0.4 + rng() * 0.2;
    cortada.bola0 = [bola.x, bola.y];
    s.congelado = true;
    s.sigAlvo = -0.6;
    bola.colide[i] = false;
    bola.colide[outroI(i)] = false;
    Jm.cortadas++;
    caretar(i, 'focado', 9);
    ev({ tipo: 'cortada-entra', i, x: s.x, y: s.y, humano: humano[i] });
    return true;
  }

  function soltarCortada() {
    const c = cortada;
    if (!c || c.fase !== 'mirando') return;
    const i = c.i;
    const s = slimes[i];
    c.fase = 'soltando';
    c.t = 0;
    Cort.resolver(c, s.lado, ginasio.vento);
    bola.solta = true;
    bola.x = c.bx;
    bola.y = c.by;
    bola.vx = c.vx;
    bola.vy = c.vy;
    bola.estado = 'cortada';
    bola.semLimite = true;
    bola.angV = s.lado * 18;
    // conta como toque do lado de quem cortou
    if (rali.lado !== s.lado) { rali.lado = s.lado; rali.toques = 0; }
    rali.toques++;
    rali.ultimo = i;
    rali.ultimoLado = s.lado;
    rali.ultimaCortada = true;
    rali.ultimaSaida = Math.hypot(c.vx, c.vy);
    rali.ultimaVy = c.vy;
    rali.ultimoNoAr = true;
    rali.ultimoContatoX = c.bx;
    rali.recepcaoSaque = false;
    atualizarFundo();
    s.congelado = false;
    s.sigAlvo = 0;
    s.sig = 0.5;
    J[i].bote = 0.18;
    J[i].tUltToque = T.tMundo;
    tCortadaSolta = T.tMundo;
    bola.colide[outroI(i)] = true;
    T.hitstop = Cort.CORTADA.hitstop;
    novaJogadaIAs();
    caretar(i, 'feliz', 0.8);
    const quick = c.tTotal < Cort.CORTADA.devolucao + Cort.CORTADA.entrada && c.mexido < 1;
    ev({ tipo: 'cortada-solta', i, x: c.bx, y: c.by, vx: c.vx, vy: c.vy, alvoX: c.alvoX, auto: !c.mexeu, rapida: quick, tMira: c.tTotal });
    if (gatilho === 'segura' && quick && !c.gratis) J[i].med.v = Math.min(300, J[i].med.v + CUSTO.cortada);
    if (tutorialCortada === 'oferecida' && humano[i]) tutorialCortada = 'feito';
  }

  function terminarCortada(cancelada = false) {
    if (!cortada) return;
    const i = cortada.i;
    slimes[i].congelado = false;
    slimes[i].sigAlvo = 0;
    bola.colide[0] = true;
    bola.colide[1] = true;
    escalarTudo(T, 1000);
    if (cancelada && cortada.fase !== 'soltando') ev({ tipo: 'cortada-cancela', i });
    cortada = null;
  }

  /** Avanca a cortada no jogo-real. @param {number} dtR */
  function passoCortada(dtR) {
    const c = cortada;
    if (!c) return;
    c.t += dtR;
    c.tTotal += dtR;
    const s = slimes[c.i];
    const Jm = J[c.i];
    if (c.fase === 'entrando' || c.fase === 'mirando') {
      // a bola vai para o ponto de batida (mola no jogo-real) e respira
      const k = 1 - Math.exp(-dtR * 38);
      bola.solta = false;
      bola.x += (c.bx - bola.x) * k;
      bola.y += (c.by + Math.sin(c.tTotal * 6) * 0.05 - bola.y) * k;
      bola.angV = 2;
      // mira
      if (humano[c.i]) {
        if (Jm.it.miraX !== null && Jm.it.miraX !== undefined) Cort.mirarEm(c, s.lado, Jm.it.miraX, ginasio.vento);
        if (Jm.it.miraDx) Cort.mirar(c, s.lado, Jm.it.miraDx, ginasio.vento);
      }
    }
    if (c.fase === 'entrando') {
      if (c.t >= (lenta.entrada ?? Cort.CORTADA.entrada)) { c.fase = 'mirando'; c.t = 0; ev({ tipo: 'cortada-mira', i: c.i }); }
    } else if (c.fase === 'mirando') {
      const soltou = humano[c.i] ? !Jm.it.botao : c.t >= (c.cpuSegura || 0.5);
      if (soltou || c.t >= c.tMax) soltarCortada();
    } else if (c.fase === 'soltando') {
      if (c.t >= Cort.CORTADA.hitstop + Math.max(0.08, Cort.CORTADA.saida)) terminarCortada();
    }
    if (cortada) {
      const e = Cort.escalas(cortada, lenta);
      T.escala.mundo = e.mundo;
      T.escala.defensor = e.defensor;
      T.escala.bola = e.bola === 1000 ? 1000 : 0;
    }
  }

  // ------------------------------------------------------------------ toques

  function aoToque(e) {
    const i = e.i;
    const Jm = J[i];
    const s = slimes[i];
    marcarCovinha(Jm.pele, e.x, e.y, e.nx, e.ny, limitar(e.imp / 18, 0.3, 1.4));
    amassar(s, limitar(e.imp * 0.02, 0, 0.5) * Math.max(0.2, e.ny));
    // o mesmo slime colado na bola conta um toque so
    const novo = T.tMundo - Jm.tUltToque > TEMPOS.debounceToque;
    Jm.tUltToque = T.tMundo;
    ev({ tipo: 'toque', i, x: e.x, y: e.y, nx: e.nx, ny: e.ny, imp: e.imp, novo, estado });
    if (!novo || estado !== 'jogo') return;
    // manchete perfeita: so contra cortada (ou super), perto do topo da cupula
    const especial = bola.estado !== 'normal' && rali.ultimoLado !== s.lado;
    bola.gMult = 1;
    if (especial) {
      const [a] = eixos(s);
      const perfeita = Math.abs(e.x - s.x) <= 0.35 * a;
      if (!perfeita && bola.estado === 'fogo') {
        // recepcao da Bola de Fogo: o receptor e empurrado para tras e a bola sai fraca
        s.vx = s.lado * EFEITO.fogo.empurrao;
        amassar(s, EFEITO.fogo.sigma);
        bola.vx *= EFEITO.fogo.saida;
        bola.vy = Math.max(bola.vy * EFEITO.fogo.saida, 5);
        ev({ tipo: 'fogo-recepcao', i, x: e.x, y: e.y });
      }
      if (perfeita) {
        const [vx, vy] = arco(bola.x, bola.y, s.lado * 6, bola.y + 3.2);
        const f = 9 / Math.max(1e-3, Math.hypot(vx, vy));
        bola.vx = vx * Math.max(0.6, f);
        bola.vy = Math.max(7, vy * Math.max(0.6, f));
        ganhar(Jm.med, 'perfeita');
        ev({ tipo: 'perfeita', i, x: bola.x, y: bola.y, contra: bola.estado });
      }
      bola.estado = 'normal';
      bola.semLimite = false;
    } else if (bola.estado === 'cortada') {
      bola.estado = 'normal';
      bola.semLimite = false;
    }
    if (rali.lado !== s.lado) { rali.lado = s.lado; rali.toques = 0; }
    rali.toques++;
    rali.ultimo = i;
    rali.ultimoLado = s.lado;
    rali.ultimaCortada = false;
    rali.ultimoNoAr = !s.noChao;
    rali.ultimoContatoX = e.x;
    if (rali.saqueDeQuem !== i) rali.recepcaoSaque = false;
    atualizarFundo();
    ganhar(Jm.med, 'toque');
    if (humano[i] && !humano[outroI(i)]) assistir(i);
    // protecao da primeira partida: a CPU nunca fecha a partida (erra de forma visivel: a bola
    // morre na rede, do proprio lado; para fora nao da mais, a parede de fundo devolve)
    if (!humano[i] && humano[outroI(i)] && regras.imperdivel && placar[i] === regras.alvo - 1) {
      const [vx, vy] = arco(bola.x, bola.y, s.lado * (REDE_R + 0.9), bola.y + 0.8);
      bola.vx = vx;
      bola.vy = vy;
    } else if (!humano[i] && humano[outroI(i)] && tutorialCortada === 'esperando' && J[outroI(i)].med.v >= CUSTO.cortada && placar[outroI(i)] >= 1) {
      // cortada guiada: a Gota devolve uma bola alta perto da rede do jogador
      const alvoX = s.lado * -3.2;
      const [vx, vy] = arco(bola.x, bola.y, alvoX, 10.5);
      bola.vx = vx;
      bola.vy = vy;
      tutorialCortada = 'oferecida';
      ev({ tipo: 'tutorial-cortada', i: outroI(i) });
    }
    if (Jm.bolaPoder) poderNaBola(i);
    rali.ultimaSaida = Math.hypot(bola.vx, bola.vy);
    rali.ultimaVy = bola.vy;
    if (rali.toques > TOQUES) {
      ev({ tipo: 'texto', chave: 'grito.toques4', x: s.x, y: 6.2 });
      ponto(-s.lado, 'toques4', s.x);
      return;
    }
    ev({ tipo: 'contagem', i, n: rali.toques });
    novaJogadaIAs();
  }

  // ------------------------------------------------------------------ power-ups

  /** A bolha pegou: o poder vai para `i` (quem tocou por ultimo). */
  function aplicarPowerUp(i, id) {
    const c = powerUp(id);
    if (!c || i < 0) return;
    const Jm = J[i];
    const r = outroI(i);
    if (id === 'cortadaGratis') Jm.cortadaGratis = true;
    else if (id === 'segmento') Jm.med.v = Math.min(300, Jm.med.v + 100);
    else if (c.tipo === 'bola') Jm.bolaPoder = id;
    else if (c.tipo === 'rival') J[r].pendente = { id, t: 0 };
    else {
      Jm.efeitos[id] = c.pontos || 1;
      if (id === 'pisoMola') Jm.pisoMola = 1;
    }
    ev({ tipo: 'powerup', i, id, alvo: c.tipo === 'rival' ? r : i, humano: humano[i] });
  }

  /** Avisos e gelo de um slime (s de mundo). */
  function passoPoderes(i, dtM) {
    const Jm = J[i];
    const s = slimes[i];
    if (Jm.pendente) {
      Jm.pendente.t += dtM;
      if (Jm.pendente.t >= EFEITO.avisoRival) {
        const id = Jm.pendente.id;
        Jm.pendente = null;
        if (id === 'congelar') Jm.gelo = { fase: 'preso', t: 0 };
        else Jm.efeitos[id] = powerUp(id)?.pontos || 1;
        ev({ tipo: 'powerup-vale', i, id, x: s.x, y: s.y });
      }
    }
    if (Jm.gelo) {
      Jm.gelo.t += dtM;
      if (Jm.gelo.fase === 'preso' && Jm.gelo.t >= EFEITO.gelo.preso) {
        Jm.gelo = { fase: 'escorrega', t: 0 };
        ev({ tipo: 'gelo-quebra', i, x: s.x, y: s.y });
      } else if (Jm.gelo.fase === 'escorrega' && Jm.gelo.t >= EFEITO.gelo.escorrega) Jm.gelo = null;
    }
  }

  /** Fogo ou Bola Pesada no toque de `i` que vai cruzar a rede (re-mira para a mesma queda). */
  function poderNaBola(i) {
    const Jm = J[i];
    const s = slimes[i];
    const P = prever(bola, { tMax: 3, vento: ginasio.vento, teto: ginasio.teto });
    if (P.x * s.lado >= 0) return;
    const id = Jm.bolaPoder;
    Jm.bolaPoder = '';
    const xq = limitar(P.x, -LARG + 0.8, LARG - 0.8);
    const H = Math.max(bola.y, REDE_H + RB + 1.0) + 0.5;
    if (id === 'fogo') {
      const [vx, vy] = arco(bola.x, bola.y, xq, H);
      const f = EFEITO.fogo.vel * Math.hypot(bola.vx, bola.vy) / Math.max(1e-3, Math.hypot(vx, vy));
      bola.vx = vx * Math.max(1, Math.min(1.5, f));
      bola.vy = vy;
      bola.estado = 'fogo';
    } else {
      const g = G_BOLA * EFEITO.pesada;
      const [vx, vy] = arco(bola.x, bola.y, xq, H + 1, g);
      bola.vx = vx;
      bola.vy = vy;
      bola.gMult = EFEITO.pesada;
    }
    ev({ tipo: 'bola-poder', i, id, x: bola.x, y: bola.y });
  }

  /** Devolucao assistida e 3o toque puxado (so contra a CPU, ligado no toque). */
  function assistir(i) {
    if (!assist.devolucao) return;
    const s = slimes[i];
    const Jm = J[i];
    const parado = s.noChao && Math.abs(Jm.it.eixo) < 0.2;
    const alvo = -s.lado * 6;
    const P = prever(bola, { tMax: 3, vento: ginasio.vento, teto: ginasio.teto });
    const cruza = P.x * s.lado < 0 && P.motivo === 'chao';
    let mistura = 0;
    if (rali.toques <= 2 && parado) mistura = 0.45;
    if (rali.toques === 3 && !cruza) mistura = 0.6;
    if (!mistura) return;
    const [vx, vy] = arco(bola.x, bola.y, alvo, Math.max(bola.y + 2.5, 7.2));
    bola.vx = bola.vx * (1 - mistura) + vx * mistura;
    bola.vy = bola.vy * (1 - mistura) + vy * mistura;
  }

  /** Ima: a bola descendo perto da cupula do jogador encosta nela. */
  function ima(i) {
    const forte = !!J[i].efeitos.ima;
    if (!bola.solta || bola.vy >= 0 || !bola.colide[i]) return;
    if (!forte && (!assist.ima || !humano[i])) return;
    const s = slimes[i];
    if (forte && bola.x * s.lado < 0) return;
    const r = (humano[i] && assist.ima ? (J[i].it.via === 'toque' ? IMA.toque : IMA.teclado) : 0) + (forte ? EFEITO.ima : 0);
    const [a, b] = eixos(s);
    const p = pertoCupula(s.x, s.y, a, b, bola.x, bola.y);
    if (p.d > RB && p.d < RB + r && p.ny > 0.3) {
      const k = Math.min(1, (p.d - RB) * 0.6);
      bola.x -= p.nx * k * 0.5;
      bola.y -= p.ny * k * 0.25;
    }
  }

  // ------------------------------------------------------------------ passos

  /** Intencao efetiva de um jogador neste passo de mundo (humano ou IA). */
  function intencaoMundo(i, dtM) {
    const Jm = J[i];
    const s = slimes[i];
    const a = ias[i];
    if (estado === 'fim') {
      const feliz = Jm.expr === 'feliz';
      return { eixo: irPara(s.x, s.lado * 7, 4), pular: feliz && s.noChao && rng() < 0.08 };
    }
    if (estado === 'ponto') {
      // o sacador desliza para a zona de saque; o controle volta antes do saque
      const [d0, d1] = festa.deslize;
      if (i === sacador && festa.t >= d0 && festa.t <= d1 + 0.4) return { eixo: irPara(s.x, s.lado * 8, 11), pular: false };
      if (festa.t < festa.controle || !humano[i]) {
        if (!humano[i]) return { eixo: irPara(s.x, s.lado * 7, 8), pular: false };
        return { eixo: 0, pular: false };
      }
    }
    if (a) {
      if (estado === 'saque') {
        if (i === sacador) return { eixo: irPara(s.x, s.lado * 8, 6), pular: false };
        return { eixo: irPara(s.x, s.lado * 6.5, 8), pular: false };
      }
      const ctx = {
        bola, eu: s, outro: slimes[outroI(i)], meus: rali.lado === s.lado ? rali.toques : 0, estado,
        souSacador: i === sacador, mira: cortada && cortada.i !== i ? { x: cortada.alvoX } : null,
        vento: ginasio.vento, teto: ginasio.teto, tJogo: T.tJogo,
      };
      const r = a.pensar(ctx, dtM);
      return { eixo: r.eixo, pular: r.pulo };
    }
    // humano: pulo com buffer
    let pular = false;
    if (Jm.bufferPulo > 0) {
      Jm.bufferPulo -= dtM;
      if (s.noChao && estado !== 'saque') { pular = true; Jm.bufferPulo = 0; }
    }
    return { eixo: Jm.it.eixo, pular };
  }

  /** Bordas de entrada de um humano (no passo real: jogo-real). */
  function lerBordas(i, dtR) {
    const Jm = J[i];
    const s = slimes[i];
    const it = Jm.it;
    if (estado === 'saque' && i === sacador) {
      if (!saque.valendo || esperaToque) { it.borda = false; return; }
      if (saque.fase === 'pronto') {
        if (it.borda) levantar(i);
      } else {
        mirarSaque(i, it);
        if (it.borda && saque.fase === 'levantada' && saque.tL >= SAQUE.ignora) bater(i);
      }
      it.borda = false;
      return;
    }
    if (it.borda) {
      if (s.noChao) {
        if (estado === 'jogo' || estado === 'ponto' || estado === 'fim') Jm.bufferPulo = TEMPOS.bufferPulo + 1e-6;
        Jm.pressaoAr = false;
      } else {
        // pressao nova no ar: candidata a cortada (senao, buffer de pulo)
        Jm.pressaoAr = true;
        Jm.tSeguraJanela = 0;
        if (gatilho === 'novo' && !tentarCortada(i, true)) Jm.bufferPulo = TEMPOS.bufferPulo;
      }
    }
    // segurando no ar: tenta enquanto a bola entra na janela (pressao nova) ou, na variante
    // "segura", com o dedo do pulo segurado 180 ms depois da janela abrir
    if (!s.noChao && it.botao && !cortada && estado === 'jogo') {
      if (gatilho === 'novo' && Jm.pressaoAr) tentarCortada(i, true);
      else if (gatilho === 'segura') {
        Jm.tSeguraJanela += dtR;
        if (Jm.tSeguraJanela >= 0.18) tentarCortada(i, true);
      }
    }
    if (!it.botao) { Jm.pressaoAr = false; Jm.tSeguraJanela = 0; }
    it.borda = false;
  }

  /** Um passo de mundo de um slime (pele junto). */
  function passoDoSlime(i, dtM) {
    const s = slimes[i];
    const Jm = J[i];
    const it = intencaoMundo(i, dtM);
    let eixo = it.eixo;
    if (Jm.bote > 0) {
      Jm.bote -= dtM;
      eixo = -s.lado;
    }
    // o sacador fica na zona de saque (e parado no levantamento: o stick vira a mira)
    if (estado === 'saque' && i === sacador && saque.fase !== 'pronto') eixo = 0;
    if (estado === 'saque' && i === sacador) {
      const [z0, z1] = SAQUE.zona;
      const ax = Math.abs(s.x);
      if ((ax <= z0 && eixo * s.lado < 0) || (ax >= z1 && eixo * s.lado > 0)) eixo = 0;
    }
    // power-ups: pulo, tamanho (aos poucos, a pele acompanha), velocidade e gelo
    passoPoderes(i, dtM);
    const ef = Jm.efeitos;
    s.multPulo = (ef.puloMola ? EFEITO.pulo : 1) * (ef.cola ? EFEITO.cola.pulo : 1);
    const alvoR = RAIO * (ef.gosmao ? EFEITO.gosmao : 1) * (ef.encolher ? EFEITO.encolher : 1);
    s.R += (alvoR - s.R) * Math.min(1, dtM * 6);
    const preso = !!Jm.gelo && Jm.gelo.fase === 'preso';
    if (preso) eixo = 0;
    const velBase = (ias[i] ? ias[i].estado.p.vel : VEL) * (ef.turbo ? EFEITO.turbo : 1) * (ef.cola ? EFEITO.cola.vel : 1);
    const atrito = Jm.gelo && Jm.gelo.fase === 'escorrega' ? EFEITO.gelo.atrito : 1;
    const r = passoSlime(s, { eixo, pular: it.pular && estado !== 'saque' && !preso }, dtM, { vel: Jm.bote > 0 ? 14 : velBase, atrito });
    if (estado === 'saque' && i === sacador) {
      const [z0, z1] = SAQUE.zona;
      const ax = limitar(Math.abs(s.x), z0, z1);
      s.x = s.lado * ax;
    }
    if (r === 'pulo') { Jm.pulos++; ev({ tipo: 'pulo', i, x: s.x }); }
    if (r === 'pouso') ev({ tipo: 'pouso', i, x: s.x, forca: 1 });
    passoPele(Jm.pele, s, dtM);
    if (Jm.tExpr > 0) {
      Jm.tExpr -= dtM;
      if (Jm.tExpr <= 0) Jm.expr = '';
    }
  }

  /** Um passo de mundo da bola. */
  function passoDaBola(dtM, andaram) {
    if (estado === 'saque') {
      if (saque.fase !== 'pronto') passoLevantada(dtM);
      else {
        bolaNoSacador();
        bola.ang += bola.angV * dtM;
      }
      return;
    }
    if (!bola.solta) return;
    for (const i of [0, 1]) ima(i);
    // a cupula de quem acabou de cortar nao pega a bola de volta
    // nem a de quem acabou de sacar (ela ainda sobe no pulo da batida)
    if (T.tMundo - tSaqueSolto < 0.2 && rali.recepcaoSaque) { bola.colide[rali.saqueDeQuem] = false; bola.colide[outroI(rali.saqueDeQuem)] = true; }
    else if (T.tMundo - tCortadaSolta < 0.15 && rali.ultimaCortada) bola.colide[rali.ultimo] = false;
    else if (!cortada || cortada.fase === 'soltando') { bola.colide[0] = true; bola.colide[1] = true; }
    const evs = passoBola(bola, slimes, dtM, ginasio, [], andaram);
    for (const e of evs) {
      if (e.tipo === 'toque') aoToque(e);
      else if (e.tipo === 'cruzou') {
        if (estado === 'jogo') {
          rali.travessias++;
          const quemMandou = iDoLado(-e.lado);
          ganhar(J[quemMandou].med, 'passou');
          if (rali.travessias >= 6) ganhar(J[quemMandou].med, 'travessia');
          rali.lado = e.lado;
          rali.toques = 0;
          rali.bateuRede = false;
          ev({ tipo: 'cruzou', lado: e.lado, n: rali.travessias });
        }
      } else if (e.tipo === 'chao') {
        ev({ tipo: 'chao', x: e.x, v: e.v, estado });
        if (estado === 'jogo') {
          const ladoChao = ladoDe(e.x);
          const Jc = J[iDoLado(ladoChao)];
          if (Jc.pisoMola > 0) {
            // Piso Mola: a bola quica alto em vez de virar ponto (uma vez)
            Jc.pisoMola = 0;
            delete Jc.efeitos.pisoMola;
            bola.vy = Math.max(bola.vy, EFEITO.pisoMola);
            bola.y = Math.max(bola.y, RB + 0.02);
            bola.gMult = 1;
            if (bola.estado === 'fogo') bola.estado = 'normal';
            rali.toques = 0;
            ev({ tipo: 'piso-mola', i: Jc.i, x: e.x });
          } else ponto(-ladoChao, motivoChao(ladoChao), e.x);
        }
      } else if (e.tipo === 'fora') {
        if (estado === 'jogo') {
          ev({ tipo: 'fora', lado: e.lado, x: e.x, y: e.y });
          ponto(e.lado, 'fora', e.x);
        }
      } else if (e.tipo === 'rede') {
        rali.bateuRede = true;
        ev(e);
      } else ev(e);
    }
    // bola presa: peteleco
    if (estado === 'jogo' && bola.vx * bola.vx + bola.vy * bola.vy < 2.25 && bola.y > RB + 0.1) {
      rali.tPresa += dtM;
      if (rali.tPresa > TEMPOS.bolaPresa) {
        bola.vy = 9;
        bola.vx = bola.x < 0 ? 2 : -2;
        rali.tPresa = 0;
      }
    } else rali.tPresa = 0;
  }

  /** Avanca a comemoracao (jogo-real). */
  function passoFesta(dtR) {
    festa.t += dtR;
    if (festa.fim) {
      if (festa.t >= TEMPOS.fimPartida && !fimEmitido) {
        fimEmitido = true;
        estado = 'fim';
        ev({ tipo: 'fim', vencedor: resultado, placar: [...placar], humanoVenceu: humano[0] ? resultado === -1 : false });
      }
      return;
    }
    // a bola some depois do quique e aparece no sacador perto do fim
    if (festa.t >= festa.dur) {
      prepararSaque(sacador);
      if (humano.some(Boolean) && tSemInteracao >= TEMPOS.portao) esperaToque = true;
    }
  }

  // ------------------------------------------------------------------ API

  const anterior = {
    slimes: slimes.map((s) => ({ x: s.x, y: s.y, sig: s.sig })),
    bola: { x: bola.x, y: bola.y, ang: 0 },
    peles: peles.map((p) => ({ x: new Float64Array(p.x), y: new Float64Array(p.y) })),
  };

  function guardar(i) {
    const s = slimes[i];
    const a = anterior.slimes[i];
    a.x = s.x; a.y = s.y; a.sig = s.sig;
    anterior.peles[i].x.set(peles[i].x);
    anterior.peles[i].y.set(peles[i].y);
  }

  /**
   * Um passo real (1/120 s de jogo-real).
   */
  function passo() {
    const dtR = PASSO;
    tPartida += dtR;
    tSemInteracao += dtR;
    for (const i of [0, 1]) if (humano[i]) lerBordas(i, dtR);
    if (cortada) passoCortada(dtR);
    const n = passoReal(T, dtR);
    // slimes: quem mira anda no canal do mundo; o outro, no do defensor
    const passos = [0, 1].map((i) => (cortada && i !== cortada.i ? n.defensor : n.mundo));
    const bolaAnda = !cortada || cortada.fase === 'soltando';
    const kMax = Math.max(passos[0], passos[1], bolaAnda ? n.bola : 0);
    for (let k = 0; k < kMax; k++) {
      const andaram = [k < passos[0], k < passos[1]];
      for (const i of [0, 1]) {
        if (!andaram[i]) continue;
        guardar(i);
        passoDoSlime(i, PASSO);
      }
      if (bolaAnda && k < n.bola) {
        anterior.bola.x = bola.x; anterior.bola.y = bola.y; anterior.bola.ang = bola.ang;
        passoDaBola(PASSO, andaram);
      }
      // CPU tenta a cortada no ar (na janela)
      for (const i of [0, 1]) {
        if (!ias[i] || cortada || estado !== 'jogo') continue;
        const s = slimes[i];
        if (!s.noChao && ias[i].querCortar() && !rali.recepcaoSaque) tentarCortada(i, false);
      }
    }
    if (cortada && cortada.fase !== 'soltando') { anterior.bola.x = bola.x; anterior.bola.y = bola.y; }
    // saque da CPU
    if (estado === 'saque' && saque.valendo && ias[sacador]) {
      if (!esperaToque) {
        saque.t += dtR;
        if (saque.fase === 'pronto') {
          const espera = onboardingSaque ? TEMPOS.saqueOnboarding : saque.cpuEm;
          if (saque.t >= espera) levantar(sacador);
        } else {
          // bate com o erro de tempo do plano (sempre antes da bola voltar para a mao)
          saque.prof = saque.plano.prof;
          if (saque.fase === 'levantada' && saque.tL >= limitar(TS.ideal + saque.plano.erro, SAQUE.ignora + 0.01, TS.pega - 0.25)) bater(sacador);
        }
      }
    } else if (estado === 'saque') {
      saque.t += dtR;
    }
    // bolhas de power-up: o relogio anda no rali (parado na camera lenta)
    if (bolhas.ativo || bolhas.bolha) {
      const pegavel = bola.solta && !rali.recepcaoSaque && rali.ultimo >= 0;
      for (const e of bolhas.passo(cortada ? 0 : n.mundo * PASSO, { jogo: estado === 'jogo', pegavel, bola, placar, contraCpu: modo === 'cpu' })) {
        ev(e);
        if (e.tipo === 'bolha-pega') aplicarPowerUp(rali.ultimo, e.id);
      }
    }
    passoReacoes(dtR);
    // no 'fim' a festa segue andando (a palavra sai e o render solta a comemoracao aos 3 s)
    if (estado === 'ponto' || estado === 'fim') passoFesta(dtR);
    if (cortada && cortada.fase === 'entrando') ev({ tipo: 'lenta', escala: T.escala.mundo });
  }

  return {
    passo,
    /**
     * Intencao de um jogador humano (o main.js chama antes de cada passo; bordas acumulam).
     * @param {0|1} i @param {Partial<Intencao>} it
     */
    intencao(i, it) {
      const a = J[i].it;
      if (it.eixo !== undefined) a.eixo = it.eixo;
      if (it.botao !== undefined) a.botao = it.botao;
      if (it.borda) a.borda = true;
      if (it.superBorda) a.superBorda = true;
      a.miraDx = it.miraDx || 0;
      a.miraX = it.miraX ?? null;
      if (it.via) a.via = it.via;
    },
    /** pointerdown/keydown real (portao de interacao, primeiro saque). */
    interacao() {
      tSemInteracao = 0;
      if (esperaToque) {
        esperaToque = false;
        primeiroToque = true;
        if (estado === 'saque') ev({ tipo: 'saque-liberado', i: sacador });
      }
    },
    /** volta de pausa ou anuncio: o proximo saque espera um toque (a bola no ar volta para a mao) */
    exigirToque() {
      esperaToque = true;
      if (estado === 'saque' && saque.fase !== 'pronto') { saque.fase = 'pronto'; saque.tL = 0; bolaNoSacador(); }
    },
    get eventos() { return eventos; },
    get estado() { return estado; },
    get placar() { return placar; },
    get regras() { return regras; },
    get sacador() { return sacador; },
    get saque() { return saque; },
    get festa() { return festa; },
    get cortada() { return cortada; },
    /** a bolha de power-up na quadra (ou null) */
    get bolha() { return bolhas.bolha; },
    get tempo() { return T; },
    get slimes() { return slimes; },
    get peles() { return peles; },
    get bola() { return bola; },
    get jogadores() { return J; },
    get humano() { return humano; },
    get rali() { return rali; },
    get rival() { return riv; },
    get esperaToque() { return esperaToque; },
    get tPartida() { return tPartida; },
    get tutorialCortada() { return tutorialCortada; },
    get anterior() { return anterior; },
    get resultado() { return resultado; },
    /** Previsao de queda da bola agora (sombra, mao fantasma). */
    previsao() {
      if (estado !== 'jogo' || !bola.solta) return null;
      return prever(bola, { tMax: 3, vento: ginasio.vento, teto: ginasio.teto });
    },
    /**
     * Levantamento do saque (anel e marcador): onde cai, quanto falta para o ideal (k de 0 a 1)
     * e o erro de tempo agora (s; negativo = cedo).
     */
    previsaoSaque() {
      if (estado !== 'saque' || saque.fase === 'pronto') return null;
      const s = slimes[sacador];
      const erro = saque.fase === 'batendo' ? saque.erro : saque.tL - TS.ideal;
      return { alvo: -s.lado * saque.prof, k: Math.min(1, saque.tL / TS.ideal), erro, q: saque.fase === 'batendo' ? saque.q : qualidadeSaque(erro, !!o.primeira), batendo: saque.fase === 'batendo' };
    },
    /** Tempos do levantamento (dicas e testes). */
    get temposSaque() { return TS; },
    /** Reacao (emoji) do jogador i; devolve se valeu (1 por ponto, so fora do rali). */
    reagir(i, id) { return reagir(i, id); },
    /**
     * Resumo da partida para o jogador i (o perfil converte em XP e Gotas).
     * @param {0|1} [i]
     */
    resumo(i = 0) {
      const lado = i === 0 ? -1 : 1;
      return { venceu: resultado === lado, copa, pontos: stats.pontos[i], aces: stats.aces[i], bombas: stats.bombas[i], viradas: stats.viradas[i], ralis10: stats.ralis10, perdidos: placar[1 - i] };
    },
    /** quantos pontos ja sairam nesta partida */
    get pontoN() { return pontoN; },
    /** Dar o power-up "Cortada gratis" (testes e power-ups). */
    darCortadaGratis(i) { J[i].cortadaGratis = true; },
    /** Encher o medidor (laboratorio, testes). */
    encher(i, v = 300) { J[i].med.v = v; },
    /** testes: as IAs */
    get __ias() { return ias; },
    /** Hash do estado (determinismo). */
    hash() {
      let h = 2166136261;
      const mix = (v) => { h ^= Math.round(v * 1000) | 0; h = Math.imul(h, 16777619) >>> 0; };
      for (const s of slimes) { mix(s.x); mix(s.y); mix(s.vx); mix(s.vy); mix(s.sig); }
      mix(bola.x); mix(bola.y); mix(bola.vx); mix(bola.vy);
      mix(placar[0]); mix(placar[1]);
      return h >>> 0;
    },
    /**
     * Roteiros de teste (prints, GIFs, laboratorio): poe a partida num estado conhecido.
     * cortada: o jogador no ar sob a bola alta, medidor cheio, a mira armada.
     * ponto | ponto-curto: o ponto acabou de sair (festa completa ou curta); reacao: o curto com o
     * balao da CPU. bolha | gelo | fogo: power-ups no rali. saque: a bola no ar,
     * logo antes do ideal.
     * @param {string} nome
     */
    roteiro(nome) {
      esperaToque = false;
      primeiroToque = true;
      if (nome === 'cortada' || nome === 'mira') {
        J[0].med.v = 300;
        estado = 'jogo';
        const s = slimes[0];
        s.x = -3.2; s.y = 2.6; s.vy = 6; s.noChao = false; s.tAr = 0.2;
        bola.solta = true; bola.x = -2.9; bola.y = 6.4; bola.vx = 0.4; bola.vy = -2;
        rali.lado = -1; rali.toques = 1; rali.ultimoLado = -1; rali.recepcaoSaque = false;
        slimes[1].x = 7; slimes[1].y = 0;
        assentar(peles[0], s);
        assentar(peles[1], slimes[1]);
        tentarCortada(0, true);
        J[0].it.botao = true;
        return !!cortada;
      }
      if (nome === 'ponto' || nome === 'ponto-curto' || nome === 'reacao') {
        estado = 'jogo';
        if (nome !== 'ponto') pontoN = 5;
        bola.solta = true; bola.x = 6.2; bola.y = RB + 0.05; bola.vx = 2; bola.vy = -14;
        rali.ultimoLado = -1; rali.recepcaoSaque = false; rali.ultimaCortada = nome === 'ponto';
        ponto(-1, nome === 'ponto' ? 'bomba' : 'ponto', 6.2);
        // reacao: a CPU ja responde com um balao (a barra do jogador aparece no main.js)
        if (nome === 'reacao') { reacaoCpu = null; reagir(1, 'chorando'); }
        return true;
      }
      if (nome === 'fim') {
        // o ponto final acabou de sair (o cartao de fim aparece depois da festa)
        estado = 'jogo';
        placar = [regras.alvo - 1, 3];
        pontoN = placar[0] + placar[1];
        bola.solta = true; bola.x = 6.2; bola.y = RB + 0.05; bola.vx = 2; bola.vy = -14;
        rali.ultimoLado = -1; rali.recepcaoSaque = false; rali.ultimaCortada = true;
        ponto(-1, 'bomba', 6.2);
        stats.pontos[0] = placar[0];
        stats.pontos[1] = placar[1];
        return true;
      }
      if (nome === 'bolha' || nome === 'gelo' || nome === 'fogo') {
        // rali no ar: a bolha no caminho da bola; o rival preso no gelo; a Bola de Fogo indo
        estado = 'jogo';
        rali.lado = -1; rali.toques = 1; rali.ultimo = 0; rali.ultimoLado = -1; rali.recepcaoSaque = false;
        slimes[0].x = -6; slimes[1].x = 6;
        assentar(peles[0], slimes[0]);
        assentar(peles[1], slimes[1]);
        bola.solta = true; bola.x = -3; bola.y = 6.5; bola.vx = 4; bola.vy = 3;
        if (nome === 'bolha') bolhas.forcar('congelar', -1.6, 7.6);
        if (nome === 'gelo') { J[1].gelo = { fase: 'preso', t: 0.1 }; bola.vy = 6; }
        if (nome === 'fogo') { bola.x = -1.5; bola.y = 5.5; bola.vx = 15; bola.vy = 2; bola.estado = 'fogo'; }
        return true;
      }
      if (nome === 'saque') {
        prepararSaque(0);
        levantar(0);
        saque.prof = SAQUE.prof.fundo;
        passoLevantada(TS.ideal - 0.1);
        return true;
      }
      return false;
    },
    /** Reassenta a pele (troca de qualidade, replay). */
    assentarPeles() { for (const i of [0, 1]) assentar(peles[i], slimes[i]); },
  };
}

export { LARG, REDE_R, PULO, limitesX };
