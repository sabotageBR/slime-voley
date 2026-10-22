// Juiz da rede: deterministico, nunca muda a bola (o hash e igual com e sem ele), toda reacao
// volta ao posto em ate 2,5 s, aponta quem ganhou o ponto e leva ~1 bolada por partida.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarPartida } from '../src/jogo/partida.js';
import { criarJuiz, passoJuiz, forcarBolada, JUIZ, REACOES_FORTES, REACOES_FRACAS } from '../src/jogo/juiz.js';
import { PASSO } from '../src/fisica/volei.js';

/** Bot contra bot ate o fim: hash, placar e as boladas. */
function rodar(sem, o = {}) {
  const p = criarPartida({ modo: 'demo', semente: sem, ...o });
  p.interacao();
  const boladas = [];
  for (let k = 0; k < 120 * 400 && p.estado !== 'fim'; k++) {
    p.passo();
    for (const e of p.eventos) if (e.tipo === 'juiz-bolada') boladas.push(`${k}:${e.reacao}`);
    p.eventos.length = 0;
  }
  return { hash: p.hash(), placar: p.placar.join('-'), boladas: boladas.join(',') };
}

test('o juiz nunca muda a bola: a partida e identica com e sem ele, e deterministica', () => {
  for (const sem of [2, 7]) {
    const com = rodar(sem);
    const sem_ = rodar(sem, { juiz: false });
    assert.equal(com.hash, sem_.hash, `semente ${sem}: hash`);
    assert.equal(com.placar, sem_.placar);
    assert.deepEqual(rodar(sem), com, 'mesma semente, mesmas boladas');
  }
});

test('toda reacao da bolada volta ao posto em ate 2,5 s', () => {
  const bola = { x: 0, y: 3.4, vx: 0, vy: 0 };
  for (const r of new Set([...REACOES_FORTES, ...REACOES_FRACAS])) {
    const j = criarJuiz(5);
    assert.equal(forcarBolada(j, r), r);
    let t = 0;
    while (j.fase !== 'posto' && t < 5) { passoJuiz(j, PASSO, { bola, ativa: false, forte: false, ponto: null }); t += PASSO; }
    assert.ok(t <= JUIZ.durMax + 1e-9, `${r}: ${t.toFixed(2)} s`);
    assert.equal(j.x, JUIZ.x);
    assert.equal(j.y, JUIZ.piso);
    assert.equal(j.objeto, null, `${r}: o apito ou o bone voltou`);
  }
});

test('no ponto o juiz aponta e olha para quem ganhou', () => {
  const p = criarPartida({ modo: 'cpu', semente: 3 });
  p.interacao();
  p.roteiro('ponto-curto');
  for (let k = 0; k < 60; k++) { p.passo(); p.eventos.length = 0; }
  assert.equal(p.estado, 'ponto');
  assert.equal(p.juiz.aponta, -1, 'o ponto foi da esquerda');
  assert.ok(p.juiz.braco > 0.9, 'o braco subiu');
  assert.ok(p.juiz.olhar < -0.5, 'olha para a esquerda');
});

test('no rali a cabeca segue a bola', () => {
  const j = criarJuiz(1);
  for (let k = 0; k < 60; k++) passoJuiz(j, PASSO, { bola: { x: 8, y: 6, vx: 0, vy: 0 }, ativa: false, forte: false, ponto: null });
  assert.ok(j.olhar > 0.9 && j.olharY > 0.3, `olhar ${j.olhar.toFixed(2)}, ${j.olharY.toFixed(2)}`);
});

test('boladas: de 0,5 a 2 por partida em 20 sementes de bot', () => {
  let n = 0;
  for (let sem = 1; sem <= 20; sem++) n += rodar(sem).boladas.split(',').filter(Boolean).length;
  assert.ok(n / 20 >= 0.5 && n / 20 <= 2, `${(n / 20).toFixed(2)} por partida`);
});
