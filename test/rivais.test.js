// Rivais: a chave de 32 (31 adversarios distintos, cada um com nome nas 3 linguas e nivel valido) e
// as cores (pedido de 2026-10-22: "os rivais vem sempre da mesma cor"): distintas dentro de cada
// caminho, longe da laranjinha, e a reserva quando o jogador veste uma cor parecida.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RIVAIS, COPAS, NIVEIS, corDoRival, rival, LIMIAR_COR, paramsIA, BOT, FORCA_NIVEL, ALIVIO, ELASTICO } from '../src/jogo/rivais.js';
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

test('o BOT (bot contra bot, ?auto) e o T2 de 2026-10-22 em literal, para a Copa mexer nos niveis', () => {
  assert.deepEqual({ ...BOT }, { vel: 9.0, reacao: 0.24, erro: 1.1, pulo: 0.35, corta: 0.2, super: 0.3, perfeita: 0.15, saqueErro: 0.08 });
});

test('a forca dos niveis: todos tem, e o caminho de cada Copa nunca enfraquece ate o chefe', () => {
  for (const id of Object.keys(NIVEIS)) assert.ok(Number.isFinite(FORCA_NIVEL[id]), id);
  for (const c of COPAS) {
    const f = c.rivais.map((id) => FORCA_NIVEL[rival(id).nivel]);
    for (let k = 1; k < f.length; k++) assert.ok(f[k] >= f[k - 1], `Copa ${c.n}: ${c.rivais[k]}`);
  }
});

/** O elastico de antes do M2d (2026-10-22), para provar que as partidas a 7 nao mudaram. */
function elasticoAntigo(r, placarCpu, placarHumano) {
  const base = { ...NIVEIS[r.nivel] };
  const dif = placarCpu - placarHumano;
  const f = r.chefe ? 0.5 : 1;
  if (dif >= 3) {
    const k = Math.min(1, (dif - 2) / 2) * f;
    base.erro *= 1 + 0.3 * k;
    base.reacao += 0.06 * k;
    base.corta *= 1 - 0.5 * k;
  } else if (dif <= -4) {
    const k = Math.min(1, (-dif - 3) / 2) * f;
    base.erro *= 1 - 0.15 * k;
  }
  return base;
}

test('elastico das partidas a 7 e da 1a da vida: o mesmo de antes, numero a numero', () => {
  for (const r of RIVAIS) {
    if (r.id === 'geleia') continue;
    for (let cpu = 0; cpu <= 9; cpu++) {
      for (let h = 0; h <= 9; h++) {
        const velho = elasticoAntigo(r, cpu, h);
        assert.deepEqual(paramsIA(r, { placarCpu: cpu, placarHumano: h, alvo: 7 }), velho, `${r.id} ${h}-${cpu}`);
        if (cpu <= 4 && h <= 4) assert.deepEqual(paramsIA(r, { placarCpu: cpu, placarHumano: h, alvo: 5, imperdivel: true }), velho);
      }
    }
  }
});

test('elastico das partidas a 5: so com a CPU na frente, monotono e limitado (o nivel nunca troca)', () => {
  const E = ELASTICO.curta;
  for (const r of RIVAIS) {
    const puro = NIVEIS[r.nivel];
    let antes = null;
    for (let dif = 0; dif <= 5; dif++) {
      const p = paramsIA(r, { placarCpu: dif, placarHumano: 0, alvo: 5 });
      if (dif < E.ini) assert.deepEqual(p, paramsIA(r, { placarCpu: 0, placarHumano: 0, alvo: 5 }));
      if (antes) {
        assert.ok(p.erro >= antes.erro - 1e-12 && p.reacao >= antes.reacao - 1e-12 && p.corta <= antes.corta + 1e-12, `${r.id} dif ${dif}`);
      }
      assert.ok(p.erro <= puro.erro * (r.id === 'geleia' ? 1.4 : 1) * (1 + E.erro) + 1e-9 && p.reacao <= puro.reacao + E.reacao + 1e-9);
      assert.equal(p.vel, puro.vel, 'a velocidade e a do nivel');
      antes = p;
    }
  }
});

test('alivio por derrota seguida: monotono, com teto, o chefe alivia menos e sem derrota e o nivel puro', () => {
  for (const r of RIVAIS) {
    const ctx = (d) => ({ placarCpu: 0, placarHumano: 0, alvo: 7, derrotas: d });
    assert.deepEqual(paramsIA(r, ctx(0)), paramsIA(r, { placarCpu: 0, placarHumano: 0, alvo: 7 }));
    let antes = paramsIA(r, ctx(0));
    for (let d = 1; d <= ALIVIO.max + 3; d++) {
      const p = paramsIA(r, ctx(d));
      assert.ok(p.erro >= antes.erro && p.reacao >= antes.reacao && p.pulo <= antes.pulo && p.corta <= antes.corta && p.saqueErro >= antes.saqueErro, `${r.id} ${d}`);
      if (d > ALIVIO.max) assert.deepEqual(p, paramsIA(r, ctx(ALIVIO.max)), 'teto');
      antes = p;
    }
  }
  if (ALIVIO.erro > 0) {
    const rei = rival('rei');
    const mingau = rival('mingau');
    const ganho = (r) => paramsIA(r, { placarCpu: 0, placarHumano: 0, derrotas: 2 }).erro / NIVEIS[r.nivel].erro;
    assert.ok(ganho(rei) < ganho(mingau), 'o chefe alivia menos');
  }
});
