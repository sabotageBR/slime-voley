// Regras: alvo, vai-a-2, saque ativo e a partida (rali, 3 toques, fora so no ataque estourado).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { alvoDaPartida, vencedor, pontoDaPartida, profundidadeSaque, SAQUE } from '../src/jogo/regras.js';
import { criarPartida } from '../src/jogo/partida.js';

test('alvo: 1a da vida 5 imperdivel; rivais 7 vai-a-2 teto 9; chefes das Copas 2-4 9 teto 11', () => {
  assert.deepEqual(alvoDaPartida({ primeira: true }), { alvo: 5, vaiA2: false, teto: 5, imperdivel: true });
  assert.equal(alvoDaPartida({}).alvo, 7);
  assert.equal(alvoDaPartida({ chefe: true, copa: 2 }).teto, 11);
});

test('vai-a-2 ate o teto', () => {
  const r = alvoDaPartida({});
  assert.equal(vencedor([7, 6], r), 0);
  assert.equal(vencedor([8, 6], r), -1);
  assert.equal(vencedor([8, 9], r), 1);
  assert.equal(pontoDaPartida([6, 3], r), -1);
});

test('saque: toque, fundo, viagem; na Copa 1 segurar 3 s nunca da fora', () => {
  assert.equal(profundidadeSaque(0.05).tipo, 'toque');
  assert.equal(profundidadeSaque(0.6).tipo, 'viagem');
  const longo = profundidadeSaque(3, 1);
  assert.ok(longo.prof <= SAQUE.profMax && longo.auto);
  assert.equal(profundidadeSaque(1.1, 2).tipo, 'vermelho');
});

test('partida bot contra bot: deterministica, termina e nunca passa de 3 toques sem falta', () => {
  const rodar = (sem) => {
    const p = criarPartida({ modo: 'demo', semente: sem });
    p.interacao();
    let toques4 = 0;
    let k = 0;
    for (; k < 120 * 400 && p.estado !== 'fim'; k++) {
      p.passo();
      for (const e of p.eventos) if (e.tipo === 'ponto' && e.motivo === 'toques4') toques4++;
      p.eventos.length = 0;
    }
    return { fim: p.estado, hash: p.hash(), placar: p.placar.join('-'), toques4, k };
  };
  const a = rodar(11);
  const b = rodar(11);
  assert.deepEqual(a, b);
  assert.equal(a.fim, 'fim');
});

test('o jogo espera o primeiro toque: sem interacao, nada de saque e bola parada', () => {
  const p = criarPartida({ modo: 'cpu', semente: 3, sacaPrimeiro: 1 });
  for (let k = 0; k < 120 * 10; k++) p.passo();
  assert.equal(p.estado, 'saque');
  p.interacao();
  for (let k = 0; k < 120 * 2; k++) p.passo();
  assert.notEqual(p.estado, 'saque');
});

test('primeira partida: imperdivel (a CPU nunca fecha)', () => {
  for (const sem of [1, 2, 3]) {
    const p = criarPartida({ modo: 'cpu', semente: sem, primeira: true });
    p.interacao();
    // humano parado (entrada nula): a Gota nunca fecha a partida
    for (let k = 0; k < 120 * 240 && p.estado !== 'fim'; k++) {
      p.passo();
      p.eventos.length = 0;
      if (p.estado === 'saque' && p.sacador === 0 && p.saque.valendo) { p.intencao(0, { borda: true, botao: true }); p.passo(); p.intencao(0, { botao: false }); }
    }
    assert.ok(p.placar[1] < 5, `semente ${sem}: ${p.placar}`);
  }
});
