// Power-ups (bolhas): sorteio so entre os liberados, a regra dos 60% para quem perde, a bolha
// nunca pega no saque, gelo de no maximo 0,6 s, aviso de 0,5 s contra o rival e determinismo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CATALOGO, INICIAIS, BOLHA, EFEITO, sortear, criarBolhas } from '../src/jogo/powerups.js';
import { criarPartida } from '../src/jogo/partida.js';
import { criarRng } from '../src/core/rng.js';
import { PASSO } from '../src/fisica/volei.js';

const TODOS = CATALOGO.map((c) => c.id);

test('catalogo: pesos somam 95 (a Bola Gigante, 5, ficou fora); os iniciais sao os do nivel 1', () => {
  assert.equal(CATALOGO.reduce((s, c) => s + c.peso, 0), 95);
  assert.deepEqual([...INICIAIS].sort(), ['congelar', 'cortadaGratis', 'fogo', 'gosmao', 'puloMola', 'segmento']);
  assert.ok(!TODOS.includes('gigante'));
});

test('sorteio: so entre os liberados, na proporcao dos pesos', () => {
  const r = criarRng(9);
  const n = { fogo: 0, turbo: 0 };
  for (let k = 0; k < 2000; k++) n[sortear(['fogo', 'turbo'], r)]++;
  assert.equal(n.fogo + n.turbo, 2000);
  assert.ok(Math.abs(n.fogo / 2000 - 10 / 18) < 0.05, JSON.stringify(n));
});

test('contra a CPU, com 2+ pontos de diferenca, 60% das bolhas nascem do lado de quem perde', () => {
  let perde = 0;
  const N = 600;
  for (let sem = 1; sem <= N; sem++) {
    const b = criarBolhas({ semente: sem, liberados: INICIAIS });
    b.passo(BOLHA.primeira + 0.1, { jogo: true, pegavel: false, bola: { x: 0, y: 0 }, placar: [0, 3], contraCpu: true });
    if (b.bolha.x < 0) perde++;
  }
  assert.ok(Math.abs(perde / N - BOLHA.perdedor) < 0.06, `${perde / N}`);
});

test('a bolha so anda no rali, avisa 0,8 s e some aos 8 s', () => {
  const b = criarBolhas({ semente: 3, liberados: ['fogo'] });
  const c = (jogo) => ({ jogo, pegavel: false, bola: { x: 99, y: 99 }, placar: [0, 0], contraCpu: true });
  b.passo(60, c(false));
  assert.equal(b.bolha, null);
  const tipos = [];
  for (let t = 0; t < 40; t += 0.05) for (const e of b.passo(0.05, c(true))) tipos.push([e.tipo, Math.round(t * 100) / 100]);
  const aviso = tipos.find((x) => x[0] === 'bolha-aviso');
  const nasce = tipos.find((x) => x[0] === 'bolha-nasce');
  const some = tipos.find((x) => x[0] === 'bolha-some');
  assert.ok(aviso && Math.abs(aviso[1] - BOLHA.primeira) < 0.1, `aviso ${aviso}`);
  assert.ok(nasce && Math.abs(nasce[1] - aviso[1] - BOLHA.aviso) < 0.11);
  assert.ok(some && Math.abs(some[1] - nasce[1] - BOLHA.vida) < 0.11);
});

/** Roteiro da bolha (congelar no caminho da bola) e roda ate pegar, devolvendo os eventos. */
function pegarBolha(o = {}) {
  const p = criarPartida({ modo: 'demo', semente: 4, powerups: INICIAIS, ...o });
  p.interacao();
  p.roteiro('bolha');
  return p;
}

test('a bola pega a bolha e o poder vai para quem tocou por ultimo; no saque ela nao pega', () => {
  const p = pegarBolha();
  const evs = [];
  for (let k = 0; k < 120 && p.bolha; k++) { p.passo(); evs.push(...p.eventos); p.eventos.length = 0; }
  const pw = evs.find((e) => e.tipo === 'powerup');
  assert.ok(pw, 'pegou');
  assert.equal(pw.i, 0);
  assert.equal(pw.alvo, 1);
  // a mesma cena com a bola vindo do saque: nao pega
  const q = pegarBolha();
  q.rali.recepcaoSaque = true;
  for (let k = 0; k < 60; k++) { q.passo(); for (const e of q.eventos) assert.notEqual(e.tipo, 'bolha-pega'); q.eventos.length = 0; }
});

test('congelar: aviso de 0,5 s antes de valer e no maximo 0,6 s preso', () => {
  const p = pegarBolha();
  let tPegou = -1;
  let tVale = -1;
  let presoPassos = 0;
  for (let k = 0; k < 120 * 4; k++) {
    p.passo();
    for (const e of p.eventos) {
      if (e.tipo === 'powerup') tPegou = p.tPartida;
      if (e.tipo === 'powerup-vale') tVale = p.tPartida;
    }
    p.eventos.length = 0;
    if (p.jogadores[1].gelo && p.jogadores[1].gelo.fase === 'preso') presoPassos++;
  }
  assert.ok(tPegou > 0 && tVale > 0, 'pegou e valeu');
  assert.ok(tVale - tPegou >= EFEITO.avisoRival - 1e-6, `aviso ${(tVale - tPegou).toFixed(3)}`);
  assert.ok(presoPassos * PASSO <= EFEITO.gelo.preso + 2 * PASSO, `preso ${(presoPassos * PASSO).toFixed(3)} s`);
});

test('bot contra bot com todas as bolhas: deterministico, termina e pega power-ups', () => {
  const rodar = (sem) => {
    const p = criarPartida({ modo: 'demo', semente: sem, powerups: TODOS });
    p.interacao();
    const pegos = [];
    for (let k = 0; k < 120 * 600 && p.estado !== 'fim'; k++) {
      p.passo();
      for (const e of p.eventos) if (e.tipo === 'powerup') pegos.push(e.id);
      p.eventos.length = 0;
    }
    return { fim: p.estado, hash: p.hash(), pegos: pegos.join(',') };
  };
  const a = rodar(21);
  assert.deepEqual(a, rodar(21));
  assert.equal(a.fim, 'fim');
  let total = 0;
  for (const sem of [21, 22, 23, 24]) total += rodar(sem).pegos.split(',').filter(Boolean).length;
  assert.ok(total >= 2, `power-ups pegos em 4 partidas: ${total}`);
});

test('primeira partida: nunca tem bolha', () => {
  const p = criarPartida({ modo: 'demo', semente: 2, primeira: true, powerups: TODOS });
  p.interacao();
  for (let k = 0; k < 120 * 120 && p.estado !== 'fim'; k++) {
    p.passo();
    for (const e of p.eventos) assert.ok(!String(e.tipo).startsWith('bolha'), e.tipo);
    p.eventos.length = 0;
  }
});
