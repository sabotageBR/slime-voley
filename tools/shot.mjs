// Print do jogo pelo Chrome headless em tempo real (CDP), servido em 127.0.0.1:4380 (modulos ES
// nao carregam por file://). Mostra os erros do console.
// Uso: node tools/shot.mjs "<query>" <LxA> <saida.png> [espera_ms] [--toque]
import { writeFileSync } from 'node:fs';
import { servir } from './servir.mjs';
import { abrirChrome, espera } from './cdp.mjs';

export const PORTA = 4380;

/**
 * @param {string} query @param {string} tam LxA @param {string} saida @param {number} [ms]
 * @param {{ toque?: boolean, antes?: (c: any) => Promise<void>, porta?: number }} [o]
 */
export async function shot(query, tam, saida, ms = 2500, o = {}) {
  const [w, h] = tam.split('x').map(Number);
  const fechar = await servir(PORTA);
  const c = await abrirChrome({ largura: w, altura: h, toque: !!o.toque, porta: o.porta || 9380 });
  try {
    await c.ir(`http://127.0.0.1:${PORTA}/index.html?${query}`, 600);
    if (o.antes) await o.antes(c);
    await espera(ms);
    writeFileSync(saida, await c.print());
    return c.erros.slice();
  } finally {
    await c.fechar();
    await fechar();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [query, tam, saida, ms] = process.argv.slice(2);
  const erros = await shot(query || '', tam || '390x844', saida || 'shot.png', Number(ms) || 2500, { toque: process.argv.includes('--toque') });
  if (erros.length) process.stdout.write('ERROS:\n  ' + erros.join('\n  ') + '\n');
  else process.stdout.write('ok\n');
}
