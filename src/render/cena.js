// Cena do Volei de Gosma: quatro canvases empilhados
//   cFundo (2D): fundo distante do ginasio, arquibancada e plateia, piso, placas e rede;
//   cSlime (WebGL2): os dois slimes pela gosma (um campo P2G por slime, janela movel);
//   cTopo  (2D): rostos, bola, rastro, mira (feixe reto e reticula), coroas, vfx;
//   cTela  (2D, por cima do HUD): palavra, placar gigante, VAI! (so quando ha efeito).
// A camera vem do diretor (close, tremor, seguir a bola) sobre o layout (src/render/layout.js).

import { criarCampo } from './campo.js';
import { criarComposicao } from './composicao.js';
import { desenharSlimes2D } from './slime2d.js';
import { desenharRostos } from './rostos.js';
import { criarVfx } from './vfx.js';
import { criarDiretor } from './diretor.js';
import { criarPlateia } from './plateia.js';
import { calcularLayout } from './layout.js';
import { ESTILOS, desenharPiso, desenharTopo } from './quadra.js';
import { desenharFundo, desenharArquibancada, desenharBiruta } from './ginasios/praia.js';
import { cameraFesta, desenharFesta, desenharInicio, focoCampeao, QUADRO_CAMPEAO } from './celebracao.js';
import { paraMundo, paraTela, aplicar, enquadrar } from './camera.js';
import { CORTADA } from '../jogo/cortada.js';
import { alfaCanal } from '../jogo/tempo.js';
import { desenharCadeira, desenharJuiz } from './juiz.js';
import { BOLHA } from '../jogo/powerups.js';
import { REACAO } from '../jogo/reacoes.js';
import { desenharFala } from './carinhas.js';
import { desenharAcessorios } from './acessorios.js';
import { desenharNomeBolha } from './icones.js';

/**
 * Raio do nucleo do campo (no passo normal da pele e raio 2; cada slime escala pelo escNucleo) e
 * limiar da superficie. 0,55 com o contorno da pele recuado 0,22 (src/jogo/pele.js) deixa o miolo
 * cheio e o isocontorno em cima da cupula fisica (test/pele.test.js).
 */
export const RAIO_CAMPO = 0.55;
export const LIMIAR = 0.85;

/** Qualidades (so o render muda). */
export const QUALIDADES = Object.freeze([
  { nome: 'alta', dpr: 2, celula: 0.085, brilho: 1 },
  { nome: 'media', dpr: 1.5, celula: 0.11, brilho: 1 },
  { nome: 'baixa', dpr: 1, celula: 0.14, brilho: 0 },
  { nome: 'minima', dpr: 1, slime: 0.75, celula: 0.17, brilho: 0 },
]);

/** Janela local de cada campo (u, relativa ao centro da base do slime). */
const JANELA_CAMPO = [-3.4, -0.7, 3.4, 4.0];

/**
 * @param {{ fundo: HTMLCanvasElement, slime: HTMLCanvasElement, topo: HTMLCanvasElement, tela: HTMLCanvasElement }} el
 * @param {{ forcar2d?: boolean, visual?: 'a'|'b'|'c', reduzir?: boolean }} [o]
 */
export function criarCena(el, o = {}) {
  const ctxFundo = /** @type {CanvasRenderingContext2D} */ (el.fundo.getContext('2d'));
  const ctxTopo = /** @type {CanvasRenderingContext2D} */ (el.topo.getContext('2d'));
  const ctxTela = /** @type {CanvasRenderingContext2D} */ (el.tela.getContext('2d'));
  let comp = o.forcar2d ? null : criarComposicao(el.slime);
  const ctxSlime2d = comp ? null : el.slime.getContext('2d');
  const vfx = criarVfx();
  const diretor = criarDiretor();
  const plateia = criarPlateia();
  let est = ESTILOS[o.visual || 'a'] || ESTILOS.a;
  let qual = 1;
  let W = 0;
  let H = 0;
  let dpr = 1;
  let dprSlime = 1;
  /** @type {import('./layout.js').Layout|null} */
  let L = null;
  /** @type {import('./camera.js').Camera|null} */
  let camBase = null;
  /** @type {import('./camera.js').Camera|null} */
  let camQuadro = null;
  let campos = [null, null];
  let camposChave = '';
  let telaSuja = true;
  let arte = null;
  let seguro = { t: 0, r: 0, b: 0, l: 0 };
  let toque = false;
  let esquema = 'a';
  /** efeitos da quadra (eventos da partida) */
  const ef = { rastro: [], coroas: [], contagem: null, inicio: -9, tRastro: 0, semente: 1 };

  function medir() {
    W = Math.max(1, window.innerWidth | 0);
    H = Math.max(1, window.innerHeight | 0);
    const q = QUALIDADES[qual];
    dpr = Math.min(q.dpr, window.devicePixelRatio || 1);
    dprSlime = Math.min(q.slime || q.dpr, dpr);
    for (const c of [el.fundo, el.slime, el.topo]) {
      const d = c === el.slime ? dprSlime : dpr;
      const w = Math.max(1, Math.round(W * d));
      const h = Math.max(1, Math.round(H * d));
      if (c.width !== w) c.width = w;
      if (c.height !== h) c.height = h;
    }
    const dT = Math.min(1.5, dpr);
    const w = Math.max(1, Math.round(W * dT));
    const h = Math.max(1, Math.round(H * dT));
    if (el.tela.width !== w) { el.tela.width = w; telaSuja = true; }
    if (el.tela.height !== h) { el.tela.height = h; telaSuja = true; }
    L = calcularLayout({ W, H, seguro, toque, esquema, tablet: Math.min(W, H) >= 700 && toque });
  }

  function garantirCampos() {
    const q = QUALIDADES[qual];
    const chave = String(q.celula);
    if (chave === camposChave && campos[0]) return campos;
    camposChave = chave;
    campos = [0, 1].map(() => criarCampo({ janela: JANELA_CAMPO, celula: q.celula, raio: RAIO_CAMPO }));
    return campos;
  }

  /**
   * Campo deslocado: o mundo anda (dx, dy) antes de acumular (porte do campo-movel do prototipo).
   */
  function campoMovel(c, m, i, dx, dy) {
    const n = m.n;
    const a0 = m.iniSl[i];
    const a1 = m.iniSl[i + 1];
    const xs = c.__xs || (c.__xs = new Float64Array(n));
    const ys = c.__ys || (c.__ys = new Float64Array(n));
    for (let k = a0; k < a1; k++) { xs[k] = m.x[k] - dx; ys[k] = m.y[k] - dy; }
    const s = m.slimes[i];
    const sombra = c.__s || (c.__s = { dados: null });
    Object.assign(sombra, { ativo: true, idx: i, dados: s.dados, esq: s.esq - dx, dir: s.dir - dx, base: s.base - dy, topo: s.topo - dy, cx: s.cx - dx, cy: s.cy - dy, a11: s.a11, a12: s.a12, a21: s.a21, a22: s.a22, raio0: s.raio0, escNucleo: s.escNucleo });
    const prox = c.__p || (c.__p = { x: xs, y: ys, pig: m.pig, membros: m.membros, iniSl: m.iniSl, slimes: [] });
    prox.slimes = i === 0 ? [sombra, { ativo: false, idx: 1 }] : [{ ativo: false, idx: 0 }, sombra];
    c.acumular(prox);
    const j = c.janela;
    return { nx: c.nx, ny: c.ny, t0: c.t0, t1: c.t1, t2: c.t2, celula: c.celula, raio: c.raio, janela: [j[0] + dx, j[1] + dy, j[2] + dx, j[3] + dy], comAparencia: c.comAparencia };
  }

  /**
   * Desenha o quadro.
   * @param {ReturnType<typeof import('../jogo/partida.js').criarPartida>} P
   * @param {ReturnType<typeof import('./vista.js').criarVista>} vista
   * @param {number} alfa fracao do passo real
   * @param {number} dtR s de jogo-real desde o ultimo quadro
   * @param {{ textos: (k: string) => string, cores: string[], festa?: any, inicio?: { t: number, txt: string }|null, pulsoSaque?: number, saque?: { k: number, q: string, alvo: number, depois: boolean }|null, alvoSaque?: number|null, mao?: any, feixe?: boolean }} o2
   *   feixe: false esconde o feixe da mira (a thumb desenha as setas dela; a reticula fica)
   *   falas: [{ i, texto, t, dur }] baloes de fala ja traduzidos
   *   vitrine: { x, y, w, h } (px CSS): o vestiario enquadra so o slime do jogador nesse retangulo
   *   nomeBolha: o nome traduzido do power-up da bolha em quadra ('' esconde)
   */
  function desenhar(P, vista, alfa, dtR, o2) {
    medir();
    if (!L) return;
    const m = vista.atualizar(alfa);
    const b = vista.bola;
    const t = P.tempo.tJogo;
    // efeitos de camera
    let zoom = 1;
    let foco = null;
    const F = o2.festa;
    if (F) {
      const c = cameraFesta(F, L.orient === 'retrato');
      zoom = c.zoom;
      foco = c.foco;
    }
    const C = P.cortada;
    if (C && (C.fase === 'entrando' || C.fase === 'mirando')) {
      const k = C.fase === 'entrando' ? Math.min(1, C.t / CORTADA.entrada) : 1;
      zoom = Math.max(zoom, 1 + (CORTADA.pushIn - 1) * k);
      foco = foco || [C.bx, C.by];
    }
    let { base, cam } = diretor.quadro(L, b, dtR, { zoom, foco, reduzir: o.reduzir });
    // campeao da Copa: a camera fecha no slime do jogador (o letreiro e a taca na celebracao.js)
    const kc = F && F.campeao ? focoCampeao(F.t) : 0;
    if (kc > 0) {
      const sx = vista.slimes[0].x;
      const Q = QUADRO_CAMPEAO;
      const alvo = enquadrar([sx - Q.esq, Q.baixo, sx + Q.dir, Q.cima], { x: 0, y: 0, w: W, h: H });
      cam = { s: cam.s + (alvo.s - cam.s) * kc, cx: cam.cx + (alvo.cx - cam.cx) * kc, cy: cam.cy + (alvo.cy - cam.cy) * kc, sx: cam.sx + (alvo.sx - cam.sx) * kc, sy: cam.sy + (alvo.sy - cam.sy) * kc };
    }
    // vitrine do vestiario: o slime do jogador grande no retangulo dela (o rival, a bola e as
    // festas saem); o pincel converte o ponteiro por esta camera (paraMundo)
    const vit = o2.vitrine || null;
    if (vit && vit.w > 10 && vit.h > 10) {
      const sx = vista.slimes[0].x;
      cam = enquadrar([sx - 3.3, -0.8, sx + 3.3, 4.5], vit);
      base = cam;
    }
    camBase = base;
    camQuadro = cam;
    // efeitos de mundo
    passoEfeitos(P, vista, dtR);
    plateia.passo(dtR * (C && C.fase === 'mirando' ? CORTADA.escalaMundo / 1000 : 1));
    // ---------------- fundo
    ctxFundo.setTransform(1, 0, 0, 1, 0, 0);
    desenharFundo(ctxFundo, cam, dpr, W, H, t, est, { arte });
    desenharArquibancada(ctxFundo, cam, dpr, W, t, est);
    plateia.desenhar(ctxFundo, cam, dpr, W, est, { fileiras: 3, lotacao: 0.55, alt: 0.9 });
    desenharPiso(ctxFundo, cam, dpr, W, H, t, est, {
      sombras: vista.slimes.map((s) => ({ x: s.x, y: s.y, a: s.a })),
      bola: vit ? null : P.estado !== 'ponto' || (F && F.t < 0.6) ? b : null,
      alvoSaque: o2.alvoSaque,
      atrasDaRede: P.juiz ? desenharCadeira : undefined,
    });
    if (L.plateia && !vit) plateia.desenharFaixa(ctxFundo, dpr, L.plateia, est, 0.8);
    aplicar(ctxFundo, cam, dpr);
    desenharBiruta(ctxFundo, -11.6, 3.2, 0, t, Math.max(0.03, est.traco / cam.s));
    // o juiz em cima da cadeirinha (atras dos slimes e da bola: em profundidade)
    if (P.juiz) desenharJuiz(ctxFundo, P.juiz, alfaCanal(P.tempo, 'mundo', alfa), t, Math.max(0.03, est.traco / cam.s));
    // ---------------- slimes
    const q = QUALIDADES[qual];
    if (comp && !comp.perdeu()) {
      const cs = garantirCampos();
      let primeiro = true;
      for (const i of [0, 1]) {
        if (vit && i === 1) continue;
        const s = vista.slimes[i];
        const cm = campoMovel(cs[i], m, i, s.x, s.y);
        comp.desenhar(cm, cam, dprSlime, { tempo: t, brilho: q.brilho * est.brilhoSlime, limiar: LIMIAR, traco: Math.max(1.4, Math.min(2.6, cam.s * 0.05)) * (est.traco / 1.9), limpar: primeiro });
        primeiro = false;
      }
    } else if (ctxSlime2d) {
      ctxSlime2d.setTransform(1, 0, 0, 1, 0, 0);
      ctxSlime2d.clearRect(0, 0, el.slime.width, el.slime.height);
      desenharSlimes2D(ctxSlime2d, vista, m, cam, dprSlime, est.traco);
    }
    // ---------------- topo
    ctxTopo.setTransform(1, 0, 0, 1, 0, 0);
    ctxTopo.clearRect(0, 0, el.topo.width, el.topo.height);
    const rival = m.slimes[1];
    const rivalAtivo = rival.ativo;
    if (vit) rival.ativo = false;
    desenharRostos(ctxTopo, m, cam, dpr, t, { olhar: vit ? null : [b.x, b.y], estilo: 'classico' });
    desenharAcessorios(ctxTopo, m, cam, dpr, t);
    rival.ativo = rivalAtivo;
    if (vit) { telaSuja = true; limparTela(); return; }
    const mira = C && (C.fase === 'entrando' || C.fase === 'mirando') ? { c: C, cor: o2.cores[C.i], final: C.fase === 'mirando' && C.tMax - C.t < 0.3, feixe: o2.feixe } : null;
    const bolaAlfa = P.estado === 'ponto' && F ? (F.t < 0.5 ? 1 : F.t < 0.8 ? 1 - (F.t - 0.5) / 0.3 : 0) : 1;
    // power-ups: gelo e avisos sobre cada slime
    const gelos = [];
    const avisos = [];
    const baloes = [];
    for (const i of [0, 1]) {
      const Jx = P.jogadores[i];
      const s = vista.slimes[i];
      if (Jx.gelo) gelos.push({ x: s.x, y: s.y, a: s.a, b: s.b, fase: Jx.gelo.fase, t: Jx.gelo.t });
      if (Jx.pendente) avisos.push({ x: s.x, y: s.y + s.b + 1.3, id: Jx.pendente.id });
      // balao legivel em qualquer tela (raio minimo: 32 px no retrato, 40 em paisagem); no rali
      // um pouco menor, para nao tapar a bola
      if (Jx.reacao) baloes.push({ id: Jx.reacao.id, x: s.x, y: s.y + s.b, t: Jx.reacao.t, dur: REACAO.dur, rMin: (L.orient === 'retrato' ? 32 : 40) / cam.s, escala: P.estado === 'jogo' ? 0.75 : 1 });
    }
    desenharTopo(ctxTopo, cam, dpr, t, est, {
      bola: b, rastro: ef.rastro, coroas: ef.coroas, mira, contagem: ef.contagem,
      saque: o2.saque || null, pulsoSaque: o2.pulsoSaque || 0, bolaAlfa,
      bolha: P.bolha, vidaBolha: BOLHA.vida, gelos, avisos, baloes, bolaFogo: P.bola.estado === 'fogo' && P.estado === 'jogo',
    });
    vfx.desenhar(ctxTopo, cam, dpr);
    // falas dos slimes: balao de texto em px da tela, acima do slime, fugindo da bola
    if (o2.falas && o2.falas.length) {
      ctxTopo.setTransform(dpr, 0, 0, dpr, 0, 0);
      const [bx, by] = paraTela(cam, b.x, b.y);
      const px = Math.round(Math.max(13, Math.min(22, cam.s * 0.5)));
      for (const f of o2.falas) {
        const s = vista.slimes[f.i];
        const [ax, ay] = paraTela(cam, s.x, s.y + s.b + 0.25);
        desenharFala(ctxTopo, { texto: f.texto, t: f.t, dur: f.dur, ax, ay, bx, by, px, W });
      }
    }
    // o nome do power-up embaixo da bolha
    if (o2.nomeBolha && P.bolha) desenharNomeBolha(ctxTopo, P.bolha, t, BOLHA.vida, o2.nomeBolha, cam, dpr, W);
    // ---------------- tela (por cima do HUD)
    const dT = Math.min(1.5, dpr);
    const ativo = !!F || !!(o2.inicio && o2.inicio.t < 1.4);
    if (ativo || telaSuja) {
      ctxTela.setTransform(1, 0, 0, 1, 0, 0);
      ctxTela.clearRect(0, 0, el.tela.width, el.tela.height);
      telaSuja = ativo;
    }
    if (F) {
      const s0 = vista.slimes[0];
      // a taca paira na altura da cabeca dele em pe (ele pula embaixo dela)
      const campeao = F.campeao ? { foco: paraTela(cam, s0.x, s0.y + s0.b * 0.5), cabeca: paraTela(cam, s0.x, s0.b + 0.1) } : {};
      desenharFesta(ctxTela, cam, dT, W, H, F, { quadra: L.quadra, qualidade: q.nome, retrato: L.orient === 'retrato', ...campeao });
    }
    if (o2.inicio && o2.inicio.t < 1.4) desenharInicio(ctxTela, dT, o2.inicio.t, { quadra: L.quadra }, o2.inicio.txt, P.placar, o2.cores[0]);
  }

  /** Limpa o canvas de cima do HUD (a vitrine nao tem festa). */
  function limparTela() {
    ctxTela.setTransform(1, 0, 0, 1, 0, 0);
    ctxTela.clearRect(0, 0, el.tela.width, el.tela.height);
  }

  /** Rastro, coroas e contagem (jogo-real). */
  function passoEfeitos(P, vista, dt) {
    for (const r of ef.rastro) r.idade += dt;
    ef.rastro = ef.rastro.filter((r) => r.idade < r.vida);
    for (const c of ef.coroas) c.idade += dt;
    ef.coroas = ef.coroas.filter((c) => c.idade < c.dur);
    if (ef.contagem) ef.contagem.vida -= dt;
    vfx.passo(dt);
    const b = P.bola;
    const v = Math.hypot(b.vx, b.vy);
    ef.tRastro += dt;
    if (b.solta && P.estado === 'jogo') {
      if (b.estado === 'cortada' && ef.tRastro >= CORTADA.rastro.cada) {
        ef.tRastro = 0;
        ef.rastro.push({ x: vista.bola.x, y: vista.bola.y, vx: -b.vx, vy: -b.vy, idade: 0, vida: CORTADA.rastro.vida, gota: true, cor: ef.corCortada || '#ff8a2a' });
        if (ef.rastro.length > CORTADA.rastro.max * 2) ef.rastro.shift();
      } else if (b.estado === 'fogo' && ef.tRastro >= 0.03) {
        // Bola de Fogo: gotas de chama alternando laranja e amarelo
        ef.tRastro = 0;
        ef.semente++;
        ef.rastro.push({ x: vista.bola.x, y: vista.bola.y, vx: -b.vx, vy: -b.vy, idade: 0, vida: 0.26, gota: true, cor: ef.semente % 2 ? '#ff6a1a' : '#ffd23a' });
        if (ef.rastro.length > 24) ef.rastro.shift();
      } else if (v > 15 && ef.tRastro >= 0.035) {
        ef.tRastro = 0;
        ef.rastro.push({ x: vista.bola.x, y: vista.bola.y, vx: 0, vy: 0, idade: 0, vida: 0.18, gota: false });
      }
    }
  }

  return {
    desenhar,
    vfx,
    plateia,
    diretor,
    /** Coroa de respingo (cortada, ponto). */
    coroa(x, y, cor, o3 = {}) {
      ef.coroas.push({ x, y, cor, idade: 0, dur: o3.dur || CORTADA.coroa.dur, r0: o3.r0 ?? CORTADA.coroa.r0, r1: o3.r1 ?? CORTADA.coroa.r1, n: o3.n || 12, esc: o3.esc || 1, chao: !!o3.chao, giro: (ef.semente++ * 0.37) % 6.28, seed: ef.semente, miolo: o3.miolo });
    },
    contagem(x, y, n) { ef.contagem = { x, y, n, vida: 0.9 }; },
    set corCortada(c) { ef.corCortada = c; },
    /** @param {'a'|'b'|'c'} v */
    definirVisual(v) { est = ESTILOS[v] || ESTILOS.a; },
    get visual() { return est.id; },
    definirArte(img) { arte = img; },
    definirSeguro(sg) { seguro = sg; },
    definirToque(v, esq) { toque = v; if (esq) esquema = esq; },
    definirQualidade(k) { qual = Math.max(0, Math.min(QUALIDADES.length - 1, k)); camposChave = ''; },
    get nivelQualidade() { return qual; },
    get qualidade() { return QUALIDADES[qual].nome; },
    get layout() { return L; },
    get camera() { return camQuadro; },
    get cameraBase() { return camBase; },
    get usaGl() { return !!comp; },
    /** aparencias dos slimes (src/render/composicao.js; sem WebGL2 nao faz nada) */
    definirAparencias(lista) { if (comp) comp.definirAparencias(lista); },
    /** estampa RGBA 128 x 64 do slot (0 o jogador) ou null */
    definirEstampa(slot, img) { if (comp) comp.definirEstampa(slot, img); },
    /** tela -> mundo pela camera do ultimo quadro (o que o jogador ve: o cursor cai onde o slime esta) */
    paraMundo(px, py) { const c = camQuadro || camBase; return c ? paraMundo(c, px, py) : null; },
    paraTela(x, y) { return camQuadro ? paraTela(camQuadro, x, y) : null; },
    medir,
  };
}
