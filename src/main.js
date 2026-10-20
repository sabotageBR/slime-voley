// Volei de Gosma: liga tudo. UNICO dono do SDK (src/core/poki.js), do audio, da vibracao, do
// save e do DOM; o jogo (src/jogo/) e puro e so emite eventos, que o TRATADORES abaixo traduz em
// som, efeito, vibracao e telemetria.
//
// Fluxo do SDK (regras da Poki, ver docs/desenho.md):
// - gameLoadingFinished no primeiro quadro com a fonte (reserva de 1,5 s);
// - gameplayStart so com pointerdown/keydown REAL nos 5 s anteriores (o primeiro saque de cada
//   partida, o de depois da pausa e o de depois de um anuncio esperam um toque, sem relogio);
// - nada entre pontos; gameplayStop no ponto final; commercialBreak so no toque em Proxima ou
//   Revanche (a partir da 3a partida) e ao despausar; nunca no meio do rali;
// - durante o anuncio a entrada e ignorada e o blur nao pausa.

import { poki } from './core/poki.js';
import { criarAudio } from './core/audio.js';
import { criarHaptico } from './core/haptico.js';
import { criarArmazem } from './core/armazenamento.js';
import { criarLaco, PASSO } from './core/laco.js';
import { lerDepuracao } from './core/depuracao.js';
import { hexDaMistura } from './cor/km.js';
import { criarPartida } from './jogo/partida.js';
import { rival as acharRival, COPAS } from './jogo/rivais.js';
import { skin as acharSkin } from './jogo/skins.js';
import { CUSTO } from './jogo/medidor.js';
import { TEMPOS, SAQUE } from './jogo/regras.js';
import { criarVista } from './render/vista.js';
import { criarCena } from './render/cena.js';
import { tonalidade } from './render/celebracao.js';
import { criarControles } from './ui/controles.js';
import { criarHud } from './ui/hud.js';
import { criarMesa } from './som/mesa.js';
import { escolherIdioma, textos } from './i18n/textos.js';
import { G_BOLA, RB } from './fisica/volei.js';

const D = lerDepuracao();
const $ = (id) => /** @type {HTMLElement} */ (document.getElementById(id));
const save = criarArmazem();
const perfil = Object.assign({ partidas: 0, vitorias: 0, fase: 0, controle: '', som: true, vibrar: true, gotas: 0 }, save.ler('perfil', {}) || {});
let idioma = escolherIdioma(D.lang, poki.idioma);
let T = textos(idioma);
const audio = criarAudio();
const mesa = criarMesa(audio);
const haptico = criarHaptico();
const toque = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

// ------------------------------------------------------------------ cena e UI
const cena = criarCena({ fundo: /** @type {any} */ ($('cFundo')), slime: /** @type {any} */ ($('cSlime')), topo: /** @type {any} */ ($('cTopo')), tela: /** @type {any} */ ($('cTela')) }, {
  forcar2d: D.render === '2d',
  visual: /** @type {any} */ (D.visual || 'a'),
});
if (D.qualidade >= 0) cena.definirQualidade(D.qualidade);
const esquema = /** @type {'a'|'b'} */ (D.controle || perfil.controle || 'a');
cena.definirToque(toque, esquema);

let pausado = false;
let emAnuncio = false;
const raiz = $('jogo');
const controles = criarControles(raiz, {
  paraMundo: (px, py) => cena.paraMundo(px, py),
  layout: () => cena.layout,
  aoInteragir: (e) => interagir(e),
  ativo: () => !pausado && !emAnuncio && !hud.cartaoAberto,
});
controles.definirEsquema(esquema);
const hud = criarHud(raiz, T, {
  aoPausar: () => pausar(true),
  aoContinuar: () => continuar(),
  aoProxima: () => proximaPartida(false),
  aoRevanche: () => proximaPartida(true),
  aoOpcao: (id) => {
    if (id === 'controle') {
      const novo = controles.esquema === 'a' ? 'b' : 'a';
      controles.definirEsquema(novo);
      cena.definirToque(toque, novo);
      perfil.controle = novo;
      gravarPerfil();
    } else if (id === 'som') {
      perfil.som = !perfil.som;
      audio.definirMudo(!perfil.som);
      gravarPerfil();
    }
    hud.menu(true, { controle: controles.esquema, som: perfil.som });
  },
  som: (id) => mesa.tocar(id),
});
audio.definirMudo(!perfil.som);

function gravarPerfil() { save.gravar('perfil', perfil); }

// ------------------------------------------------------------------ partida
let P = null;
let vista = null;
let cores = ['#ff8a2a', '#3fd6c8'];
let nomes = ['', ''];
let inicio = null;
let tMao = 0;
let partidaN = perfil.partidas;
let premiadoNaPausa = false;

function novaPartida(revanche = false) {
  const primeira = D.primeira ?? perfil.partidas === 0;
  const copa = COPAS[0];
  const idRival = D.rival || (primeira ? 'gota' : copa.rivais[Math.min(copa.rivais.length - 1, perfil.fase)]);
  const riv = acharRival(idRival);
  const sk = acharSkin(D.skin || 'laranjinha');
  P = criarPartida({
    semente: D.semente || ((Date.now() / 1000) | 0) + partidaN * 7919,
    modo: D.auto ? 'demo' : 'cpu',
    rival: riv.id,
    primeira,
    partidaN: partidaN + 1,
    gatilho: /** @type {any} */ (D.gatilho || 'novo'),
    assist: { ima: D.assist, devolucao: D.assist },
    lenta: { ...(D.lenta ? { escalaMundo: Math.round(D.lenta * 1000) } : {}), ...(D.defensor ? { escalaDefensor: Math.round(D.defensor * 1000) } : {}) },
    qualidadeMinima: cena.nivelQualidade >= 3,
  });
  vista = criarVista(P);
  cores = [sk.hex, hexDaMistura(riv.pig)];
  vista.vestir(0, sk.pig, cores[0]);
  vista.vestir(1, riv.pig, cores[1]);
  nomes = [T('ui.voce'), T('rival.' + riv.id)];
  inicio = null;
  tMao = 0;
  void revanche;
}

// ------------------------------------------------------------------ SDK
let carregouEnviado = false;
let jogando = false;
let tUltimaInteracao = -1e9;
let primeiraInteracao = false;

function interagir(e) {
  tUltimaInteracao = performance.now();
  audio.iniciar();
  if (!P) return;
  P.interacao();
  if (!primeiraInteracao) {
    primeiraInteracao = true;
  }
  // gameplayStart: so com a partida em jogo e interacao real agora
  if (!jogando && !pausado && !emAnuncio && P.estado !== 'fim' && !hud.cartaoAberto) {
    jogando = true;
    poki.gameplayStart();
    if (!inicio) inicio = { t: 0, txt: T('grito.vai') };
    audio.pronto().then((ok) => { if (ok) { mesa.falar('vozProntoSlime', { forcar: true }); mesa.falar('vozVaiSlime', { forcar: true, atraso: 0.55 }); } });
  }
  void e;
}

function pararJogo() {
  if (jogando) { jogando = false; poki.gameplayStop(); }
}

async function intervalo() {
  if (D.semAnuncio || premiadoNaPausa) { premiadoNaPausa = false; return; }
  if (partidaN < 3) return;
  emAnuncio = true;
  controles.soltarTudo();
  await poki.commercialBreak();
  emAnuncio = false;
}

poki.onAdStart = () => { audio.mudoParaAnuncio(); };
poki.onAdEnd = () => { audio.voltarDoAnuncio(); };

let motivoPausa = '';
function pausar(v, motivo = 'botao') {
  if (v === pausado || emAnuncio) return;
  motivoPausa = motivo;
  if (v) {
    if (hud.cartaoAberto) return;
    pausado = true;
    pararJogo();
    controles.soltarTudo();
    hud.menu(true, { controle: controles.esquema, som: perfil.som });
  }
}

async function continuar() {
  hud.menu(false);
  await intervalo();
  pausado = false;
  if (P) P.exigirToque();
}

async function proximaPartida(revanche) {
  hud.cartao(null);
  partidaN++;
  await intervalo();
  novaPartida(revanche);
}

document.addEventListener('visibilitychange', () => {
  audio.pausarAba(document.hidden);
  if (document.hidden && !emAnuncio && P && P.estado === 'jogo') pausar(true, 'oculta');
});
window.addEventListener('blur', () => { if (!D.semBlur && !emAnuncio && P && P.estado === 'jogo' && jogando) pausar(true, 'blur'); });

// ------------------------------------------------------------------ eventos -> som, vfx, vibracao
const vibrar = (p) => { if (perfil.vibrar) haptico.vibrar(p); };

/** @type {Record<string, (e: any) => void>} */
const TRATADORES = {
  'toque': (e) => {
    if (!e.novo) return;
    const f = Math.min(1.5, e.imp / 16);
    mesa.tocar('toque', { forca: f }, { max: 4 });
    if (f > 0.8) cena.vfx.respingo(e.x, e.y, cores[e.i], 6, 4 + f * 3);
    if (e.i === 0) vibrar(18);
  },
  'contagem': (e) => { const s = P.slimes[e.i]; cena.contagem(s.x, s.y + 3.4, e.n); },
  'pulo': () => mesa.tocar('pulo', {}, { max: 2 }),
  'pouso': () => {},
  'rede': (e) => mesa.tocar('rede', { forca: Math.min(1, e.v / 12) }),
  'placa': (e) => mesa.tocar('placa', { forca: Math.min(1, e.v / 12) }),
  'fundo': () => mesa.tocar('fundo'),
  'chao': (e) => { if (e.v > 3) mesa.tocar('chao', { forca: Math.min(1.2, e.v / 14) }); },
  'saque': (e) => { mesa.tocar('comboSwoosh', {}, { max: 1 }); if (e.i === 0) vibrar(12); },
  'saque-carga': () => {},
  'saque-valendo': () => { tMao = 0; },
  'saque-liberado': () => {},
  'cruzou': (e) => { if (e.n >= 6 && e.n % 2 === 0) { cena.plateia.animar(0.15); if (e.n <= 10) mesa.falar('vozCombo' + Math.min(10, e.n) + 'Slime'); } },
  'perfeita': (e) => { mesa.tocar('perfeita'); cena.coroa(e.x, e.y, '#ffffff', { r1: 1.6, n: 10, esc: 0.7 }); cena.vfx.texto(e.x, e.y + 1.6, T('grito.manchete'), '#ffffff', 1); },
  'cortada-entra': (e) => {
    mesa.tocar('lentaEntra', {}, { max: 1 });
    cena.corCortada = cores[e.i];
    if (e.humano && P.jogadores[e.i].cortadas === 1) mesa.falar('vozPowerUpSlime');
    poki.measure('powerup', 'cortada-lenta', 'interact');
  },
  'cortada-mira': () => {},
  'cortada-solta': (e) => {
    mesa.tocar('lentaSolta', {}, { max: 1 });
    cena.coroa(e.x, e.y, cores[e.i], { miolo: tonalidade(cores[e.i], 0.6) });
    cena.diretor.tremer(0.45);
    if (e.i === 0) vibrar([30, 40, 60]);
    if (e.rapida) poki.measure('cortada', 'lenta', 'sem-querer');
    poki.measure('cortada', 'mira', e.auto ? 'auto' : 'manual');
  },
  'ponto': (e) => {
    const completa = e.festa === 'completa';
    const cor = cores[e.i];
    cena.coroa(e.x, 0.15, cor, { chao: true, r1: completa ? 3.2 : 2.0, n: completa ? 14 : 10, esc: completa ? 1.2 : 0.8, miolo: tonalidade(cor, 0.6) });
    cena.vfx.respingo(e.x, 0.3, cor, completa ? 10 : 5, 7);
    mesa.tocar('apito', {}, { max: 1 });
    if (e.cpu) {
      mesa.tocar('ohh', {}, { max: 1 });
      cena.plateia.lamentar();
    } else {
      mesa.tocar('rugido', { forca: completa ? 1 : 0.6 }, { max: 1 });
      if (completa) { mesa.tocar('fanfarra', {}, { max: 1, atraso: 0.12 }); mesa.tocar('estouroPop', {}, { max: 1, atraso: 0.12 }); }
      cena.plateia.festa(e.lado, completa ? 1 : 0.5);
    }
    const trauma = ['ace', 'bomba'].includes(e.palavra) ? 0.55 : ['fogo', 'raio', 'jornada'].includes(e.palavra) ? 0.7 : 0.35;
    cena.diretor.tremer(completa ? trauma : trauma * 0.4);
    if (e.humano) vibrar(40);
    if (e.fim) pararJogo();
    if (e.matchPoint) hud.faixa(T('grito.matchPoint'));
    else hud.faixa('');
    if (e.motivo === 'fora') poki.measure('fora', e.lado < 0 ? 'esquerda' : 'direita', 'ponto');
  },
  'match-point': () => {},
  'fim': (e) => {
    const venceu = e.humanoVenceu;
    perfil.partidas++;
    if (venceu) { perfil.vitorias++; perfil.fase = Math.min(2, perfil.fase + 1); }
    gravarPerfil();
    mesa.falar(venceu ? 'vozVenceuSlime' : 'vozPerdeuSlime', { forcar: true });
    poki.measure('level', 'm' + perfil.partidas, venceu ? 'complete' : 'fail');
    hud.faixa('');
    setTimeout(() => {
      hud.cartao({ titulo: venceu ? T('ui.venceu') : T('ui.perdeu'), sub: `${e.placar[0]} · ${e.placar[1]}`, proxima: venceu, revanche: !venceu });
    }, 400);
  },
  'tutorial-cortada': () => { tMao = 0; },
  'texto': () => {},
  'lenta': () => {},
  'cortada-cancela': () => {},
};

// ------------------------------------------------------------------ laco
let tReal = 0;
let tFesta = 0;

function passo(dt) {
  if (!P) return;
  if (pausado || emAnuncio) return;
  tReal += dt;
  if (inicio) inicio.t += dt;
  // intencoes do jogador (uma vez por passo: as bordas acumulam no controle)
  const its = controles.ler(P.slimes);
  if (!D.auto) P.intencao(0, its[0]);
  P.passo();
  for (const e of P.eventos) {
    const f = TRATADORES[e.tipo];
    if (f) f(e);
  }
  P.eventos.length = 0;
  tFesta = P.estado === 'ponto' || P.estado === 'fim' ? P.festa.t : 0;
}

/** Arco previsto do saque segurado (mini-arco de pontinhos). */
function arcoSaque() {
  const ps = P.previsaoSaque();
  if (!ps) return null;
  const b = P.bola;
  const H = ps.tipo === 'viagem' ? SAQUE.apiceViagem : SAQUE.apice;
  const vy = Math.sqrt(Math.max(0.5, 2 * G_BOLA * Math.max(0.3, H - b.y)));
  const tv = (vy + Math.sqrt(vy * vy + 2 * G_BOLA * Math.max(0, b.y - RB))) / G_BOLA;
  const vx = (ps.alvo - b.x) / tv;
  const pts = [];
  for (let k = 0; k <= 40; k++) {
    const t = (k / 40) * tv * 0.55;
    pts.push(b.x + vx * t, b.y + vy * t - (G_BOLA * t * t) / 2);
  }
  return { k: ps.k, tipo: ps.tipo, arco: pts };
}

function desenhar(dtReal, alfa) {
  if (!P) return;
  const dt = pausado || emAnuncio ? 0 : dtReal;
  // comemoracao
  let festa = null;
  if (P.estado === 'ponto' || (P.estado === 'fim' && P.festa.t < 3)) {
    const f = P.festa;
    const iv = f.lado < 0 ? 0 : 1;
    const venceu = P.resultado === -1;
    festa = {
      t: f.t, tipo: f.tipo, lado: f.lado, x: f.x, cor: cores[iv], placar: P.placar, semente: (P.placar[0] * 31 + P.placar[1] * 7 + 3) >>> 0,
      texto: f.palavra ? T('grito.' + f.palavra) : '', cpu: !P.humano[iv], fim: f.fim,
      textoFim: f.fim ? T(venceu ? 'grito.vitoria' : 'grito.derrota') : '', derrota: f.fim && !venceu,
    };
    if (f.fim) festa.cor = venceu ? cores[0] : '#7a7f95';
  }
  // saque: anel de carga, mini-arco e pulso da espera
  const sq = P.estado === 'saque' && P.sacador === 0 && P.saque.segurando ? arcoSaque() : null;
  let pulso = 0;
  if (P.estado === 'saque' && P.sacador === 0 && !P.saque.segurando) pulso = P.saque.t >= TEMPOS.pulsoSaque ? 1 : 0;
  // marca de queda do saque para quem recebe
  let alvoSaque = null;
  if (P.estado === 'jogo' && P.rali.recepcaoSaque && P.rali.saqueDeQuem === 1) {
    const pr = P.previsao();
    if (pr && pr.x < 0) alvoSaque = pr.x;
  }
  cena.desenhar(P, vista, alfa, dt, { cores, festa, inicio, saque: sq, pulsoSaque: pulso, alvoSaque });
  // HUD
  const L = cena.layout;
  if (L) hud.posicionar(L);
  hud.atualizar({ nomes, cores, placar: P.placar, medidor: [P.jogadores[0].med.v, P.jogadores[1].med.v], esconder: D.semHud });
  controles.desenhar();
  controles.mostrarSuper(false);
  desenharMao(dt);
  // carregou: primeiro quadro com a fonte
  if (!carregouEnviado) {
    carregouEnviado = true;
    $('carregando')?.remove();
    poki.gameLoadingFinished();
  }
  void tFesta;
}

/** Mao fantasma: comeco da partida, espera do saque e cortada guiada. */
function desenharMao(dt) {
  if (D.semHud || !P || !cena.layout) { hud.mao(null); return; }
  tMao += dt;
  const L = cena.layout;
  const W = window.innerWidth;
  let m = null;
  const acao = L.painel ? { x: W * 0.75, y: L.painel.y + L.painel.h * 0.45 } : { x: W * 0.78, y: window.innerHeight * 0.72 };
  if (!primeiraInteracao) m = { ...acao, texto: toque ? T('dica.toque') : T('dica.teclas'), gesto: 'toque' };
  else if (P.estado === 'saque' && P.sacador === 0 && !P.saque.segurando && P.saque.t >= TEMPOS.pulsoSaque) m = { ...acao, texto: toque ? T('dica.toque') : T('dica.clique'), gesto: 'toque' };
  else if (P.tutorialCortada === 'oferecida' && P.estado === 'jogo' && !P.cortada) m = { ...acao, texto: T('dica.cortada'), gesto: 'duplo' };
  else if (P.esperaToque && P.estado === 'saque' && P.sacador === 1) m = { ...acao, texto: T('dica.receber'), gesto: 'toque' };
  hud.mao(m);
}

// ------------------------------------------------------------------ comeco
novaPartida();
const laco = criarLaco({ passo, desenhar });

// modo filme (ferramentas): N quadros deterministicos em <pre id="filme">, sem rAF
if (D.filme > 0) {
  globalThis.__filme = { pronto: false };
  primeiraInteracao = true;
  P.interacao();
  jogando = true;
  const quadros = [];
  for (let k = 0; k < D.filme; k++) {
    for (let j = 0; j < D.cada; j++) passo(PASSO);
    desenhar(PASSO * D.cada, 1);
    quadros.push(k);
  }
  globalThis.__filme.pronto = true;
} else {
  poki.init().then(() => { idioma = escolherIdioma(D.lang, poki.idioma); T = textos(idioma); nomes[0] = T('ui.voce'); });
  if (D.auto) { primeiraInteracao = true; P.interacao(); }
  laco.iniciar();
  // reserva do loading: 1,5 s
  setTimeout(() => { if (!carregouEnviado) { carregouEnviado = true; $('carregando')?.remove(); poki.gameLoadingFinished(); } }, 1500);
}

// ganchos de teste (loopback e build de modelos)
if (D.ganchos) {
  globalThis.__volei = {
    get partida() { return P; },
    get cena() { return cena; },
    get pausado() { return pausado; },
    get emAnuncio() { return emAnuncio; },
    get jogando() { return jogando; },
    get motivoPausa() { return motivoPausa; },
    passo,
    desenhar,
    interagir: () => interagir(null),
    encher: (v = 300) => P.encher(0, v),
    gratis: () => P.darCortadaGratis(0),
    CUSTO,
  };
}
