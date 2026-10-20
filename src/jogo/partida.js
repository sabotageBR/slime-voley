// Partida do Volei de Gosma: pura e deterministica (sorteio so pelo rng da semente, relogios do
// src/jogo/tempo.js, nada de DOM). O main.js passa as intencoes de cada jogador a cada passo real
// (1/120 s) e le os eventos (som, vfx, SDK) e o estadoVisual() (render).
//
// Estados: 'saque' (o sacador segura a bola; o jogo espera sem limite) -> 'jogo' (rali) ->
// 'ponto' (comemoracao curta 1,0 s ou completa 1,8 s; o controle volta antes do saque) ->
// 'saque' ... -> 'fim'. A cortada lenta e um sub-estado do rali (this.cortada).
//
// Regras: rally point, quem ganha o ponto saca; 3 toques por lado (o 4o e falta); bola fora so
// no ataque estourado (passou por cima da placa do lado que NAO tocou por ultimo); a bola que o
// proprio lado manda para tras bate na rede de protecao e segue em jogo.

import { criarSlime, criarBola, passoSlime, passoBola, eixos, prever, pertoCupula, amassar, limitesX, limitar, RB, PASSO, PULO, G_BOLA, LARG, REDE_R } from '../fisica/volei.js';
import { criarTempo, passoReal, escalarTudo } from './tempo.js';
import { criarPele, passoPele, assentar, marcarCovinha, PASSO_PELE } from './pele.js';
import { TEMPOS, SAQUE, profundidadeSaque, alvoDaPartida, vencedor, pontoDaPartida, TOQUES } from './regras.js';
import { criarMedidor, ganhar, gastar, tem, CUSTO } from './medidor.js';
import { criarIA, irPara } from './ia.js';
import { BOT, paramsIA, rival as acharRival } from './rivais.js';
import * as Cort from './cortada.js';
import { criarRng } from '../core/rng.js';

/** Velocidade de saida que conta como BOMBA (com a bola descendo). */
const V_BOMBA = 24;
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
  const passoPeleQ = o.qualidadeMinima ? PASSO_PELE.minima : PASSO_PELE.normal;
  /** @type {any[]} */
  const eventos = [];

  const slimes = [criarSlime(-1, -7), criarSlime(1, 7)];
  const peles = slimes.map((s) => criarPele(s, passoPeleQ));
  const bola = criarBola();

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
  }));

  let placar = [0, 0];
  /** @type {'saque'|'jogo'|'ponto'|'fim'} */
  let estado = 'saque';
  let sacador = o.sacaPrimeiro ?? (o.primeira ? 1 : 0);
  /** o primeiro saque da partida (e depois de pausa/anuncio) espera um toque real */
  let esperaToque = true;
  let tSemInteracao = 0;
  const saque = { valendo: true, t: 0, segurando: false, tSeg: 0, cpuEm: 0, cpuSegura: 0, tipo: '', recepcao: false, tremor: 0 };
  /** rali */
  const rali = { toques: 0, lado: 0, ultimo: -1, ultimoLado: 0, travessias: 0, bateuRede: false, ultimaSaida: 0, ultimaVy: 0, ultimaCortada: false, ultimoNoAr: false, ultimoX: 0, ultimoContatoX: 0, tPresa: 0, recepcaoSaque: false, saqueDeQuem: 0 };
  /** comemoracao */
  const festa = { t: 0, tipo: 'curta', lado: 0, motivo: '', palavra: '', x: 0, dur: 1, controle: 0.5, deslize: [0.3, 0.5], fim: false };
  let maxAtras = [0, 0];
  let pontoN = 0;
  /** @type {Cort.Cortada|null} */
  let cortada = null;
  let tCortadaSolta = -9;
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

  function atualizarFundo() {
    bola.fundo[0] = rali.ultimoLado === -1;
    bola.fundo[1] = rali.ultimoLado === 1;
  }

  /** Bola em cima do sacador (segurando o saque). */
  function bolaNoSacador() {
    const s = slimes[sacador];
    const [, b] = eixos(s);
    bola.solta = false;
    bola.x = s.x - s.lado * 0.25;
    bola.y = s.y + b + 1.7 + Math.sin(T.tJogo * 3.2) * 0.12;
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
    saque.segurando = false;
    saque.tSeg = 0;
    saque.tremor = 0;
    saque.cpuEm = TEMPOS.saqueCpu[0] + rng() * (TEMPOS.saqueCpu[1] - TEMPOS.saqueCpu[0]);
    saque.cpuSegura = ias[i] ? ias[i].segurarSaque() : 0;
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
  function arco(x0, y0, xAlvo, H) {
    const g = G_BOLA;
    const vy = Math.sqrt(Math.max(0.5, 2 * g * Math.max(0.3, H - y0)));
    const t = (vy + Math.sqrt(vy * vy + 2 * g * Math.max(0, y0 - RB))) / g;
    return [(xAlvo - x0) / t, vy];
  }

  /** Solta o saque de `i` com o tempo segurado. */
  function executarSaque(i, tSeg) {
    const s = slimes[i];
    let alvo;
    let H = SAQUE.apice;
    let tipo;
    if (onboardingSaque && i === 1) {
      // lob roteirizado para o quarto da cupula do jogador voltado para a rede
      const h = slimes[0];
      const [a] = eixos(h);
      alvo = h.x + 0.45 * a;
      H = 9.0;
      tipo = 'roteiro';
      onboardingSaque = false;
    } else {
      const p = profundidadeSaque(tSeg, copa);
      alvo = -s.lado * p.prof;
      tipo = p.tipo;
      if (p.tipo === 'viagem') H = SAQUE.apiceViagem;
    }
    const [vx, vy] = arco(bola.x, bola.y, alvo, H);
    bola.solta = true;
    bola.vx = vx;
    bola.vy = vy;
    bola.estado = 'normal';
    bola.angV = -s.lado * 6;
    estado = 'jogo';
    saque.valendo = false;
    saque.segurando = false;
    saque.tipo = tipo;
    rali.recepcaoSaque = true;
    rali.saqueDeQuem = i;
    rali.ultimo = i;
    rali.ultimoLado = s.lado;
    rali.toques = 0;
    atualizarFundo();
    amassar(s, -0.35);
    novaJogadaIAs();
    ev({ tipo: 'saque', i, tipoSaque: tipo, alvo, x: bola.x, y: bola.y });
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
    escalarTudo(T, 1000);
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
      if (c.t >= Cort.CORTADA.hitstop + 0.08) terminarCortada();
    }
    if (cortada) {
      const e = Cort.escalas(cortada, lenta);
      T.escala.mundo = e.mundo;
      T.escala.defensor = e.defensor;
      T.escala.bola = cortada.fase === 'soltando' ? 1000 : 0;
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
    if (especial) {
      const [a] = eixos(s);
      if (Math.abs(e.x - s.x) <= 0.35 * a) {
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
    // protecao da primeira partida: a CPU nunca fecha a partida (erra de forma visivel)
    if (!humano[i] && humano[outroI(i)] && regras.imperdivel && placar[i] === regras.alvo - 1) {
      const [vx, vy] = arco(bola.x, bola.y, -s.lado * 15.5, Math.max(bola.y + 1.5, 6));
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
    if (!assist.ima || !humano[i] || !bola.solta || bola.vy >= 0 || !bola.colide[i]) return;
    const s = slimes[i];
    const r = J[i].it.via === 'toque' ? IMA.toque : IMA.teclado;
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
      if (it.borda && !saque.segurando) { saque.segurando = true; saque.tSeg = 0; ev({ tipo: 'saque-carga', i }); }
      if (saque.segurando) {
        saque.tSeg += dtR;
        const p = profundidadeSaque(saque.tSeg, copa);
        if (p.tipo === 'vermelho' || (p.auto && copa <= 1)) saque.tremor = 1;
        if (!it.botao || p.auto) executarSaque(i, saque.tSeg);
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
    // o sacador fica na zona de saque
    if (estado === 'saque' && i === sacador) {
      const [z0, z1] = SAQUE.zona;
      const ax = Math.abs(s.x);
      if ((ax <= z0 && eixo * s.lado < 0) || (ax >= z1 && eixo * s.lado > 0)) eixo = 0;
    }
    const vel = ias[i] ? ias[i].estado.p.vel : undefined;
    const r = passoSlime(s, { eixo, pular: it.pular && (estado !== 'saque') }, dtM, { vel: Jm.bote > 0 ? 14 : vel });
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
      bolaNoSacador();
      bola.ang += bola.angV * dtM;
      return;
    }
    if (!bola.solta) return;
    for (const i of [0, 1]) ima(i);
    // a cupula de quem acabou de cortar nao pega a bola de volta
    if (T.tMundo - tCortadaSolta < 0.15 && rali.ultimaCortada) bola.colide[rali.ultimo] = false;
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
          ponto(-ladoChao, motivoChao(ladoChao), e.x);
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
        const espera = onboardingSaque ? TEMPOS.saqueOnboarding : saque.cpuEm;
        if (saque.t >= espera) {
          if (saque.cpuSegura > 0 && !saque.segurando) { saque.segurando = true; saque.tSeg = 0; }
          if (saque.segurando) saque.tSeg += dtR;
          if (!saque.segurando || saque.tSeg >= saque.cpuSegura) executarSaque(sacador, saque.segurando ? saque.tSeg : 0);
        }
      }
    } else if (estado === 'saque') {
      saque.t += dtR;
    }
    if (estado === 'ponto') passoFesta(dtR);
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
    /** volta de pausa ou anuncio: o proximo saque espera um toque */
    exigirToque() { esperaToque = true; },
    get eventos() { return eventos; },
    get estado() { return estado; },
    get placar() { return placar; },
    get regras() { return regras; },
    get sacador() { return sacador; },
    get saque() { return saque; },
    get festa() { return festa; },
    get cortada() { return cortada; },
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
    /** Linha do saque segurado (mini-arco): onde cai com o tempo atual. */
    previsaoSaque() {
      if (estado !== 'saque' || !saque.segurando) return null;
      const s = slimes[sacador];
      const p = profundidadeSaque(saque.tSeg, copa);
      return { alvo: -s.lado * p.prof, tipo: p.tipo, k: Math.min(1, saque.tSeg / (copa <= 1 ? SAQUE.fimCarga : SAQUE.vermelho[1])) };
    },
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
    /** Reassenta a pele (troca de qualidade, replay). */
    assentarPeles() { for (const i of [0, 1]) assentar(peles[i], slimes[i]); },
  };
}

export { LARG, REDE_R, PULO, limitesX };
