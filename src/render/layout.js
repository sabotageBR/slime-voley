// Layout responsivo (funcao pura): onde ficam o placar, a plateia, a quadra e os controles, e
// quantos px CSS vale 1 u do mundo.
//
// Retrato (celular em pe): a quadra ocupa a largura inteira (25,5 u: as duas meias quadras, as
// placas e uma folga), a camera so segue em y. Faixas de cima para baixo: placar, plateia (o que
// sobrar), quadra (21 u de mundo; no minimo 17) e o painel dos controles (a frente da quadra,
// escurecida). Prioridade: quadra > controles > plateia.
// Paisagem: esquema A (metades) usa a tela inteira; esquema B (botoes) recua a camera para os
// botoes nao cobrirem a quadra. Desktop: sem controles na tela.

/** Largura do mundo enquadrada (u) e janela vertical (u). */
export const LARG_MUNDO = 25.5;
export const JANELA_Y = 21;
export const JANELA_Y_MIN = 17;
/** Paisagem: janela vertical menor (os slimes ficam maiores; a camera segue a bola alta). */
export const JANELA_Y_PAISAGEM = 18;
/** Chao do mundo dentro da janela: o piso fica PISO_U acima da borda de baixo. */
export const PISO_U = 1.6;
/** Pilula da Poki (celular): canto superior esquerdo, a partir de y = 24 px. */
export const PILULA = Object.freeze({ x: 0, y: 24, w: 46, h: 62 });

/**
 * @typedef {Object} Layout
 * @property {'retrato'|'paisagem'|'desktop'} orient
 * @property {number} s              px CSS por u
 * @property {{ x: number, y: number, w: number, h: number }} quadra   retangulo da quadra na tela
 * @property {number[]} janela       [x0, y0, x1, y1] do mundo enquadrado
 * @property {{ x: number, y: number, w: number, h: number }|null} painel  faixa dos controles (retrato)
 * @property {{ x: number, y: number, w: number, h: number }} placar
 * @property {{ x: number, y: number, w: number, h: number }|null} plateia
 * @property {Array<{ id: string, x: number, y: number, r: number }>} botoes  esquema B e SUPER
 * @property {number} escalaUi
 * @property {{ t: number, r: number, b: number, l: number }} seguro
 */

/**
 * @param {{ W: number, H: number, seguro?: { t?: number, r?: number, b?: number, l?: number }, toque?: boolean, tablet?: boolean, esquema?: 'a'|'b' }} o
 * @returns {Layout}
 */
export function calcularLayout(o) {
  const W = Math.max(1, o.W);
  const H = Math.max(1, o.H);
  const sg = { t: o.seguro?.t || 0, r: o.seguro?.r || 0, b: o.seguro?.b || 0, l: o.seguro?.l || 0 };
  const toque = !!o.toque;
  const esquema = o.esquema || 'a';
  const retrato = H > W * 1.05;
  const escalaUi = Math.max(0.8, Math.min(1.25, Math.min(W, H) / 400));
  if (retrato) return retratoL(W, H, sg, toque, esquema, escalaUi);
  return paisagemL(W, H, sg, toque, esquema, escalaUi, !!o.tablet);
}

function retratoL(W, H, sg, toque, esquema, escalaUi) {
  const hUtil = H - sg.t - sg.b;
  const s = W / LARG_MUNDO;
  const placarH = hUtil < 700 ? 48 : 56;
  let painel = toque ? Math.max(200, Math.min(280, Math.round(0.3 * hUtil))) : 0;
  let janelaY = JANELA_Y;
  let quadraH = janelaY * s;
  let sobra = hUtil - placarH - quadraH - painel;
  if (sobra < 0 && toque) {
    // o painel cede ate 180, depois a janela do mundo ate 17 u
    const cede = Math.min(painel - 180, -sobra);
    painel -= cede;
    sobra += cede;
  }
  if (sobra < 0) {
    janelaY = Math.max(JANELA_Y_MIN, janelaY + sobra / s);
    quadraH = janelaY * s;
    sobra = hUtil - placarH - quadraH - painel;
  }
  const plateiaH = Math.max(0, sobra);
  const yPlacar = sg.t;
  const yPlateia = yPlacar + placarH;
  const yQuadra = yPlateia + plateiaH;
  const yPainel = yQuadra + quadraH;
  const quadra = { x: 0, y: yQuadra, w: W, h: quadraH };
  const y0 = -PISO_U;
  const janela = [-LARG_MUNDO / 2, y0, LARG_MUNDO / 2, y0 + janelaY];
  const botoes = [];
  const painelR = toque ? { x: 0, y: yPainel, w: W, h: H - yPainel } : null;
  if (toque && painelR) {
    if (esquema === 'b') {
      const cy = painelR.y + Math.min(painelR.h - sg.b, 230) * 0.5;
      const m = Math.max(24, sg.l + 18);
      botoes.push({ id: 'esq', x: m + 38, y: cy, r: 38 });
      botoes.push({ id: 'dir', x: m + 38 * 3 + 10, y: cy, r: 38 });
      botoes.push({ id: 'pulo', x: W - Math.max(24, sg.r + 18) - 48, y: cy + 8, r: 48 });
      botoes.push({ id: 'super', x: W - Math.max(24, sg.r + 18) - 48 - 70, y: cy - 58, r: 32 });
    } else {
      botoes.push({ id: 'super', x: W - Math.max(24, sg.r + 18) - 36, y: painelR.y + 46, r: 36 });
    }
  }
  return {
    orient: 'retrato', s, quadra, janela, painel: painelR,
    placar: { x: 0, y: yPlacar, w: W, h: placarH },
    plateia: plateiaH > 0 ? { x: 0, y: yPlateia, w: W, h: plateiaH } : null,
    botoes, escalaUi, seguro: sg,
  };
}

function paisagemL(W, H, sg, toque, esquema, escalaUi, tablet) {
  const placarH = H < 420 ? 44 : 52;
  let s;
  let margem = 0;
  if (!toque) {
    s = Math.min(W / LARG_MUNDO, (H - placarH * 0.3) / 15.5);
  } else if (esquema === 'b') {
    margem = Math.max(sg.l, sg.r) + 24 + 136 + 8;
    s = Math.min(H / JANELA_Y_PAISAGEM, (W - 2 * margem) / LARG_MUNDO);
  } else {
    s = Math.min(H / JANELA_Y_PAISAGEM, W / LARG_MUNDO);
    if (tablet) s = Math.min(H / (JANELA_Y * 0.85), W / (LARG_MUNDO + 4));
  }
  const janelaW = W / s;
  const janelaY = H / s;
  // piso a 20% da base (desktop: 12%)
  const yPiso = toque ? 0.2 : 0.12;
  const y0 = -janelaY * yPiso;
  const janela = [-janelaW / 2, y0, janelaW / 2, y0 + janelaY];
  const quadra = { x: (W - LARG_MUNDO * s) / 2, y: 0, w: LARG_MUNDO * s, h: H };
  const botoes = [];
  if (toque) {
    if (esquema === 'b') {
      const cy = H - Math.max(24, sg.b + 16) - 32;
      const ml = Math.max(24, sg.l + 16);
      const mr = Math.max(24, sg.r + 16);
      botoes.push({ id: 'esq', x: ml + 32, y: cy, r: 32 });
      botoes.push({ id: 'dir', x: ml + 32 * 3 + 8, y: cy, r: 32 });
      botoes.push({ id: 'pulo', x: W - mr - 40, y: cy - 8, r: 40 });
      botoes.push({ id: 'super', x: W - mr - 40, y: cy - 96, r: 30 });
    } else {
      botoes.push({ id: 'super', x: W - Math.max(24, sg.r + 16) - 34, y: H * 0.42, r: 34 });
    }
  }
  return {
    orient: toque ? 'paisagem' : 'desktop', s, quadra, janela, painel: null,
    placar: { x: 0, y: sg.t, w: W, h: placarH },
    plateia: null, botoes, escalaUi, seguro: sg,
  };
}
