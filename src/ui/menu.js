// Menu principal e tela da chave (DOM, pedido de 2026-10-22). O menu abre a partir da 2a sessao (a
// 1a vai direto para a partida, onboarding do desenho §3.9), pelo cartao de fim e pela pausa:
// JOGAR (o foco inicial; mostra a fase e o proximo rival da Copa Gosma), CHAVE, VESTIARIO
// (src/ui/vestiario.js) e as opcoes de controle e som. A chave e desenhada em canvas (src/render/chave.js). Teclado: o hud.js navega
// por estas caixas tambem (fase de bolha, sem stopPropagation).

import { desenharChave } from '../render/chave.js';
import { desenharBandeirinha } from '../render/bandeiras.js';

/**
 * @typedef {{ copa: string, fase: string, proxima: string, pais: string, controle: string, som: boolean, chave: import('../render/chave.js').DadosChave }} InfoMenu
 */

/**
 * @param {HTMLElement} raiz
 * @param {(k: string) => string} T
 * @param {{ aoJogar: () => void, aoOpcao: (id: string) => void, aoVestiario: () => void, som: (id: string) => void }} cb
 */
export function criarMenu(raiz, T, cb) {
  raiz.insertAdjacentHTML('beforeend', `
    <div class="menuInicial" id="menuInicial" hidden>
      <div class="caixa">
        <div class="logo"></div>
        <div class="copaInfo"><canvas class="icPais" width="72" height="48"></canvas><div><b class="copaNome"></b><span class="copaFase"></span></div></div>
        <div class="botoes">
          <button class="bt principal jogar"></button>
          <button class="bt verChave"></button>
          <button class="bt vestiarioBt"></button>
          <div class="linha"><button class="bt op" data-op="controle"></button><button class="bt op" data-op="som"></button></div>
        </div>
      </div>
    </div>
    <div class="telaChave" id="telaChave" hidden>
      <div class="caixa">
        <div class="titulo"></div>
        <canvas class="cvChave"></canvas>
        <div class="sub"></div>
        <div class="botoes"><button class="bt principal voltar"></button></div>
      </div>
    </div>`);
  const $ = (s) => /** @type {HTMLElement} */ (raiz.querySelector(s));
  const el = {
    menu: $('#menuInicial'), logo: $('#menuInicial .logo'), icPais: /** @type {HTMLCanvasElement} */ ($('#menuInicial .icPais')),
    copaNome: $('#menuInicial .copaNome'), copaFase: $('#menuInicial .copaFase'), jogar: $('#menuInicial .jogar'), verChave: $('#menuInicial .verChave'), vestiario: $('#menuInicial .vestiarioBt'),
    opControle: $('#menuInicial [data-op="controle"]'), opSom: $('#menuInicial [data-op="som"]'),
    tela: $('#telaChave'), titulo: $('#telaChave .titulo'), cv: /** @type {HTMLCanvasElement} */ ($('#telaChave .cvChave')), sub: $('#telaChave .sub'), voltar: $('#telaChave .voltar'),
  };
  /** @type {InfoMenu|null} */
  let info = null;
  let aberto = false;
  let chaveAberta = false;
  let t0 = 0;

  el.jogar.addEventListener('click', () => { cb.som('botao'); cb.aoJogar(); });
  el.verChave.addEventListener('click', () => { cb.som('botao'); abrirChave(); });
  el.vestiario.addEventListener('click', () => { cb.som('botao'); cb.aoVestiario(); });
  el.voltar.addEventListener('click', () => { cb.som('botao'); fecharChave(); });
  el.opControle.addEventListener('click', () => { cb.som('botao'); cb.aoOpcao('controle'); });
  el.opSom.addEventListener('click', () => { cb.som('botao'); cb.aoOpcao('som'); });
  window.addEventListener('resize', () => { if (chaveAberta) pintarChave(); });

  function textos() {
    if (!info) return;
    el.logo.textContent = T('titulo');
    el.jogar.textContent = T('ui.jogar');
    el.verChave.textContent = T('ui.chave');
    el.vestiario.textContent = T('ui.vestiarioBt');
    el.copaNome.textContent = info.copa;
    el.copaFase.textContent = info.proxima || info.fase;
    el.opControle.textContent = `${T('ui.controle')}: ${info.controle === 'b' ? T('ui.botoes') : T('ui.metades')}`;
    el.opSom.textContent = `${T('ui.som')}: ${info.som ? 'ON' : 'OFF'}`;
    const g = el.icPais.getContext('2d');
    if (g) { g.clearRect(0, 0, 72, 48); desenharBandeirinha(g, info.pais, 2, 2, 68, 44); }
  }

  function pintarChave() {
    if (!info) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const r = el.cv.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width));
    const h = Math.max(1, Math.round(r.height));
    if (el.cv.width !== Math.round(w * dpr)) el.cv.width = Math.round(w * dpr);
    if (el.cv.height !== Math.round(h * dpr)) el.cv.height = Math.round(h * dpr);
    const g = el.cv.getContext('2d');
    if (!g) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    desenharChave(g, w, h, { ...info.chave, k: 1, t: (performance.now() - t0) / 1000 });
  }

  function animar() {
    if (!chaveAberta) return;
    pintarChave();
    requestAnimationFrame(animar);
  }

  function abrirChave() {
    if (!info) return;
    chaveAberta = true;
    el.tela.hidden = false;
    el.titulo.textContent = info.copa;
    el.sub.textContent = info.proxima || info.fase;
    el.voltar.textContent = T('ui.voltar');
    t0 = performance.now();
    requestAnimationFrame(() => { animar(); el.voltar.focus(); });
  }

  function fecharChave() {
    chaveAberta = false;
    el.tela.hidden = true;
    if (aberto) requestAnimationFrame(() => el.jogar.focus());
  }

  return {
    /** @param {InfoMenu} i */
    abrir(i) {
      info = i;
      aberto = true;
      el.menu.hidden = false;
      textos();
      requestAnimationFrame(() => el.jogar.focus());
    },
    /** atualiza os textos (opcoes trocadas) sem mexer no foco @param {Partial<InfoMenu>} i */
    atualizar(i) { if (info) { Object.assign(info, i); textos(); } },
    fechar() {
      aberto = false;
      el.menu.hidden = true;
      if (chaveAberta) fecharChave();
    },
    abrirChave,
    get aberto() { return aberto || chaveAberta; },
    /** a caixa aberta (o teclado do hud.js navega por ela) */
    get caixa() { return chaveAberta ? el.tela : aberto ? el.menu : null; },
    /** Esc: a chave volta para o menu */
    voltar() { if (chaveAberta) fecharChave(); },
  };
}
