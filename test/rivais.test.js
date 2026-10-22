// Rivais: a chave de 32 (31 adversarios distintos, cada um com nome nas 3 linguas e nivel valido) e
// as cores (pedido de 2026-10-22: "os rivais vem sempre da mesma cor"): distintas dentro de cada
// caminho, longe da laranjinha, e a reserva quando o jogador veste uma cor parecida.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RIVAIS, COPAS, NIVEIS, corDoRival, rival, LIMIAR_COR } from '../src/jogo/rivais.js';
import { TAM_COPA } from '../src/jogo/torneio.js';
import { CORES_BASE } from '../src/jogo/visual.js';
import { deltaE, linearDeHex } from '../src/cor/km.js';
import { TABELA as TEXTOS } from '../src/i18n/textos.js';

const dE = (a, b) => deltaE(linearDeHex(a), linearDeHex(b));
const LARANJA = CORES_BASE.find((c) => c.id === 'laranja').hex;

test('31 rivais distintos (a chave de 32), cada caminho com 5 da propria Copa e o chefe na final', () => {
  assert.equal(RIVAIS.length, TAM_COPA - 1);
  assert.equal(new Set(RIVAIS.map((r) => r.id)).size, RIVAIS.length);
  for (const r of RIVAIS) {
    assert.ok(NIVEIS[r.nivel], `${r.id}: nivel`);
    assert.ok(CORES_BASE.some((c) => c.id === r.cor) && CORES_BASE.some((c) => c.id === r.alt), `${r.id}: cor da paleta`);
    for (const lingua of Object.keys(TEXTOS)) assert.ok(TEXTOS[lingua]['rival.' + r.id], `${r.id}: nome em ${lingua}`);
  }
  const usados = COPAS.flatMap((c) => c.rivais);
  assert.equal(new Set(usados).size, usados.length, 'nenhum rival em dois caminhos');
  for (const c of COPAS) {
    assert.equal(c.rivais.length, 5);
    assert.ok(c.rivais.every((id) => rival(id).id === id && rival(id).copa === c.n));
    assert.ok(rival(c.rivais[4]).chefe, `Copa ${c.n}: o chefe na final`);
  }
});

test('as cores de cada caminho sao distintas entre si e longe da laranjinha; a reserva longe da principal', () => {
  for (const c of COPAS) {
    const hs = c.rivais.map((id) => rival(id).hex);
    for (let i = 0; i < hs.length; i++) {
      for (let j = i + 1; j < hs.length; j++) assert.ok(dE(hs[i], hs[j]) >= 15, `Copa ${c.n}: ${c.rivais[i]} e ${c.rivais[j]} parecidos`);
      assert.ok(dE(hs[i], LARANJA) >= LIMIAR_COR, `${c.rivais[i]} perto da laranjinha`);
    }
  }
  for (const r of RIVAIS) assert.ok(dE(r.hex, r.hexAlt) >= 15, `${r.id}: reserva parecida com a principal`);
});

test('o rival veste a reserva quando o jogador esta de cor parecida (e so entao)', () => {
  const gota = rival('gota');
  assert.equal(corDoRival(gota, LARANJA).hex, gota.hex);
  assert.equal(corDoRival(gota).hex, gota.hex);
  const azul = CORES_BASE.find((c) => c.id === 'azul').hex;
  assert.equal(corDoRival(gota, azul).hex, gota.hexAlt);
  for (const r of RIVAIS) {
    for (const c of CORES_BASE) {
      const v = corDoRival(r, c.hex);
      assert.ok(v.hex === r.hex || v.hex === r.hexAlt);
      if (dE(r.hex, c.hex) >= LIMIAR_COR) assert.equal(v.hex, r.hex);
      else assert.ok(dE(v.hex, c.hex) >= dE(r.hex, c.hex), `${r.id} contra ${c.id}`);
    }
  }
});
