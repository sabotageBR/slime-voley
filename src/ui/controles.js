// Controles do Volei de Gosma.
//
// Esquema A, "Metades" (padrao no celular): cada pointerId fica com a zona onde encostou.
//   Esquerda: stick horizontal flutuante (zona morta 8 px, velocidade maxima a 36 px na curva
//   ((|dx| - 8) / 28)^0,8; a origem acompanha o dedo alem de 56 px).
//   Direita: acao. pointerdown pula na hora; um NOVO pointerdown no ar, segurado, e a cortada
//   lenta; arrastar mira ("mais fundo" = para cima OU rumo ao adversario).
// Esquema B, "Botoes": ◀ ▶, PULO e SUPER (o 2o toque em PULO no ar corta).
// Teclado: A/D ou ←/→ anda, W/↑/Espaco pula (de novo no ar e segurar = cortada), S/↓/Shift super;
//   no 2P o jogador 1 usa A/D/W/S e o 2, as setas. Mouse: o slime segue o x do cursor e o
//   clique pula; na mira, o cursor projetado no piso e a reticula.
//
// Regras da Poki (vigiadas pelo test/estilo.test.js): ouvintes em fase de bolha, nenhum
// stopPropagation, preventDefault so em touchmove, wheel, contextmenu, setas e Espaco.

const ZONA_MORTA = 8;
const VMAX_PX = 36;
const ARRASTA_ORIGEM = 56;
const TECLAS = Object.freeze({
  p1: { esq: ['KeyA'], dir: ['KeyD'], acao: ['KeyW'], super: ['KeyS'] },
  p2: { esq: ['ArrowLeft'], dir: ['ArrowRight'], acao: ['ArrowUp'], super: ['ArrowDown'] },
  solo: { esq: ['KeyA', 'ArrowLeft'], dir: ['KeyD', 'ArrowRight'], acao: ['KeyW', 'ArrowUp', 'Space'], super: ['KeyS', 'ArrowDown', 'ShiftLeft', 'ShiftRight'] },
});
const PREVENIR = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space']);

/**
 * @param {HTMLElement} raiz  area de toque (a tela inteira)
 * @param {{ paraMundo: (px: number, py: number) => number[]|null, layout: () => any, aoInteragir: (e: Event) => void, ativo: () => boolean, toque?: boolean }} o
 */
export function criarControles(raiz, o) {
  let esquema = 'a';
  let dois = false;
  /** ultimo tipo de ponteiro (os controles na tela aparecem quando foi toque) */
  let via = o.toque ? 'toque' : 'teclado';
  const jog = [novoJog(), novoJog()];
  /** @type {Map<number, { zona: string, x0: number, y0: number, x: number, y: number, jog: number }>} */
  const dedos = new Map();
  const teclas = new Set();
  let mouse = { x: 0, y: 0, ativo: false, dentro: false };
  // desenho do stick e dos botoes (DOM leve por cima da quadra)
  const camada = document.createElement('div');
  camada.className = 'controles';
  camada.innerHTML = '<div class="stick"><div class="alca"></div></div><div class="botoes"></div>';
  raiz.appendChild(camada);
  const elStick = /** @type {HTMLElement} */ (camada.querySelector('.stick'));
  const elAlca = /** @type {HTMLElement} */ (camada.querySelector('.alca'));
  const elBotoes = /** @type {HTMLElement} */ (camada.querySelector('.botoes'));
  /** @type {Record<string, HTMLElement>} */
  const btn = {};
  let botoesChave = '';

  function novoJog() {
    return { eixo: 0, botao: false, borda: false, superBorda: false, miraDx: 0, miraX: null, stick: null, segAcao: 0 };
  }

  function zonaDe(x, y) {
    const L = o.layout();
    if (!L) return 'acao';
    for (const b of L.botoes || []) {
      if (esquema !== 'b' && b.id !== 'super') continue;
      const d = Math.hypot(x - b.x, y - b.y);
      if (d <= b.r * 1.25) return b.id;
    }
    if (esquema === 'b') return 'nada';
    // 2P no celular em paisagem: cada jogador na sua margem
    if (dois) return x < window.innerWidth / 2 ? 'p1' : 'p2';
    return x < window.innerWidth / 2 ? 'stick' : 'acao';
  }

  /** @param {PointerEvent} e */
  function baixo(e) {
    if (!o.ativo()) return;
    o.aoInteragir(e);
    via = e.pointerType === 'mouse' ? 'mouse' : 'toque';
    if (via === 'mouse') {
      mouse.ativo = true;
      jog[0].botao = true;
      jog[0].borda = true;
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      return;
    }
    const zona = zonaDe(e.clientX, e.clientY);
    const d = { zona, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, jog: 0 };
    dedos.set(e.pointerId, d);
    const J = jog[0];
    if (zona === 'acao' || zona === 'pulo') {
      J.botao = true;
      J.borda = true;
    } else if (zona === 'super') {
      J.superBorda = true;
    } else if (zona === 'stick') {
      J.stick = d;
    }
    try { raiz.setPointerCapture(e.pointerId); } catch { /* ignora */ }
  }

  /** @param {PointerEvent} e */
  function mover(e) {
    if (e.pointerType === 'mouse' || !dedos.has(e.pointerId)) {
      if (e.pointerType === 'mouse') { mouse.x = e.clientX; mouse.y = e.clientY; mouse.dentro = true; via = 'mouse'; }
      return;
    }
    const d = dedos.get(e.pointerId);
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    d.x = e.clientX;
    d.y = e.clientY;
    if (d.zona === 'stick') {
      // a origem acompanha o dedo alem de 56 px
      const off = d.x - d.x0;
      if (Math.abs(off) > ARRASTA_ORIGEM) d.x0 = d.x - Math.sign(off) * ARRASTA_ORIGEM;
    } else if (d.zona === 'acao' || d.zona === 'pulo') {
      // mira: eixo dominante; "mais fundo" = para cima ou rumo ao adversario (+x para o jogador 1)
      const L = o.layout();
      const ganho = L && L.orient === 'retrato' ? 0.075 : 0.1;
      const u = Math.abs(dx) > Math.abs(dy) ? dx : -dy;
      jog[0].miraDx += u * ganho;
    }
  }

  /** @param {PointerEvent} e */
  function cima(e) {
    if (e.pointerType === 'mouse') {
      mouse.ativo = false;
      jog[0].botao = false;
      return;
    }
    const d = dedos.get(e.pointerId);
    if (!d) return;
    dedos.delete(e.pointerId);
    const J = jog[0];
    if (d.zona === 'acao' || d.zona === 'pulo') {
      // outro dedo de acao ainda segurando?
      J.botao = [...dedos.values()].some((x) => x.zona === 'acao' || x.zona === 'pulo');
    }
    if (J.stick === d) J.stick = null;
  }

  /** @param {KeyboardEvent} e */
  function tecla(e, baixa) {
    if (PREVENIR.has(e.code)) e.preventDefault();
    if (baixa) {
      if (e.repeat) return;
      if (!o.ativo()) return;
      o.aoInteragir(e);
      via = 'teclado';
      teclas.add(e.code);
      const mapas = dois ? [[0, TECLAS.p1], [1, TECLAS.p2]] : [[0, TECLAS.solo]];
      for (const [k, mp] of mapas) {
        if (mp.acao.includes(e.code)) jog[k].borda = true;
        if (mp.super.includes(e.code)) jog[k].superBorda = true;
      }
    } else {
      teclas.delete(e.code);
    }
  }

  raiz.addEventListener('pointerdown', baixo);
  raiz.addEventListener('pointermove', mover);
  raiz.addEventListener('pointerup', cima);
  raiz.addEventListener('pointercancel', cima);
  raiz.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') mouse.dentro = false; });
  window.addEventListener('keydown', (e) => tecla(e, true));
  window.addEventListener('keyup', (e) => tecla(e, false));
  raiz.addEventListener('contextmenu', (e) => e.preventDefault());
  raiz.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  raiz.addEventListener('wheel', (e) => e.preventDefault(), { passive: false });
  window.addEventListener('blur', () => { teclas.clear(); for (const J of jog) J.botao = false; dedos.clear(); });

  /** Eixo do stick (-1..1) pela curva. */
  function eixoStick(d) {
    const dx = d.x - d.x0;
    const a = Math.abs(dx);
    if (a <= ZONA_MORTA) return 0;
    const k = Math.min(1, (a - ZONA_MORTA) / (VMAX_PX - ZONA_MORTA));
    return Math.sign(dx) * Math.pow(k, 0.8);
  }

  /**
   * Intencoes deste passo (consome as bordas e a mira acumulada).
   * @param {{ x: number }[]} slimes posicao dos slimes (o mouse segue o cursor)
   * @returns {Array<import('../jogo/partida.js').Intencao & { via: string }>}
   */
  function ler(slimes) {
    const out = [];
    const mapas = dois ? [TECLAS.p1, TECLAS.p2] : [TECLAS.solo];
    for (let k = 0; k < (dois ? 2 : 1); k++) {
      const J = jog[k];
      const mp = mapas[k];
      let eixo = 0;
      const tE = mp.esq.some((c) => teclas.has(c));
      const tD = mp.dir.some((c) => teclas.has(c));
      if (tE || tD) eixo = (tD ? 1 : 0) - (tE ? 1 : 0);
      const tA = mp.acao.some((c) => teclas.has(c));
      let botao = J.botao || tA;
      let miraX = null;
      if (k === 0 && esquema === 'b') {
        const ds = [...dedos.values()];
        const e = ds.some((d) => d.zona === 'esq');
        const dd = ds.some((d) => d.zona === 'dir');
        if (e || dd) eixo = (dd ? 1 : 0) - (e ? 1 : 0);
      } else if (k === 0 && J.stick) {
        eixo = eixoStick(J.stick);
      }
      if (k === 0 && via === 'mouse' && mouse.dentro && !tE && !tD) {
        const w = o.paraMundo(mouse.x, mouse.y);
        if (w && slimes[0]) {
          const d = w[0] - slimes[0].x;
          eixo = Math.abs(d) < 0.15 ? 0 : Math.max(-1, Math.min(1, d * 1.6));
          miraX = w[0];
        }
      }
      out.push({ eixo, botao, borda: J.borda, superBorda: J.superBorda, miraDx: J.miraDx, miraX, via });
      J.borda = false;
      J.superBorda = false;
      J.miraDx = 0;
    }
    return out;
  }

  /** Atualiza o desenho do stick e dos botoes. */
  function desenhar() {
    const L = o.layout();
    const mostrar = via === 'toque' && o.ativo();
    camada.style.display = mostrar ? '' : 'none';
    if (!mostrar || !L) return;
    const J = jog[0];
    if (esquema === 'a' && J.stick) {
      elStick.style.display = '';
      elStick.style.transform = `translate(${J.stick.x0 - 56}px, ${J.stick.y0 - 56}px)`;
      const dx = Math.max(-36, Math.min(36, J.stick.x - J.stick.x0));
      elAlca.style.transform = `translate(${dx}px, 0)`;
      elStick.classList.add('uso');
    } else {
      elStick.style.display = 'none';
    }
    const chave = esquema + '|' + (L.botoes || []).map((b) => `${b.id}:${b.x | 0}:${b.y | 0}:${b.r}`).join(',');
    if (chave !== botoesChave) {
      botoesChave = chave;
      elBotoes.innerHTML = '';
      for (const b of L.botoes || []) {
        if (esquema !== 'b' && b.id !== 'super') continue;
        const e = document.createElement('div');
        e.className = 'bt bt-' + b.id;
        e.style.cssText = `left:${b.x - b.r}px;top:${b.y - b.r}px;width:${b.r * 2}px;height:${b.r * 2}px`;
        e.innerHTML = b.id === 'esq' ? '<span>◀</span>' : b.id === 'dir' ? '<span>▶</span>' : b.id === 'pulo' ? '<span>⤒</span>' : '<span>★</span>';
        elBotoes.appendChild(e);
        btn[b.id] = e;
      }
    }
    const ds = [...dedos.values()];
    for (const id in btn) btn[id].classList.toggle('ativo', ds.some((d) => d.zona === id));
  }

  return {
    ler,
    desenhar,
    /** @param {'a'|'b'} e */
    definirEsquema(e) { esquema = e === 'b' ? 'b' : 'a'; botoesChave = ''; },
    get esquema() { return esquema; },
    definirDois(v) { dois = !!v; },
    get via() { return via; },
    /** mostra o SUPER (so no saque, com 2 segmentos ou prova gratis) */
    mostrarSuper(v) { if (btn.super) btn.super.classList.toggle('visivel', !!v); },
    soltarTudo() { dedos.clear(); teclas.clear(); for (const J of jog) { J.botao = false; J.stick = null; } },
  };
}
