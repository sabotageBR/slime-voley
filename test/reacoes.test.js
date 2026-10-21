// Reacoes (emoji) depois do ponto: 1 por ponto, nunca no rali, o rosto acompanha e a CPU responde
// de forma deterministica (rng proprio).
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

test('reagir: so fora do rali e 1 por ponto; o rosto faz a expressao', () => {
  const p = criarPartida({ modo: 'cpu', semente: 3 });
  p.interacao();
  assert.equal(p.reagir(0, 'rindo'), false, 'antes do 1o ponto nao vale');
  p.roteiro('ponto-curto');
  assert.equal(p.reagir(0, 'bravo'), true);
  assert.equal(p.jogadores[0].expr, 'furioso');
  assert.equal(p.reagir(0, 'rindo'), false, 'uma por ponto');
  assert.ok(p.eventos.some((e) => e.tipo === 'reacao' && e.id === 'bravo'));
  // o balao some sozinho
  for (let k = 0; k < 120 * (REACAO.dur + 0.1); k++) p.passo();
  assert.equal(p.jogadores[0].reacao, null);
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
