// Bandeiras: os 195 paises (ONU + Vaticano e Palestina), sem repetir, cada um com a bandeira
// desenhada e o nome do navegador; o pais pelo idioma.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PAISES, paisDoIdioma, embaralharPaises, ehPais } from '../src/jogo/paises.js';
import { BANDEIRAS } from '../src/render/bandeiras.js';
import { criarRng } from '../src/core/rng.js';

test('195 paises, sem repetir, todos com bandeira e nada sobrando', () => {
  assert.equal(PAISES.length, 195);
  assert.equal(new Set(PAISES).size, 195);
  for (const p of PAISES) assert.ok(Array.isArray(BANDEIRAS[p]) && BANDEIRAS[p].length, `sem bandeira: ${p}`);
  for (const k of Object.keys(BANDEIRAS)) assert.ok(PAISES.includes(k), `bandeira a mais: ${k}`);
});

test('todo pais tem nome no navegador (Intl.DisplayNames) em pt, en e es', () => {
  for (const l of ['pt', 'en', 'es']) {
    const dn = new Intl.DisplayNames([l], { type: 'region' });
    for (const p of PAISES) assert.notEqual(dn.of(p), p, `${l}: ${p}`);
  }
});

test('pais pelo idioma do navegador e o sorteio sem repetir', () => {
  assert.equal(paisDoIdioma(['pt-BR', 'en']), 'BR');
  assert.equal(paisDoIdioma(['en', 'es-mx']), 'MX');
  assert.equal(paisDoIdioma(['pt']), '');
  assert.ok(ehPais('jp') && !ehPais('XX'));
  const l = embaralharPaises(criarRng(3), ['BR']);
  assert.equal(l.length, 194);
  assert.ok(!l.includes('BR'));
  assert.deepEqual(embaralharPaises(criarRng(3), ['BR']), l, 'deterministico');
});
