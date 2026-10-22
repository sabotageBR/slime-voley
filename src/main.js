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
import { linearDeHex } from './cor/km.js';
import { criarPartida } from './jogo/partida.js';
import { rival as acharRival, corDoRival } from './jogo/rivais.js';
import { skin as acharSkin } from './jogo/skins.js';
import { CUSTO } from './jogo/medidor.js';
import { REACOES } from './jogo/reacoes.js';
import { vozDaFala, FALA } from './jogo/falas.js';
import { chaveDaCopa, registrarVitoria, proximaCopa, trocarPais, normalizarCopa, GOTAS_TITULO, NUM_COPAS, TAM_COPA } from './jogo/torneio.js';
import { paisDoIdioma } from './jogo/paises.js';
import { visualDaSkin, visualDoArquetipo, comprar as comprarItem, normalizarVisual } from './jogo/visual.js';
import { normalizarPerfil, rendimento, aplicarGanho, proximosMarcos, darPresente, presenteDaVitoria } from './jogo/perfil.js';
import { TEMPOS } from './jogo/regras.js';
import { criarVista } from './render/vista.js';
import { criarCena } from './render/cena.js';
import { tonalidade } from './render/celebracao.js';
import { desenharIconeTela, desenharPremioTela } from './render/icones.js';
import { desenharCarinhaTela } from './render/carinhas.js';
import { desenharEstampa, EST_W, EST_H } from './render/estampas.js';
import { desenharMiniSlime } from './render/vitrine.js';
import { criarControles } from './ui/controles.js';
import { criarHud } from './ui/hud.js';
import { criarMenu } from './ui/menu.js';
import { criarVestiario } from './ui/vestiario.js';
import { criarMesa } from './som/mesa.js';
import { escolherIdioma, textos } from './i18n/textos.js';

const D = lerDepuracao();
const $ = (id) => /** @type {HTMLElement} */ (document.getElementById(id));
const save = criarArmazem();
/** perfil salvo: partidas, opcoes, nivel e XP, Gotas, skin e o que a trilha liberou (src/jogo/perfil.js) */
const perfil = normalizarPerfil(save.ler('perfil', {}));
if (D.bandeira) perfil.pais = D.bandeira.toUpperCase();
// ?copa=N&fase=F (testes): a Copa na fase pedida
if (D.copa) perfil.copa = normalizarCopa({ n: D.copa, tam: TAM_COPA, semente: D.semente || 1, fase: D.fase, pais: perfil.pais });
// a selecao do jogador: a regiao do idioma do navegador, ate ele escolher no vestiario
if (!perfil.pais) {
  perfil.pais = paisDoIdioma([...(navigator.languages || []), navigator.language]);
  perfil.copa = trocarPais(perfil.copa, perfil.pais);
}
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
/** Fundo distante (arte tratada do Grok) por direcao visual; a C (transmissao) e so codigo. */
const ARTE = { a: 'src/arte/ginasios/praia-a1.webp', b: 'src/arte/ginasios/praia-b1.webp' };
function carregarArte(v) {
  const url = ARTE[v];
  cena.definirArte(null);
  if (!url) return;
  const img = new Image();
  img.decoding = 'async';
  img.onload = () => { if (cena.visual === v) cena.definirArte(img); };
  img.src = url;
}
carregarArte(cena.visual);
document.body.dataset.visual = cena.visual;
const esquema = /** @type {'a'|'b'} */ (D.controle || perfil.controle || 'a');
cena.definirToque(toque, esquema);

let pausado = false;
let emAnuncio = false;
const raiz = $('jogo');
const controles = criarControles(raiz, {
  paraMundo: (px, py) => cena.paraMundo(px, py),
  layout: () => cena.layout,
  aoInteragir: (e) => interagir(e),
  ativo: () => !pausado && !emAnuncio && !hud.cartaoAberto && !menu.aberto && !vestiario.aberto,
  toque,
});
controles.definirEsquema(esquema);
const hud = criarHud(raiz, T, {
  aoPausar: () => pausar(true),
  aoContinuar: () => continuar(),
  aoProxima: () => proximaPartida(false),
  aoRevanche: () => proximaPartida(true),
  aoAutoAvanco: (revanche) => proximaPartida(revanche, true),
  aoOpcao: (id) => { trocarOpcao(id); hud.menu(true, { controle: controles.esquema, som: perfil.som }); },
  som: (id) => mesa.tocar(id),
  icone: desenharIconeTela,
  carinha: desenharCarinhaTela,
  aoReagir: (id) => reagirJogador(id),
  aoReagirTecla: (k) => { if (reacoesLiberadas[k]) reagirJogador(reacoesLiberadas[k]); },
  aoBotaoReacao: () => { barra = tReal < barra.ate && tReal >= barra.de ? { de: 0, ate: 0 } : { de: tReal, ate: tReal + 2.5 }; },
  // o presente (acessorio) aparece no slime do jogador, como na vitrine do vestiario
  premio: (ctx, pr, lado) => (pr.tipo === 'acessorio'
    ? desenharMiniSlime(ctx, lado, lado, { ...visualAtual(), [pr.encaixe]: pr.id }, { pais: perfil.pais, pintura: cvPintura })
    : desenharPremioTela(ctx, pr, lado, pr.tipo === 'skin' ? acharSkin(pr.id).hex : undefined)),
  aoPremiado: () => premiado(),
  aoMenu: () => irParaMenu(),
  aoPresente: () => abrirPresente(),
  caixaExtra: () => vestiario.caixa || menu.caixa,
  aoEscExtra: () => menu.voltar(),
});
const menu = criarMenu(raiz, T, {
  aoJogar: () => jogarDoMenu(),
  aoOpcao: (id) => { trocarOpcao(id); menu.atualizar({ controle: controles.esquema, som: perfil.som }); },
  aoVestiario: () => abrirVestiario(),
  som: (id) => mesa.tocar(id),
});
const vestiario = criarVestiario(raiz, T, {
  visual: () => perfil.visual,
  definir: (v) => { perfil.visual = normalizarVisual(v, perfil.skin); aplicarVisual(); },
  perfil: () => perfil,
  comprar: (chave) => {
    const r = comprarItem(perfil, chave);
    if (r.ok) { Object.assign(perfil, r.perfil); gravarPerfil(); poki.measure('vestiario', chave.replace(/:/g, '-'), 'compra'); }
    return r.ok;
  },
  escolherPais: (cod) => { perfil.pais = cod; perfil.copa = trocarPais(perfil.copa, cod); },
  nomePais: (cod) => nomePais(cod),
  pintura: () => cvPintura,
  pincel: {
    definir: (p) => Object.assign(pincel, p),
    desfazer: () => { const d = desfazer.pop(); if (d) { cvPintura.getContext('2d')?.putImageData(d, 0, 0); aplicarVisual(); } },
    limpar: () => { guardarDesfazer(); cvPintura.getContext('2d')?.clearRect(0, 0, EST_W, EST_H); comecarPintura(false); aplicarVisual(); },
    balde: () => {
      guardarDesfazer();
      comecarPintura(false);
      const g = cvPintura.getContext('2d');
      if (g) { g.globalCompositeOperation = 'source-over'; g.fillStyle = pincel.cor; g.fillRect(0, 0, EST_W, EST_H); }
      aplicarVisual();
    },
  },
  pintar: (x, y, fase) => pintarEm(x, y, fase),
  aoFechar: () => fecharVestiario(),
  som: (id) => mesa.tocar(id === 'compra' ? 'registradora' : id),
  icone: (ctx, lado) => desenharPremioTela(ctx, { tipo: 'gotas' }, lado),
});

// ------------------------------------------------------------------ vestiario e pincel
const pincel = { cor: '#17161c', tam: 6, borracha: false };
/** @type {ImageData[]} */
const desfazer = [];
let ultimoPonto = null;

/** @param {string} [aba] @param {'menu'|'cartao'} [origem] */
function abrirVestiario(aba, origem = 'menu') {
  menu.fechar();
  controles.soltarTudo();
  vestiario.abrir(aba);
  poki.measure('vestiario', 'abrir', origem);
}

function fecharVestiario() {
  gravarPerfil();
  try { save.gravar('pintura', cvPintura.toDataURL('image/png')); } catch { /* sem espaco: a pintura fica so nesta sessao */ }
  if (P) cores[0] = perfil.visual.hex;
  abrirMenu();
}

function guardarDesfazer() {
  const g = cvPintura.getContext('2d');
  if (!g) return;
  desfazer.push(g.getImageData(0, 0, EST_W, EST_H));
  if (desfazer.length > 12) desfazer.shift();
}

/**
 * A pintura passa a ser a estampa; a primeira pincelada parte da estampa atual (pinta por cima da
 * bandeira ou do personagem).
 * @param {boolean} copiar
 */
function comecarPintura(copiar = true) {
  if (perfil.visual.estampa === 'pintura') return;
  const g = cvPintura.getContext('2d');
  if (g && copiar) { g.clearRect(0, 0, EST_W, EST_H); g.drawImage(cvEstampa, 0, 0); }
  perfil.visual = { ...perfil.visual, estampa: 'pintura', pronta: '' };
}

/** Pincelada na vitrine: tela -> mundo -> repouso da cupula (como o campo.js) -> pixel da estampa. */
function pintarEm(px, py, fase) {
  if (!vista) return;
  if (fase === 'fim') { ultimoPonto = null; return; }
  const w = cena.paraMundo(px, py);
  if (!w) return;
  const s = vista.m.slimes[0];
  const lim = (v, a, b) => (v < a ? a : v > b ? b : v);
  const a11 = lim(s.a11, 0.6, 1.6);
  const a22 = lim(s.a22, 0.6, 1.6);
  const a12 = lim(s.a12, -0.6, 0.6);
  const a21 = lim(s.a21, -0.6, 0.6);
  const det = a11 * a22 - a12 * a21 || 1;
  const rx = w[0] - s.cx;
  const ry = w[1] - s.cy;
  const lx = (a22 * rx - a12 * ry) / det;
  const ly = (-a21 * rx + a11 * ry) / det;
  const R = s.raio0 / 0.925;
  const X = (lx / (2 * R) + 0.5) * EST_W;
  const Y = (1 - (ly + 0.44 * R) / R) * EST_H;
  const g = cvPintura.getContext('2d');
  if (!g) return;
  if (fase === 'ini') { guardarDesfazer(); comecarPintura(true); ultimoPonto = null; }
  g.save();
  g.globalCompositeOperation = pincel.borracha ? 'destination-out' : 'source-over';
  g.strokeStyle = pincel.cor;
  g.fillStyle = pincel.cor;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.lineWidth = pincel.tam;
  g.beginPath();
  if (ultimoPonto) { g.moveTo(ultimoPonto[0], ultimoPonto[1]); g.lineTo(X, Y); g.stroke(); }
  else { g.arc(X, Y, pincel.tam / 2, 0, Math.PI * 2); g.fill(); }
  g.restore();
  ultimoPonto = [X, Y];
  aplicarVisual();
}
audio.definirMudo(!perfil.som);

function gravarPerfil() { save.gravar('perfil', perfil); }

/** Controle (metades/botoes) e som: o menu de pausa e o menu principal. */
function trocarOpcao(id) {
  if (id === 'controle') {
    const novo = controles.esquema === 'a' ? 'b' : 'a';
    controles.definirEsquema(novo);
    cena.definirToque(toque, novo);
    perfil.controle = novo;
  } else if (id === 'som') {
    perfil.som = !perfil.som;
    audio.definirMudo(!perfil.som);
  }
  gravarPerfil();
}

// ------------------------------------------------------------------ Copa Gosma e menu
/** Nome do pais na lingua do jogo (o navegador; alguns nomes corrigidos no i18n). */
function nomePais(cod) {
  if (!cod) return '';
  const k = T('pais.' + cod);
  if (k !== 'pais.' + cod) return k;
  try { return new Intl.DisplayNames([idioma], { type: 'region' }).of(cod) || cod; } catch { return cod; }
}

/** A chave pronta para desenhar (nomes, bandeiras e cores de cada vaga). */
function dadosChave(ch = chaveDaCopa(perfil.copa)) {
  const corJogador = visualAtual().hex;
  const vagas = ch.vagas.map((v) => (v.jogador ? { nome: T('ui.voce'), pais: v.pais, cor: corJogador } : { nome: T('rival.' + v.id), pais: v.pais, cor: corDoRival(acharRival(v.id), corJogador).hex }));
  return { chave: ch, vagas, corJogador };
}

/** "Proxima: Semifinal contra Geleia (Zambia)". */
function textoProxima(ch) {
  if (ch.campeao) return T('copa.campeao');
  const vaga = ch.vagas.find((v) => v.id === ch.adversario);
  const rival = T('rival.' + ch.adversario) + (vaga && vaga.pais ? ` (${nomePais(vaga.pais)})` : '');
  return T('copa.proxima').replace('{fase}', T('copa.' + ch.nomeFase)).replace('{rival}', rival);
}

/** o menu foi aberto pela pausa (JOGAR continua a partida) ou pelo cartao (JOGAR paga o intervalo) */
let menuDaPausa = false;
let intervaloPendente = false;

function abrirMenu() {
  const ch = chaveDaCopa(perfil.copa);
  controles.soltarTudo();
  menu.abrir({
    copa: T('copa.nome').replace('{n}', String(ch.n)), fase: T('copa.' + ch.nomeFase), proxima: textoProxima(ch),
    pais: perfil.pais, controle: controles.esquema, som: perfil.som, chave: dadosChave(ch),
  });
}

/** Fecha o cartao de fim e deixa a proxima partida pronta, esperando o JOGAR do menu. */
function sairDoCartao() {
  hud.cartao(null);
  partidaN++;
  intervaloPendente = true;
  avancarCopaSeCampeao();
  novaPartida();
}

/** Menu pelo cartao de fim ou pela pausa. */
function irParaMenu() {
  if (hud.cartaoAberto) {
    poki.measure('cartao', 'menu', 'interact');
    sairDoCartao();
  } else if (pausado) {
    hud.menu(false);
    menuDaPausa = true;
  }
  abrirMenu();
}

/** O presente novo do cartao: o vestiario abre nos acessorios (o Pronto volta ao menu, e o JOGAR segue). */
function abrirPresente() {
  if (!hud.cartaoAberto) return;
  poki.measure('cartao', 'vestiario', 'interact');
  sairDoCartao();
  abrirVestiario('acessorios', 'cartao');
}

async function jogarDoMenu() {
  menu.fechar();
  audio.iniciar();
  if (menuDaPausa) { menuDaPausa = false; await continuar(); return; }
  if (intervaloPendente) { intervaloPendente = false; await intervalo(); }
}

/** Depois do titulo, a proxima Copa (a chave nova sorteada). */
function avancarCopaSeCampeao() {
  if (!chaveDaCopa(perfil.copa).campeao) return;
  perfil.copa = proximaCopa(perfil.copa, ((Date.now() / 1000) | 0) ^ (perfil.partidas * 2654435761));
  gravarPerfil();
}

// ------------------------------------------------------------------ partida
let P = null;
let vista = null;
let cores = ['#ff8a2a', '#3fd6c8'];
/** o rival da partida (src/jogo/rivais.js), vestido por vestirRival */
let rivalAtual = null;
/** a partida e a final da Copa (vencer = campeao: o letreiro, o foco e a taca) */
let finalDaCopa = false;
/** o cartao de fim esperando a festa do titulo (um toque abre na hora) */
let cartaoPendente = null;
/** nivel do tom do balbucio de cada slime (src/som/falas.js tomDoNivel) */
let tons = [3, 4];
let nomes = ['', ''];
let inicio = null;
let tMao = 0;
let partidaN = perfil.partidas;
let premiadoNaPausa = false;
/** a partida ja mandou o level/mN/start (no primeiro gameplayStart dela) */
let inicioMedido = false;
/** passos do tutorial da 1a partida (0 nao comecou, 1 comecou, 2 feito): receber, sacar, cortar */
let tutorial = { receber: 0, saque: 0, cortada: 0 };
/** um passo do tutorial (progress events da Poki: start e complete) */
function passoTutorial(id, fase) {
  if (D.auto || !P || !P.regras.imperdivel) return;
  if (fase === 'start' && tutorial[id] === 0) { tutorial[id] = 1; poki.measure('tutorial', id, 'start'); }
  else if (fase === 'complete' && tutorial[id] === 1) { tutorial[id] = 2; poki.measure('tutorial', id, 'complete'); }
}

// ------------------------------------------------------------------ visual (vestiario)
/** o canvas da estampa do jogador (128 x 64) e o da pintura (o pincel; so no aparelho) */
const cvEstampa = document.createElement('canvas');
cvEstampa.width = EST_W;
cvEstampa.height = EST_H;
const cvPintura = document.createElement('canvas');
cvPintura.width = EST_W;
cvPintura.height = EST_H;
{
  const salva = save.ler('pintura', '');
  if (typeof salva === 'string' && salva.startsWith('data:image/png')) {
    const img = new Image();
    img.onload = () => { cvPintura.getContext('2d')?.drawImage(img, 0, 0); if (vista) aplicarVisual(); };
    img.src = salva;
  }
}
/** o visual em uso (?skin=, ?look= e ?bandeira= na URL trocam, para os prints) */
function visualAtual() {
  let v = D.skin ? visualDaSkin(D.skin) : D.look ? visualDoArquetipo(D.look) || perfil.visual : perfil.visual;
  if (D.bandeira) v = { ...v, estampa: 'bandeira' };
  return v;
}

/** Acessorio do rival (o campo acessorio de src/jogo/rivais.js) nos encaixes do vestiario. */
function acessoriosDoRival(a) {
  const mapa = { chapeu: ['cabeca', 'cartola'], faixa: ['cabeca', 'bandana'], coroa: ['cabeca', 'coroa'], oculos: ['rosto', 'oculosRedondos'], apito: ['boca', 'apito'], laco: ['cabeca', 'laco'], gorro: ['cabeca', 'gorro'], bone: ['cabeca', 'bone'] };
  const m = mapa[a];
  const r = { cabeca: '', rosto: '', boca: '' };
  if (m) r[m[0]] = m[1];
  return r;
}

/**
 * Veste o slime do jogador com o visual (pigmento, padrao, estampa e acessorios): a vista, o shader
 * (aparencia 1 e a estampa do slot 0) e as cores do desenho.
 * @param {ReturnType<typeof visualDaSkin>} [v]
 */
function aplicarVisual(v = visualAtual()) {
  if (!vista) return;
  const g = cvEstampa.getContext('2d');
  const temEstampa = !!g && desenharEstampa(g, v.estampa, { pais: perfil.pais, pintura: cvPintura });
  const temAp = temEstampa || v.padrao > 0;
  cores[0] = v.hex;
  vista.vestir(0, v.pig, v.hex, temAp ? 1 : 0);
  vista.m.slimes[0].dados.acessorios = { cabeca: v.cabeca, rosto: v.rosto, boca: v.boca };
  cena.definirEstampa(0, temEstampa && g ? g.getImageData(0, 0, EST_W, EST_H) : null);
  cena.definirAparencias(temAp ? [null, { ap: 1, chave: `${v.padrao}|${v.cor2}|${temEstampa}`, proc: v.padrao, escala: 1, modo: 0, corLin: linearDeHex(v.cor2), estampa: temEstampa ? 0 : -1 }] : []);
  vestirRival();
}

/** O rival na cor dele, ou na reserva se o jogador estiver de cor parecida (src/jogo/rivais.js). */
function vestirRival() {
  if (!vista || !rivalAtual) return;
  const c = corDoRival(rivalAtual, cores[0]);
  cores[1] = c.hex;
  vista.vestir(1, c.pig, c.hex);
}

function novaPartida(revanche = false) {
  // a 1a partida da vida e os 16-avos da Copa 1, contra a Gota (imperdivel); as oitavas da Copa 1
  // (a 2a partida da vida, contra o Pingo) vao a 5 sem vai-a-2
  const ch0 = chaveDaCopa(perfil.copa);
  const adversario = ch0.adversario || 'gota';
  const primeira = D.primeira ?? (perfil.partidas === 0 && adversario === 'gota');
  const curta = !primeira && !D.rival && ch0.n === 1 && ch0.fase === 1;
  const idRival = D.rival || adversario;
  const riv = acharRival(idRival);
  reacoesLiberadas = REACOES.map((r) => r.id).filter((id) => perfil.liberados.reacoes.includes(id));
  P = criarPartida({
    semente: D.semente || ((Date.now() / 1000) | 0) + partidaN * 7919,
    modo: D.auto ? 'demo' : 'cpu',
    rival: riv.id,
    primeira,
    curta,
    partidaN: partidaN + 1,
    gatilho: /** @type {any} */ (D.gatilho || 'novo'),
    assist: { ima: D.assist, devolucao: D.assist },
    fora: D.fora,
    powerups: [...perfil.liberados.powerups],
    lenta: { ...(D.lenta ? { escalaMundo: Math.round(D.lenta * 1000) } : {}), ...(D.defensor ? { escalaDefensor: Math.round(D.defensor * 1000) } : {}) },
    qualidadeMinima: cena.nivelQualidade >= 3,
  });
  vista = criarVista(P);
  const ch = chaveDaCopa(perfil.copa);
  finalDaCopa = !D.rival && !D.auto && !ch.campeao && ch.fase === ch.fases.length - 1;
  rivalAtual = riv;
  cores = [visualAtual().hex, riv.hex];
  aplicarVisual();
  vista.m.slimes[1].dados.acessorios = acessoriosDoRival(riv.acessorio);
  nomes = [T('ui.voce'), T('rival.' + riv.id)];
  // tom do balbucio: o jogador agudo; o rival pelo nivel (os chefes falam grosso)
  tons = [3, riv.chefe ? 11 : 2 + Math.max(0, ['T0', 'T1', 'T1+', 'T2', 'T3', 'T4', 'T5'].indexOf(riv.nivel))];
  inicio = null;
  tMao = 0;
  inicioMedido = false;
  tutorial = { receber: 0, saque: 0, cortada: 0 };
  if (D.roteiro) {
    primeiraInteracao = true;
    jogando = true;
    P.roteiro(D.roteiro);
  }
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
  if (cartaoPendente) { cartaoPendente(); return; }
  if (!P || menu.aberto || vestiario.aberto) return;
  P.interacao();
  if (!primeiraInteracao) {
    primeiraInteracao = true;
  }
  // gameplayStart: so com a partida em jogo e interacao real agora
  if (!jogando && !pausado && !emAnuncio && P.estado !== 'fim' && !hud.cartaoAberto) {
    jogando = true;
    poki.gameplayStart();
    // o funil da Poki: a partida N comecou (com o complete/fail do fim, o painel mostra quem saiu nela)
    if (!inicioMedido) {
      inicioMedido = true;
      if (!D.auto) poki.measure('level', 'm' + (perfil.partidas + 1), 'start');
    }
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
    if (hud.cartaoAberto || menu.aberto || vestiario.aberto) return;
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

/**
 * Soma o ganho ao perfil (subindo de nivel pela trilha) e devolve o que o cartao mostra.
 * @param {{ xp: number, gotas: number }} g @param {boolean} dobrado
 */
function ganhar(g, dobrado) {
  const gotasAntes = perfil.gotas;
  const r = aplicarGanho(perfil, g);
  Object.assign(perfil, r.perfil);
  for (const s of r.subiu) poki.measure('nivel', 'n' + s.nivel, 'subiu');
  // subiu de nivel: o locutor anuncia quando o cartao abre (depois do "venceu/perdeu")
  if (r.subiu.length) mesa.falar('vozNivelSlime', { forcar: true, atraso: 1.6 });
  return { ...r, gotasAntes, gotasTotal: perfil.gotas, marcos: proximosMarcos(r.depois.nivel, 4), dobrado };
}

/** Premio x2 (video recompensado, so por escolha): dobra o XP e as Gotas da partida. */
async function premiado() {
  if (!ultimoGanho || emAnuncio) return;
  // o SDK ja mede o video e o resultado; aqui so a oferta (visible no cartao, interact no toque)
  poki.measure('rewarded', 'dobrar', 'interact');
  premiadoNaPausa = true;
  emAnuncio = true;
  controles.soltarTudo();
  const ok = await poki.rewardedBreak();
  emAnuncio = false;
  if (!ok) { hud.cartaoPremiado(null); return; }
  const p = ganhar(ultimoGanho, true);
  ultimoGanho = null;
  gravarPerfil();
  hud.cartaoPremiado(p);
}

/** auto: o cartao avancou sozinho (sem toque), entao nao ha intervalo com anuncio. */
async function proximaPartida(revanche, auto = false) {
  if (!hud.cartaoAberto) return;
  poki.measure('cartao', revanche ? 'revanche' : 'proxima', auto ? 'auto' : 'interact');
  hud.cartao(null);
  partidaN++;
  if (!auto) await intervalo();
  avancarCopaSeCampeao();
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
    if (e.i === 0) { vibrar(18); passoTutorial('receber', 'complete'); }
  },
  'contagem': (e) => { const s = P.slimes[e.i]; cena.contagem(s.x, s.y + 3.4, e.n); },
  'pulo': () => mesa.tocar('pulo', {}, { max: 2 }),
  'pouso': () => {},
  'rede': (e) => mesa.tocar('rede', { forca: Math.min(1, e.v / 12) }),
  'placa': (e) => mesa.tocar('placa', { forca: Math.min(1, e.v / 12) }),
  'fundo': () => mesa.tocar('fundo'),
  'teto': () => mesa.tocar('placa', { forca: 0.5 }),
  'fora': () => {},
  'chao': (e) => { if (e.v > 3) mesa.tocar('chao', { forca: Math.min(1.2, e.v / 14) }); },
  'saque': (e) => {
    mesa.tocar('comboSwoosh', {}, { max: 1 });
    if (e.tipoSaque === 'perfeito') {
      mesa.tocar('perfeita', {}, { max: 1 });
      cena.coroa(e.x, e.y, '#ffd23a', { r1: 1.5, n: 10, esc: 0.7 });
      if (e.i === 0) cena.vfx.texto(e.x, e.y + 1.5, T('grito.saquePerfeito'), '#ffd23a', 1);
    }
    if (e.i === 0) {
      vibrar(e.tipoSaque === 'perfeito' ? [16, 30, 16] : 12);
      // o saque de um toque (1a partida) sai sempre perfeito: conta a parte
      poki.measure('saque', e.simples ? 'simples' : e.tipoSaque, 'humano');
      passoTutorial('saque', 'complete');
    } else passoTutorial('receber', 'start');
  },
  'saque-levanta': () => mesa.tocar('pulo', {}, { max: 1 }),
  'saque-pega': () => mesa.tocar('toque', { forca: 0.3 }, { max: 1 }),
  'saque-valendo': (e) => { tMao = 0; if (e.i === 0) passoTutorial('saque', 'start'); },
  'saque-liberado': () => {},
  // rali longo: a plateia anima nas travessias pares (o locutor contando saiu a pedido, 2026-10-22)
  'cruzou': (e) => { if (e.n >= 4 && e.n % 2 === 0) cena.plateia.animar(0.15); },
  'perfeita': (e) => { mesa.tocar('perfeita'); cena.coroa(e.x, e.y, '#ffffff', { r1: 1.6, n: 10, esc: 0.7 }); cena.vfx.texto(e.x, e.y + 1.6, T('grito.manchete'), '#ffffff', 1); },
  'cortada-entra': (e) => {
    mesa.tocar('lentaEntra', {}, { max: 1 });
    cena.corCortada = cores[e.i];
    if (e.humano && P.jogadores[e.i].cortadas === 1) mesa.falar('vozPowerUpSlime');
  },
  'cortada-mira': () => {},
  'cortada-solta': (e) => {
    mesa.tocar('lentaSolta', {}, { max: 1 });
    cena.coroa(e.x, e.y, cores[e.i], { miolo: tonalidade(cores[e.i], 0.6) });
    cena.diretor.tremer(0.45);
    if (e.i === 0) vibrar([30, 40, 60]);
    // so o humano (antes de 2026-10-22 a CPU entrava na conta): o gesto (toque simples ou segurou)
    // e a mira (a padrao ou mexida)
    if (e.humano) {
      poki.measure('cortada', 'gesto', e.toque ? 'toque' : 'segurou');
      poki.measure('cortada', 'mira', e.auto ? 'auto' : 'manual');
      if (e.rapida) poki.measure('cortada', 'lenta', 'sem-querer');
      passoTutorial('cortada', 'complete');
    }
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
    if (!e.fim && !D.auto && P.humano[0]) barra = { de: tReal + 0.15, ate: tReal + 2.2 };
  },
  'match-point': () => {},
  'fim': (e) => {
    const venceu = e.humanoVenceu;
    perfil.partidas++;
    if (venceu) perfil.vitorias++;
    // Copa Gosma: a vitoria avanca a chave (a rodada inteira se revela); a derrota e revanche da
    // mesma fase. O titulo da Gotas (o 1o de cada Copa vale mais) e o locutor parabeniza.
    const daCopa = !D.rival && !D.auto;
    let titulo = false;
    let bonus = 0;
    if (venceu && daCopa) {
      perfil.copa = registrarVitoria(perfil.copa, e.placar);
      const ch = chaveDaCopa(perfil.copa);
      titulo = ch.campeao;
      if (titulo) {
        bonus = perfil.titulos[ch.n - 1] ? Math.round(GOTAS_TITULO * 0.4) : GOTAS_TITULO;
        perfil.titulos[ch.n - 1]++;
        poki.measure('copa', 'c' + ch.n, 'titulo');
      }
    }
    // progresso: XP, nivel e Gotas (o ?auto nao mexe no perfil)
    let progresso = null;
    if (!D.auto) {
      ultimoGanho = rendimento(P.resumo(0));
      ultimoGanho.gotas += bonus;
      progresso = ganhar(ultimoGanho, false);
    }
    // presente das primeiras vitorias: ja vestido no slime (src/jogo/perfil.js PRESENTES)
    let presente = '';
    if (venceu && !D.auto) {
      const r = darPresente(perfil, perfil.vitorias);
      if (r.chave) {
        Object.assign(perfil, r.perfil);
        presente = r.chave;
        aplicarVisual();
        poki.measure('presente', r.chave.split(':')[2], 'ganhou');
      }
    }
    gravarPerfil();
    mesa.falar(titulo ? 'vozParabensSlime' : venceu ? 'vozVenceuSlime' : 'vozPerdeuSlime', { forcar: true });
    poki.measure('level', 'm' + perfil.partidas, venceu ? 'complete' : 'fail');
    hud.faixa('');
    const ch = daCopa ? chaveDaCopa(perfil.copa) : null;
    let proxCopa = '';
    if (ch) proxCopa = titulo ? (ch.n < NUM_COPAS ? T('copa.liberada').replace('{n}', String(ch.n + 1)) : T('copa.campeao')) + ` · ${T('copa.titulo').replace('{g}', String(bonus))}` : textoProxima(ch);
    // o titulo deixa a festa do campeao correr (um toque abre o cartao na hora)
    if (titulo) cena.plateia.festa(-1, 1.5);
    // o presente que acabou de ganhar e o da proxima vitoria (com o rival da proxima partida)
    const pres = (chave) => { const [, encaixe, id] = chave.split(':'); return { tipo: 'acessorio', encaixe, id }; };
    let prox = ch && !ch.campeao && !D.auto ? presenteDaVitoria(perfil.vitorias + 1) : '';
    if (perfil.liberados.itens.includes(prox)) prox = '';
    const presenteCartao = presente || prox
      ? { novo: presente ? { pr: pres(presente) } : null, proximo: prox && ch ? { pr: pres(prox), rival: T('rival.' + ch.adversario) } : null }
      : null;
    const premiadoVisivel = !!progresso && poki.temAnuncios && !D.semAnuncio;
    // depois da 1a partida da vida o cartao avanca rapido (o maior vazamento do Player Fit Test)
    const auto = perfil.partidas === 1 && D.avanco > 0 ? Math.min(D.avanco, TEMPOS.avancoPrimeira) : D.avanco;
    const abrir = () => {
      if (cartaoPendente !== abrir) return;
      cartaoPendente = null;
      hud.cartao({
        titulo: titulo ? T('copa.campeao') : venceu ? T('ui.venceu') : T('ui.perdeu'), sub: `${e.placar[0]} · ${e.placar[1]}`, proxima: venceu, revanche: !venceu,
        progresso, premiado: premiadoVisivel, campeao: titulo, auto,
        chave: ch ? { ...dadosChave(ch), animar: venceu } : null, proxCopa, presente: presenteCartao,
      });
      // a exposicao de cada botao do cartao (o toque mede o interact: proximaPartida, irParaMenu...)
      poki.measure('cartao', venceu ? 'proxima' : 'revanche', 'visible');
      poki.measure('cartao', 'menu', 'visible');
      if (premiadoVisivel) poki.measure('rewarded', 'dobrar', 'visible');
      if (presenteCartao && presenteCartao.novo) poki.measure('cartao', 'vestiario', 'visible');
    };
    cartaoPendente = abrir;
    setTimeout(abrir, titulo ? 2600 : 400);
  },
  // power-ups (bolhas)
  'bolha-aviso': () => mesa.tocar('bolhaSobe', {}, { max: 1 }),
  'bolha-nasce': () => mesa.tocar('pingoGota', {}, { max: 1 }),
  'bolha-some': () => mesa.tocar('botaoPop', {}, { max: 1 }),
  'bolha-pega': (e) => { mesa.tocar('estouroSplash', {}, { max: 1 }); cena.coroa(e.x, e.y, '#ffffff', { r1: 1.8, n: 12, esc: 0.8 }); },
  'powerup': (e) => {
    const s = P.slimes[e.alvo];
    cena.vfx.texto(s.x, s.y + 4.2, T('pw.' + e.id), cores[e.i], 1);
    if (e.id === 'gosmao') { mesa.tocar('inflar', {}, { max: 1 }); cena.vfx.respingo(s.x, s.y + 2.4, cores[e.alvo], 10, 6); }
    if (e.humano && tReal - tVozPw > 20) { tVozPw = tReal; mesa.falar('vozPowerUpSlime'); }
    // efeito do rival vindo contra o jogador: "cuidado!"
    else if (e.alvo === 0 && e.i !== 0) mesa.falar('vozCuidadoSlime');
    if (e.alvo === 0 || e.i === 0) vibrar(e.alvo === 0 && e.i !== 0 ? [20, 30, 20] : 25);
    poki.measure('powerup', e.id, e.humano ? 'humano' : 'cpu');
  },
  'powerup-vale': (e) => {
    mesa.tocar(e.id === 'congelar' ? 'vidro' : e.id === 'cola' ? 'splat' : 'murcho', {}, { max: 1 });
    if (e.id === 'congelar') cena.vfx.respingo(e.x, e.y + 1.2, '#bfeaff', 8, 5);
  },
  'powerup-fim': (e) => { if (e.id === 'gosmao') mesa.tocar('murcho', {}, { max: 1 }); else if (e.id === 'encolher') mesa.tocar('inflar', {}, { max: 1 }); },
  'gelo-quebra': (e) => { mesa.tocar('gelatinaTreme', {}, { max: 1 }); cena.vfx.respingo(e.x, e.y + 1, '#dff6ff', 10, 6); },
  'piso-mola': (e) => { mesa.tocar('pulo', {}, { max: 2 }); mesa.tocar('tilim', {}, { max: 1 }); cena.coroa(e.x, 0.15, '#2fc7a0', { chao: true, r1: 2.2, n: 10, esc: 0.8 }); },
  'bola-poder': (e) => { mesa.tocar(e.id === 'fogo' ? 'missilZuum' : 'tum', {}, { max: 1 }); if (e.id === 'fogo') cena.diretor.tremer(0.25); },
  'fogo-recepcao': (e) => { mesa.tocar('estouroSplash', {}, { max: 1 }); cena.vfx.respingo(e.x, e.y, '#ff8a2a', 10, 7); cena.diretor.tremer(0.4); if (e.i === 0) vibrar([30, 30, 50]); },
  'reacao': (e) => {
    mesa.tocar('botaoPop', {}, { max: 2 });
    if (e.i === 0) { vibrar(10); poki.measure('reacao', e.id, 'humano'); }
  },
  // o juiz da rede levou a bolada (a bola nao desvia; so ele sofre)
  'juiz-bolada': (e) => {
    mesa.tocar('bonk', { forca: Math.min(1, e.v / 20) }, { max: 1 });
    cena.vfx.respingo(e.x, e.y, '#ffffff', 6, 4);
    poki.measure('juiz', e.reacao, 'bolada');
  },
  // falas em balao: o balbucio no tom de cada slime (o texto a cena desenha)
  'fala': (e) => mesa.balbuciar(vozDaFala(e.id), { nivel: tons[e.i] }),
  'tutorial-cortada': () => { tMao = 0; passoTutorial('cortada', 'start'); },
  'texto': () => {},
  'lenta': () => {},
  'cortada-cancela': () => {},
};

// ------------------------------------------------------------------ laco
let tReal = 0;
let tVozPw = -99;
/** barra de reacoes: aparece de `de` ate `ate` (jogo-real), depois do ponto ou pelo botao */
let barra = { de: 0, ate: 0 };

/** O jogador reage (barra, botao ou tecla): a qualquer hora, com a recarga da partida. */
function reagirJogador(id) {
  if (!P || !P.reagir(0, id)) return;
  barra = { de: 0, ate: 0 };
  hud.reacoes(null);
}
/** @type {string[]} */
let reacoesLiberadas = [];
/** o que a ultima partida rendeu (o premiado dobra) */
let ultimoGanho = null;
let labSegura = false;
let tFesta = 0;

function passo(dt) {
  if (!P) return;
  if (pausado || emAnuncio) return;
  tReal += dt;
  if (inicio) inicio.t += dt;
  // intencoes do jogador (uma vez por passo: as bordas acumulam no controle)
  const its = controles.ler(P.slimes);
  // roteiro da mira: a acao fica segurada (prints e laboratorio)
  if ((D.roteiro === 'cortada' || D.roteiro === 'mira') && !D.lab) its[0].botao = true;
  // laboratorio: a mira fica segurada ate o proximo toque (que solta)
  if (labSegura) {
    if (its[0].borda) { labSegura = false; its[0].borda = false; its[0].botao = false; } else its[0].botao = true;
    if (!P.cortada) labSegura = false;
  }
  // com o menu, o vestiario ou o cartao abertos o slime fica parado (o mouse nao o arrasta por tras)
  if (menu.aberto || vestiario.aberto || hud.cartaoAberto) P.intencao(0, { eixo: 0, botao: false, alvoX: null, miraX: null });
  else if (!D.auto) P.intencao(0, its[0]);
  P.passo();
  for (const e of P.eventos) {
    const f = TRATADORES[e.tipo];
    if (f) f(e);
  }
  P.eventos.length = 0;
  tFesta = P.estado === 'ponto' || P.estado === 'fim' ? P.festa.t : 0;
}

/** Power-ups ativos de um jogador para o HUD: "id:pontos" (sem pontos: espera o uso). */
function chipsDe(Jx) {
  const l = Object.entries(Jx.efeitos).map(([id, n]) => `${id}:${n}`);
  if (Jx.cortadaGratis) l.push('cortadaGratis:');
  if (Jx.bolaPoder) l.push(`${Jx.bolaPoder}:`);
  if (Jx.pendente) l.push(`${Jx.pendente.id}:`);
  return l;
}

/** Levantamento do saque humano: anel de tempo e o marcador de onde a bola vai cair. */
function saqueVis() {
  const ps = P.sacador === 0 ? P.previsaoSaque() : null;
  if (!ps) return null;
  return { k: ps.k, q: ps.q, alvo: ps.alvo, depois: ps.erro > 0 };
}

function desenhar(dtReal, alfa) {
  if (!P) return;
  const dt = pausado || emAnuncio ? 0 : dtReal;
  // comemoracao
  let festa = null;
  const campeao = finalDaCopa && P.festa.fim && P.resultado === -1;
  if (P.estado === 'ponto' || (P.estado === 'fim' && P.festa.t < (campeao ? 9 : 3))) {
    const f = P.festa;
    const iv = f.lado < 0 ? 0 : 1;
    const venceu = P.resultado === -1;
    festa = {
      t: f.t, tipo: f.tipo, lado: f.lado, x: f.x, cor: cores[iv], placar: P.placar, semente: (P.placar[0] * 31 + P.placar[1] * 7 + 3) >>> 0,
      texto: f.palavra ? T('grito.' + f.palavra) : '', cpu: !P.humano[iv], fim: f.fim,
      textoFim: f.fim ? T(campeao ? 'copa.campeao' : venceu ? 'grito.vitoria' : 'grito.derrota') : '', derrota: f.fim && !venceu, campeao,
    };
    if (f.fim) festa.cor = venceu ? cores[0] : '#7a7f95';
  }
  // saque: anel de tempo, marcador e pulso da espera
  const sq = P.estado === 'saque' ? saqueVis() : null;
  let pulso = 0;
  if (P.estado === 'saque' && P.sacador === 0 && P.saque.fase === 'pronto') pulso = P.saque.t >= TEMPOS.pulsoSaque ? 1 : 0;
  // marca de queda do saque para quem recebe
  let alvoSaque = null;
  if (P.estado === 'jogo' && P.rali.recepcaoSaque && P.rali.saqueDeQuem === 1) {
    const pr = P.previsao();
    if (pr && pr.x < 0) alvoSaque = pr.x;
  }
  const falas = [];
  for (const i of [0, 1]) {
    const f = P.jogadores[i].fala;
    if (f && !D.semHud) falas.push({ i, texto: T('fala.' + f.id), t: f.t, dur: FALA.dur });
  }
  const nomeBolha = P.bolha && !D.semHud ? T('pwn.' + P.bolha.id) : '';
  cena.desenhar(P, vista, alfa, dt, { cores, festa, inicio, saque: sq, pulsoSaque: pulso, alvoSaque, falas, nomeBolha, vitrine: vestiario.aberto ? vestiario.vitrine() : null });
  // HUD
  const L = cena.layout;
  if (L) hud.posicionar(L);
  hud.atualizar({ nomes, cores, placar: P.placar, medidor: [P.jogadores[0].med.v, P.jogadores[1].med.v], chips: P.jogadores.map(chipsDe), esconder: D.semHud || vestiario.aberto });
  // barra de reacoes: depois do ponto ou pelo botao, fora da recarga; o botao fica na partida toda
  const pronto = P.jogadores[0].recargaReacao <= 0;
  const naPartida = !D.semHud && !D.auto && P.humano[0] && !hud.cartaoAberto && !menu.aberto && !vestiario.aberto && P.estado !== 'fim';
  const comBarra = naPartida && pronto && tReal >= barra.de && tReal < barra.ate;
  hud.reacoes(comBarra ? reacoesLiberadas : null, !toque);
  hud.botaoReacao(naPartida, pronto);
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
  if (D.semHud || !P || !cena.layout || menu.aberto || vestiario.aberto) { hud.mao(null); return; }
  tMao += dt;
  const L = cena.layout;
  const W = window.innerWidth;
  let m = null;
  const pulo = controles.esquema === 'b' ? (L.botoes || []).find((b) => b.id === 'pulo') : null;
  const acao = pulo ? { x: pulo.x, y: pulo.y } : L.painel ? { x: W * 0.75, y: L.painel.y + L.painel.h * 0.45 } : { x: W * 0.78, y: window.innerHeight * 0.72 };
  if (!primeiraInteracao) m = { ...acao, texto: toque ? T('dica.toque') : T('dica.teclas'), gesto: 'toque' };
  else if (D.auto) m = null;
  else if (P.estado === 'saque' && P.sacador === 0 && P.saque.fase === 'pronto' && (P.saque.t >= TEMPOS.pulsoSaque || perfil.partidas < 2)) {
    // na 1a partida o saque e de um toque (a batida sai sozinha): "toque para sacar"
    const k = P.saqueSimples ? (toque ? 'dica.sacarSimples' : 'dica.sacarTeclaSimples') : toque ? 'dica.sacar' : 'dica.sacarTecla';
    m = { ...acao, texto: T(k), gesto: 'toque' };
  } else if (P.estado === 'saque' && P.sacador === 0 && P.saque.fase === 'levantada' && !P.saqueSimples && perfil.partidas < 3) m = { ...acao, texto: T('dica.bater'), gesto: 'toque' };
  else if (P.tutorialCortada === 'oferecida' && P.estado === 'jogo' && !P.cortada) m = { ...acao, texto: T('dica.cortada'), gesto: 'duplo' };
  else if (P.esperaToque && P.estado === 'saque' && P.sacador === 1) m = { ...acao, texto: T('dica.receber'), gesto: 'toque' };
  hud.mao(m);
}

// ------------------------------------------------------------------ comeco
novaPartida();
const laco = criarLaco({ passo, desenhar });
// personagens famosos (pacote local, fora do zip da Poki: o empacotar corta esta linha "// modelo")
if (D.local || D.modelo) import('./extra/famosos.js').then((m) => { m.instalar(); aplicarVisual(); vestiario.atualizar(); }).catch(() => {}); // modelo
// o menu abre a partir da 2a sessao (a 1a vai direto para a partida); ?menu e ?chave nos testes
if (D.menu || D.chave || D.vestiario || (perfil.partidas > 0 && !D.roteiro && !D.auto && !D.filme && !D.semHud && !D.lab)) {
  abrirMenu();
  if (D.chave) menu.abrirChave();
  if (D.vestiario) { menu.fechar(); vestiario.abrir(D.vestiario); }
}

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

// laboratorio da cortada (?lab)
if (D.lab) {
  import('./ui/lab.js').then(({ criarLab }) => {
    let gat = D.gatilho || 'novo';
    criarLab(raiz, {
      repetir: () => { partidaN = 1; novaPartida(); primeiraInteracao = true; jogando = true; P.roteiro('cortada'); labSegura = true; },
      gatilho: () => gat,
      definirGatilho: (g) => { gat = g; D.gatilho = g; },
    });
  });
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
    get medidas() { return laco.medidas; },
    passo,
    desenhar,
    interagir: () => interagir(null),
    encher: (v = 300) => P.encher(0, v),
    gratis: () => P.darCortadaGratis(0),
    CUSTO,
  };
}
