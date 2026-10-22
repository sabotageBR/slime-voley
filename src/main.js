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
import { rival as acharRival } from './jogo/rivais.js';
import { skin as acharSkin } from './jogo/skins.js';
import { CUSTO } from './jogo/medidor.js';
import { REACOES } from './jogo/reacoes.js';
import { vozDaFala, FALA } from './jogo/falas.js';
import { chaveDaCopa, registrarVitoria, proximaCopa, trocarPais, normalizarCopa, GOTAS_TITULO, NUM_COPAS } from './jogo/torneio.js';
import { paisDoIdioma } from './jogo/paises.js';
import { normalizarPerfil, rendimento, aplicarGanho, proximosMarcos } from './jogo/perfil.js';
import { TEMPOS } from './jogo/regras.js';
import { criarVista } from './render/vista.js';
import { criarCena } from './render/cena.js';
import { tonalidade } from './render/celebracao.js';
import { desenharIconeTela, desenharPremioTela } from './render/icones.js';
import { desenharCarinhaTela } from './render/carinhas.js';
import { criarControles } from './ui/controles.js';
import { criarHud } from './ui/hud.js';
import { criarMenu } from './ui/menu.js';
import { criarMesa } from './som/mesa.js';
import { escolherIdioma, textos } from './i18n/textos.js';

const D = lerDepuracao();
const $ = (id) => /** @type {HTMLElement} */ (document.getElementById(id));
const save = criarArmazem();
/** perfil salvo: partidas, opcoes, nivel e XP, Gotas, skin e o que a trilha liberou (src/jogo/perfil.js) */
const perfil = normalizarPerfil(save.ler('perfil', {}));
// ?copa=N&fase=F (testes): a Copa na fase pedida
if (D.copa) perfil.copa = normalizarCopa({ n: D.copa, semente: D.semente || 1, fase: D.fase, pais: perfil.pais });
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
  ativo: () => !pausado && !emAnuncio && !hud.cartaoAberto && !menu.aberto,
  toque,
});
controles.definirEsquema(esquema);
const hud = criarHud(raiz, T, {
  aoPausar: () => pausar(true),
  aoContinuar: () => continuar(),
  aoProxima: () => proximaPartida(false),
  aoRevanche: () => proximaPartida(true),
  aoOpcao: (id) => { trocarOpcao(id); hud.menu(true, { controle: controles.esquema, som: perfil.som }); },
  som: (id) => mesa.tocar(id),
  icone: desenharIconeTela,
  carinha: desenharCarinhaTela,
  aoReagir: (id) => reagirJogador(id),
  aoReagirTecla: (k) => { if (reacoesLiberadas[k]) reagirJogador(reacoesLiberadas[k]); },
  aoBotaoReacao: () => { barra = tReal < barra.ate && tReal >= barra.de ? { de: 0, ate: 0 } : { de: tReal, ate: tReal + 2.5 }; },
  premio: (ctx, pr, lado) => desenharPremioTela(ctx, pr, lado, pr.tipo === 'skin' ? acharSkin(pr.id).hex : undefined),
  aoPremiado: () => premiado(),
  aoMenu: () => irParaMenu(),
  caixaExtra: () => menu.caixa,
  aoEscExtra: () => menu.voltar(),
});
const menu = criarMenu(raiz, T, {
  aoJogar: () => jogarDoMenu(),
  aoOpcao: (id) => { trocarOpcao(id); menu.atualizar({ controle: controles.esquema, som: perfil.som }); },
  som: (id) => mesa.tocar(id),
});
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
  const corJogador = acharSkin(perfil.skin || 'laranjinha').hex;
  const vagas = ch.vagas.map((v) => (v.jogador ? { nome: T('ui.voce'), pais: v.pais, cor: corJogador } : { nome: T('rival.' + v.id), pais: v.pais, cor: hexDaMistura(acharRival(v.id).pig) }));
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

/** Menu pelo cartao de fim (a proxima partida fica pronta, esperando o JOGAR) ou pela pausa. */
function irParaMenu() {
  if (hud.cartaoAberto) {
    hud.cartao(null);
    partidaN++;
    intervaloPendente = true;
    avancarCopaSeCampeao();
    novaPartida();
  } else if (pausado) {
    hud.menu(false);
    menuDaPausa = true;
  }
  abrirMenu();
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
/** nivel do tom do balbucio de cada slime (src/som/falas.js tomDoNivel) */
let tons = [3, 4];
let nomes = ['', ''];
let inicio = null;
let tMao = 0;
let partidaN = perfil.partidas;
let premiadoNaPausa = false;

function novaPartida(revanche = false) {
  // a 1a partida da vida e as quartas da Copa 1, contra a Gota (imperdivel)
  const adversario = chaveDaCopa(perfil.copa).adversario || 'gota';
  const primeira = D.primeira ?? (perfil.partidas === 0 && adversario === 'gota');
  const idRival = D.rival || adversario;
  const riv = acharRival(idRival);
  const sk = acharSkin(D.skin || perfil.skin || 'laranjinha');
  reacoesLiberadas = REACOES.map((r) => r.id).filter((id) => perfil.liberados.reacoes.includes(id));
  P = criarPartida({
    semente: D.semente || ((Date.now() / 1000) | 0) + partidaN * 7919,
    modo: D.auto ? 'demo' : 'cpu',
    rival: riv.id,
    primeira,
    partidaN: partidaN + 1,
    gatilho: /** @type {any} */ (D.gatilho || 'novo'),
    assist: { ima: D.assist, devolucao: D.assist },
    fora: D.fora,
    powerups: [...perfil.liberados.powerups],
    lenta: { ...(D.lenta ? { escalaMundo: Math.round(D.lenta * 1000) } : {}), ...(D.defensor ? { escalaDefensor: Math.round(D.defensor * 1000) } : {}) },
    qualidadeMinima: cena.nivelQualidade >= 3,
  });
  vista = criarVista(P);
  cores = [sk.hex, hexDaMistura(riv.pig)];
  vista.vestir(0, sk.pig, cores[0]);
  vista.vestir(1, riv.pig, cores[1]);
  nomes = [T('ui.voce'), T('rival.' + riv.id)];
  // tom do balbucio: o jogador agudo; o rival pelo nivel (os chefes falam grosso)
  tons = [3, riv.chefe ? 11 : 2 + Math.max(0, ['T0', 'T1', 'T1+', 'T2', 'T3', 'T4', 'T5'].indexOf(riv.nivel))];
  inicio = null;
  tMao = 0;
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
  if (!P || menu.aberto) return;
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
    if (hud.cartaoAberto || menu.aberto) return;
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
  premiadoNaPausa = true;
  emAnuncio = true;
  controles.soltarTudo();
  const ok = await poki.rewardedBreak();
  emAnuncio = false;
  poki.measure('rewarded', 'dobrar', ok ? 'premio' : 'sem-premio');
  if (!ok) { hud.cartaoPremiado(null); return; }
  const p = ganhar(ultimoGanho, true);
  ultimoGanho = null;
  gravarPerfil();
  hud.cartaoPremiado(p);
}

async function proximaPartida(revanche) {
  hud.cartao(null);
  partidaN++;
  await intervalo();
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
    if (e.i === 0) vibrar(18);
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
      poki.measure('saque', e.tipoSaque, 'humano');
    }
  },
  'saque-levanta': () => mesa.tocar('pulo', {}, { max: 1 }),
  'saque-pega': () => mesa.tocar('toque', { forca: 0.3 }, { max: 1 }),
  'saque-valendo': () => { tMao = 0; },
  'saque-liberado': () => {},
  // rali longo: a plateia anima e o locutor conta as travessias pares (4, 6, 8, 10)
  'cruzou': (e) => { if (e.n >= 4 && e.n % 2 === 0) { cena.plateia.animar(0.15); if (e.n <= 10) mesa.falar('vozCombo' + e.n + 'Slime'); } },
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
    gravarPerfil();
    mesa.falar(titulo ? 'vozParabensSlime' : venceu ? 'vozVenceuSlime' : 'vozPerdeuSlime', { forcar: true });
    poki.measure('level', 'm' + perfil.partidas, venceu ? 'complete' : 'fail');
    hud.faixa('');
    const ch = daCopa ? chaveDaCopa(perfil.copa) : null;
    let proxCopa = '';
    if (ch) proxCopa = titulo ? (ch.n < NUM_COPAS ? T('copa.liberada').replace('{n}', String(ch.n + 1)) : T('copa.campeao')) + ` · ${T('copa.titulo').replace('{g}', String(bonus))}` : textoProxima(ch);
    setTimeout(() => {
      hud.cartao({
        titulo: titulo ? T('copa.campeao') : venceu ? T('ui.venceu') : T('ui.perdeu'), sub: `${e.placar[0]} · ${e.placar[1]}`, proxima: venceu, revanche: !venceu,
        progresso, premiado: !!progresso && poki.temAnuncios && !D.semAnuncio,
        chave: ch ? { ...dadosChave(ch), animar: venceu } : null, proxCopa,
      });
    }, 400);
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
  'tutorial-cortada': () => { tMao = 0; },
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
  if (!D.auto) P.intencao(0, its[0]);
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
  cena.desenhar(P, vista, alfa, dt, { cores, festa, inicio, saque: sq, pulsoSaque: pulso, alvoSaque, falas });
  // HUD
  const L = cena.layout;
  if (L) hud.posicionar(L);
  hud.atualizar({ nomes, cores, placar: P.placar, medidor: [P.jogadores[0].med.v, P.jogadores[1].med.v], chips: P.jogadores.map(chipsDe), esconder: D.semHud });
  // barra de reacoes: depois do ponto ou pelo botao, fora da recarga; o botao fica na partida toda
  const pronto = P.jogadores[0].recargaReacao <= 0;
  const naPartida = !D.semHud && !D.auto && P.humano[0] && !hud.cartaoAberto && !menu.aberto && P.estado !== 'fim';
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
  if (D.semHud || !P || !cena.layout || menu.aberto) { hud.mao(null); return; }
  tMao += dt;
  const L = cena.layout;
  const W = window.innerWidth;
  let m = null;
  const pulo = controles.esquema === 'b' ? (L.botoes || []).find((b) => b.id === 'pulo') : null;
  const acao = pulo ? { x: pulo.x, y: pulo.y } : L.painel ? { x: W * 0.75, y: L.painel.y + L.painel.h * 0.45 } : { x: W * 0.78, y: window.innerHeight * 0.72 };
  if (!primeiraInteracao) m = { ...acao, texto: toque ? T('dica.toque') : T('dica.teclas'), gesto: 'toque' };
  else if (D.auto) m = null;
  else if (P.estado === 'saque' && P.sacador === 0 && P.saque.fase === 'pronto' && (P.saque.t >= TEMPOS.pulsoSaque || perfil.partidas < 2)) m = { ...acao, texto: toque ? T('dica.sacar') : T('dica.sacarTecla'), gesto: 'toque' };
  else if (P.estado === 'saque' && P.sacador === 0 && P.saque.fase === 'levantada' && perfil.partidas < 3) m = { ...acao, texto: T('dica.bater'), gesto: 'toque' };
  else if (P.tutorialCortada === 'oferecida' && P.estado === 'jogo' && !P.cortada) m = { ...acao, texto: T('dica.cortada'), gesto: 'duplo' };
  else if (P.esperaToque && P.estado === 'saque' && P.sacador === 1) m = { ...acao, texto: T('dica.receber'), gesto: 'toque' };
  hud.mao(m);
}

// ------------------------------------------------------------------ comeco
novaPartida();
const laco = criarLaco({ passo, desenhar });
// o menu abre a partir da 2a sessao (a 1a vai direto para a partida); ?menu e ?chave nos testes
if (D.menu || D.chave || (perfil.partidas > 0 && !D.roteiro && !D.auto && !D.filme && !D.semHud && !D.lab)) {
  abrirMenu();
  if (D.chave) menu.abrirChave();
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
