// Dicas do cartao de derrota (M2d): a causa de cada ponto perdido, a principal da partida e os textos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CAUSAS, causaDoPonto, causaPrincipal } from '../src/jogo/dicas.js';
import { criarPartida } from '../src/jogo/partida.js';
import { TABELA } from '../src/i18n/textos.js';

test('a causa: o ponto de quem ganhou e colocada, o do proprio toque e erro; a bomba e cortada ou forte', () => {
  assert.equal(causaDoPonto('ponto', { ultimoDoVencedor: true, cortada: false }), 'colocada');
  assert.equal(causaDoPonto('ponto', { ultimoDoVencedor: false, cortada: false }), 'erro');
  assert.equal(causaDoPonto('bomba', { ultimoDoVencedor: true, cortada: true }), 'cortada');
  assert.equal(causaDoPonto('bomba', { ultimoDoVencedor: true, cortada: false }), 'forte');
  for (const m of ['ace', 'rede', 'toques4', 'bloqueio', 'fora']) assert.equal(causaDoPonto(m, { ultimoDoVencedor: true, cortada: false }), m);
  assert.ok(CAUSAS.includes(causaDoPonto('qualquer', { ultimoDoVencedor: false, cortada: false })));
});

test('a principal: a mais frequente, o empate na ordem de CAUSAS, nenhuma sem pontos', () => {
  assert.equal(causaPrincipal({ rede: 3, ace: 1 }), 'rede');
  assert.equal(causaPrincipal({ rede: 2, ace: 2 }), 'ace');
  assert.equal(causaPrincipal({}), '');
});

test('os textos das dicas em todas as linguas, curtos (cabem no cartao)', () => {
  for (const [lingua, t] of Object.entries(TABELA)) {
    for (const k of ['dica.titulo', 'dica.cortadaToque', 'dica.cortadaClique', ...CAUSAS.map((c) => 'dica.derrota.' + c)]) {
      assert.ok(t[k], `${k} em ${lingua}`);
      assert.ok(t[k].length <= 50, `${k} em ${lingua}: ${t[k].length}`);
    }
  }
});

test('a partida conta cada ponto perdido com a causa (a soma da o placar do outro)', () => {
  const p = criarPartida({ modo: 'demo', semente: 8 });
  p.interacao();
  for (let k = 0; k < 120 * 600 && p.estado !== 'fim'; k++) {
    p.passo();
    for (const e of p.eventos) if (e.tipo === 'ponto') assert.ok(CAUSAS.includes(e.causa), e.causa);
    p.eventos.length = 0;
  }
  for (const i of [0, 1]) {
    const soma = Object.values(p.resumo(i).perdas).reduce((a, b) => a + b, 0);
    assert.equal(soma, p.placar[1 - i]);
  }
});
