// Cortada lenta: elegibilidade, escalas, tiro sempre dentro e o cortador nunca cruza a rede.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarSlime, criarBola, prever, LARG, REDE_R } from '../src/fisica/volei.js';
import { elegivel, iniciar, escalas, resolverTiro, faixaAlvo, CORTADA } from '../src/jogo/cortada.js';
import { criarPartida } from '../src/jogo/partida.js';
import { PASSO } from '../src/fisica/volei.js';

function cena() {
  const s = criarSlime(-1, -3);
  s.noChao = false; s.y = 3; s.tAr = 0.2;
  const b = criarBola();
  b.solta = true; b.x = -2.6; b.y = 6.2; b.vx = 0; b.vy = -3;
  return { s, b };
}

test('nao arma na recepcao de saque nem com bola de super/cortada', () => {
  const { s, b } = cena();
  const base = { slime: s, bola: b, meus: 1, recepcaoSaque: false, bolaEspecial: false, toqueAnteriorMeu: false, nivel: 1, tutorial: false };
  assert.equal(elegivel(base), true);
  assert.equal(elegivel({ ...base, recepcaoSaque: true }), false);
  assert.equal(elegivel({ ...base, bolaEspecial: true }), false);
  assert.equal(elegivel({ ...base, meus: 3 }), false);
  s.noChao = true;
  assert.equal(elegivel(base), false);
});

test('escalas: entrada vai a 60/300 e a mira fica la', () => {
  const { s } = cena();
  const c = iniciar(0, s, { tMax: 1.2, alvoX: 8, gratis: false });
  c.t = 0;
  assert.deepEqual(escalas(c), { mundo: 1000, defensor: 1000, bola: 0 });
  c.t = CORTADA.entrada;
  const e = escalas(c);
  assert.equal(e.mundo, CORTADA.escalaMundo);
  c.fase = 'mirando';
  assert.equal(escalas(c).defensor, CORTADA.escalaDefensor);
});

test('o tiro cai na reticula (a ate 0,3 u) em toda a faixa, sem raspar o poste, de varios pontos de batida', () => {
  for (const lado of [-1, 1]) {
    const [x0, x1] = faixaAlvo(lado);
    for (const [bxa, by] of [[2.5, 6.5], [3.2, 7.6], [5, 7], [8, 7.5], [2.4, 5.2]]) {
      const bx = lado * bxa;
      for (let alvo = x0; alvo <= x1 + 1e-9; alvo += 0.25) {
        const r = resolverTiro(bx, by, alvo, lado, {});
        const p = prever({ x: bx, y: by, vx: r.vx, vy: r.vy, semLimite: true, fundo: [false, false] }, { tMax: 3, semVmax: true, pararNaRede: true });
        assert.equal(p.motivo, 'chao', `lado ${lado} batida (${bx}, ${by}) alvo ${alvo.toFixed(2)}: ${p.motivo}`);
        assert.ok(Math.abs(p.x - alvo) <= 0.3, `lado ${lado} batida (${bx}, ${by}) alvo ${alvo.toFixed(2)}: caiu em ${p.x.toFixed(2)}`);
      }
    }
  }
});

test('o tiro cai sempre dentro da faixa do outro lado, com vento maximo', () => {
  for (const lado of [-1, 1]) {
    const [x0, x1] = faixaAlvo(lado);
    for (const vento of [-1.5, 0, 1.5]) {
      for (let alvo = x0; alvo <= x1; alvo += 1.3) {
        const bx = lado * 2.5;
        const by = 6.5;
        const r = resolverTiro(bx, by, alvo, lado, { vento });
        const p = prever({ x: bx, y: by, vx: r.vx, vy: r.vy, semLimite: true, fundo: [false, false] }, { tMax: 3, vento, semVmax: true });
        assert.ok(p.x * lado < 0 && Math.abs(p.x) <= LARG + 0.5, `lado ${lado} vento ${vento} alvo ${alvo}: caiu em ${p.x} (${p.motivo})`);
        assert.ok(Math.abs(p.x) >= REDE_R, 'nao fica na rede');
      }
    }
  }
});

/** Cortada armada (roteiro) e o tempo real ate ela soltar, com o botao solto em `soltaEm` s. */
function tempoAteSoltar(soltaEm, o = {}) {
  const p = criarPartida({ modo: 'cpu', semente: 3, ...o });
  p.interacao();
  assert.ok(p.roteiro('cortada'));
  let t = 0;
  for (let k = 0; k < 120 * 4; k++) {
    p.intencao(0, { botao: t < soltaEm });
    p.passo();
    t += PASSO;
    for (const e of p.eventos) if (e.tipo === 'cortada-solta') return { t, e };
    p.eventos.length = 0;
  }
  return { t: Infinity, e: null };
}

test('o toque simples segura a camera lenta ate o tMinToque e corta com a mira padrao', () => {
  const toque = tempoAteSoltar(0);
  assert.ok(toque.e, 'soltou');
  assert.ok(toque.t >= CORTADA.entrada + CORTADA.tMinToque - PASSO, `soltou em ${toque.t.toFixed(3)} s`);
  assert.ok(toque.t <= CORTADA.entrada + CORTADA.tMinToque + 3 * PASSO, `soltou em ${toque.t.toFixed(3)} s`);
  assert.equal(toque.e.toque, true);
  assert.equal(toque.e.auto, true);
  assert.equal(toque.e.humano, true);
  // segurando alem do minimo: solta quando o dedo sai (nao e toque)
  const segurou = tempoAteSoltar(0.8);
  assert.ok(Math.abs(segurou.t - 0.8) <= 2 * PASSO, `soltou em ${segurou.t.toFixed(3)} s`);
  assert.equal(segurou.e.toque, false);
  // a variante "segura" nao tem minimo (a soltura rapida devolve o medidor)
  const segura = tempoAteSoltar(0, { gatilho: 'segura' });
  assert.ok(segura.t < CORTADA.entrada + 0.1, `soltou em ${segura.t.toFixed(3)} s`);
});
