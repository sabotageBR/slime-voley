// HUD do Volei de Gosma (DOM): placar no centro do alto (a pilula da Poki, no canto superior
// esquerdo, fica livre), medidor de gosma (3 segmentos), botao de pausa a direita, mao fantasma
// das dicas, o cartao unico entre partidas e o menu de pausa. Teclado nos menus: setas e
// WASD movem o foco, Enter/Espaco acionam, Esc volta; o foco inicial e sempre o botao normal.

/**
 * @param {HTMLElement} raiz
 * @param {(k: string) => string} T
 * @param {{ aoPausar: () => void, aoContinuar: () => void, aoProxima: () => void, aoRevanche: () => void, aoOpcao: (id: string, v?: any) => void, som: (id: string) => void }} cb
 */
export function criarHud(raiz, T, cb) {
  raiz.insertAdjacentHTML('beforeend', `
    <div class="hud" id="hud">
      <div class="placar">
        <div class="lado l0"><span class="nome"></span><div class="medidor"><i></i><i></i><i></i></div></div>
        <div class="pontos"><b class="p0">0</b><span>·</span><b class="p1">0</b></div>
        <div class="lado l1"><span class="nome"></span><div class="medidor"><i></i><i></i><i></i></div></div>
      </div>
      <button class="pausa" aria-label="pause"><svg viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1.5"/><rect x="14" y="5" width="4" height="14" rx="1.5"/></svg></button>
      <div class="faixa" hidden></div>
      <div class="mao" hidden><div class="dedo"></div><div class="texto"></div></div>
    </div>
    <div class="cartao" id="cartao" hidden>
      <div class="caixa">
        <div class="titulo"></div>
        <div class="sub"></div>
        <div class="botoes"><button class="bt principal proxima"></button><button class="bt revanche"></button></div>
      </div>
    </div>
    <div class="menuPausa" id="menuPausa" hidden>
      <div class="caixa">
        <div class="titulo"></div>
        <div class="botoes">
          <button class="bt principal continuar"></button>
          <button class="bt op" data-op="controle"></button>
          <button class="bt op" data-op="som"></button>
          <button class="bt op" data-op="modelos" hidden>← Modelos</button>
        </div>
      </div>
    </div>`);
  const $ = (s) => /** @type {HTMLElement} */ (raiz.querySelector(s));
  const el = {
    hud: $('#hud'), nome0: $('.l0 .nome'), nome1: $('.l1 .nome'), p0: $('.p0'), p1: $('.p1'),
    med0: $('.l0 .medidor'), med1: $('.l1 .medidor'), pausa: $('.pausa'), faixa: $('.faixa'),
    mao: $('.mao'), maoTexto: $('.mao .texto'), cartao: $('#cartao'), cTitulo: $('#cartao .titulo'), cSub: $('#cartao .sub'),
    proxima: $('#cartao .proxima'), revanche: $('#cartao .revanche'), menu: $('#menuPausa'), mTitulo: $('#menuPausa .titulo'),
    continuar: $('#menuPausa .continuar'), opControle: $('[data-op="controle"]'), opSom: $('[data-op="som"]'),
  };
  el.proxima.textContent = T('ui.proxima');
  el.revanche.textContent = T('ui.revanche');
  el.continuar.textContent = T('ui.continuar');
  el.mTitulo.textContent = T('ui.pausa');
  let ultimo = { p0: -1, p1: -1, m0: -1, m1: -1 };
  let menuAberto = false;
  let cartaoAberto = false;

  el.pausa.addEventListener('click', () => { cb.som('botao'); cb.aoPausar(); });
  el.continuar.addEventListener('click', () => { cb.som('botao'); cb.aoContinuar(); });
  el.proxima.addEventListener('click', () => { cb.som('botao'); cb.aoProxima(); });
  el.revanche.addEventListener('click', () => { cb.som('botao'); cb.aoRevanche(); });
  el.opControle.addEventListener('click', () => { cb.som('botao'); cb.aoOpcao('controle'); });
  el.opSom.addEventListener('click', () => { cb.som('botao'); cb.aoOpcao('som'); });
  // build de modelos (Artifact): volta para o hub (o empacotar corta as linhas "// modelo")
  const opModelos = $('[data-op="modelos"]'); // modelo
  if (/** @type {any} */ (globalThis).__voleiModelo) { // modelo
    opModelos.hidden = false; // modelo
    opModelos.addEventListener('click', () => { if (history.length > 1) history.back(); else location.href = 'index.html'; }); // modelo
  } // modelo

  // teclado nos menus (fase de bolha, sem stopPropagation)
  window.addEventListener('keydown', (e) => {
    const box = menuAberto ? el.menu : cartaoAberto ? el.cartao : null;
    if (!box) {
      if (e.code === 'Escape' || e.code === 'KeyP') cb.aoPausar();
      return;
    }
    const bts = [...box.querySelectorAll('button:not([hidden])')];
    const i = bts.indexOf(/** @type {any} */ (document.activeElement));
    if (['ArrowDown', 'ArrowRight', 'KeyS', 'KeyD'].includes(e.code)) { e.preventDefault(); /** @type {HTMLElement} */ (bts[(i + 1 + bts.length) % bts.length]).focus(); }
    else if (['ArrowUp', 'ArrowLeft', 'KeyW', 'KeyA'].includes(e.code)) { e.preventDefault(); /** @type {HTMLElement} */ (bts[(i - 1 + bts.length) % bts.length]).focus(); }
    else if (e.code === 'Escape' && menuAberto) cb.aoContinuar();
    else if ((e.code === 'Enter' || e.code === 'Space') && i < 0) { e.preventDefault(); /** @type {HTMLElement} */ (bts[0]).click(); }
  });

  function medidor(box, v) {
    const is = box.querySelectorAll('i');
    for (let k = 0; k < 3; k++) {
      const f = Math.max(0, Math.min(1, (v - k * 100) / 100));
      /** @type {HTMLElement} */ (is[k]).style.setProperty('--f', f.toFixed(3));
      is[k].classList.toggle('cheio', f >= 1);
    }
  }

  return {
    /**
     * @param {{ nomes: string[], cores: string[], placar: number[], medidor: number[], esconder?: boolean }} s
     */
    atualizar(s) {
      el.hud.hidden = !!s.esconder;
      if (s.esconder) return;
      if (el.nome0.textContent !== s.nomes[0]) el.nome0.textContent = s.nomes[0];
      if (el.nome1.textContent !== s.nomes[1]) el.nome1.textContent = s.nomes[1];
      el.nome0.style.color = s.cores[0];
      el.nome1.style.color = s.cores[1];
      if (ultimo.p0 !== s.placar[0]) { el.p0.textContent = String(s.placar[0]); el.p0.classList.remove('rola'); void el.p0.offsetWidth; el.p0.classList.add('rola'); ultimo.p0 = s.placar[0]; }
      if (ultimo.p1 !== s.placar[1]) { el.p1.textContent = String(s.placar[1]); el.p1.classList.remove('rola'); void el.p1.offsetWidth; el.p1.classList.add('rola'); ultimo.p1 = s.placar[1]; }
      if (ultimo.m0 !== s.medidor[0]) { medidor(el.med0, s.medidor[0]); ultimo.m0 = s.medidor[0]; }
      if (ultimo.m1 !== s.medidor[1]) { medidor(el.med1, s.medidor[1]); ultimo.m1 = s.medidor[1]; }
    },
    /** posiciona o placar (faixa do layout) */
    posicionar(L) {
      el.hud.style.setProperty('--placarY', `${L.placar.y}px`);
      el.hud.style.setProperty('--placarH', `${L.placar.h}px`);
    },
    faixa(txt) {
      el.faixa.hidden = !txt;
      if (txt) { el.faixa.textContent = txt; el.faixa.classList.remove('entra'); void el.faixa.offsetWidth; el.faixa.classList.add('entra'); }
    },
    /** mao fantasma: x, y (px CSS) e o texto da dica (ou null para esconder) */
    mao(m) {
      el.mao.hidden = !m;
      if (!m) return;
      el.mao.style.transform = `translate(${m.x}px, ${m.y}px)`;
      el.mao.dataset.gesto = m.gesto || 'toque';
      if (el.maoTexto.textContent !== m.texto) el.maoTexto.textContent = m.texto || '';
    },
    cartao(c) {
      cartaoAberto = !!c;
      el.cartao.hidden = !c;
      if (!c) return;
      el.cTitulo.textContent = c.titulo;
      el.cSub.textContent = c.sub || '';
      el.proxima.hidden = !c.proxima;
      el.revanche.hidden = !c.revanche;
      requestAnimationFrame(() => (c.proxima ? el.proxima : el.revanche).focus());
    },
    menu(aberto, ops = {}) {
      menuAberto = aberto;
      el.menu.hidden = !aberto;
      if (!aberto) return;
      el.opControle.textContent = `${T('ui.controle')}: ${ops.controle === 'b' ? T('ui.botoes') : T('ui.metades')}`;
      el.opSom.textContent = `${T('ui.som')}: ${ops.som ? 'ON' : 'OFF'}`;
      requestAnimationFrame(() => el.continuar.focus());
    },
    get menuAberto() { return menuAberto; },
    get cartaoAberto() { return cartaoAberto; },
  };
}
