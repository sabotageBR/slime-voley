// Regras: alvo, vai-a-2, saque ativo e a partida (rali, 3 toques, parede de fundo; o fora antigo so com { fora: true }).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { alvoDaPartida, vencedor, pontoDaPartida, profundidadeSaque, qualidadeSaque, temposSaque, posicaoParaRumo, anjoDaPartida, ajudaDaPartida, avancoDoCartao, SAQUE, ANJO, AJUDA, TEMPOS } from '../src/jogo/regras.js';
import { miraGuiada, faixaAlvo } from '../src/jogo/cortada.js';
import { criarIA } from '../src/jogo/ia.js';
import { NIVEIS } from '../src/jogo/rivais.js';
import { criarRng } from '../src/core/rng.js';
import { criarPartida } from '../src/jogo/partida.js';

test('alvo: 1a da vida 5 imperdivel; rivais 7 vai-a-2 teto 9; chefes das Copas 2-4 9 teto 11', () => {
  assert.deepEqual(alvoDaPartida({ primeira: true }), { alvo: 5, vaiA2: false, teto: 5, imperdivel: true });
  assert.equal(alvoDaPartida({}).alvo, 7);
  assert.equal(alvoDaPartida({ chefe: true, copa: 2 }).teto, 11);
});

test('a 2a partida da vida (curta) vai a 5 sem vai-a-2; o 2P e a rapida ignoram', () => {
  assert.deepEqual(alvoDaPartida({ curta: true }), { alvo: 5, vaiA2: false, teto: 5, imperdivel: false });
  assert.equal(alvoDaPartida({ curta: true, modo: 'dois', alvo: 9 }).alvo, 9);
  const p = criarPartida({ modo: 'cpu', semente: 2, rival: 'pingo', curta: true });
  assert.equal(p.regras.alvo, 5);
  assert.equal(vencedor([5, 4], p.regras), -1);
});

test('vai-a-2 ate o teto', () => {
  const r = alvoDaPartida({});
  assert.equal(vencedor([7, 6], r), 0);
  assert.equal(vencedor([8, 6], r), -1);
  assert.equal(vencedor([8, 9], r), 1);
  assert.equal(pontoDaPartida([6, 3], r), -1);
});

test('saque: qualidade pelo erro de tempo e profundidade pela mira', () => {
  assert.equal(qualidadeSaque(0.05), 'perfeito');
  assert.equal(qualidadeSaque(-0.1), 'bom');
  assert.equal(qualidadeSaque(0.1, true), 'perfeito');
  assert.equal(qualidadeSaque(0.3), 'fraco');
  assert.equal(profundidadeSaque(1), SAQUE.prof.fundo);
  assert.equal(profundidadeSaque(0), SAQUE.prof.medio);
  assert.equal(profundidadeSaque(-1), SAQUE.prof.curto);
  const ts = temposSaque({ g: 28, gSlime: 68, pulo: 23, rb: 0.75 });
  assert.ok(ts.ideal > ts.apice && ts.ideal < ts.pega, 'o 2o toque ideal fica logo depois do apice');
  assert.ok(ts.pega - ts.ideal > SAQUE.janela.bom, 'a janela do bom cabe antes da bola voltar');
});

/** Partida com o humano sacando, ja liberada. */
function humanoSacando() {
  const p = criarPartida({ modo: 'cpu', semente: 4, sacaPrimeiro: 0 });
  p.interacao();
  p.passo();
  return p;
}

test('saque: sem o 2o toque a bola volta para a mao (sem falta, sem saque automatico)', () => {
  const p = humanoSacando();
  p.intencao(0, { borda: true, botao: true });
  p.passo();
  assert.equal(p.saque.fase, 'levantada');
  p.intencao(0, { botao: false });
  const tipos = [];
  for (let k = 0; k < 120 * 5; k++) { p.passo(); for (const e of p.eventos) tipos.push(e.tipo); p.eventos.length = 0; }
  assert.equal(p.estado, 'saque');
  assert.equal(p.saque.fase, 'pronto');
  assert.ok(tipos.includes('saque-pega'));
  assert.ok(!tipos.includes('saque') && !tipos.includes('ponto'));
});

test('1a partida: o saque e de um toque (a batida sai sozinha, PERFEITO) e o 2o toque nao conta', () => {
  const p = criarPartida({ modo: 'cpu', semente: 4, primeira: true, sacaPrimeiro: 0 });
  assert.equal(p.saqueSimples, true);
  p.interacao();
  p.passo();
  p.intencao(0, { borda: true, botao: true });
  p.passo();
  assert.equal(p.saque.fase, 'levantada');
  p.intencao(0, { botao: false });
  const saques = [];
  for (let k = 0; k < 120 * 3 && !saques.length; k++) {
    // um 2o toque cedo (que daria o FRACO no saque normal) e ignorado
    if (k === 30) p.intencao(0, { borda: true, botao: true });
    if (k === 31) p.intencao(0, { botao: false });
    p.passo();
    for (const e of p.eventos) if (e.tipo === 'saque') saques.push(e);
    p.eventos.length = 0;
  }
  assert.equal(saques.length, 1);
  assert.equal(saques[0].tipoSaque, 'perfeito');
  assert.equal(saques[0].simples, true);
  assert.equal(criarPartida({ modo: 'cpu', semente: 4 }).saqueSimples, false);
});

test('saque: depois do 1o toque o slime anda e a posicao mira (frente = fundo, em cima = medio, atras = curto)', () => {
  for (const rumo of [-1, 0, 1]) {
    const p = humanoSacando();
    p.intencao(0, { borda: true, botao: true });
    p.passo();
    assert.equal(p.saque.fase, 'levantada');
    const x0 = p.saque.x0;
    const xAlvo = posicaoParaRumo(x0, p.slimes[0].lado, rumo);
    // o mouse leva o slime ate a posicao (a bola sobe na vertical sobre x0) e bate no ideal
    let saiu = null;
    const ts = p.temposSaque;
    for (let k = 0; k < 240 && !saiu; k++) {
      const borda = p.saque.fase === 'levantada' && p.saque.tL >= ts.ideal - 1 / 240;
      p.intencao(0, { alvoX: xAlvo, borda, botao: borda });
      p.passo();
      for (const e of p.eventos) if (e.tipo === 'saque') saiu = e;
      p.eventos.length = 0;
    }
    assert.ok(saiu, 'sacou');
    assert.equal(saiu.tipoSaque, 'perfeito');
    assert.ok(Math.abs(saiu.x - x0) < 1e-9, 'a bola subiu na vertical');
    assert.ok(Math.abs(saiu.alvo - profundidadeSaque(rumo)) < 0.35, `rumo ${rumo}: alvo ${saiu.alvo.toFixed(2)} (pedido ${profundidadeSaque(rumo)})`);
    // voo: apice baixo e a bola cai do lado de la, perto do alvo (o rival pode tocar antes)
    let apice = 0;
    let queda = null;
    for (let k = 0; k < 120 * 3 && queda === null; k++) {
      apice = Math.max(apice, p.bola.y);
      p.passo();
      for (const e of p.eventos) if (e.tipo === 'chao' || e.tipo === 'toque' || e.tipo === 'rede') queda = e;
      p.eventos.length = 0;
    }
    assert.ok(apice <= saiu.y + SAQUE.subidaViagem + 0.15, `apice ${apice.toFixed(2)} (contato em ${saiu.y.toFixed(2)})`);
    assert.ok(queda && queda.tipo !== 'rede', `passou a rede (${queda && queda.tipo})`);
    if (queda.tipo === 'chao') assert.ok(Math.abs(queda.x - saiu.alvo) < 0.4, `caiu em ${queda.x.toFixed(2)}`);
  }
});

test('saque: longe da bola o pulo nao alcanca e ela volta para a mao (sem falta)', () => {
  const p = humanoSacando();
  p.intencao(0, { borda: true, botao: true });
  p.passo();
  const ts = p.temposSaque;
  const tipos = [];
  for (let k = 0; k < 120 * 2; k++) {
    const borda = p.saque.fase === 'levantada' && p.saque.tL >= ts.ideal - 1 / 240;
    p.intencao(0, { alvoX: -10.5, borda, botao: borda });
    p.passo();
    for (const e of p.eventos) tipos.push(e.tipo);
    p.eventos.length = 0;
  }
  assert.ok(tipos.includes('pulo'), 'pulou');
  assert.ok(tipos.includes('saque-pega'), 'a bola voltou para a mao');
  assert.ok(!tipos.includes('saque') && !tipos.includes('ponto'), 'sem saque e sem ponto');
  assert.equal(p.estado, 'saque');
});

test('saque da CPU: na levantada ela anda ate a posicao do plano antes de bater', () => {
  const p = criarPartida({ modo: 'cpu', semente: 9, sacaPrimeiro: 1 });
  p.interacao();
  let antes = null;
  for (let k = 0; k < 120 * 4; k++) {
    p.passo();
    for (const e of p.eventos) {
      if (e.tipo === 'pulo' && e.i === 1 && p.estado === 'saque') antes = { x: p.slimes[1].x, alvo: posicaoParaRumo(p.saque.x0, 1, p.saque.plano.rumo) };
      if (e.tipo === 'saque') k = 1e9;
    }
    p.eventos.length = 0;
  }
  assert.ok(antes, 'a CPU pulou para bater');
  assert.ok(Math.abs(antes.x - antes.alvo) < 0.2, `x ${antes.x.toFixed(2)} longe da posicao ${antes.alvo.toFixed(2)}`);
});

test('saque da CPU: mais perfeitos no T4 que no T0', () => {
  const taxa = (nivel) => {
    let perf = 0;
    let n = 0;
    for (let sem = 1; sem <= 60; sem++) {
      const ia = criarIA({ ...NIVEIS[nivel] }, criarRng(sem), {});
      const pl = ia.planoSaque(6.5);
      n++;
      if (qualidadeSaque(pl.erro) === 'perfeito') perf++;
    }
    return perf / n;
  };
  assert.ok(taxa('T4') > taxa('T0') + 0.3, `T0 ${taxa('T0')} T4 ${taxa('T4')}`);
});

test('partida bot contra bot: deterministica, termina e nunca passa de 3 toques sem falta', () => {
  const rodar = (sem) => {
    const p = criarPartida({ modo: 'demo', semente: sem });
    p.interacao();
    let toques4 = 0;
    let k = 0;
    for (; k < 120 * 400 && p.estado !== 'fim'; k++) {
      p.passo();
      for (const e of p.eventos) if (e.tipo === 'ponto' && e.motivo === 'toques4') toques4++;
      p.eventos.length = 0;
    }
    return { fim: p.estado, hash: p.hash(), placar: p.placar.join('-'), toques4, k };
  };
  const a = rodar(11);
  const b = rodar(11);
  assert.deepEqual(a, b);
  assert.equal(a.fim, 'fim');
});

test('o jogo espera o primeiro toque: sem interacao, nada de saque e bola parada', () => {
  const p = criarPartida({ modo: 'cpu', semente: 3, sacaPrimeiro: 1 });
  for (let k = 0; k < 120 * 10; k++) p.passo();
  assert.equal(p.estado, 'saque');
  p.interacao();
  for (let k = 0; k < 120 * 2; k++) p.passo();
  assert.notEqual(p.estado, 'saque');
});

test('primeira partida: imperdivel (a CPU nunca fecha)', () => {
  for (const sem of [1, 2, 3]) {
    const p = criarPartida({ modo: 'cpu', semente: sem, primeira: true });
    p.interacao();
    // humano parado (entrada nula): a Gota nunca fecha a partida
    for (let k = 0; k < 120 * 240 && p.estado !== 'fim'; k++) {
      p.passo();
      p.eventos.length = 0;
      if (p.estado === 'saque' && p.sacador === 0 && p.saque.valendo) { p.intencao(0, { borda: true, botao: true }); p.passo(); p.intencao(0, { botao: false }); }
    }
    assert.ok(p.placar[1] < 5, `semente ${sem}: ${p.placar}`);
  }
});

/** Roda a partida ate o rali comecar e devolve-a (bot contra bot). */
function ateORali(o) {
  const p = criarPartida({ modo: 'demo', semente: 5, ...o });
  p.interacao();
  for (let k = 0; k < 120 * 10 && p.estado !== 'jogo'; k++) { p.passo(); p.eventos.length = 0; }
  return p;
}

/** Bola chapada por cima da placa direita, mandada pela esquerda. */
function atacarPorCima(p) {
  Object.assign(p.bola, { solta: true, x: 9, y: 6, vx: 30, vy: 2, estado: 'normal' });
  p.rali.ultimoLado = -1;
  const tipos = [];
  for (let k = 0; k < 60; k++) { p.passo(); for (const e of p.eventos) tipos.push(e.tipo); p.eventos.length = 0; }
  return tipos;
}

test('a bola nunca sai: por cima da placa ela bate na parede de fundo e volta', () => {
  const p = ateORali();
  assert.equal(p.estado, 'jogo');
  const tipos = atacarPorCima(p);
  assert.ok(tipos.includes('fundo'), 'bateu na parede');
  assert.ok(!tipos.includes('fora'), 'nada de fora');
  assert.ok(p.bola.x < 12.4, `voltou (x = ${p.bola.x.toFixed(2)})`);
});

test('bot contra bot: nenhum ponto por fora com a parede; com { fora: true } a regra antiga vale', () => {
  const motivos = (o) => {
    const m = [];
    for (const sem of [1, 2, 3, 4, 5, 6]) {
      const p = criarPartida({ modo: 'demo', semente: sem, ...o });
      p.interacao();
      for (let k = 0; k < 120 * 400 && p.estado !== 'fim'; k++) {
        p.passo();
        for (const e of p.eventos) if (e.tipo === 'ponto') m.push(e.motivo);
        p.eventos.length = 0;
      }
    }
    return m;
  };
  assert.equal(motivos({}).filter((x) => x === 'fora').length, 0);
  const antigo = ateORali({ fora: true });
  assert.ok(atacarPorCima(antigo).includes('fora'), 'regra antiga: fora');
});

test('1a partida: o erro do proprio humano no match point da CPU nao fecha (o ponto nao vale e ele saca)', () => {
  const p = criarPartida({ modo: 'cpu', semente: 3, primeira: true });
  p.interacao();
  for (let k = 0; k < 120 * 10 && p.estado !== 'jogo'; k++) { p.passo(); p.eventos.length = 0; }
  assert.equal(p.estado, 'jogo');
  p.placar[1] = 4;
  // a bola cai do lado do humano depois do toque dele (rede/erro): seria o 5o ponto da Gota
  Object.assign(p.bola, { solta: true, x: -2.2, y: 1.2, vx: 0, vy: -8, estado: 'normal' });
  Object.assign(p.rali, { lado: -1, toques: 1, ultimo: 0, ultimoLado: -1, recepcaoSaque: false, bateuRede: true });
  const tipos = [];
  for (let k = 0; k < 120 * 3; k++) { p.passo(); for (const e of p.eventos) tipos.push(e.tipo); p.eventos.length = 0; }
  assert.ok(tipos.includes('repete'), tipos.join(','));
  assert.ok(!tipos.includes('fim') && !tipos.includes('ponto'));
  assert.equal(p.placar[1], 4);
  assert.equal(p.sacador, 0, 'o humano saca de novo');
});

/** Pingo nas oitavas (a 5), a CPU sacando no match point dela com o humano 2 atras; entrada nula. */
function matchPointDoPingo(o = {}) {
  const p = criarPartida({ modo: 'cpu', semente: 6, rival: 'pingo', curta: true, sacaPrimeiro: 1, ...o });
  p.placar[0] = 2;
  p.placar[1] = 4;
  p.interacao();
  return p;
}

/** Roda ate o proximo ponto (ou o fim); devolve o evento. */
function proximoPonto(p, max = 120 * 30) {
  for (let k = 0; k < max; k++) {
    // o humano saca com os dois toques (o 2o no instante ideal)
    if (p.estado === 'saque' && p.sacador === 0 && p.saque.valendo && p.saque.fase === 'pronto') { p.intencao(0, { borda: true, botao: true }); p.passo(); p.intencao(0, { botao: false }); }
    if (p.estado === 'saque' && p.sacador === 0 && p.saque.fase === 'levantada' && p.saque.tL >= p.temposSaque.ideal) p.intencao(0, { borda: true, botao: true });
    p.passo();
    const e = p.eventos.find((x) => x.tipo === 'ponto');
    p.eventos.length = 0;
    if (e) return e;
  }
  return null;
}

test('anjo: no match point da CPU com o humano 2 atras ela erra (uma vez por anjo); sem anjo, fecha', () => {
  assert.equal(anjoDaPartida({ primeira: true, curta: true }), 0);
  assert.equal(anjoDaPartida({ curta: true }), Math.min(ANJO.max, ANJO.curta));
  const p = matchPointDoPingo({ anjo: 1 });
  const e = proximoPonto(p);
  assert.equal(e.i, 0, 'o ponto e do humano');
  assert.deepEqual(p.anjo, { restam: 0, usados: 1 });
  assert.equal(p.resumo(0).anjos, 1);
  // de novo em 2-4, sem anjo: a CPU pode fechar (o humano parado nao segura)
  p.placar[0] = 2;
  p.placar[1] = 4;
  let fim = false;
  for (let k = 0; k < 10 && !fim; k++) { const x = proximoPonto(p); fim = !!(x && x.fim); }
  assert.ok(fim && p.placar[1] === 5, `${p.placar}`);
});

test('anjo: nao age com o humano so 1 atras, sem anjo, no bot contra bot nem no 2P', () => {
  const um = criarPartida({ modo: 'cpu', semente: 6, rival: 'pingo', curta: true, sacaPrimeiro: 1, anjo: 2 });
  um.placar[0] = 3;
  um.placar[1] = 4;
  um.interacao();
  proximoPonto(um);
  assert.equal(um.anjo.usados, 0);
  const zero = matchPointDoPingo({ anjo: 0 });
  proximoPonto(zero);
  assert.equal(zero.anjo.usados, 0);
  assert.equal(criarPartida({ modo: 'demo', semente: 6, anjo: 2 }).anjo.restam, 0);
  assert.equal(criarPartida({ modo: 'dois', semente: 6, anjo: 2 }).anjo.restam, 0);
  assert.equal(criarPartida({ modo: 'cpu', semente: 6, primeira: true, anjo: 2 }).anjo.restam, 0, 'a 1a da vida ja e imperdivel');
});

test('ajuda ao jogador: base por fase so na Copa 1, mais a cada derrota seguida, limitada a 1', () => {
  assert.equal(ajudaDaPartida({ copa: 1, fase: 1 }), AJUDA.copa1[1]);
  assert.ok(ajudaDaPartida({ copa: 1, fase: 1 }) >= ajudaDaPartida({ copa: 1, fase: 4 }), 'quem chega na final ja aprendeu');
  assert.equal(ajudaDaPartida({ copa: 2, fase: 0 }), 0);
  assert.ok(ajudaDaPartida({ copa: 2, fase: 0, derrotas: 2 }) > 0, 'as derrotas seguidas ajudam em toda Copa');
  let antes = -1;
  for (let d = 0; d <= 9; d++) {
    const a = ajudaDaPartida({ copa: 1, fase: 3, derrotas: d });
    assert.ok(a >= antes && a <= 1);
    antes = a;
  }
  assert.equal(ajudaDaPartida({ copa: 1, fase: 3, derrotas: 9 }), ajudaDaPartida({ copa: 1, fase: 3, derrotas: AJUDA.maxDerrotas }));
  assert.equal(criarPartida({ modo: 'demo', semente: 1, ajuda: 1 }).hash(), criarPartida({ modo: 'demo', semente: 1 }).hash(), 'nada muda no bot contra bot');
});

test('mira guiada: a ponta da faixa mais longe do rival (a cortada do humano comeca nela)', () => {
  const [x0, x1] = faixaAlvo(-1);
  assert.equal(miraGuiada(-1, 10, 0), x0, 'o rival no fundo: a cortada vai colada na rede');
  assert.equal(miraGuiada(-1, 2, 0), x1, 'o rival na rede: vai no fundo');
  const p = criarPartida({ modo: 'cpu', semente: 4 });
  assert.ok(p.roteiro('cortada'));
  assert.equal(p.cortada.alvoX, miraGuiada(-1, p.slimes[1].x, p.slimes[1].vx));
});

test('avanco do cartao: 3 s depois da 1a partida, 4 s nas primeiras derrotas, senao o padrao; 0 desliga', () => {
  assert.equal(avancoDoCartao({ partidas: 1, vitorias: 1, venceu: true, avanco: 8 }), TEMPOS.avancoPrimeira);
  assert.equal(avancoDoCartao({ partidas: 2, vitorias: 1, venceu: false, avanco: 8 }), TEMPOS.avancoDerrota);
  assert.equal(avancoDoCartao({ partidas: 9, vitorias: 1, venceu: false, avanco: 8 }), 8, 'depois das primeiras derrotas, o padrao');
  assert.equal(avancoDoCartao({ partidas: 3, vitorias: 2, venceu: true, avanco: 8 }), 8);
  assert.equal(avancoDoCartao({ partidas: 2, vitorias: 1, venceu: false, avanco: 0 }), 0);
  assert.equal(avancoDoCartao({ partidas: 2, vitorias: 1, venceu: false, avanco: 2 }), 2, 'nunca mais lento que o ?avanco');
});
