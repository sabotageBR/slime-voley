// Custo por quadro com a CPU limitada (Emulation.setCPUThrottlingRate, como o
// carimbador-maluco/tools/medir.mjs): ms do passo e do desenho e fps, por direcao visual.
// O headless usa GPU por software (swiftshader): o numero e RELATIVO entre direcoes; o de
// verdade vem do Android real (adb + chrome://inspect). Porta 4385 / CDP 9382.
// Uso: node tools/medir.mjs [cpu=4] [ms=5000] [LxA=844x390]
import { servir } from './servir.mjs';
import { abrirChrome, espera } from './cdp.mjs';

export async function medir(visual, cpu = 4, ms = 5000, tam = '844x390') {
  const [w, h] = tam.split('x').map(Number);
  const fechar = await servir(4385);
  const c = await abrirChrome({ largura: w, altura: h, toque: true, porta: 9382 });
  try {
    await c.cmd('Emulation.setCPUThrottlingRate', { rate: cpu });
    await c.ir(`http://127.0.0.1:4385/index.html?semblur&semente=7&primeira=0&auto&visual=${visual}&qualidade=1`, 1500);
    await espera(ms);
    const m = await c.avaliar('JSON.stringify(__volei.medidas)');
    return JSON.parse(m);
  } finally {
    await c.fechar();
    await fechar();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [cpu, ms, tam] = process.argv.slice(2);
  const res = {};
  for (const v of ['a', 'b', 'c']) {
    const m = await medir(v, Number(cpu) || 4, Number(ms) || 5000, tam || '844x390');
    res[v] = { passoMs: +m.passoMs.toFixed(2), desenhoMs: +m.desenhoMs.toFixed(2), fps: +m.fps.toFixed(1) };
    process.stdout.write(`${v}: passo ${res[v].passoMs} ms, desenho ${res[v].desenhoMs} ms, ${res[v].fps} fps\n`);
  }
  process.stdout.write(JSON.stringify(res) + '\n');
}
