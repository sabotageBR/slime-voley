// Relogios e canais de escala da camera lenta.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarTempo, passoReal, escalarTudo, alfaCanal } from '../src/jogo/tempo.js';

test('com tudo em 1000, cada passo real e um passo de mundo', () => {
  const T = criarTempo();
  for (let k = 0; k < 100; k++) assert.deepEqual(passoReal(T, 1 / 120), { mundo: 1, defensor: 1, bola: 1 });
});

test('escala 70: o mundo anda 0,07x (ticks inteiros, sem perder resto)', () => {
  const T = criarTempo();
  T.escala.mundo = 70;
  T.escala.defensor = 300;
  let m = 0;
  let d = 0;
  for (let k = 0; k < 1000; k++) { const n = passoReal(T, 1 / 120); m += n.mundo; d += n.defensor; }
  assert.equal(m, 70);
  assert.equal(d, 300);
});

test('hitstop para tudo e o jogo-real continua', () => {
  const T = criarTempo();
  T.hitstop = 0.045;
  let soma = 0;
  for (let k = 0; k < 6; k++) soma += passoReal(T, 1 / 120).mundo;
  assert.equal(soma, 0);
  assert.ok(T.tJogo > 0.049);
  assert.equal(passoReal(T, 1 / 120).mundo, 1);
});

test('alfa do canal fica entre 0 e 1', () => {
  const T = criarTempo();
  escalarTudo(T, 60);
  for (let k = 0; k < 50; k++) {
    passoReal(T, 1 / 120);
    const a = alfaCanal(T, 'mundo', 0.5);
    assert.ok(a >= 0 && a <= 1);
  }
});
