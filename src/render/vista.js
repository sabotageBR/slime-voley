// Vista: o "mundo" que o campo da gosma (src/render/campo.js), os rostos (src/render/rostos.js) e
// a reserva 2D leem, montado a partir da pele de cada slime, interpolado entre o passo de mundo
// anterior e o atual (cada slime pelo proprio canal da camera lenta).
//
// Contrato (o mesmo do motor da gosma):
//   m.{ n, x, y, pig, membros, iniSl, slimes }
//   s.{ ativo, idx, n, a11, a12, a21, a22, raio0, cx, cy, esq, dir, base, topo, escNucleo, dados: { hex, expr, ap, apModo, textura, texturaT } }
// a11 = 1 + 0,18 sigma e a22 = 1 - 0,22 sigma (a deformacao da cupula). O rosto fica em
// base + 0,44 b, com raio0 = 0,925 R (olhos a 1,15 u da base num slime de raio 2). escNucleo
// multiplica o raio do nucleo do campo (o reticulado da pele so se espalha quando o raio muda).

import { N_PIG } from '../fisica/constantes.js';
import { eixosVisuais, limitar } from '../fisica/volei.js';
import { alfaCanal } from '../jogo/tempo.js';
import { PASSO_PELE } from '../jogo/pele.js';

/**
 * @param {ReturnType<typeof import('../jogo/partida.js').criarPartida>} partida
 */
export function criarVista(partida) {
  const peles = partida.peles;
  const n0 = peles[0].n;
  const n1 = peles[1].n;
  const n = n0 + n1;
  const m = {
    n,
    x: new Float64Array(n),
    y: new Float64Array(n),
    pig: new Float64Array(n * N_PIG),
    membros: Int32Array.from({ length: n }, (_, i) => i),
    iniSl: [0, n0, n],
    slimes: [0, 1].map((idx) => ({
      ativo: true, idx, n: idx ? n1 : n0, nivel: 1,
      a11: 1, a12: 0, a21: 0, a22: 1, raio0: 1.85, cx: 0, cy: 0, esq: 0, dir: 0, base: 0, topo: 0, escNucleo: 1,
      dados: { hex: '#ff8a2a', expr: '', ap: 0, apModo: 0, textura: 0, texturaT: 1 },
    })),
    paredes: [],
  };
  /** posicoes interpoladas dos slimes (x, y da base, sigma) e da bola */
  const slimes = [{ x: 0, y: 0, sig: 0, a: 2, b: 2 }, { x: 0, y: 0, sig: 0, a: 2, b: 2 }];
  const bola = { x: 0, y: 0, ang: 0 };

  /**
   * Pigmento e cor de cada slime (skin).
   * @param {0|1} i @param {number[]} pig @param {string} hex @param {number} [ap]
   */
  function vestir(i, pig, hex, ap = 0) {
    const a = m.iniSl[i];
    const b = m.iniSl[i + 1];
    for (let k = a; k < b; k++) for (let c = 0; c < N_PIG; c++) m.pig[k * N_PIG + c] = pig[c] || 0;
    m.slimes[i].dados.hex = hex;
    m.slimes[i].dados.ap = ap;
  }

  /**
   * Atualiza o mundo de desenho para este quadro.
   * @param {number} alfaLaco fracao do passo real (0..1)
   */
  function atualizar(alfaLaco) {
    const T = partida.tempo;
    const ant = partida.anterior;
    const c = partida.cortada;
    for (const i of [0, 1]) {
      const canal = c && c.i !== i ? 'defensor' : 'mundo';
      const al = alfaCanal(T, canal, alfaLaco);
      const s = partida.slimes[i];
      const sa = ant.slimes[i];
      const p = peles[i];
      const pa = ant.peles[i];
      const off = m.iniSl[i];
      let esq = Infinity;
      let dir = -Infinity;
      let base = Infinity;
      let topo = -Infinity;
      for (let k = 0; k < p.n; k++) {
        const x = pa.x[k] + (p.x[k] - pa.x[k]) * al;
        const y = pa.y[k] + (p.y[k] - pa.y[k]) * al;
        m.x[off + k] = x;
        m.y[off + k] = y;
        if (x < esq) esq = x;
        if (x > dir) dir = x;
        if (y < base) base = y;
        if (y > topo) topo = y;
      }
      const v = slimes[i];
      v.x = sa.x + (s.x - sa.x) * al;
      v.y = sa.y + (s.y - sa.y) * al;
      v.sig = sa.sig + (s.sig - sa.sig) * al;
      const Rv = sa.Rv + (s.Rv - sa.Rv) * al;
      const [ea, eb] = eixosVisuais({ ...s, sig: v.sig, Rv });
      v.a = ea;
      v.b = eb;
      const sm = m.slimes[i];
      sm.esq = esq;
      sm.dir = dir;
      sm.base = base;
      sm.topo = topo;
      sm.cx = v.x;
      sm.cy = v.y + 0.44 * eb;
      sm.a11 = limitar(ea / Rv, 0.75, 1.3);
      sm.a22 = limitar(eb / Rv, 0.75, 1.3);
      sm.raio0 = 0.925 * Rv;
      // nucleo do campo na escala da pele (o reticulado so se espalha quando o raio muda)
      sm.escNucleo = (Rv / p.R0) * (p.passo / PASSO_PELE.normal);
      const J = partida.jogadores[i];
      sm.dados.expr = J.expr;
    }
    const b = partida.bola;
    const balfa = c && c.fase !== 'soltando' ? 1 : alfaCanal(T, 'bola', alfaLaco);
    bola.x = ant.bola.x + (b.x - ant.bola.x) * balfa;
    bola.y = ant.bola.y + (b.y - ant.bola.y) * balfa;
    bola.ang = b.ang;
    return m;
  }

  return { m, slimes, bola, atualizar, vestir };
}
