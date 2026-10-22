// HUD do Volei de Gosma (DOM): placar no centro do alto (a pilula da Poki, no canto superior
// esquerdo, fica livre), medidor de gosma (3 segmentos), chips dos power-ups ativos embaixo de
// cada lado, botao de pausa a direita (e o de reacao embaixo dele), mao fantasma das dicas, a
// barra de reacoes (emoji: abre sozinha depois do ponto e a qualquer hora pelo botao), o cartao
// unico entre partidas e o menu de pausa. As teclas 1 a 9 e 0 reagem a qualquer hora no
// desktop (fora dos menus). Teclado nos menus: setas e
// WASD movem o foco, Enter/Espaco acionam, Esc volta; o foco inicial e sempre o botao normal.

import { desenharChave, desenharCaminho } from '../render/chave.js';

/**
 * @param {HTMLElement} raiz
 * @param {(k: string) => string} T
 * @param {{ aoPausar: () => void, aoContinuar: () => void, aoProxima: () => void, aoRevanche: () => void, aoOpcao: (id: string, v?: any) => void, som: (id: string) => void, icone: (ctx: CanvasRenderingContext2D, id: string, lado: number) => void, carinha: (ctx: CanvasRenderingContext2D, id: string, lado: number) => void, aoReagir: (id: string) => void, aoReagirTecla: (k: number) => void, aoBotaoReacao: () => void,
 *   premio: (ctx: CanvasRenderingContext2D, pr: any, lado: number) => void, aoPremiado: () => void, aoMenu: () => void, aoAutoAvanco: (revanche: boolean) => void,
 *   aoPresente: () => void, caixaExtra?: () => HTMLElement|null, aoEscExtra?: () => void }} cb
 *   caixaExtra: o menu principal ou a chave abertos (src/ui/menu.js): o teclado navega por eles
 *   aoAutoAvanco: o cartao de fim avancou sozinho (ninguem tocou): a proxima partida sem anuncio
 *   aoPresente: o toque no presente novo do cartao (abre o vestiario)
 */
export function criarHud(raiz, T, cb) {
  raiz.insertAdjacentHTML('beforeend', `
    <div class="hud" id="hud">
      <div class="placar">
        <div class="lado l0"><span class="nome"></span><div class="medidor"><i></i><i></i><i></i></div><div class="chips"></div></div>
        <div class="pontos"><b class="p0">0</b><span>·</span><b class="p1">0</b></div>
        <div class="lado l1"><span class="nome"></span><div class="medidor"><i></i><i></i><i></i></div><div class="chips"></div></div>
      </div>
      <button class="pausa" aria-label="pause"><svg viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1.5"/><rect x="14" y="5" width="4" height="14" rx="1.5"/></svg></button>
      <button class="reagir" aria-label="emoji" hidden><canvas width="72" height="72"></canvas></button>
      <div class="faixa" hidden></div>
      <div class="reacoes" hidden></div>
      <div class="mao" hidden><div class="dedo"></div><div class="texto"></div></div>
    </div>
    <div class="cartao" id="cartao" hidden>
      <div class="caixa">
        <div class="titulo"></div>
        <div class="sub"></div>
        <canvas class="cvCaminho" hidden></canvas>
        <canvas class="cvChave" hidden></canvas>
        <div class="proxCopa" hidden></div>
        <div class="presentes" hidden></div>
        <div class="progresso" hidden>
          <div class="ganhos"><span class="gotas"><canvas class="icGota" width="44" height="44"></canvas><b class="gTotal">0</b><em class="gMais"></em></span><span class="xpMais"></span></div>
          <div class="nivel"><span class="nNum"></span><div class="barraXp"><i></i></div><span class="nXp"></span></div>
          <div class="subiu" hidden><b class="subiuTit"></b><div class="subiuPremios"></div></div>
          <div class="trilha"></div>
        </div>
        <div class="botoes"><button class="bt principal proxima"></button><button class="bt revanche"></button><button class="bt secundario menuBt"></button><button class="bt premiado" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9h18v11H3z" fill="#fff" stroke="#17161c" stroke-width="2"/><path d="M3 9l2-5 16 0-2 5z" fill="#17161c"/><path d="M8 4l-2 5M13 4l-2 5M18 4l-2 5" stroke="#fff" stroke-width="1.6"/><path d="M10 12.5v5l4.5-2.5z" fill="#17161c"/></svg><span></span></button></div>
      </div>
    </div>
    <div class="menuPausa" id="menuPausa" hidden>
      <div class="caixa">
        <div class="titulo"></div>
        <div class="botoes">
          <button class="bt principal continuar"></button>
          <button class="bt op" data-op="controle"></button>
          <button class="bt op" data-op="som"></button>
          <button class="bt op" data-op="menu"></button>
          <button class="bt op" data-op="modelos" hidden>← Modelos</button>
        </div>
      </div>
    </div>`);
  const $ = (s) => /** @type {HTMLElement} */ (raiz.querySelector(s));
  const el = {
    hud: $('#hud'), nome0: $('.l0 .nome'), nome1: $('.l1 .nome'), p0: $('.p0'), p1: $('.p1'),
    med0: $('.l0 .medidor'), med1: $('.l1 .medidor'), chips0: $('.l0 .chips'), chips1: $('.l1 .chips'), pausa: $('.pausa'), reagir: $('.reagir'), faixa: $('.faixa'),
    reacoes: $('.reacoes'), mao: $('.mao'), maoTexto: $('.mao .texto'), cartao: $('#cartao'), cTitulo: $('#cartao .titulo'), cSub: $('#cartao .sub'),
    proxima: $('#cartao .proxima'), revanche: $('#cartao .revanche'), premiado: $('#cartao .premiado'), menuBt: $('#cartao .menuBt'),
    cvChave: /** @type {HTMLCanvasElement} */ ($('#cartao .cvChave')), cvCaminho: /** @type {HTMLCanvasElement} */ ($('#cartao .cvCaminho')), cCaixa: $('#cartao .caixa'), proxCopa: $('#cartao .proxCopa'), presentes: $('#cartao .presentes'), opMenu: $('[data-op="menu"]'),
    prog: $('#cartao .progresso'), gTotal: $('#cartao .gTotal'), gMais: $('#cartao .gMais'), xpMais: $('#cartao .xpMais'),
    nNum: $('#cartao .nNum'), barraXp: $('#cartao .barraXp i'), nXp: $('#cartao .nXp'), subiu: $('#cartao .subiu'),
    subiuTit: $('#cartao .subiuTit'), subiuPremios: $('#cartao .subiuPremios'), trilha: $('#cartao .trilha'), menu: $('#menuPausa'), mTitulo: $('#menuPausa .titulo'),
    continuar: $('#menuPausa .continuar'), opControle: $('[data-op="controle"]'), opSom: $('[data-op="som"]'),
  };
  el.proxima.textContent = T('ui.proxima');
  el.revanche.textContent = T('ui.revanche');
  el.menuBt.textContent = T('ui.menu');
  el.opMenu.textContent = T('ui.menu');
  /** @type {HTMLElement} */ (el.premiado.querySelector('span')).textContent = T('ui.premio2');
  const ctxGota = /** @type {HTMLCanvasElement} */ (el.cartao.querySelector('.icGota')).getContext('2d');
  if (ctxGota) cb.premio(ctxGota, { tipo: 'gotas' }, 44);
  el.continuar.textContent = T('ui.continuar');
  el.mTitulo.textContent = T('ui.pausa');
  let ultimo = { p0: -1, p1: -1, m0: -1, m1: -1, c0: '', c1: '' };
  let menuAberto = false;
  /** @type {string[]|null} */
  let barra = null;
  let chaveBarra = '';
  let cartaoAberto = false;
  /** s do avanco automatico do cartao aberto (0 = desligado) */
  let autoSeg = 0;

  el.pausa.addEventListener('click', () => { cb.som('botao'); cb.aoPausar(); });
  el.reagir.addEventListener('click', () => { cb.som('botao'); cb.aoBotaoReacao(); });
  const ctxReagir = /** @type {HTMLCanvasElement} */ (el.reagir.querySelector('canvas')).getContext('2d');
  if (ctxReagir) cb.carinha(ctxReagir, 'rindo', 72);
  el.reacoes.addEventListener('click', (e) => {
    const b = e.target instanceof Element ? e.target.closest('button[data-id]') : null;
    if (b) cb.aoReagir(/** @type {HTMLElement} */ (b).dataset.id || '');
  });
  el.continuar.addEventListener('click', () => { cb.som('botao'); cb.aoContinuar(); });
  el.proxima.addEventListener('click', () => { cb.som('botao'); cb.aoProxima(); });
  el.revanche.addEventListener('click', () => { cb.som('botao'); cb.aoRevanche(); });
  el.menuBt.addEventListener('click', () => { cb.som('botao'); cb.aoMenu(); });
  el.opMenu.addEventListener('click', () => { cb.som('botao'); cb.aoMenu(); });
  el.premiado.addEventListener('click', () => { cb.som('botao'); el.premiado.disabled = true; pararAuto(); cb.aoPremiado(); });
  // um toque no cartao pula a contagem (Gotas, barra de XP e a chave) e recomeca o avanco automatico
  el.cartao.addEventListener('pointerdown', () => { anim.fim = 0; animChave.fim = 0; reiniciarAuto(); });
  el.cartao.addEventListener('keydown', () => reiniciarAuto());
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
    if (e.target instanceof HTMLElement && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    const extra = cb.caixaExtra ? cb.caixaExtra() : null;
    const box = menuAberto ? el.menu : cartaoAberto ? el.cartao : extra;
    if (box && box === extra && e.code === 'Escape') { if (cb.aoEscExtra) cb.aoEscExtra(); return; }
    if (!box) {
      if (e.code === 'Escape' || e.code === 'KeyP') cb.aoPausar();
      else if (/^(Digit|Numpad)[0-9]$/.test(e.code)) {
        const n = Number(e.code.slice(-1));
        cb.aoReagirTecla(n === 0 ? 9 : n - 1);
      }
      return;
    }
    const bts = [...box.querySelectorAll('button:not([hidden])')];
    const i = bts.indexOf(/** @type {any} */ (document.activeElement));
    if (['ArrowDown', 'ArrowRight', 'KeyS', 'KeyD'].includes(e.code)) { e.preventDefault(); /** @type {HTMLElement} */ (bts[(i + 1 + bts.length) % bts.length]).focus(); }
    else if (['ArrowUp', 'ArrowLeft', 'KeyW', 'KeyA'].includes(e.code)) { e.preventDefault(); /** @type {HTMLElement} */ (bts[(i - 1 + bts.length) % bts.length]).focus(); }
    else if (e.code === 'Escape' && menuAberto) cb.aoContinuar();
    else if ((e.code === 'Enter' || e.code === 'Space') && i < 0) {
      // sem foco: o botao normal (o primeiro da fileira de baixo), nunca o presente que vem antes dela
      e.preventDefault();
      /** @type {HTMLElement} */ (box.querySelector('.botoes button:not([hidden])') || bts[0]).click();
    }
  });

  function medidor(box, v) {
    const is = box.querySelectorAll('i');
    for (let k = 0; k < 3; k++) {
      const f = Math.max(0, Math.min(1, (v - k * 100) / 100));
      /** @type {HTMLElement} */ (is[k]).style.setProperty('--f', f.toFixed(3));
      is[k].classList.toggle('cheio', f >= 1);
    }
  }

  /** Animacao do cartao: Gotas contando e a barra de XP enchendo (pulavel com um toque). */
  const anim = { ini: 0, fim: 0, g0: 0, g1: 0, k0: 0, k1: 0, voltas: 0, nivelFinal: 1, xpFinal: '', req: 1 };
  function animar() {
    if (!cartaoAberto) return;
    const agora = performance.now();
    const u = anim.fim <= anim.ini ? 1 : Math.min(1, (agora - anim.ini) / (anim.fim - anim.ini));
    const e = 1 - (1 - u) * (1 - u);
    el.gTotal.textContent = String(Math.round(anim.g0 + (anim.g1 - anim.g0) * e));
    // a barra percorre as voltas de nivel (cheia -> zera) ate o ponto final
    const total = anim.voltas + anim.k1 - anim.k0;
    const pos = anim.k0 + total * e;
    const volta = Math.min(anim.voltas, Math.floor(pos));
    const k = u >= 1 ? anim.k1 : pos - volta;
    el.barraXp.style.setProperty('--k', Math.max(0, Math.min(1, k)).toFixed(3));
    if (u >= 1) { el.nXp.textContent = anim.xpFinal; el.nNum.textContent = `${T('ui.nivel')} ${anim.nivelFinal}`; return; }
    requestAnimationFrame(animar);
  }

  /** Chave no cartao: a rodada que acabou de ser revelada anima em ~1,2 s (um toque pula). */
  const animChave = { ini: 0, fim: 0, dados: /** @type {any} */ (null) };
  /** Pinta um canvas do cartao no tamanho dele (DPR ate 2); o escondido (display none) fica. */
  function pintar(cv, desenho) {
    const r = cv.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round(r.width);
    const h = Math.round(r.height);
    if (cv.width !== Math.round(w * dpr)) cv.width = Math.round(w * dpr);
    if (cv.height !== Math.round(h * dpr)) cv.height = Math.round(h * dpr);
    const g = cv.getContext('2d');
    if (!g) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    desenho(g, w, h);
  }
  function animarChave() {
    if (!cartaoAberto || !animChave.dados) return;
    const agora = performance.now();
    const k = animChave.fim <= animChave.ini ? 1 : Math.min(1, (agora - animChave.ini) / (animChave.fim - animChave.ini));
    const d = { ...animChave.dados, k: 1 - Math.pow(1 - k, 2), t: (agora - animChave.ini) / 1000 };
    pintar(el.cvCaminho, (g, w, h) => desenharCaminho(g, w, h, d));
    pintar(el.cvChave, (g, w, h) => desenharChave(g, w, h, d));
    requestAnimationFrame(animarChave);
  }

  /**
   * Avanco automatico do cartao de fim (pedido de 2026-10-22): sem toque, depois das animacoes, a
   * barra enche no botao principal e a partida seguinte vem sozinha (sem anuncio: main.js). Um toque
   * no cartao recomeca a conta; a aba oculta para (o rAF nao roda); o Premio x2 cancela.
   */
  const auto = { dur: 0, resta: 0, desde: 0, ultimo: 0, ativo: false, bt: /** @type {HTMLElement|null} */ (null) };
  function iniciarAuto(seg) {
    pararAuto();
    if (!(seg > 0) || !cartaoAberto) return;
    auto.bt = el.proxima.hidden ? el.revanche : el.proxima;
    auto.dur = seg;
    auto.ativo = true;
    reiniciarAuto();
    auto.bt.classList.add('auto');
    requestAnimationFrame(passoAuto);
  }
  function reiniciarAuto() {
    if (!auto.ativo) return;
    auto.resta = auto.dur;
    auto.desde = performance.now() + 1500;
    auto.ultimo = performance.now();
  }
  function pararAuto() {
    auto.ativo = false;
    if (auto.bt) { auto.bt.classList.remove('auto'); auto.bt.style.removeProperty('--auto'); }
  }
  function passoAuto() {
    if (!auto.ativo || !cartaoAberto || !auto.bt) return;
    const agora = performance.now();
    const dt = Math.min(0.1, (agora - auto.ultimo) / 1000);
    auto.ultimo = agora;
    if (agora >= auto.desde) auto.resta -= dt;
    auto.bt.style.setProperty('--auto', (1 - Math.max(0, auto.resta) / auto.dur).toFixed(3));
    if (auto.resta <= 0) {
      const revanche = auto.bt === el.revanche;
      pararAuto();
      cb.aoAutoAvanco(revanche);
      return;
    }
    requestAnimationFrame(passoAuto);
  }

  /** Nome curto de um premio da trilha. */
  function nomePremio(pr) {
    if (pr.tipo === 'gotas') return `+${pr.gotas} ${T('ui.gotas')}`;
    if (pr.tipo === 'acessorio') return T('ac.' + pr.id);
    return T((pr.tipo === 'reacao' ? 'reacao.' : pr.tipo === 'powerup' ? 'pwn.' : 'skin.') + pr.id);
  }

  /** Um premio (canvas + nome). */
  function premioEl(pr, classe, px) {
    const d = document.createElement('div');
    d.className = classe;
    const cv = document.createElement('canvas');
    const lado = Math.round(px * Math.min(2, window.devicePixelRatio || 1));
    cv.width = lado;
    cv.height = lado;
    const ctx = cv.getContext('2d');
    if (ctx) cb.premio(ctx, pr, lado);
    d.append(cv);
    const s = document.createElement('span');
    s.textContent = nomePremio(pr);
    d.append(s);
    return d;
  }

  /**
   * Progresso no cartao: Gotas, XP, subida de nivel com os premios e os proximos marcos.
   * @param {any} p { antes, depois, subiu, ganho, gotasAntes, gotasTotal, marcos, dobrado }
   */
  function progresso(p) {
    el.prog.hidden = !p;
    if (!p) return;
    el.gMais.textContent = `+${p.ganho.gotas}`;
    el.xpMais.textContent = `+${p.ganho.xp} XP${p.dobrado ? ' · ' + T('ui.dobrado') : ''}`;
    el.subiu.hidden = !p.subiu.length;
    if (p.subiu.length) {
      el.subiuTit.textContent = T('ui.nivelN').replace('{n}', String(p.depois.nivel));
      el.subiuPremios.replaceChildren(...p.subiu.flatMap((s) => s.premios).map((pr) => premioEl(pr, 'premio', 44)));
    }
    el.trilha.replaceChildren(...p.marcos.map((m) => {
      const d = document.createElement('div');
      d.className = 'marco';
      const n = document.createElement('b');
      n.textContent = String(m.nivel);
      d.append(n, ...m.premios.slice(0, 1).map((pr) => premioEl(pr, 'mini', 30)));
      return d;
    }));
    const agora = performance.now();
    Object.assign(anim, {
      ini: agora, fim: agora + 1100, g0: p.gotasAntes, g1: p.gotasTotal,
      k0: p.antes.xp / p.antes.req, k1: p.depois.xp / p.depois.req, voltas: p.depois.nivel - p.antes.nivel,
      nivelFinal: p.depois.nivel, xpFinal: `${p.depois.xp}/${p.depois.req}`,
    });
    el.nNum.textContent = `${T('ui.nivel')} ${p.antes.nivel}`;
    el.nXp.textContent = `${p.antes.xp}/${p.antes.req}`;
    requestAnimationFrame(animar);
  }

  /**
   * Um presente no cartao: o rotulo, o slime do jogador vestindo o item e o nome. O novo e um botao
   * (abre o vestiario); o da proxima vitoria so mostra.
   */
  function presenteEl(pr, rotulo, px, botao) {
    const d = document.createElement(botao ? 'button' : 'div');
    d.className = botao ? 'bt presente novo' : 'presente prox';
    const b = document.createElement('b');
    b.textContent = rotulo;
    const cv = document.createElement('canvas');
    const lado = Math.round(px * Math.min(2, window.devicePixelRatio || 1));
    cv.width = lado;
    cv.height = lado;
    const ctx = cv.getContext('2d');
    if (ctx) cb.premio(ctx, pr, lado);
    const s = document.createElement('span');
    s.textContent = nomePremio(pr);
    d.append(b, cv, s);
    if (botao) d.addEventListener('click', () => { cb.som('botao'); pararAuto(); cb.aoPresente(); });
    return d;
  }

  /**
   * Presentes das primeiras vitorias (src/jogo/perfil.js PRESENTES): o que acabou de ganhar e o da
   * proxima vitoria. Com eles, a trilha de niveis sai do cartao (volta quando acabam).
   * @param {{ novo?: { pr: any }|null, proximo?: { pr: any, rival: string }|null }|null} p
   */
  function presentes(p) {
    const tem = !!p && (!!p.novo || !!p.proximo);
    el.presentes.hidden = !tem;
    el.cCaixa.classList.toggle('comPresente', tem);
    if (!p || !tem) { el.presentes.replaceChildren(); return; }
    const l = [];
    if (p.novo) l.push(presenteEl(p.novo.pr, T('ui.presenteNovo'), 60, true));
    if (p.proximo) l.push(presenteEl(p.proximo.pr, T('ui.presenteProximo').replace('{rival}', p.proximo.rival), 52, false));
    el.presentes.replaceChildren(...l);
  }

  /** Chips dos power-ups: "id:pontos" (sem pontos: espera o uso). */
  function chips(box, lista) {
    box.replaceChildren();
    for (const c of lista) {
      const [id, n] = c.split(':');
      const d = document.createElement('div');
      d.className = 'chip';
      const cv = document.createElement('canvas');
      const lado = Math.round(22 * Math.min(2, window.devicePixelRatio || 1));
      cv.width = lado;
      cv.height = lado;
      const ctx = cv.getContext('2d');
      if (ctx) cb.icone(ctx, id, lado);
      d.append(cv);
      if (n && Number(n) > 1) { const b = document.createElement('b'); b.textContent = n; d.append(b); }
      box.append(d);
    }
  }

  return {
    /**
     * @param {{ nomes: string[], cores: string[], placar: number[], medidor: number[], chips?: string[][], esconder?: boolean }} s
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
      const c0 = (s.chips?.[0] || []).join(',');
      const c1 = (s.chips?.[1] || []).join(',');
      if (ultimo.c0 !== c0) { chips(el.chips0, s.chips?.[0] || []); ultimo.c0 = c0; }
      if (ultimo.c1 !== c1) { chips(el.chips1, s.chips?.[1] || []); ultimo.c1 = c1; }
    },
    /**
     * Barra de reacoes: a lista de ids liberados (ou null para esconder); teclas mostra os numeros.
     * @param {string[]|null} lista @param {boolean} [teclas]
     */
    reacoes(lista, teclas = false) {
      const chave = lista ? lista.join(',') + (teclas ? '#' : '') : '';
      if (chave === chaveBarra) return;
      chaveBarra = chave;
      barra = lista;
      el.reacoes.hidden = !lista;
      if (!lista) return;
      el.reacoes.replaceChildren();
      lista.forEach((id, k) => {
        const b = document.createElement('button');
        b.dataset.id = id;
        b.setAttribute('aria-label', T('reacao.' + id));
        b.style.animationDelay = `${k * 0.025}s`;
        const cv = document.createElement('canvas');
        const lado = Math.round(56 * Math.min(2, window.devicePixelRatio || 1));
        cv.width = lado;
        cv.height = lado;
        const ctx = cv.getContext('2d');
        if (ctx) cb.carinha(ctx, id, lado);
        b.append(cv);
        if (teclas && k < 10) { const i = document.createElement('i'); i.textContent = String((k + 1) % 10); b.append(i); }
        el.reacoes.append(b);
      });
    },
    /**
     * Botao fixo de reacao: visivel na partida; apagado durante a recarga.
     * @param {boolean} visivel @param {boolean} pronto
     */
    botaoReacao(visivel, pronto) {
      if (el.reagir.hidden === visivel) el.reagir.hidden = !visivel;
      el.reagir.classList.toggle('recarga', !pronto);
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
      if (!c) { pararAuto(); return; }
      el.cCaixa.classList.toggle('campeao', !!c.campeao);
      el.cTitulo.textContent = c.titulo;
      el.cSub.textContent = c.sub || '';
      el.proxima.hidden = !c.proxima;
      el.revanche.hidden = !c.revanche;
      el.premiado.hidden = !c.premiado;
      el.premiado.disabled = false;
      el.menuBt.hidden = !!c.semMenu;
      // a chave da Copa (com a rodada nova animando) e o proximo jogo
      el.cvChave.hidden = !c.chave;
      el.cvCaminho.hidden = !c.chave;
      el.proxCopa.hidden = !c.proxCopa;
      el.proxCopa.textContent = c.proxCopa || '';
      animChave.dados = c.chave ? { ...c.chave, nomesFases: c.chave.chave.fases.map((f) => T('copa.' + f)) } : null;
      if (c.chave) {
        // a vitoria revela a rodada nova animando; na derrota a chave so aparece
        animChave.ini = performance.now() + (c.chave.animar === false ? 0 : 250);
        animChave.fim = animChave.ini + (c.chave.animar === false ? 0 : 1200);
        requestAnimationFrame(animarChave);
      }
      progresso(c.progresso || null);
      presentes(c.presente || null);
      requestAnimationFrame(() => (c.proxima ? el.proxima : el.revanche).focus());
      autoSeg = c.auto || 0;
      iniciarAuto(autoSeg);
    },
    /** depois do premiado: o progresso dobrado (ou null: o video nao rendeu) */
    cartaoPremiado(p) {
      el.premiado.hidden = true;
      if (p) progresso(p);
      iniciarAuto(autoSeg);
      requestAnimationFrame(() => (el.proxima.hidden ? el.revanche : el.proxima).focus());
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
