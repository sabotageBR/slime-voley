// Vestiario: o visual salvo valida, a compra com Gotas, todo acessorio e toda estampa dos
// arquetipos tem desenho e texto, a skin da trilha veste sem tirar os acessorios e o pacote local
// de famosos registra os dele.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizarVisual, visualDaSkin, visualDoArquetipo, comprar, temItem, precoDe, ACESSORIOS, ARQUETIPOS, CORES_BASE, ENCAIXES, prontasExtras } from '../src/jogo/visual.js';
import { normalizarPerfil, aplicarGanho, xpParaSubir } from '../src/jogo/perfil.js';
import { ACESSORIOS_DESENHADOS } from '../src/render/acessorios.js';
import { estampasDesenhadas } from '../src/render/estampas.js';
import { textos, IDIOMAS } from '../src/i18n/textos.js';
import { hexDaMistura } from '../src/cor/km.js';

test('visual salvo: o invalido volta ao da skin; o hex sempre sai do pigmento', () => {
  assert.deepEqual(normalizarVisual(null, 'listrado'), visualDaSkin('listrado'));
  const v = normalizarVisual({ pig: [0.5, 0.6, 0, 0], padrao: 99, cor2: 'azul', estampa: '<script>', cabeca: 'coroa', rosto: 42 });
  assert.deepEqual(v.pig, visualDaSkin('laranjinha').pig, 'pigmento com soma > 1 nao vale');
  assert.equal(v.padrao, 0);
  assert.equal(v.cor2, '#ffffff');
  assert.equal(v.estampa, '');
  assert.equal(v.cabeca, 'coroa');
  assert.equal(v.rosto, '');
  const c = CORES_BASE[8];
  assert.equal(normalizarVisual({ pig: c.pig, hex: '#000000' }).hex, hexDaMistura(c.pig));
  for (const e of ['bandeira', 'pintura', 'arq:mumia', 'famoso:teia']) assert.equal(normalizarVisual({ estampa: e }).estampa, e);
});

test('compra com Gotas: sem saldo nao compra; com saldo desconta e o item fica; o gratis ja e seu', () => {
  const p = normalizarPerfil({ gotas: 100 });
  assert.ok(temItem(p, 'ac:cabeca:bone'), 'gratis');
  assert.equal(precoDe('ac:cabeca:coroa'), 80);
  const a = comprar(p, 'arq:goleiroMascarado');
  assert.equal(a.ok, false, '200 > 100');
  const b = comprar(p, 'ac:cabeca:coroa');
  assert.ok(b.ok);
  assert.equal(b.perfil.gotas, 20);
  assert.ok(temItem(b.perfil, 'ac:cabeca:coroa'));
  assert.equal(comprar(b.perfil, 'ac:cabeca:coroa').ok, false, 'nao compra duas vezes');
  assert.equal(p.gotas, 100, 'o perfil original nao muda');
  assert.deepEqual(normalizarPerfil(b.perfil).liberados.itens, ['ac:cabeca:coroa'], 'o save guarda o item');
});

test('todo acessorio e toda estampa de arquetipo tem desenho; tudo tem nome nas 3 linguas', () => {
  for (const enc of ENCAIXES) {
    const desenhados = ACESSORIOS_DESENHADOS[enc]();
    for (const a of ACESSORIOS[enc]) assert.ok(desenhados.includes(a.id), `${enc}/${a.id} sem desenho`);
  }
  for (const a of ARQUETIPOS) {
    const v = visualDoArquetipo(a.id);
    if (v.estampa) assert.ok(estampasDesenhadas().includes(v.estampa.slice(4)), `estampa ${v.estampa}`);
    for (const enc of ENCAIXES) if (v[enc]) assert.ok(ACESSORIOS[enc].some((x) => x.id === v[enc]), `${a.id}: ${enc} ${v[enc]}`);
    assert.ok(a.preco >= 120 && a.preco <= 250, `${a.id}: preco ${a.preco}`);
  }
  for (const l of IDIOMAS) {
    const T = textos(l);
    for (const a of ARQUETIPOS) assert.notEqual(T('arq.' + a.id), 'arq.' + a.id, `${l}: arq.${a.id}`);
    for (const enc of ENCAIXES) for (const a of ACESSORIOS[enc]) assert.notEqual(T('ac.' + a.id), 'ac.' + a.id, `${l}: ac.${a.id}`);
  }
});

test('a skin liberada pela trilha veste na hora e os acessorios ficam', () => {
  const p = normalizarPerfil({ nivel: 2, xp: 0, visual: { ...visualDaSkin('laranjinha'), cabeca: 'coroa', boca: 'bigode' } });
  const r = aplicarGanho(p, { xp: xpParaSubir(2), gotas: 0 });
  assert.equal(r.perfil.nivel, 3);
  assert.equal(r.perfil.skin, 'listrado');
  assert.equal(r.perfil.visual.pronta, 'listrado');
  assert.equal(r.perfil.visual.padrao, visualDaSkin('listrado').padrao);
  assert.equal(r.perfil.visual.cabeca, 'coroa');
  assert.equal(r.perfil.visual.boca, 'bigode');
});

test('o pacote local registra os 16 famosos, com os acessorios e as estampas deles', async () => {
  const { instalar } = await import('../src/extra/famosos.js');
  assert.equal(instalar(), 16);
  assert.equal(prontasExtras().length, 16);
  for (const f of prontasExtras()) {
    const v = visualDoArquetipo(f.id);
    assert.ok(v, f.id);
    if (v.estampa) assert.ok(estampasDesenhadas().includes(v.estampa.slice(7)), `${f.id}: ${v.estampa}`);
    for (const enc of ENCAIXES) if (v[enc]) assert.ok(ACESSORIOS_DESENHADOS[enc]().includes(v[enc]), `${f.id}: ${enc} ${v[enc]}`);
  }
});
