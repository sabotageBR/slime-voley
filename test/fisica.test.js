// Fisica do volei: angulos da cupula (normal e saida separadas), espelho, rede, placas, rede de
// fundo, numeros derivados e determinismo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  criarSlime, criarBola, passoBola, passoSlime, eixos, pertoCupula, prever, limitesX,
  RB, E_SLIME, PULO, G_SLIME, ACEL_CHAO, REDE_R, PLACA_X, PLACA_H, FUNDO_X, PASSO, VMAX,
} from '../src/fisica/volei.js';

const graus = (r) => (r * 180) / Math.PI;

/** Toque em x = 0,5a com a bola caindo na vertical: normal e saida (graus da vertical). */
function angulos(sig) {
  const s = criarSlime(-1, -6);
  s.sig = sig;
  const [a, b] = eixos(s);
  const p = pertoCupula(s.x, 0, a, b, s.x + 0.5 * a, b * Math.sqrt(0.75) + 1e-4);
  const bola = criarBola();
  bola.solta = true;
  bola.colide = [true, false];
  bola.x = p.qx + p.nx * (RB - 0.002);
  bola.y = p.qy + p.ny * (RB - 0.002);
  bola.vx = 0;
  bola.vy = -12;
  // um subpasso so (sem a gravidade do passo inteiro mudando o angulo)
  const ev = passoBola(bola, [s], PASSO / 2 / 1000, {}, []);
  return { normal: graus(Math.atan2(p.nx, p.ny)), saida: graus(Math.atan2(bola.vx, bola.vy)), tocou: ev.some((e) => e.tipo === 'toque') };
}

/** A saida pela formula do reflexo (vertical para baixo, normal th): atan(ux/uy). */
function saidaTeorica(thGraus) {
  const th = (thGraus * Math.PI) / 180;
  const nx = Math.sin(th);
  const ny = Math.cos(th);
  const vn = -ny;
  const vx = -(1 + E_SLIME) * vn * nx;
  const vy = -1 - (1 + E_SLIME) * vn * ny;
  return graus(Math.atan2(vx, vy));
}

test('normal da cupula: 30 / 24 / 36 graus (redonda, achatada, esticada)', () => {
  const r = angulos(0);
  const ach = angulos(0.6);
  const est = angulos(-0.6);
  assert.ok(Math.abs(r.normal - 30) < 0.5, `redonda ${r.normal}`);
  assert.ok(Math.abs(ach.normal - 24.3) < 0.6, `achatada ${ach.normal}`);
  assert.ok(Math.abs(est.normal - 36.2) < 0.6, `esticada ${est.normal}`);
});

test('saida da bola segue o reflexo com E_SLIME (achatada levanta, esticada sai rasante)', () => {
  for (const sig of [0, 0.6, -0.6]) {
    const a = angulos(sig);
    assert.ok(a.tocou, 'tocou');
    assert.ok(Math.abs(a.saida - saidaTeorica(a.normal)) < 2, `sig ${sig}: ${a.saida} x ${saidaTeorica(a.normal)}`);
  }
  assert.ok(angulos(0.6).saida < angulos(0).saida && angulos(0).saida < angulos(-0.6).saida);
});

test('espelho: o lado direito e o esquerdo dao o mesmo angulo com o sinal trocado', () => {
  const s = criarSlime(1, 6);
  const [a, b] = eixos(s);
  const p = pertoCupula(s.x, 0, a, b, s.x - 0.5 * a, b * Math.sqrt(0.75));
  assert.ok(Math.abs(graus(Math.atan2(p.nx, p.ny)) + 30) < 0.5);
});

test('bola nao atravessa a rede nem a placa; a rede de fundo segura so o lado ativo', () => {
  const b = criarBola();
  b.solta = true;
  b.x = -3; b.y = 1.2; b.vx = 25; b.vy = 0;
  b.fundo = [true, true];
  for (let k = 0; k < 120; k++) passoBola(b, [], PASSO, {}, []);
  assert.ok(b.x < 0, `rede: ${b.x}`);
  const c = criarBola();
  c.solta = true;
  c.x = 10; c.y = 1.0; c.vx = 20; c.vy = 2; c.fundo = [true, false];
  const ev = [];
  for (let k = 0; k < 60; k++) passoBola(c, [], PASSO, {}, ev);
  assert.ok(ev.some((e) => e.tipo === 'placa'), 'bateu na placa');
  assert.ok(c.x < PLACA_X, 'nao passou da placa por baixo');
  // por cima da placa: lado inativo = fora; lado ativo = volta da rede de fundo
  const d = criarBola();
  d.solta = true; d.x = 11; d.y = PLACA_H + 3; d.vx = 12; d.vy = 0; d.fundo = [true, false];
  const ev2 = [];
  for (let k = 0; k < 30; k++) passoBola(d, [], PASSO, {}, ev2);
  assert.ok(ev2.some((e) => e.tipo === 'fora' && e.lado === 1), 'fora do lado direito');
  const f = criarBola();
  f.solta = true; f.x = 11; f.y = PLACA_H + 3; f.vx = 12; f.vy = 0; f.fundo = [true, true];
  const ev3 = [];
  for (let k = 0; k < 30; k++) passoBola(f, [], PASSO, {}, ev3);
  assert.ok(ev3.some((e) => e.tipo === 'fundo'), 'rede de fundo');
  assert.ok(f.x < FUNDO_X && f.vx < 0);
});

test('numeros derivados: apice do pulo, tempo no ar, faixa livre e travessia', () => {
  const apice = (PULO * PULO) / (2 * G_SLIME);
  assert.ok(Math.abs(apice - 3.89) < 0.02, `apice ${apice}`);
  assert.ok(Math.abs((2 * PULO) / G_SLIME - 0.68) < 0.01);
  const s = criarSlime(-1, -7);
  const [x0, x1] = limitesX(s);
  const faixa = x1 - x0;
  assert.ok(faixa > 7.9 && faixa < 8.5, `faixa ${faixa}`);
  // travessia da faixa com aceleracao de 85 (saindo do repouso)
  s.x = x0;
  let t = 0;
  while (s.x < x1 - 1e-6 && t < 3) { passoSlime(s, { eixo: 1, pular: false }, PASSO); t += PASSO; }
  assert.ok(t > 0.7 && t < 0.95, `travessia ${t}`);
  void ACEL_CHAO;
  void REDE_R;
});

test('VMAX por estado: cortada sem limite ate o contato (teto 34), Jornada 40 na subida', () => {
  const b = criarBola();
  b.solta = true; b.x = -6; b.y = 6; b.vx = 40; b.vy = -10; b.estado = 'cortada'; b.semLimite = true;
  passoBola(b, [], PASSO, {}, []);
  assert.ok(Math.hypot(b.vx, b.vy) <= VMAX.cortada + 1e-6);
  const j = criarBola();
  j.solta = true; j.x = -6; j.y = 2; j.vx = 1; j.vy = 50; j.estado = 'jornada';
  passoBola(j, [], PASSO, {}, []);
  assert.ok(Math.hypot(j.vx, j.vy) <= VMAX.jornadaSobe + 1e-6 && Math.hypot(j.vx, j.vy) > VMAX.normal);
});

test('prever bate com o passo da bola (mesmo integrador)', () => {
  const b0 = { x: -6, y: 5, vx: 9, vy: 8 };
  const p = prever(b0, { tMax: 4 });
  const b = criarBola();
  Object.assign(b, b0, { solta: true, fundo: [true, true] });
  let k = 0;
  for (; k < 600; k++) {
    const ev = passoBola(b, [], PASSO, {}, []);
    if (ev.some((e) => e.tipo === 'chao')) break;
  }
  assert.ok(Math.abs(p.x - b.x) < 1e-9 && Math.abs(p.t - (k + 1) * PASSO) < 1e-9);
});
