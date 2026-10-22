// Pele e campo da gosma: o isocontorno desenhado cai em cima da cupula fisica e o miolo nunca
// tem buraco (o Gosmao "oco" de 2026-10-22), em qualquer raio e nas duas qualidades da pele.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarSlime } from '../src/fisica/volei.js';
import { criarPele, assentar, PASSO_PELE } from '../src/jogo/pele.js';
import { criarCampo } from '../src/render/campo.js';
import { RAIO_CAMPO, LIMIAR, QUALIDADES } from '../src/render/cena.js';
import { N_PIG } from '../src/fisica/constantes.js';

/** O campo de um slime parado (raio R), como a vista monta: pele de raio 2 espalhada ate R. */
function campoDe(R, passo, celula) {
  const s = criarSlime(-1, 0);
  s.x = 0;
  const p = criarPele(s, passo);
  s.R = R;
  s.Rv = R;
  assentar(p, s);
  let esq = Infinity, dir = -Infinity, base = Infinity, topo = -Infinity;
  for (let i = 0; i < p.n; i++) {
    esq = Math.min(esq, p.x[i]); dir = Math.max(dir, p.x[i]);
    base = Math.min(base, p.y[i]); topo = Math.max(topo, p.y[i]);
  }
  const c = criarCampo({ janela: [-3.4, -0.7, 3.4, 4.0], celula, raio: RAIO_CAMPO });
  c.acumular({
    n: p.n, x: p.x, y: p.y, pig: new Float64Array(p.n * N_PIG), membros: Int32Array.from({ length: p.n }, (_, i) => i), iniSl: [0, p.n, p.n],
    slimes: [{ ativo: true, idx: 0, a11: 1, a12: 0, a21: 0, a22: 1, raio0: 0.925 * R, cx: 0, cy: 0.44 * R, esq, dir, base, topo,
      escNucleo: (R / p.R0) * (passo / PASSO_PELE.normal), dados: { ap: 0 } }, { ativo: false, idx: 1 }],
  });
  return c;
}

const rho = (c, i, j) => c.t0[(j * c.nx + i) * 4];

/** Topo do isocontorno em x = 0 (interpolado). */
function topoIso(c) {
  const i0 = Math.round((0 - c.janela[0]) / c.celula);
  for (let j = c.ny - 2; j >= 0; j--) {
    const a = rho(c, i0, j);
    const b = rho(c, i0, j + 1);
    if (a >= LIMIAR && b < LIMIAR) return c.janela[1] + (j + (a - LIMIAR) / (a - b)) * c.celula;
  }
  return 0;
}

const CASOS = [];
for (const [nome, passo, celula] of [['normal', PASSO_PELE.normal, QUALIDADES[0].celula], ['minima', PASSO_PELE.minima, QUALIDADES[3].celula]]) {
  for (const R of [1.6, 2.0, 2.5]) CASOS.push({ nome, passo, celula, R });
}

test('o topo da gosma desenhada fica em cima da cupula fisica (Encolher, normal e Gosmao)', () => {
  for (const k of CASOS) {
    const t = topoIso(campoDe(k.R, k.passo, k.celula));
    assert.ok(Math.abs(t - k.R) <= 0.06 * (k.R / 2), `${k.nome} R=${k.R}: topo ${t.toFixed(3)} longe de ${k.R}`);
  }
});

test('o miolo nunca tem buraco: toda celula dentro da cupula passa do limiar com folga', () => {
  for (const k of CASOS) {
    const c = campoDe(k.R, k.passo, k.celula);
    const dentro = k.R - 0.3;
    let fracas = 0;
    let n = 0;
    for (let j = 0; j < c.ny; j++) {
      for (let i = 0; i < c.nx; i++) {
        const x = c.janela[0] + i * c.celula;
        const y = c.janela[1] + j * c.celula;
        if (y < 0.25 || (x / dentro) ** 2 + (y / dentro) ** 2 > 1) continue;
        n++;
        if (rho(c, i, j) < LIMIAR * 1.15) fracas++;
      }
    }
    assert.ok(n > 50, 'amostra pequena demais');
    assert.equal(fracas, 0, `${k.nome} R=${k.R}: ${fracas} de ${n} celulas internas fracas (contorno em volta de buraco)`);
  }
});
