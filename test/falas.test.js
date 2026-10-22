// Falas dos slimes: todo id tem texto curto nas 3 linguas e um balbucio que existe; a recarga e o
// intervalo seguram a frequencia; nunca junto do balao de reacao; deterministico no bot.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FALAS, IDS_FALA, FALA, criarFalas, passoFalas, disparar, vozDaFala } from '../src/jogo/falas.js';
import { FRASES } from '../src/som/falas.js';
import { textos, IDIOMAS } from '../src/i18n/textos.js';
import { criarPartida } from '../src/jogo/partida.js';

test('todo id tem texto de ate 14 caracteres nas 3 linguas e o balbucio existe', () => {
  for (const l of IDIOMAS) {
    const T = textos(l);
    for (const id of IDS_FALA) {
      const s = T('fala.' + id);
      assert.notEqual(s, 'fala.' + id, `${l}: sem texto para ${id}`);
      assert.ok([...s].length <= 14, `${l}: "${s}" passa de 14`);
    }
  }
  for (const g of Object.values(FALAS)) assert.ok(FRASES[g.voz], `balbucio ${g.voz}`);
  assert.equal(vozDaFala('foiMalJuiz'), 'socorro');
});

test('recarga por slime e intervalo geral', () => {
  const f = criarFalas(1);
  assert.ok(disparar(f, 'inicio', 0), 'chance 1 fala');
  assert.equal(disparar(f, 'inicio', 1), null, 'no intervalo geral ninguem fala');
  for (let k = 0; k < 120 * FALA.intervalo + 2; k++) passoFalas(f, 1 / 120);
  assert.equal(disparar(f, 'inicio', 0), null, 'o mesmo slime na recarga');
  assert.ok(disparar(f, 'inicio', 1), 'o outro pode');
});

test('bot contra bot: falas na medida (de 4 a 25 por partida), deterministicas e nunca com o balao de reacao', () => {
  const rodar = (sem) => {
    const p = criarPartida({ modo: 'cpu', semente: sem });
    p.interacao();
    const ids = [];
    for (let k = 0; k < 120 * 300 && p.estado !== 'fim'; k++) {
      if (p.estado === 'saque' && p.sacador === 0 && p.saque.valendo) {
        p.intencao(0, { borda: true, botao: true });
        p.passo();
        p.intencao(0, { botao: false });
      }
      p.passo();
      for (const e of p.eventos) if (e.tipo === 'fala') ids.push(e.id);
      for (const J of p.jogadores) assert.ok(!(J.fala && J.reacao), 'fala e reacao juntas');
      p.eventos.length = 0;
    }
    return ids;
  };
  let n = 0;
  for (const sem of [1, 2, 3, 4]) {
    const a = rodar(sem);
    assert.deepEqual(rodar(sem), a);
    n += a.length;
  }
  assert.ok(n / 4 >= 4 && n / 4 <= 25, `${(n / 4).toFixed(1)} falas por partida`);
});
