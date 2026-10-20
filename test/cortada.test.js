// Cortada lenta: elegibilidade, escalas, tiro sempre dentro e o cortador nunca cruza a rede.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarSlime, criarBola, prever, LARG, REDE_R } from '../src/fisica/volei.js';
import { elegivel, iniciar, escalas, resolverTiro, faixaAlvo, CORTADA } from '../src/jogo/cortada.js';

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
