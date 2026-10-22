// Reacoes (emoji): o jogador reage a qualquer hora (inclusive no rali) com recarga, o rosto
// acompanha (menos na cortada lenta) e a CPU responde fora do rali, de forma deterministica.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REACOES, REACOES_INICIAIS, REACAO, escolherReacaoCpu } from '../src/jogo/reacoes.js';
import { criarPartida } from '../src/jogo/partida.js';
import { criarRng } from '../src/core/rng.js';

test('catalogo: 6 da base e 4 da trilha, cada uma com expressao', () => {
  assert.equal(REACOES_INICIAIS.length, 6);
  assert.equal(REACOES.length, 10);
  for (const r of REACOES) assert.ok(r.expr, r.id);
});

test('reagir: a qualquer hora, com recarga; o rosto faz a expressao e o balao some', () => {
  const p = criarPartida({ modo: 'cpu', semente: 3 });
  p.interacao();
  assert.equal(p.reagir(0, 'rindo'), true, 'antes do 1o ponto ja vale');
  assert.equal(p.reagir(0, 'bravo'), false, 'na recarga nao vale');
  for (let k = 0; k < 120 * (REACAO.recarga + 0.05); k++) p.passo();
  assert.equal(p.jogadores[0].reacao, null, 'o balao sumiu');
  p.roteiro('ponto-curto');
  assert.equal(p.reagir(0, 'bravo'), true, 'depois da recarga vale de novo');
  assert.equal(p.jogadores[0].expr, 'furioso');
  assert.ok(p.eventos.some((e) => e.tipo === 'reacao' && e.id === 'bravo'));
});

test('reagir no rali: vale para o jogador, nunca para a CPU; na cortada lenta o rosto fica focado', () => {
  const p = criarPartida({ modo: 'cpu', semente: 5 });
  p.interacao();
  p.roteiro('cortada');
  assert.ok(p.cortada, 'a mira armou');
  assert.equal(p.estado, 'jogo');
  assert.equal(p.reagir(0, 'gargalhada'), true);
  assert.equal(p.jogadores[0].expr, 'focado', 'a cortada segura o rosto focado');
  assert.ok(p.jogadores[0].reacao, 'o balao sobe mesmo assim');
  assert.equal(p.reagir(1, 'rindo'), false, 'a CPU nao reage no rali');
});

test('a CPU responde as vezes, igual nas duas rodadas com a mesma semente', () => {
  const rodar = (sem) => {
    const p = criarPartida({ modo: 'cpu', semente: sem });
    p.interacao();
    p.roteiro('ponto-curto');
    p.reagir(0, 'coracao');
    const ids = [];
    for (let k = 0; k < 120 * 1.5; k++) { p.passo(); for (const e of p.eventos) if (e.tipo === 'reacao' && e.i === 1) ids.push(e.id); p.eventos.length = 0; }
    return ids.join(',');
  };
  const todas = [];
  for (let sem = 1; sem <= 30; sem++) {
    const a = rodar(sem);
    assert.equal(a, rodar(sem));
    if (a) todas.push(a);
  }
  assert.ok(todas.length >= 5 && todas.length <= 25, `a CPU reagiu em ${todas.length} de 30`);
});

test('escolha da CPU: coracao responde coracao; ganhando provoca, perdendo reclama', () => {
  const r = criarRng(1);
  assert.equal(escolherReacaoCpu(r, { ganhou: true, resposta: 'coracao' }), 'coracao');
  for (let k = 0; k < 20; k++) assert.ok(['convencido', 'rindo', 'gargalhada'].includes(escolherReacaoCpu(r, { ganhou: true })));
  for (let k = 0; k < 20; k++) assert.ok(['bravo', 'chorando'].includes(escolherReacaoCpu(r, { ganhou: false })));
});
