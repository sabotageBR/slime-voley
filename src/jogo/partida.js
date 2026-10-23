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

import { criarSlime, criarBola, passoSlime, passoBola, eixos, prever, pertoCupula, amassar, limitesX, limitar, seguirAlvo, RB, PASSO, PULO, G_BOLA, G_SLIME, LARG, REDE_R, REDE_H, RAIO, VEL } from '../fisica/volei.js';
import { criarTempo, passoReal, escalarTudo } from './tempo.js';
import { criarPele, passoPele, assentar, marcarCovinha, PASSO_PELE } from './pele.js';
import { TEMPOS, SAQUE, ANJO, temposSaque, qualidadeSaque, profundidadePorPosicao, posicaoParaRumo, alvoDaPartida, vencedor, pontoDaPartida, TOQUES } from './regras.js';
import { criarMedidor, ganhar, gastar, tem, CUSTO } from './medidor.js';
import { criarIA, irPara } from './ia.js';
import { BOT, paramsIA, rival as acharRival } from './rivais.js';
import * as Cort from './cortada.js';
import { criarBolhas, powerUp, EFEITO } from './powerups.js';
import { reacao as acharReacao, escolherReacaoCpu, chanceReacaoCpu, REACAO } from './reacoes.js';
import { criarJuiz, passoJuiz, forcarBolada } from './juiz.js';
import { criarFalas, passoFalas, disparar as dispararFala, FALA } from './falas.js';
import { causaDoPonto } from './dicas.js';
import { criarRng, hashTexto } from '../core/rng.js';

/** Velocidade de saida que conta como BOMBA (com a bola descendo). */
const V_BOMBA = 24;
/** Tempos do levantamento do saque (apice, ideal, volta para a mao). */
const TS = temposSaque({ g: G_BOLA, gSlime: G_SLIME, pulo: PULO, rb: RB });
/** Assistencias. */
const IMA = Object.freeze({ toque: 0.25, teclado: 0.1 });
/**
 * A ajuda inteira (ajuda = 1): quanto o toque andando e o que nao cruzaria sao puxados para o arco
 * do outro lado, quanto o parado ganha alem dos 0,45 e quanto o ima cresce (u).
 */
const AJUDA = Object.freeze({ andando: 0.45, semCruzar: 0.6, parado: 0.2, ima: 0.25 });
/** Mola do raio do desenho (1/s2, 1/s): ~2,4 Hz com zeta 0,38; o Gosmao passa uns 28% do degrau. */
const MOLA_RAIO = Object.freeze({ k: 227, c: 11.5 });

/**
 * @typedef {Object} Intencao
 * @property {number} eixo       -1..1
 * @property {boolean} botao     acao segurada (pulo/saque/cortada)
 * @property {boolean} borda     acao apertada neste passo
 * @property {boolean} [superBorda]
 * @property {number} [miraDx]   u para a reticula (+ = mais fundo)
 * @property {number|null} [miraX] reticula num x absoluto (mouse)
 * @property {number|null} [alvoX] o slime segue este x (mouse; a partida acha o eixo pelo freio)
 * @property {'toque'|'teclado'|'mouse'} [via]
 */

/** @returns {Intencao} */
const intencaoVazia = () => ({ eixo: 0, botao: false, borda: false, superBorda: false, miraDx: 0, miraX: null, alvoX: null, via: 'teclado' });

/**
 * @typedef {Object} OpcoesPartida
 * @property {number} [semente]
 * @property {'cpu'|'dois'|'demo'} [modo]     demo: os dois lados pela IA (prints, testes)
 * @property {string} [rival]                 id do rival (src/jogo/rivais.js)
 * @property {boolean} [primeira]             primeira partida da vida (alvo 5, imperdivel, onboarding, saque de um toque)
 * @property {boolean} [curta]                a 2a partida da vida (alvo 5 sem vai-a-2)
 * @property {number} [copa]
 * @property {number} [derrotas]              derrotas seguidas do jogador nesta fase da Copa (o alivio da CPU)
 * @property {number} [anjo]                  quantas vezes a CPU erra no match point dela (src/jogo/regras.js ANJO)
 * @property {{ vento?: number, teto?: number, eAlambrado?: number }} [ginasio]
 * @property {'novo'|'segura'} [gatilho]
 * @property {{ escalaMundo?: number, escalaDefensor?: number, entrada?: number }} [lenta]
 * @property {{ ima?: boolean, devolucao?: boolean }} [assist]
 * @property {number} [ajuda]                 0..1: a devolucao assistida e o ima mais fortes para quem esta
 *                                            aprendendo (a Copa 1; src/jogo/regras.js ajudaDaPartida)
 * @property {number} [nivelCortada]
 * @property {number[]} [pig]                 pigmentos [jogador, rival]
 * @property {boolean} [juiz]                 false: sem o juiz da rede (ele nunca muda a bola; o hash e o mesmo)
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
  const regras = alvoDaPartida({ primeira: !!o.primeira, curta: !!o.curta, chefe: !!riv.chefe, copa, modo: modo === 'dois' ? 'dois' : o.alvo ? 'rapida' : 'circuito', alvo: o.alvo });
  // saque de um toque na 1a partida da vida (retencao, 2026-10-22): o toque levanta e a batida sai
  // sozinha no instante ideal (sempre PERFEITO); o anel e o 2o toque comecam na 2a partida
  const saqueSimples = !!o.primeira;
  const ginasio = { vento: 0, teto: Infinity, eAlambrado: undefined, ...(o.ginasio || {}) };
  const gatilho = o.gatilho || 'novo';
  const assist = { ima: true, devolucao: true, ...(o.assist || {}) };
  /** forca da ajuda ao humano (0 = a assistencia de sempre) */
  const ajuda = modo === 'cpu' ? Math.max(0, Math.min(1, o.ajuda || 0)) : 0;
  const comFora = !!o.fora;
  const bolhas = criarBolhas({ semente: o.semente, liberados: o.primeira ? [] : o.powerups || [] });
  // o juiz da rede: rng proprio, nunca mexe na bola (so sofre a bolada)
  const juiz = o.juiz === false ? null : criarJuiz(o.semente || 1);
  // falas dos slimes (catalogo fixo, rng proprio)
  const falas = criarFalas(o.semente || 1);
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
  const params = () => paramsIA(riv, { placarCpu: placar[1], placarHumano: placar[0], alvo: regras.alvo, imperdivel: regras.imperdivel, derrotas: o.derrotas || 0 });
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
    /** ponto (pontoN) em que reagiu por ultimo (a CPU: 1 por ponto) */
    reagiuEm: -1,
    /** s de jogo-real ate o humano poder reagir de novo (a qualquer hora, com recarga) */
    recargaReacao: 0,
    /** fala no balao de texto: { id, t } (src/jogo/falas.js) */
    fala: /** @type {{ id: string, t: number }|null} */ (null),
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
  const saque = { valendo: true, t: 0, fase: /** @type {'pronto'|'levantada'|'batendo'} */ ('pronto'), tL: 0, x0: 0, y0: 0, prof: SAQUE.prof.medio, q: /** @type {'perfeito'|'bom'|'fraco'} */ ('bom'), erro: 0, tPulo: 0, cpuEm: 0, plano: { erro: 0, rumo: 0, prof: SAQUE.prof.medio }, tipo: '' };
  /** rali */
  const rali = { toques: 0, lado: 0, ultimo: -1, ultimoLado: 0, travessias: 0, bateuRede: false, ultimaSaida: 0, ultimaVy: 0, ultimaCortada: false, ultimoNoAr: false, ultimoX: 0, ultimoContatoX: 0, tPresa: 0, recepcaoSaque: false, saqueDeQuem: 0 };
  /** comemoracao */
  const festa = { t: 0, tipo: 'curta', lado: 0, motivo: '', palavra: '', x: 0, dur: 1, controle: 0.5, deslize: [0.3, 0.5], fim: false };
  let maxAtras = [0, 0];
  /** numeros da partida por jogador (perfil: XP e Gotas) */
  const stats = { pontos: [0, 0], aces: [0, 0], bombas: [0, 0], viradas: [0, 0], ralis10: 0, perdas: [{}, {}] };
  let pontoN = 0;
  /** @type {Cort.Cortada|null} */
  let cortada = null;
  let tCortadaSolta = -9;
  let tSaqueSolto = -9;
  /**
   * Cortada guiada da 1a partida (M2d, a prova de falha): esperando -> oferecida (do 2o rali em
   * diante a Gota manda uma bola alta para o ponto de batida do jogador no apice do pulo, com o
   * medidor cheio) -> congelada (a bola presa sobre ele, o mundo quase parado, espera qualquer
   * toque) -> salto (o toque pula sozinho) -> cortando (a cortada sai perto do apice, na mira guiada)
   * -> feito. Da oferta ate o ponto a Gota assiste e, depois da soltura, nao encosta: BOMBA. Se o
   * rali acabar antes, volta a esperar e e oferecida de novo.
   * @type {{ fase: 'esperando'|'oferecida'|'congelada'|'salto'|'cortando'|'feito', t: number, tocou: boolean, bomba: boolean, escala: number }}
   */
  const guia = { fase: o.primeira && modo === 'cpu' ? 'esperando' : 'feito', t: 0, tocou: false, bomba: false, escala: 1000 };
  /** a Gota assiste (nao corre, nao corta, nao encosta depois da soltura) */
  const guiaSegura = () => guia.bomba || guia.fase === 'oferecida' || guia.fase === 'congelada' || guia.fase === 'salto' || guia.fase === 'cortando';
  /** a bola esta presa sobre o jogador (congelada ou no pulo automatico) */
  const guiaPrende = () => guia.fase === 'congelada' || guia.fase === 'salto';
  let tPartida = 0;
  let fimEmitido = false;
  let resultado = 0;
  const lenta = o.lenta || {};
  // onboarding: a Gota saca 0,6 s depois do primeiro toque
  let onboardingSaque = !!o.primeira;
  /** o anjo: quantas vezes ainda salva o humano no match point da CPU, e quantas ja salvou */
  let anjo = modo === 'cpu' && !regras.imperdivel ? Math.max(0, o.anjo | 0) : 0;
  let anjosUsados = 0;
  /** a CPU ja decidiu errar neste rali (o 2o toque dela nao salva a bola) */
  let erraNoRali = false;
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
    bola.x = s.x - s.lado * SAQUE.frente;
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

  /**
   * A CPU `i` tem que errar agora (de forma visivel)? A protecao da 1a partida (ela nunca fecha a
   * partida: a bola morre na rede do proprio lado) e o anjo (no match point dela, com o humano
   * ANJO.atras ou mais atras, enquanto houver anjo; vale o rali inteiro).
   */
  function cpuDeveErrar(i) {
    if (humano[i] || !humano[outroI(i)]) return false;
    if (regras.imperdivel) return placar[i] === regras.alvo - 1;
    return erraNoRali || anjoQuer(i);
  }

  /** O anjo quer que a CPU `i` erre este rali? */
  function anjoQuer(i) {
    return !regras.imperdivel && anjo > 0 && !humano[i] && humano[outroI(i)] && pontoDaPartida(placar, regras) === slimes[i].lado && placar[i] - placar[outroI(i)] >= ANJO.atras;
  }

  /**
   * A CPU errou de proposito (anjo): gasta um anjo, uma vez por rali. Pelo resto do rali ela le
   * errado a queda (vai para o lado errado) e nao encosta na bola: o furo de um rival novato.
   */
  function cpuErra() {
    if (regras.imperdivel || erraNoRali) return;
    anjo--;
    anjosUsados++;
    erraNoRali = true;
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
    erraNoRali = false;
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

  /**
   * Velocidade para a bola sair de (x0, y0), passar no apice H e, descendo, cruzar (xP, yP).
   * @returns {number[]} [vx, vy]
   */
  function arcoAte(x0, y0, xP, yP, H, g = G_BOLA) {
    const Hh = Math.max(H, y0 + 0.3, yP + 0.3);
    const vy = Math.sqrt(2 * g * (Hh - y0));
    const t = (vy + Math.sqrt(Math.max(0, vy * vy - 2 * g * (yP - y0)))) / g;
    return [(xP - x0) / t, vy];
  }

  /** A CPU `i` (a Gota da 1a partida) pode mandar agora a bola alta da cortada guiada? */
  function guiaPronta(i) {
    return guia.fase === 'esperando' && pontoN >= 1 && !humano[i] && humano[outroI(i)];
  }

  /** Comeca a cortada guiada: o medidor do jogador enche e a bola vai para o ponto de batida dele. */
  function oferecerGuia(h) {
    J[h].med.v = Math.max(J[h].med.v, CUSTO.cortada);
    const [xb, yb] = Cort.batidaNoApice(slimes[h]);
    const [vx, vy] = arcoAte(bola.x, bola.y, xb, yb, Cort.CORTADA.guia.apice);
    bola.vx = vx;
    bola.vy = vy;
    guia.fase = 'oferecida';
    guia.t = 0;
    guia.tocou = false;
    ev({ tipo: 'tutorial-cortada', i: h });
  }

  /** A cortada guiada sai (forcada, na mira guiada). */
  function cortarGuia(h) {
    J[h].med.v = Math.max(J[h].med.v, CUSTO.cortada);
    escalarTudo(T, 1000);
    guia.escala = 1000;
    if (tentarCortada(h, true, { forcar: true, guiada: true })) guia.fase = 'cortando';
  }

  /** Avanca a cortada guiada (jogo-real): congela, segura a bola, pula e corta. */
  function passoGuia(dtR) {
    if (guia.fase === 'esperando' || guia.fase === 'feito' || guia.fase === 'cortando') return;
    guia.t += dtR;
    const h = 0;
    const s = slimes[h];
    const G = Cort.CORTADA.guia;
    if (guia.fase === 'oferecida') {
      if (estado !== 'jogo' || cortada || !bola.solta) return;
      const [, yb] = Cort.batidaNoApice(s);
      if (bola.vy < 0 && bola.x * s.lado > 0 && bola.y <= yb + G.folgaY) {
        guia.fase = 'congelada';
        guia.t = 0;
        guia.tocou = false;
        ev({ tipo: 'guia-congela', i: h, x: bola.x, y: bola.y });
      }
      return;
    }
    // congelada ou salto: o mundo vai para a escala da fase (rampa) e a bola fica presa (mola)
    const alvoEsc = guia.fase === 'congelada' ? G.escala : G.escalaSalto;
    guia.escala += (alvoEsc - guia.escala) * Math.min(1, dtR / G.rampa);
    escalarTudo(T, guia.escala);
    const [bx, by] = s.noChao ? Cort.batidaNoApice(s) : Cort.pontoBatida(s);
    const k = 1 - Math.exp(-dtR * 10);
    bola.solta = false;
    bola.vx = 0;
    bola.vy = 0;
    bola.x += (bx - bola.x) * k;
    bola.y += (by + Math.sin(guia.t * 6) * 0.06 - bola.y) * k;
    bola.angV = 2;
    if (guia.fase === 'congelada' && guia.tocou) {
      guia.tocou = false;
      if (s.noChao) {
        // o toque pula sozinho
        s.vy = PULO * s.multPulo;
        s.noChao = false;
        s.tAr = 0;
        s.sig = -0.6;
        s.sigV = 0;
        J[h].pulos++;
        guia.fase = 'salto';
        guia.t = 0;
        ev({ tipo: 'guia-salto', i: h, x: s.x });
        ev({ tipo: 'pulo', i: h, x: s.x });
      } else cortarGuia(h);
    } else if (guia.fase === 'salto' && ((!s.noChao && s.tAr >= Cort.CORTADA.noArMin && s.vy <= G.vyCorta) || (s.noChao && guia.t > 0.2))) cortarGuia(h);
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

  /** Bola do levantamento no instante tL; sem batida (ou se o pulo nao alcancou) ela volta para a mao. */
  function passoLevantada(dtM) {
    saque.tL += dtM;
    const sb = slimes[sacador];
    const [ab] = eixos(sb);
    const aoAlcance = Math.abs(bola.x - sb.x) <= ab * SAQUE.alcanceA + RB * SAQUE.alcanceRB;
    if (saque.tL >= TS.pega && (saque.fase === 'levantada' || !aoAlcance)) {
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
    // a mira vem da posicao: a bola a frente do corpo vai funda, em cima media, atras curta
    const s = slimes[sacador];
    saque.prof = profundidadePorPosicao((bola.x - s.x) * -s.lado);
    // saque de um toque (1a partida): o humano pula sozinho no instante ideal
    if (saqueSimples && humano[sacador] && saque.fase === 'levantada' && saque.tL >= TS.ideal) bater(sacador);
    // batendo: o pulo encontra a bola na cupula, ou bate de todo jeito depois de 0,7 s ou quando a
    // bola voltaria para a mao (o pulo cedo demais vira o fraco); so com a bola ao alcance: longe do
    // corpo ela passa e volta para a mao
    if (saque.fase === 'batendo') {
      saque.tPulo += dtM;
      if (aoAlcance) {
        const [a, b] = eixos(s);
        const k = (bola.x - s.x) / (a + RB * SAQUE.alcanceRB);
        const topo = s.y + b * Math.sqrt(Math.max(0, 1 - k * k));
        if (bola.y - RB <= topo + 0.05 || saque.tPulo >= 0.7 || saque.tL >= TS.pega - dtM) executarSaque(sacador, saque.q, saque.prof, saque.erro);
      }
    }
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
    let guiaSaque = false;
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
    } else if (cpuDeveErrar(i)) {
      // protecao da primeira partida e anjo: a CPU nao fecha nem no saque (morre na rede)
      cpuErra();
      alvo = s.lado * (REDE_R + 0.9);
      H = bola.y + 0.8;
    } else if (guiaPronta(i)) {
      // cortada guiada: o saque da Gota e a bola alta da guia
      tipo = 'roteiro';
      guiaSaque = true;
      alvo = 0;
    } else if (saqueSimples && humano[i] && guia.fase === 'esperando' && pontoN >= 1) {
      // a guia esta pendente: o saque de um toque vai no corpo da Gota (sem ace) e o toque dela
      // oferece a cortada guiada
      alvo = slimes[outroI(i)].x;
      H = Math.max(SAQUE.apice, bola.y + 2.5);
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
    if (guiaSaque) oferecerGuia(outroI(i));
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
    ev({ tipo: 'saque', i, tipoSaque: tipo, alvo, x: bola.x, y: bola.y, erro, simples: saqueSimples && humano[i] });
    if (tipo === 'perfeito') falar(i, 'saque');
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
    // protecao da 1a partida: o erro do proprio humano (rede, 4 toques) no match point da CPU nao
    // fecha a partida imperdivel; o ponto nao vale e ele saca de novo (antes do M2d, 1,7% perdiam)
    if (regras.imperdivel && !humano[iv] && humano[ip] && placar[iv] >= regras.alvo - 1) {
      repetir(ip, x);
      return;
    }
    // a guia: o ponto encerra a BOMBA; se o rali acabou antes da cortada guiada, ela volta a esperar
    guia.bomba = false;
    if (guia.fase === 'oferecida' || guia.fase === 'congelada' || guia.fase === 'salto' || guia.fase === 'cortando') { guia.fase = 'esperando'; escalarTudo(T, 1000); guia.escala = 1000; }
    const antes = [...placar];
    placar[iv]++;
    pontoN++;
    // maior desvantagem (para a VIRADA)
    for (const k of [0, 1]) maxAtras[k] = Math.max(maxAtras[k], placar[1 - k] - placar[k]);
    const virada = antes[iv] < antes[ip] && placar[iv] > placar[ip] && maxAtras[iv] >= 2;
    let palavra = motivo === 'toques4' ? 'toques4' : motivo;
    if (virada) palavra = 'virada';
    // como o ponto foi perdido (src/jogo/dicas.js: a dica do cartao de derrota)
    const causa = causaDoPonto(motivo, { ultimoDoVencedor: rali.ultimoLado === ladoV, cortada: rali.ultimaCortada });
    stats.perdas[ip][causa] = (stats.perdas[ip][causa] || 0) + 1;
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
    ev({ tipo: 'ponto', lado: ladoV, i: iv, motivo, causa, palavra: festa.palavra, festa: festa.tipo, x, placar: [...placar], humano: humano[iv], cpu: daCpu, matchPoint: vence === 0 ? mp : 0, fim: vence !== 0, travessias: rali.travessias });
    if (vence === 0 && mp !== 0 && pontoDaPartida(antes, regras) !== mp) ev({ tipo: 'match-point', lado: mp });
    // falas: quem marcou comemora (o chefe provoca), senao quem perdeu reclama; no match point,
    // quem lidera avisa e o outro responde
    if (vence === 0) {
      const g = virada ? 'virada' : ['ace', 'bomba', 'bloqueio'].includes(motivo) ? motivo : motivo === 'rede' ? 'presente' : 'ponto';
      const provoca = g === 'ponto' && !humano[iv] && riv.chefe && humano[ip];
      if (!falar(iv, provoca ? 'provoca' : g)) falar(ip, motivo === 'rede' ? 'erro' : 'perdeu');
      if (mp !== 0 && pontoDaPartida(antes, regras) !== mp) {
        const lider = iDoLado(mp);
        if (!falar(lider, 'matchPoint')) falar(outroI(lider), 'aindaNao');
      }
    }
    // a CPU as vezes reage sozinha ao ponto (convencida quando ganha, brava ou chorando quando perde)
    reacaoCpu = null;
    if (modo === 'cpu' && vence === 0 && rngR() < chanceReacaoCpu(riv)) {
      const [a0, a1] = REACAO.atraso;
      reacaoCpu = { t: a0 + (a1 - a0) * rngR(), id: escolherReacaoCpu(rngR, { ganhou: iv === 1 }) };
    }
  }

  /** O ponto nao valeu (protecao da 1a partida): pausa curta sem festa e `i` saca de novo. */
  function repetir(i, x) {
    festa.t = 0;
    festa.tipo = 'curta';
    festa.lado = 0;
    festa.motivo = 'repete';
    festa.palavra = '';
    festa.x = x;
    festa.dur = TEMPOS.festaCurta;
    festa.controle = TEMPOS.controleCurta;
    festa.deslize = TEMPOS.deslizeCurta;
    festa.fim = false;
    T.hitstop = TEMPOS.hitstopCurta;
    estado = 'ponto';
    sacador = i;
    ev({ tipo: 'repete', i, x });
  }

  /**
   * Fala de `i` pelo gatilho (src/jogo/falas.js): nunca com o balao de reacao nem outra fala no ar.
   * @param {number} i @param {string} gatilho
   */
  function falar(i, gatilho) {
    if (i < 0 || J[i].reacao || J[i].fala) return false;
    const id = dispararFala(falas, gatilho, /** @type {0|1} */ (i));
    if (!id) return false;
    J[i].fala = { id, t: 0 };
    ev({ tipo: 'fala', i, id, humano: humano[i] });
    return true;
  }

  /**
   * Reacao (emoji) de `i`. O humano reage a qualquer hora, inclusive no rali, com recarga de
   * REACAO.recarga s (pedido de 2026-10-22); a CPU, 1 por ponto e so fora do rali. O rosto faz a
   * expressao junto (na cortada lenta fica o `focado`) e a CPU as vezes responde fora do rali.
   */
  function reagir(i, id) {
    const r = acharReacao(id);
    const Ji = J[i];
    if (!r) return false;
    if (humano[i]) {
      if (Ji.recargaReacao > 0) return false;
    } else if (pontoN === 0 || Ji.reagiuEm === pontoN || estado === 'jogo') return false;
    Ji.reagiuEm = pontoN;
    Ji.recargaReacao = REACAO.recarga;
    Ji.reacao = { id, t: 0 };
    Ji.fala = null;
    if (!(cortada && cortada.i === i)) caretar(i, r.expr, REACAO.dur);
    ev({ tipo: 'reacao', i, id, humano: humano[i] });
    const c = outroI(i);
    if (humano[i] && estado !== 'jogo' && ias[c] && modo === 'cpu' && J[c].reagiuEm !== pontoN && !reacaoCpu && rngR() < REACAO.chanceResposta) {
      reacaoCpu = { t: REACAO.resposta, id: escolherReacaoCpu(rngR, { ganhou: sacador === c, resposta: id }) };
    }
    return true;
  }

  /** Baloes e a reacao planejada da CPU (jogo-real). */
  function passoReacoes(dtR) {
    passoFalas(falas, dtR);
    for (const Jx of J) {
      if (Jx.recargaReacao > 0) Jx.recargaReacao = Math.max(0, Jx.recargaReacao - dtR);
      if (Jx.fala && (Jx.fala.t += dtR) >= FALA.dur) Jx.fala = null;
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

  /** @param {number} i @param {boolean} humanoOuCpu @param {{ forcar?: boolean, guiada?: boolean }} [oc] */
  function tentarCortada(i, humanoOuCpu, oc = {}) {
    if (cortada || estado !== 'jogo') return false;
    const Jm = J[i];
    const s = slimes[i];
    const gratis = Jm.cortadaGratis;
    if (!gratis && !tem(Jm.med, 'cortada')) return false;
    const meus = rali.lado === s.lado ? rali.toques : 0;
    const ok = oc.forcar || Cort.elegivel({
      slime: s, bola, meus,
      recepcaoSaque: rali.recepcaoSaque && rali.saqueDeQuem !== i,
      bolaEspecial: bola.estado !== 'normal',
      toqueAnteriorMeu: rali.ultimoLado === s.lado && rali.toques >= 1,
      nivel: o.nivelCortada || 1,
      tutorial: guia.fase === 'oferecida' && humano[i],
    });
    if (!ok) return false;
    if (!gratis) gastar(Jm.med, 'cortada');
    Jm.cortadaGratis = false;
    const outro = slimes[outroI(i)];
    const tMax = (oc.guiada || guia.fase === 'oferecida') && humano[i] ? Cort.CORTADA.tMiraTutorial : modo === 'dois' ? Cort.CORTADA.tMira2P : Cort.CORTADA.tMira;
    // o humano comeca na mira guiada (longe do rival); a CPU, na padrao (o fundo)
    const alvoX = humano[i] && modo === 'cpu' ? Cort.miraGuiada(s.lado, outro.x, outro.vx) : Cort.miraPadrao(s.lado, outro.x, outro.vx);
    cortada = Cort.iniciar(i, s, { tMax, alvoX, gratis, vento: ginasio.vento });
    cortada.guiada = !!oc.guiada;
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
    ev({ tipo: 'cortada-solta', i, x: c.bx, y: c.by, vx: c.vx, vy: c.vy, alvoX: c.alvoX, auto: !c.mexeu, rapida: quick, toque: c.toque, tMira: c.tTotal, humano: humano[i], guiada: !!c.guiada });
    falar(i, 'cortada');
    if (gatilho === 'segura' && quick && !c.gratis) J[i].med.v = Math.min(300, J[i].med.v + CUSTO.cortada);
    // a guia termina na cortada do jogador (a guiada ou a natural depois da oferta): a Gota nao
    // encosta mais ate o ponto
    if (humano[i] && guiaSegura()) { guia.fase = 'feito'; guia.bomba = true; }
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
      // o humano: soltar antes do tMinToque (o toque simples) segura a camera lenta ate la (gatilho novo)
      const minimo = c.guiada ? Math.max(Cort.CORTADA.tMinToque, Cort.CORTADA.guia.tMira) : gatilho === 'novo' ? Cort.CORTADA.tMinToque : 0;
      if (humano[c.i] && !Jm.it.botao && c.t < minimo) c.toque = true;
      const soltou = humano[c.i] ? !Jm.it.botao && c.t >= minimo : c.t >= (c.cpuSegura || 0.5);
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
        falar(i, 'fogo');
      }
      if (perfeita) {
        const [vx, vy] = arco(bola.x, bola.y, s.lado * 6, bola.y + 3.2);
        const f = 9 / Math.max(1e-3, Math.hypot(vx, vy));
        bola.vx = vx * Math.max(0.6, f);
        bola.vy = Math.max(7, vy * Math.max(0.6, f));
        ganhar(Jm.med, 'perfeita');
        ev({ tipo: 'perfeita', i, x: bola.x, y: bola.y, contra: bola.estado });
        falar(i, 'manchete');
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
    // protecao da primeira partida e anjo: a CPU nao fecha a partida (erra de forma visivel: a
    // bola morre na rede, do proprio lado; para fora nao da mais, a parede de fundo devolve)
    if (cpuDeveErrar(i)) {
      cpuErra();
      const [vx, vy] = arco(bola.x, bola.y, s.lado * (REDE_R + 0.9), bola.y + 0.8);
      bola.vx = vx;
      bola.vy = vy;
    } else if (guiaPronta(i)) {
      // cortada guiada: a Gota devolve a bola alta para o ponto de batida do jogador
      oferecerGuia(outroI(i));
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
    falar(i, 'poder');
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
        if (id === 'congelar') falar(i, 'gelo');
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
    // ajuda (Copa 1, M2d): o toque andando tambem e puxado, e o que cairia do proprio lado vai para
    // o outro (os erros do proprio jogador eram 70% dos pontos perdidos pelo novato simulado)
    if (ajuda > 0) {
      if (rali.toques <= 2 && !parado) mistura = Math.max(mistura, AJUDA.andando * ajuda);
      if (!cruza) mistura = Math.max(mistura, AJUDA.semCruzar * ajuda);
      if (parado) mistura = Math.max(mistura, 0.45 + AJUDA.parado * ajuda);
    }
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
    const r = (humano[i] && assist.ima ? (J[i].it.via === 'toque' ? IMA.toque : IMA.teclado) + AJUDA.ima * ajuda : 0) + (forte ? EFEITO.ima : 0);
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
    // cortada guiada: a Gota assiste do fundo; o jogador fica parado com a bola presa e no pulo
    if (estado === 'jogo' && a && guiaSegura()) return { eixo: irPara(s.x, s.lado * 7.5, 4), pular: false };
    if (!a && guiaPrende()) return { eixo: 0, pular: false };
    if (a) {
      if (estado === 'saque') {
        // na levantada a CPU se posiciona sob a bola para a profundidade do plano (telegrafa o saque)
        if (i === sacador && saque.fase !== 'pronto' && saque.plano) return { eixo: 0, pular: false, alvoX: posicaoParaRumo(saque.x0, s.lado, saque.plano.rumo) };
        if (i === sacador) return { eixo: irPara(s.x, s.lado * 8, 6), pular: false };
        return { eixo: irPara(s.x, s.lado * 6.5, 8), pular: false };
      }
      // anjo: a CPU que furou le errado a queda e vai para o lado errado (longe da bola)
      if (erraNoRali && estado === 'jogo' && bola.solta) {
        const pr = prever(bola, { tMax: 3, vento: ginasio.vento, teto: ginasio.teto });
        const [x0, x1] = limitesX(s);
        const longe = Math.abs(pr.x) > 7 ? pr.x - s.lado * 4.2 : pr.x + s.lado * 4.2;
        return { eixo: irPara(s.x, limitar(pr.x * s.lado > 0 ? longe : s.x, x0, x1), 11, s.vx), pular: false };
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
    return { eixo: Jm.it.eixo, pular, alvoX: Jm.it.alvoX };
  }

  /** Bordas de entrada de um humano (no passo real: jogo-real). */
  function lerBordas(i, dtR) {
    const Jm = J[i];
    const s = slimes[i];
    const it = Jm.it;
    // a guia congelada ou no pulo automatico: o toque e da guia (interacao), nao vira pulo nem cortada
    if (guiaPrende()) { it.borda = false; return; }
    if (estado === 'saque' && i === sacador) {
      if (!saque.valendo || esperaToque) { it.borda = false; return; }
      if (saque.fase === 'pronto') {
        if (it.borda) levantar(i);
      } else if (it.borda && saque.fase === 'levantada' && saque.tL >= SAQUE.ignora && !saqueSimples) bater(i);
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
    // power-ups: pulo, tamanho (aos poucos, a pele acompanha), velocidade e gelo
    passoPoderes(i, dtM);
    const ef = Jm.efeitos;
    const velBase = (ias[i] ? ias[i].estado.p.vel : VEL) * (ef.turbo ? EFEITO.turbo : 1) * (ef.cola ? EFEITO.cola.vel : 1);
    const atrito = Jm.gelo && Jm.gelo.fase === 'escorrega' ? EFEITO.gelo.atrito : 1;
    let eixo = it.alvoX != null ? seguirAlvo(s, it.alvoX, velBase, atrito) : it.eixo;
    if (Jm.bote > 0) {
      Jm.bote -= dtM;
      eixo = -s.lado;
    }
    // o sacador fica na zona de saque (na levantada ele anda para mirar pela posicao)
    const zonaSaque = saque.fase === 'pronto' ? SAQUE.zona : SAQUE.zonaLevantada;
    if (estado === 'saque' && i === sacador) {
      const [z0, z1] = zonaSaque;
      const ax = Math.abs(s.x);
      if ((ax <= z0 && eixo * s.lado < 0) || (ax >= z1 && eixo * s.lado > 0)) eixo = 0;
    }
    s.multPulo = (ef.puloMola ? EFEITO.pulo : 1) * (ef.cola ? EFEITO.cola.pulo : 1);
    const alvoR = RAIO * (ef.gosmao ? EFEITO.gosmao : 1) * (ef.encolher ? EFEITO.encolher : 1);
    s.R += (alvoR - s.R) * Math.min(1, dtM * 6);
    // raio do desenho: mola subamortecida (incha passando do ponto e assenta; murcha do mesmo jeito)
    s.RvV += ((alvoR - s.Rv) * MOLA_RAIO.k - s.RvV * MOLA_RAIO.c) * dtM;
    s.Rv += s.RvV * dtM;
    const preso = !!Jm.gelo && Jm.gelo.fase === 'preso';
    if (preso) eixo = 0;
    const r = passoSlime(s, { eixo, pular: it.pular && estado !== 'saque' && !preso }, dtM, { vel: Jm.bote > 0 ? 14 : velBase, atrito });
    if (estado === 'saque' && i === sacador) {
      const [z0, z1] = zonaSaque;
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
    // anjo: a CPU que furou nao encosta mais na bola neste rali; a guiada: a Gota nao pega a BOMBA
    if (erraNoRali || guia.bomba) for (const i of [0, 1]) if (!humano[i]) bola.colide[i] = false;
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
          // anjo: a bola chegou no lado da CPU no match point dela, e ela vai furar
          if (anjoQuer(iDoLado(e.lado))) cpuErra();
          ev({ tipo: 'cruzou', lado: e.lado, n: rali.travessias });
          if (rali.travessias === 8) falar(quemMandou, 'rali');
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
    slimes: slimes.map((s) => ({ x: s.x, y: s.y, sig: s.sig, Rv: s.Rv })),
    bola: { x: bola.x, y: bola.y, ang: 0 },
    peles: peles.map((p) => ({ x: new Float64Array(p.x), y: new Float64Array(p.y) })),
  };

  function guardar(i) {
    const s = slimes[i];
    const a = anterior.slimes[i];
    a.x = s.x; a.y = s.y; a.sig = s.sig; a.Rv = s.Rv;
    anterior.peles[i].x.set(peles[i].x);
    anterior.peles[i].y.set(peles[i].y);
  }

  /** O que o juiz ve: a bola, se ela esta em jogo (fora da mira) e, no ponto, quem ganhou. */
  function contextoJuiz() {
    const mirando = !!cortada && cortada.fase !== 'soltando';
    return {
      bola,
      ativa: estado === 'jogo' && bola.solta && !mirando,
      forte: bola.estado !== 'normal' || rali.ultimaCortada,
      ponto: estado === 'ponto' || estado === 'fim' ? { lado: festa.lado } : null,
    };
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
    passoGuia(dtR);
    const n = passoReal(T, dtR);
    // slimes: quem mira anda no canal do mundo; o outro, no do defensor
    const passos = [0, 1].map((i) => (cortada && i !== cortada.i ? n.defensor : n.mundo));
    const bolaAnda = (!cortada || cortada.fase === 'soltando') && !guiaPrende();
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
      // o juiz anda no relogio do mundo (camera lenta e hitstop valem para ele)
      if (juiz && k < n.mundo) {
        for (const e of passoJuiz(juiz, PASSO, contextoJuiz())) {
          ev(e);
          falar(rali.ultimo, 'juiz');
        }
      }
      // CPU tenta a cortada no ar (na janela)
      for (const i of [0, 1]) {
        if (!ias[i] || cortada || estado !== 'jogo') continue;
        const s = slimes[i];
        if (!s.noChao && ias[i].querCortar() && !rali.recepcaoSaque && !cpuDeveErrar(i) && !guiaSegura()) tentarCortada(i, false);
      }
    }
    if ((cortada && cortada.fase !== 'soltando') || guiaPrende()) { anterior.bola.x = bola.x; anterior.bola.y = bola.y; }
    // saque da CPU
    if (estado === 'saque' && saque.valendo && ias[sacador]) {
      if (!esperaToque) {
        saque.t += dtR;
        if (saque.fase === 'pronto') {
          const espera = onboardingSaque ? TEMPOS.saqueOnboarding : saque.cpuEm;
          if (saque.t >= espera) levantar(sacador);
        } else {
          // bate com o erro de tempo do plano (sempre antes da bola voltar para a mao)
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
      a.alvoX = it.alvoX ?? null;
      if (it.via) a.via = it.via;
    },
    /** pointerdown/keydown real (portao de interacao, primeiro saque). */
    interacao() {
      tSemInteracao = 0;
      if (guia.fase === 'congelada') guia.tocou = true;
      if (esperaToque) {
        esperaToque = false;
        primeiroToque = true;
        if (estado === 'saque') ev({ tipo: 'saque-liberado', i: sacador });
        // a CPU abre a partida falando (o Rei se gaba, a distraida nem viu que comecou)
        if (pontoN === 0 && modo === 'cpu' && ias[1]) falar(1, riv.id === 'rei' ? 'inicioRei' : (riv.perso || []).includes('distraida') ? 'inicioDistraida' : 'inicio');
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
    /** o juiz da rede (null com { juiz: false }) */
    get juiz() { return juiz; },
    get humano() { return humano; },
    get rali() { return rali; },
    get rival() { return riv; },
    /** vento e teto do ginasio (o novato simulado le para prever a bola como a IA) */
    get ginasio() { return ginasio; },
    /** o anjo: quantos restam e quantos ja salvaram o humano nesta partida */
    get anjo() { return { restam: anjo, usados: anjosUsados }; },
    get esperaToque() { return esperaToque; },
    get tPartida() { return tPartida; },
    get tutorialCortada() { return guia.fase; },
    /** a cortada guiada da 1a partida (fase, tempo na fase) */
    get guia() { return guia; },
    /** o saque do humano e de um toque (1a partida da vida) */
    get saqueSimples() { return saqueSimples; },
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
    /** Reacao (emoji) do jogador i; devolve se valeu (humano: a qualquer hora, com recarga). */
    reagir(i, id) { return reagir(i, id); },
    /**
     * Resumo da partida para o jogador i (o perfil converte em XP e Gotas).
     * @param {0|1} [i]
     */
    resumo(i = 0) {
      const lado = i === 0 ? -1 : 1;
      return { venceu: resultado === lado, copa, pontos: stats.pontos[i], aces: stats.aces[i], bombas: stats.bombas[i], viradas: stats.viradas[i], ralis10: stats.ralis10, perdidos: placar[1 - i], anjos: anjosUsados, perdas: { ...stats.perdas[i] } };
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
     * balao da CPU. bolha | gelo | fogo: power-ups no rali. gosmao: o Gosmao inchando (e o rival
     * encolhido). saque: a bola no ar, logo antes do ideal, com o sacador recuado (saque fundo).
     * juiz | juiz-<reacao>: a bola acabou de pegar no juiz.
     * @param {string} nome
     */
    roteiro(nome) {
      esperaToque = false;
      primeiroToque = true;
      if (nome === 'cortada' || nome === 'mira') {
        guia.fase = 'feito';
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
      if (nome === 'guiada') {
        // a cortada guiada da 1a partida, congelada: a bola presa sobre o jogador esperando o toque
        estado = 'jogo';
        placar = [1, 0];
        pontoN = 1;
        stats.pontos[0] = 1;
        J[0].med.v = Math.max(J[0].med.v, CUSTO.cortada);
        const s = slimes[0];
        s.x = -6; s.y = 0; s.vy = 0; s.noChao = true;
        slimes[1].x = 7.5; slimes[1].y = 0;
        assentar(peles[0], s);
        assentar(peles[1], slimes[1]);
        const [bx, by] = Cort.batidaNoApice(s);
        bola.solta = false; bola.x = bx; bola.y = by; bola.vx = 0; bola.vy = 0;
        rali.lado = 1; rali.toques = 1; rali.ultimo = 1; rali.ultimoLado = 1; rali.recepcaoSaque = false;
        guia.fase = 'congelada';
        guia.t = 0;
        guia.tocou = false;
        guia.escala = Cort.CORTADA.guia.escala;
        escalarTudo(T, guia.escala);
        return true;
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
      if (nome === 'gosmao') {
        // o jogador acabou de pegar o Gosmao (incha passando do ponto e assenta); o rival encolhido
        estado = 'jogo';
        rali.lado = -1; rali.toques = 1; rali.ultimo = 0; rali.ultimoLado = -1; rali.recepcaoSaque = false;
        slimes[0].x = -6; slimes[1].x = 6;
        assentar(peles[0], slimes[0]);
        assentar(peles[1], slimes[1]);
        bola.solta = true; bola.x = -1.5; bola.y = 9; bola.vx = 3; bola.vy = 4;
        J[0].efeitos.gosmao = 2;
        J[1].efeitos.encolher = 2;
        ev({ tipo: 'powerup', i: 0, id: 'gosmao', alvo: 0, humano: humano[0] });
        return true;
      }
      if (nome === 'juiz' || nome.startsWith('juiz-')) {
        // a bola acaba de passar pelo juiz: bolada garantida (juiz-<reacao> escolhe a reacao)
        estado = 'jogo';
        rali.lado = -1; rali.toques = 1; rali.ultimo = 0; rali.ultimoLado = -1; rali.recepcaoSaque = false;
        slimes[0].x = -6; slimes[1].x = 6;
        assentar(peles[0], slimes[0]);
        assentar(peles[1], slimes[1]);
        bola.solta = true; bola.x = 0.4; bola.y = 3.6; bola.vx = 9; bola.vy = 5;
        if (juiz) {
          const r = forcarBolada(juiz, nome.slice(5), { x: -0.5, y: 3.4, vx: 14, vy: -2 });
          ev({ tipo: 'juiz-bolada', reacao: r, x: -0.5, y: 3.4, v: 14 });
        }
        // e quem tocou pede desculpa (o balao de fala, garantido no roteiro)
        J[0].fala = { id: 'foiMalJuiz', t: 0 };
        ev({ tipo: 'fala', i: 0, id: 'foiMalJuiz', humano: humano[0] });
        return true;
      }
      if (nome === 'saque') {
        prepararSaque(0);
        levantar(0);
        // o sacador recuou: a bola fica a frente do corpo (saque fundo)
        slimes[0].x = posicaoParaRumo(saque.x0, slimes[0].lado, 1);
        assentar(peles[0], slimes[0]);
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
