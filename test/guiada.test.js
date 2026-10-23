// Cortada guiada da 1a partida (M2d, a prova de falha): oferecida a todo mundo cedo (no 2o rali), a
// bola congela sobre o jogador esperando qualquer toque, o toque pula e corta sozinho na mira guiada e
// a Gota nao encosta: BOMBA. No Player Fit Test da 0.2.0 so 55% recebiam a guiada e 55% deles cortavam.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarPartida } from '../src/jogo/partida.js';
import { CORTADA } from '../src/jogo/cortada.js';

/** 1a partida com o jogador passivo: so toca para sacar (o saque de um toque). */
function passiva(semente) {
  const p = criarPartida({ modo: 'cpu', semente, primeira: true });
  p.interacao();
  return p;
}

function passo(p, tipos) {
  if (p.estado === 'saque' && p.sacador === 0 && p.saque.valendo && p.saque.fase === 'pronto') { p.intencao(0, { borda: true, botao: true }); p.passo(); p.intencao(0, { botao: false }); }
  p.passo();
  for (const e of p.eventos) tipos.push(e);
  p.eventos.length = 0;
}

test('oferecida a todo mundo antes de 20 s, com o medidor cheio (antes: 13 de 20 sementes, de 15 a 28 s)', () => {
  for (let s = 1; s <= 20; s++) {
    const p = passiva(s);
    const ev = [];
    while (p.guia.fase === 'esperando' && p.tPartida < 20) passo(p, ev);
    assert.notEqual(p.guia.fase, 'esperando', `semente ${s}`);
    assert.ok(p.jogadores[0].med.v >= 100, `semente ${s}: medidor`);
    assert.ok(ev.some((e) => e.tipo === 'tutorial-cortada'));
  }
});

test('congelada sem toque espera sem limite: nada de ponto, bola no alto, todo mundo quase parado', () => {
  const p = criarPartida({ modo: 'cpu', semente: 3, primeira: true });
  assert.ok(p.roteiro('guiada'));
  const placar = [...p.placar];
  const ev = [];
  const x0 = p.slimes.map((s) => s.x);
  for (let k = 0; k < 120 * 20; k++) passo(p, ev);
  assert.equal(p.guia.fase, 'congelada');
  assert.equal(p.estado, 'jogo');
  assert.deepEqual(p.placar, placar);
  assert.ok(p.bola.y > CORTADA.yMin);
  assert.ok(!ev.some((e) => e.tipo === 'ponto'));
  p.slimes.forEach((s, i) => assert.ok(Math.abs(s.x - x0[i]) < 1.5, `slime ${i} andou ${s.x - x0[i]}`));
});

test('um toque so (sem botao) pula, corta na mira guiada e vira BOMBA sem a Gota encostar', () => {
  for (const x of [-10.5, -6, -2.6]) {
    const p = criarPartida({ modo: 'cpu', semente: 5, primeira: true });
    p.roteiro('guiada');
    p.slimes[0].x = x;
    const ev = [];
    for (let k = 0; k < 60; k++) passo(p, ev);
    p.interacao();
    let ponto = null;
    for (let k = 0; k < 120 * 8 && !ponto; k++) { passo(p, ev); ponto = ev.find((e) => e.tipo === 'ponto'); }
    const tipos = ev.map((e) => e.tipo);
    const ordem = ['guia-salto', 'cortada-entra', 'cortada-mira', 'cortada-solta', 'ponto'].map((t) => tipos.indexOf(t));
    assert.ok(ordem.every((v, k) => v >= 0 && (k === 0 || v > ordem[k - 1])), `x ${x}: ${tipos.join(',')}`);
    const solta = ev.find((e) => e.tipo === 'cortada-solta');
    assert.ok(solta.guiada && solta.humano);
    assert.ok(!ev.slice(tipos.indexOf('cortada-solta')).some((e) => e.tipo === 'toque' && e.i === 1), `x ${x}: a Gota encostou`);
    assert.equal(ponto.i, 0);
    assert.equal(ponto.motivo, 'bomba');
    assert.equal(p.guia.fase, 'feito');
  }
});

test('no ar quando congela, o toque corta direto', () => {
  const p = criarPartida({ modo: 'cpu', semente: 7, primeira: true });
  p.roteiro('guiada');
  const s = p.slimes[0];
  s.y = 2.5; s.vy = 1; s.noChao = false; s.tAr = 0.3;
  p.passo();
  p.eventos.length = 0;
  p.interacao();
  const ev = [];
  for (let k = 0; k < 10; k++) passo(p, ev);
  assert.ok(ev.some((e) => e.tipo === 'cortada-entra'));
  assert.ok(!ev.some((e) => e.tipo === 'guia-salto'));
});

test('fora da 1a partida nao ha guia', () => {
  assert.equal(criarPartida({ modo: 'cpu', semente: 1, rival: 'pingo', curta: true }).guia.fase, 'feito');
  assert.equal(criarPartida({ modo: 'demo', semente: 1, primeira: true }).guia.fase, 'feito');
});
