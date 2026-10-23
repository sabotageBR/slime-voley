// Novato simulado (test/apoio/humano-simulado.js, M2d): o jogador humano de mentira que calibra a
// Copa no tools/calibrar.mjs. Deterministico pela semente, dirige o slime 0 pela entrada do main.js
// (as protecoes valem), vence a 1a partida da vida, saca com os dois toques e corta.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarPartida } from '../src/jogo/partida.js';
import { criarNovato, jogarPartida, talentoDaVida, NOVATO } from './apoio/humano-simulado.js';
import { jogarCopa } from './apoio/copa-simulada.js';

const PODERES = ['cortadaGratis', 'segmento', 'congelar', 'fogo', 'gosmao', 'puloMola'];

test('deterministico: a mesma semente da a mesma partida; o talento vem da vida', () => {
  const um = () => jogarPartida(criarPartida, { semente: 9, rival: 'pingo', curta: true, powerups: PODERES }, criarNovato(9));
  const a = um();
  const b = um();
  assert.deepEqual(a.placar, b.placar);
  assert.equal(a.t, b.t);
  assert.equal(a.partida.hash(), b.partida.hash());
  assert.equal(talentoDaVida(4), talentoDaVida(4));
  assert.ok(talentoDaVida(4, { ...NOVATO, aprende: 0.1 }, 3) > talentoDaVida(4, { ...NOVATO, aprende: 0.1 }, 0), 'aprende com as partidas');
});

test('o novato vence a 1a partida da vida (imperdivel) em ate 3 min', () => {
  for (const s of [1, 2, 3, 4, 5, 6]) {
    const r = jogarPartida(criarPartida, { semente: s, rival: 'gota', primeira: true }, criarNovato(s, { h: 0 }));
    assert.ok(r.venceu && r.t < 180, `semente ${s}: ${r.placar} em ${r.t.toFixed(0)} s`);
  }
});

test('saque de dois toques: o 2o toque no ideal e PERFEITO, um pouco tarde e BOM, bem tarde e FRACO', () => {
  for (const [vies, q] of [[0, 'perfeito'], [0.12, 'bom'], [0.3, 'fraco']]) {
    const n = criarNovato(3, { h: 0.5, saque: { cedo: 0, esquece: 0, desvio: 0, vies } });
    jogarPartida(criarPartida, { semente: 3, rival: 'pingo', curta: true, sacaPrimeiro: 0 }, n);
    const s = n.stats.saques;
    assert.ok(s[q] > 0 && s[q] === s.perfeito + s.bom + s.fraco, `vies ${vies}: ${JSON.stringify(s)}`);
  }
});

test('o novato corta (o medidor cheio e a bola alta do lado dele)', () => {
  let cortadas = 0;
  for (const s of [1, 2, 3]) {
    const n = criarNovato(s, { h: 0.6, cortada: { chance: 1 } });
    jogarPartida(criarPartida, { semente: s, rival: 'pingo', curta: true, powerups: PODERES }, n);
    cortadas += n.stats.cortadas;
  }
  assert.ok(cortadas > 0);
});

test('entrada nula: a CPU faz o 1o ponto em ate 15 s', () => {
  for (let s = 1; s <= 8; s++) {
    const p = criarPartida({ modo: 'cpu', juiz: false, semente: s, rival: 'pingo', curta: true, sacaPrimeiro: 1 });
    const n = criarNovato(s, { nulo: true });
    let ponto = null;
    for (let k = 0; k < 120 * 15 && !ponto; k++) {
      n.jogar(p);
      p.passo();
      ponto = p.eventos.find((e) => e.tipo === 'ponto') || null;
      p.eventos.length = 0;
    }
    assert.ok(ponto && ponto.i === 1, `semente ${s}`);
  }
});

test('a Copa simulada joga sobre o save: derrota conta, vitoria avanca e o titulo encerra', () => {
  const v = jogarCopa(2, { h: 1 }, { max: 25 });
  assert.ok(v.partidas.length > 0);
  assert.equal(v.partidas[0].rival, 'gota');
  for (const p of v.partidas) if (p.tentativa > 1) assert.ok(p.derrotas === p.tentativa - 1, 'as derrotas seguidas chegam na partida');
  assert.equal(v.perfil.partidas, v.partidas.length);
  if (v.campeao) assert.equal(v.partidas.filter((p) => p.venceu).length, 5);
});
