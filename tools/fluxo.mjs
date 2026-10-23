// Fluxo de ponta a ponta (M2d) pelo CDP, com entrada real e um PokiSDK falso que registra as
// chamadas em window.__sdk (o Chrome das ferramentas ja bloqueia o CDN da Poki). Perfil novo:
// a 1a partida da vida ate a cortada guiada (um toque na metade esquerda vira BOMBA), o fim dela
// virando a 2a sem cartao (o presente, o Pingo caindo, o saque esperando o toque), a derrota com a
// dica e a revanche automatica sem anuncio. Confere as medidas do measure e o console.
// Uso: node tools/fluxo.mjs [LxA=390x844] [--mouse]   (porta 4380 e CDP 9380, como o shot)
import { writeFileSync, mkdirSync } from 'node:fs';
import { servir } from './servir.mjs';
import { abrirChrome, espera } from './cdp.mjs';

const args = process.argv.slice(2);
const tam = args.find((a) => /^\d+x\d+$/.test(a)) || '390x844';
const [W, H] = tam.split('x').map(Number);
const toque = !args.includes('--mouse');
const saida = '.tmp/fluxo';
mkdirSync(saida, { recursive: true });

const SDK_FALSO = `
  window.__sdk = [];
  const reg = (x) => window.__sdk.push(x);
  window.PokiSDK = {
    init: () => Promise.resolve(), gameLoadingFinished: () => reg('gameLoadingFinished'),
    gameplayStart: () => reg('gameplayStart'), gameplayStop: () => reg('gameplayStop'),
    commercialBreak: () => { reg('commercialBreak'); return Promise.resolve(); },
    rewardedBreak: () => { reg('rewardedBreak'); return Promise.resolve(false); },
    measure: (c, w, a) => reg('measure:' + c + '/' + w + '/' + a),
    getLanguage: () => 'pt', getDeviceInfo: () => ({}), shareableURL: () => Promise.resolve(''), getURLParam: () => '', movePill: () => {},
  };`;

const falhas = [];
const conferir = (ok, txt) => { process.stdout.write(`${ok ? 'ok   ' : 'FALHA'} ${txt}\n`); if (!ok) falhas.push(txt); };

const fechar = await servir(4380);
const c = await abrirChrome({ largura: W, altura: H, toque, porta: 9380 });
try {
  await c.cmd('Page.addScriptToEvaluateOnNewDocument', { source: SDK_FALSO });
  await c.ir('http://127.0.0.1:4380/index.html?semblur&lang=pt&semente=3', 2500);
  const sdk = () => c.avaliar('window.__sdk.slice()');
  const P = (expr) => c.avaliar(`(() => { const P = __volei.partida; return ${expr}; })()`);
  const tocarEm = async (x, y) => { if (toque) await c.tocar(x, y); else await c.clicar(x, y); };
  const novos = async (desde) => (await sdk()).slice(desde);

  // 1. carregou, sem gameplayStart antes do 1o toque
  let l = await sdk();
  const orient = W > H ? (toque ? 'paisagem' : 'desktop') : 'retrato';
  conferir(l.includes(`measure:tela/${orient}/${toque ? 'toque' : 'mouse'}`), `tela/${orient}`);
  conferir(!l.includes('gameplayStart'), 'nenhum gameplayStart antes do toque');

  // 2. o 1o toque
  const t0 = Date.now();
  await tocarEm(W * 0.8, H * 0.7);
  await espera(800);
  l = await sdk();
  conferir(l.includes('gameplayStart') && l.includes('measure:level/m1/start') && l.includes('measure:rival/gota/start'), 'o toque da gameplayStart, level/m1/start e rival/gota/start');

  // 3. ate a cortada guiada congelar (tocando so para sacar)
  let fase = '';
  for (let k = 0; k < 80 && fase !== 'congelada'; k++) {
    await espera(500);
    fase = await P('P.guia.fase');
    if (fase !== 'congelada' && (await P("P.estado === 'saque' && P.sacador === 0 && !P.esperaToque"))) await tocarEm(W * 0.8, H * 0.7);
  }
  conferir(fase === 'congelada', `a guiada congelou (${((Date.now() - t0) / 1000).toFixed(1)} s de relogio)`);
  await espera(400);
  writeFileSync(`${saida}/1-guiada-${tam}.png`, await c.print());
  const mao = await c.avaliar("document.querySelector('.mao .texto')?.textContent || ''");
  conferir(/cortar/.test(mao), `a mao diz "${mao}"`);
  const antesCorte = (await sdk()).length;
  await P('(window.__placarAntes = [...P.placar], 0)');
  await tocarEm(W * 0.15, H * 0.75);
  const tCorte = Date.now();
  for (let k = 0; k < 40 && (await P('P.placar[0] + P.placar[1]')) === (await P('window.__placarAntes[0] + window.__placarAntes[1]')); k++) await espera(200);
  process.stdout.write(`      (o ponto saiu ${((Date.now() - tCorte) / 1000).toFixed(1)} s depois do toque)\n`);
  l = await novos(antesCorte);
  conferir(l.includes('measure:cortada/gesto/guiada') && l.includes('measure:tutorial/cortada/complete'), 'um toque na metade esquerda cortou (cortada/gesto/guiada e tutorial/cortada/complete)');
  const depois = await P("({ placar: [...P.placar], guia: P.guia.fase, estado: P.estado, antes: window.__placarAntes })");
  conferir(depois.placar[0] > depois.antes[0] && depois.guia === 'feito', `a guiada virou ponto do jogador (${JSON.stringify(depois)})`);
  conferir((Date.now() - t0) / 1000 < 40, 'a BOMBA sai em menos de 40 s de relogio');

  // 4. o fim da 1a partida vira a 2a sem cartao
  const antesFim = (await sdk()).length;
  await P("P.roteiro('fim')");
  await espera(3300);
  writeFileSync(`${saida}/2-presente-${tam}.png`, await c.print());
  await espera(2400);
  writeFileSync(`${saida}/3-entrada-${tam}.png`, await c.print());
  l = await novos(antesFim);
  conferir(await c.avaliar("document.querySelector('#cartao').hidden"), 'sem cartao depois da 1a vitoria');
  for (const m of ['level/m1/complete', 'rival/gota/complete', 'placar/gota/5-3', 'transicao/m2/direta']) conferir(l.includes('measure:' + m), m);
  conferir(!l.includes('commercialBreak'), 'sem anuncio na transicao');
  conferir((await P('P.rival.id')) === 'pingo' && (await P('P.esperaToque')), 'o Pingo entrou e o saque espera o toque');

  // 5. o toque comeca a 2a
  const antesM2 = (await sdk()).length;
  await tocarEm(W * 0.8, H * 0.7);
  await espera(700);
  l = await novos(antesM2);
  conferir(l.includes('gameplayStart') && l.includes('measure:level/m2/start') && l.includes('measure:rival/pingo/start'), 'gameplayStart, level/m2/start e rival/pingo/start');

  // 6. a derrota: a dica e a revanche automatica sem anuncio
  const antesDerrota = (await sdk()).length;
  await P("P.roteiro('derrota-ace')");
  await espera(3600);
  writeFileSync(`${saida}/4-derrota-${tam}.png`, await c.print());
  const dica = await c.avaliar("(() => { const d = document.querySelector('#cartao .dica'); return d && !d.hidden ? d.textContent : ''; })()");
  conferir(/saque/.test(dica), `a dica: "${dica}"`);
  conferir(!(await c.avaliar("document.querySelector('#cartao .cvChave').hidden")), 'a chave aparece no cartao de derrota');
  await espera(5500);
  l = await novos(antesDerrota);
  for (const m of ['level/m2/fail', 'rival/pingo/fail', 'derrota/pingo/ace', 'cartao/revanche/auto']) conferir(l.includes('measure:' + m), m);
  conferir(!l.includes('commercialBreak'), 'a revanche automatica nao pede anuncio');
  conferir(c.erros.length === 0, `console sem erros${c.erros.length ? ': ' + c.erros.join(' | ') : ''}`);
} finally {
  await c.fechar();
  await fechar();
}
process.stdout.write(falhas.length ? `\n${falhas.length} falha(s)\n` : '\ntudo ok\n');
if (falhas.length) process.exitCode = 1;
