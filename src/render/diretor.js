// Diretor de camera: o enquadramento base do layout x close da comemoracao x tremor x seguir a
// bola (retrato: so em y; paisagem: um pouco em x e y) x recuo da Jornada x push-in da mira.
// Devolve a camera do quadro (src/render/camera.js). O toque e o HUD usam a camera base.

/**
 * @typedef {Object} Efeitos
 * @property {number} [zoom]      close (1 = nada)
 * @property {number[]} [foco]    ponto do close (u)
 * @property {number} [recuo]     u a mais de janela para cima (Jornada)
 * @property {boolean} [reduzir]  reduzir movimento (sem tremor nem close forte)
 */

export function criarDiretor() {
  const st = { zoom: 1, fx: 0, fy: 4, trauma: 0, segueY: 0, segueX: 0, t: 0, recuo: 0 };

  /**
   * @param {import('./layout.js').Layout} L
   * @param {{ x: number, y: number }} bola
   * @param {number} dt s de jogo-real
   * @param {Efeitos} [ef]
   * @returns {{ base: import('./camera.js').Camera, cam: import('./camera.js').Camera }}
   */
  function quadro(L, bola, dt, ef = {}) {
    st.t += dt;
    const [x0, y0, x1, y1] = L.janela;
    const base = { s: L.s, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, sx: L.quadra.x + L.quadra.w / 2, sy: L.quadra.y + L.quadra.h / 2 };
    // seguir a bola alta (sem passar do chao)
    const folga = L.orient === 'retrato' ? 2.6 : 2.2;
    const alvoY = Math.max(0, bola.y + folga - y1);
    const kS = 1 - Math.exp(-dt * (alvoY > st.segueY ? 9 : 4));
    st.segueY += (alvoY - st.segueY) * kS;
    const alvoX = L.orient === 'retrato' ? 0 : Math.max(-0.6, Math.min(0.6, bola.x * 0.05));
    st.segueX += (alvoX - st.segueX) * (1 - Math.exp(-dt * 3));
    // recuo (Jornada): a camera abre para cima
    const r = ef.recuo || 0;
    st.recuo += (r - st.recuo) * (1 - Math.exp(-dt * 4));
    const zAlvo = ef.reduzir ? 1 + ((ef.zoom || 1) - 1) * 0.3 : ef.zoom || 1;
    st.zoom += (zAlvo - st.zoom) * (1 - Math.exp(-dt * (zAlvo > st.zoom ? 18 : 7)));
    if (ef.foco) {
      st.fx += (ef.foco[0] - st.fx) * (1 - Math.exp(-dt * 14));
      st.fy += (ef.foco[1] - st.fy) * (1 - Math.exp(-dt * 14));
    }
    st.trauma = Math.max(0, st.trauma - dt * 1.8);
    const recuoK = st.recuo > 0.01 ? (y1 - y0) / (y1 - y0 + st.recuo) : 1;
    const s = base.s * st.zoom * recuoK;
    // o close puxa o centro para o foco (65% do caminho no zoom cheio)
    const z = Math.max(0, st.zoom - 1) / 0.4;
    let cx = base.cx + st.segueX + (st.fx - base.cx) * 0.65 * Math.min(1, z);
    let cy = base.cy + st.segueY + st.recuo * 0.5 + (st.fy - base.cy) * 0.65 * Math.min(1, z);
    // tremor (trauma^2)
    let sx = base.sx;
    let sy = base.sy;
    if (st.trauma > 0 && !ef.reduzir) {
      const a = st.trauma * st.trauma * 9;
      sx += Math.sin(st.t * 71.3) * a + Math.sin(st.t * 29.1) * a * 0.5;
      sy += Math.cos(st.t * 63.7) * a * 0.8;
    }
    return { base, cam: { s, cx, cy, sx, sy } };
  }

  return {
    quadro,
    /** tremor: soma trauma (0..1) */
    tremer(t) { st.trauma = Math.min(1, st.trauma + t); },
    get estado() { return st; },
  };
}
