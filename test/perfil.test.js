// Perfil: curva de XP, trilha (premios conhecidos, skin equipada na hora), Gotas do desenho §3.7 e
// o save antigo continuando a valer.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { xpParaSubir, normalizarPerfil, aplicarGanho, rendimento, premiosDoNivel, proximosMarcos, TRILHA, GOTAS_POR_NIVEL, PRESENTES, presenteDaVitoria, darPresente } from '../src/jogo/perfil.js';
import { precoDe, temItem } from '../src/jogo/visual.js';
import { INICIAIS } from '../src/jogo/powerups.js';
import { REACOES_INICIAIS, reacao } from '../src/jogo/reacoes.js';
import { powerUp } from '../src/jogo/powerups.js';
import { skin } from '../src/jogo/skins.js';

test('curva: o nivel n pede 50 + 25(n-1) XP', () => {
  assert.equal(xpParaSubir(1), 50);
  assert.equal(xpParaSubir(2), 75);
  assert.equal(xpParaSubir(10), 275);
});

test('save antigo (sem nivel nem liberados) continua valendo, com os padroes', () => {
  const p = normalizarPerfil({ partidas: 3, vitorias: 2, fase: 2, controle: 'b', som: false, vibrar: true, gotas: 0 });
  assert.equal(p.partidas, 3);
  assert.equal(p.controle, 'b');
  assert.equal(p.som, false);
  assert.equal(p.nivel, 1);
  assert.equal(p.skin, 'laranjinha');
  assert.deepEqual([...p.liberados.powerups].sort(), [...INICIAIS].sort());
  assert.deepEqual([...p.liberados.reacoes].sort(), [...REACOES_INICIAIS].sort());
  assert.deepEqual(normalizarPerfil(null).liberados.skins, ['laranjinha']);
  assert.equal(normalizarPerfil({ gotas: -5, nivel: 'x' }).gotas, 0);
  // um save no nivel 7 sem os liberados recebe o que a trilha ja deu (sem trocar a skin)
  const n7 = normalizarPerfil({ nivel: 7 });
  for (const id of ['oculos', 'zzz']) assert.ok(n7.liberados.reacoes.includes(id), id);
  for (const id of ['turbo', 'ima', 'encolher']) assert.ok(n7.liberados.powerups.includes(id), id);
  assert.ok(n7.liberados.skins.includes('faixa'));
  assert.equal(n7.skin, 'laranjinha');
});

test('a trilha so cita premios que existem, e os niveis 2 a 13 tem premio', () => {
  for (let n = 2; n <= 13; n++) assert.ok(TRILHA[n] && TRILHA[n].length, `nivel ${n}`);
  for (const lista of Object.values(TRILHA)) {
    for (const pr of lista) {
      if (pr.tipo === 'reacao') assert.ok(reacao(pr.id), pr.id);
      if (pr.tipo === 'powerup') assert.equal(powerUp(pr.id).nivel, Number(Object.keys(TRILHA).find((k) => TRILHA[k].includes(pr))), pr.id);
      if (pr.tipo === 'skin') assert.equal(skin(pr.id).id, pr.id);
    }
  }
  assert.deepEqual(premiosDoNivel(14), [{ tipo: 'gotas', gotas: GOTAS_POR_NIVEL }]);
});

test('subir de nivel libera a trilha e equipa a skin nova; o resto do XP fica', () => {
  const p0 = normalizarPerfil({});
  const r = aplicarGanho(p0, { xp: 130, gotas: 40 });
  assert.equal(r.perfil.nivel, 3);
  assert.equal(r.perfil.xp, 5);
  assert.equal(r.perfil.gotas, 40);
  assert.ok(r.perfil.liberados.reacoes.includes('oculos'));
  assert.ok(r.perfil.liberados.skins.includes('listrado'));
  assert.equal(r.perfil.skin, 'listrado');
  assert.deepEqual(r.subiu.map((s) => s.nivel), [2, 3]);
  assert.equal(p0.nivel, 1, 'o perfil de entrada nao muda');
  // depois da trilha, cada nivel da Gotas
  const longe = aplicarGanho({ ...normalizarPerfil({}), nivel: 13, xp: 0 }, { xp: xpParaSubir(13), gotas: 0 });
  assert.equal(longe.perfil.gotas, GOTAS_POR_NIVEL);
});

test('Gotas e XP da partida (desenho §3.7)', () => {
  const perfeita = rendimento({ venceu: true, copa: 1, pontos: 7, aces: 0, bombas: 0, ralis10: 0, viradas: 0, perdidos: 0 });
  assert.equal(perfeita.gotas, 20 + 5 + 7 + 10);
  assert.equal(perfeita.xp, 30 + 14);
  const derrota = rendimento({ venceu: false, pontos: 3, aces: 1, bombas: 1, ralis10: 1, viradas: 0, perdidos: 7 });
  assert.equal(derrota.gotas, 8 + 3 + 2 + 2 + 3);
  assert.equal(derrota.xp, 12 + 6 + 3 + 3 + 5);
});

test('proximos marcos: os 4 niveis seguintes com premio', () => {
  assert.deepEqual(proximosMarcos(1).map((m) => m.nivel), [2, 3, 4, 5]);
  assert.equal(proximosMarcos(12).length, 4);
});

test('o resumo da partida bate com o placar', async () => {
  const { criarPartida } = await import('../src/jogo/partida.js');
  const p = criarPartida({ modo: 'demo', semente: 6 });
  p.interacao();
  for (let k = 0; k < 120 * 400 && p.estado !== 'fim'; k++) { p.passo(); p.eventos.length = 0; }
  const r = p.resumo(0);
  assert.equal(r.pontos, p.placar[0]);
  assert.equal(r.perdidos, p.placar[1]);
  assert.equal(r.venceu, p.placar[0] > p.placar[1]);
});

test('presentes das primeiras vitorias: itens do vestiario, vestidos no encaixe livre (ou de outro presente)', () => {
  for (const chave of PRESENTES) assert.ok(precoDe(chave) > 0, `${chave} existe e nao e gratis`);
  assert.equal(presenteDaVitoria(1), PRESENTES[0]);
  assert.equal(presenteDaVitoria(PRESENTES.length + 1), '');
  let p = normalizarPerfil({});
  const r1 = darPresente(p, 1);
  assert.equal(r1.chave, PRESENTES[0]);
  assert.ok(temItem(r1.perfil, PRESENTES[0]));
  const [, enc1, id1] = PRESENTES[0].split(':');
  assert.equal(r1.perfil.visual[enc1], id1);
  assert.equal(p.liberados.itens.length, 0, 'o perfil de entrada nao muda');
  // ja tinha: nada de novo
  assert.equal(darPresente(r1.perfil, 1).chave, '');
  // o encaixe com um item escolhido pelo jogador fica como esta; o de outro presente troca
  p = r1.perfil;
  for (let n = 2; n <= PRESENTES.length; n++) {
    const [, enc, id] = PRESENTES[n - 1].split(':');
    const meu = { cabeca: 'bandana', rosto: 'tapaOlho', boca: 'presas' }[enc];
    const escolhido = normalizarPerfil({ ...p, visual: { ...p.visual, [enc]: meu } });
    assert.equal(darPresente(escolhido, n).perfil.visual[enc], meu);
    p = darPresente(p, n).perfil;
    assert.equal(p.visual[enc], id);
  }
  assert.equal(darPresente(p, PRESENTES.length + 1).chave, '');
});
