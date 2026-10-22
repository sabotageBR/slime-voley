// Copa Gosma: chave de 8 (Copa 1) e de 16 (Copas 2-4), caminho fixo do jogador pelos rivais da
// Copa (o chefe na final), rodadas reveladas a cada vitoria, revanche na mesma fase, titulo e a
// Copa seguinte; o save valida e o antigo (perfil.fase) vira a fase da Copa 1.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { novaCopa, chaveDaCopa, registrarVitoria, proximaCopa, normalizarCopa, caminhoDaCopa, trocarPais, FASES, NUM_COPAS } from '../src/jogo/torneio.js';
import { normalizarPerfil } from '../src/jogo/perfil.js';
import { COPAS } from '../src/jogo/rivais.js';

/** Vence todas as rodadas, devolvendo a chave de cada fase. */
function correr(c) {
  const chaves = [chaveDaCopa(c)];
  while (!chaves[chaves.length - 1].campeao) {
    c = registrarVitoria(c, [7, 3]);
    chaves.push(chaveDaCopa(c));
  }
  return { c, chaves };
}

test('Copa 1 com 8 e as Copas 2-4 com 16; vagas e bandeiras sem repetir; o jogador com a dele', () => {
  for (let n = 1; n <= NUM_COPAS; n++) {
    const ch = chaveDaCopa(novaCopa(n, 42, 'BR'));
    assert.equal(ch.tam, n === 1 ? 8 : 16);
    assert.equal(ch.rodadas.length, FASES[ch.tam].length);
    assert.equal(new Set(ch.vagas.map((v) => v.id)).size, ch.tam, 'rivais sem repetir');
    assert.equal(new Set(ch.vagas.map((v) => v.pais)).size, ch.tam, 'bandeiras sem repetir');
    assert.ok(ch.vagas[0].jogador && ch.vagas[0].pais === 'BR');
    assert.ok(ch.vagas.slice(1).every((v) => v.pais !== 'BR'), 'nenhum rival com a bandeira do jogador');
    assert.deepEqual(chaveDaCopa(novaCopa(n, 42, 'BR')), ch, 'deterministica');
  }
});

test('o caminho do jogador e o dos rivais da Copa, na ordem (o chefe na final)', () => {
  for (let n = 1; n <= NUM_COPAS; n++) {
    const { chaves } = correr(novaCopa(n, 7, 'JP'));
    const caminho = caminhoDaCopa(n);
    assert.deepEqual(caminho, COPAS[n - 1].rivais);
    chaves.slice(0, -1).forEach((ch, r) => {
      assert.equal(ch.adversario, caminho[r]);
      const j = ch.rodadas[r][0];
      assert.equal(ch.vagas[j.a].id, 'jogador');
      assert.equal(ch.vagas[j.b].id, caminho[r], `rodada ${r}: o rival do caminho chegou`);
    });
    assert.ok(chaves[chaves.length - 1].campeao);
  }
});

test('cada vitoria revela a rodada inteira, com placares plausiveis; perder e revanche da mesma fase', () => {
  let c = novaCopa(2, 99, 'MX');
  const antes = chaveDaCopa(c);
  assert.ok(antes.rodadas[0].every((j) => j.venc < 0), 'nada jogado no comeco');
  c = registrarVitoria(c, [7, 5]);
  const depois = chaveDaCopa(c);
  for (const j of depois.rodadas[0]) {
    assert.ok(j.venc === j.a || j.venc === j.b);
    const [x, y] = j.placar;
    const v = Math.max(x, y);
    assert.ok(v >= 7 && Math.abs(x - y) >= 2, `placar ${x}-${y}`);
  }
  assert.deepEqual(depois.rodadas[0][0].placar, [7, 5]);
  assert.ok(depois.rodadas[1].every((j) => j.a >= 0 && j.b >= 0), 'os confrontos da rodada atual aparecem');
  assert.ok(depois.rodadas[1].every((j) => j.venc < 0), 'mas nao foram jogados');
  // a derrota nao registra nada: a chave fica igual (revanche)
  assert.deepEqual(chaveDaCopa(c), depois);
  assert.equal(depois.nomeFase, 'quartas');
});

test('titulo e a Copa seguinte (a ultima se repete com outra chave)', () => {
  const { c } = correr(novaCopa(1, 3, 'AR'));
  const c2 = proximaCopa(c, 55);
  assert.equal(c2.n, 2);
  assert.equal(c2.fase, 0);
  assert.equal(c2.pais, 'AR');
  assert.equal(chaveDaCopa(c2).tam, 16);
  const c4 = proximaCopa(normalizarCopa({ n: 4, fase: 4, semente: 8 }), 9);
  assert.equal(c4.n, 4);
  assert.equal(trocarPais(c2, 'fr').pais, 'FR');
});

test('save: copa invalida vira a Copa 1; o perfil antigo (fase) continua na Copa 1', () => {
  assert.deepEqual(normalizarCopa(null, 5), novaCopa(1, 5));
  const c = normalizarCopa({ n: 9, fase: 99, semente: 4, placares: [[5, 1]] });
  assert.equal(c.n, NUM_COPAS);
  assert.equal(c.fase, 4);
  assert.equal(c.placares.length, 4);
  const p = normalizarPerfil({ partidas: 4, fase: 2 });
  assert.equal(p.copa.n, 1);
  assert.equal(p.copa.fase, 2);
  assert.equal(chaveDaCopa(p.copa).adversario, 'rei');
  assert.deepEqual(p.titulos, [0, 0, 0, 0]);
});
