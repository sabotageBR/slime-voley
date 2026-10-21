// Renderiza a thumb da Poki (tools/thumb.html) pelo Chrome headless (porte do slime-merge, com o
// CDP do shot: o PNG sai do canvas, no tamanho exato, qualquer que seja a janela).
// Uso:
//   node tools/thumb.mjs [opcoes]  as opcoes (padrao: todas de OPCOES) em
//                                  marketing/thumb/opcoes/<opcao>-<tamanho>.png, lado a lado em
//                                  marketing/thumb/comparar.png, os tiles pequenos em
//                                  marketing/thumb/comparar-tiles.png, e as medidas de cada uma
//   node tools/thumb.mjs --final   mede a ESCOLHIDA contra a regra da Poki (falha alto se sair
//                                  dela) e grava marketing/thumb/slime-voley-{1256,628}.{png,jpg}
//                                  e a folha de conferencia marketing/thumb/conferir.png
//   node tools/thumb.mjs --perto [opcoes]  marca de magenta os pixels perto do #83FFE7
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { servir, RAIZ } from './servir.mjs';
import { abrirChrome, espera } from './cdp.mjs';

/** Opcao da thumb oficial. 2026-10-21: 'quadra', o plano aberto (pedido do usuario). */
const ESCOLHIDA = 'quadra';
const OPCOES = ['quadra', 'meia'];
/** Tamanhos entregues: o minimo da Poki (628) e o dobro (o que o empacotar --thumb confere). */
const TAMANHOS = [1256, 628];
/**
 * Limites da medida (?medir, na thumb de 628 px). Barram: quase nada perto do #83FFE7,
 * beirada longe dele, nenhuma tarja e opaca. So avisa: a Laranjinha com menos de 3:1 contra a
 * media dos cantos (regua nossa, nao da Poki).
 */
const LIMITES = { pertoPoki: 0.01, bordaPoki: 30, contraste: 3 };

const PORTA = 4384;
const fechar = await servir(PORTA);
const c = await abrirChrome({ largura: 900, altura: 900, porta: 9381 });

/** Abre a pagina e espera o PRONTO (o erro do console sobe junto). */
async function pagina(query) {
  c.erros.length = 0;
  await c.ir(`http://127.0.0.1:${PORTA}/tools/thumb.html?${query}`, 200);
  for (let k = 0; k < 300; k++) {
    if ((await c.avaliar('document.title')) === 'PRONTO') return;
    if (c.erros.length) break;
    await espera(100);
  }
  throw new Error(`thumb.html?${query} nao terminou: ${c.erros.join(' | ') || 'sem erro no console'}`);
}

async function png(query, arq) {
  await pagina(query);
  const url = await c.avaliar(`document.getElementById('c').toDataURL('image/png')`);
  writeFileSync(arq, Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'));
  process.stdout.write(`thumb -> ${relative(RAIZ, arq)}\n`);
}

/** Mede a opcao o (?medir) e devolve as falhas contra LIMITES. */
async function conferir(o) {
  await pagina(`opcao=${o}&medir`);
  const m = JSON.parse(await c.avaliar(`document.getElementById('medidas').textContent`));
  const falhas = [];
  const avisos = [];
  if (m.pertoPoki > LIMITES.pertoPoki) falhas.push(`${(m.pertoPoki * 100).toFixed(1)}% dos pixels perto do #83FFE7`);
  if (m.bordaPoki < LIMITES.bordaPoki) falhas.push(`beirada perto do #83FFE7 (Delta E ${m.bordaPoki})`);
  if (m.tarja.length) falhas.push(`tarja ou borda em: ${m.tarja.join(', ')}`);
  for (const [quem, v] of Object.entries(m.contraste)) if (v < LIMITES.contraste) avisos.push(`contraste do ${quem} com os cantos ${v}:1`);
  if (!m.opaca) falhas.push('pixels transparentes');
  return { m, falhas, avisos };
}

let codigo = 0;
try {
  const args = process.argv.slice(2);
  const pedidas = args.filter((a) => !a.startsWith('--'));
  const dirOp = join(RAIZ, 'marketing/thumb/opcoes');
  const dir = join(RAIZ, 'marketing/thumb');
  mkdirSync(dirOp, { recursive: true });
  if (args.includes('--perto')) {
    for (const o of pedidas.length ? pedidas : OPCOES) await png(`opcao=${o}&perto`, join(dirOp, `${o}-perto.png`));
  } else if (args.includes('--final')) {
    const { m, falhas, avisos } = await conferir(ESCOLHIDA);
    process.stdout.write(`medidas: ${JSON.stringify(m)}\n`);
    if (avisos.length) process.stdout.write('aviso: ' + avisos.join('; ') + '\n');
    if (falhas.length) {
      process.stdout.write('FALHOU (regra da Poki):\n  ' + falhas.join('\n  ') + '\n');
      codigo = 1;
    } else {
      for (const s of TAMANHOS) {
        const arq = join(dir, `slime-voley-${s}.png`);
        await png(`opcao=${ESCOLHIDA}&s=${s}`, arq);
        // o canvas sai em RGBA (opaco): a entregue vai em RGB, sem o canal alfa
        const tmp = arq.replace(/\.png$/, '.rgb.png');
        execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', arq, '-pix_fmt', 'rgb24', tmp]);
        renameSync(tmp, arq);
        const jpg = arq.replace(/\.png$/, '.jpg');
        execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', arq, '-q:v', '2', jpg]);
        process.stdout.write(`thumb -> ${relative(RAIZ, jpg)}\n`);
      }
      await png(`opcao=${ESCOLHIDA}&grade`, join(dir, 'conferir.png'));
    }
  } else {
    const opcoes = pedidas.length ? pedidas : OPCOES;
    for (const o of opcoes) for (const s of TAMANHOS) await png(`opcao=${o}&s=${s}`, join(dirOp, `${o}-${s}.png`));
    for (const o of opcoes) await png(`opcao=${o}&grade`, join(dirOp, `${o}-tiles.png`));
    const lado = join(dir, 'comparar.png');
    const tiles = join(dir, 'comparar-tiles.png');
    // o ffmpeg nao empilha uma imagem so
    if (opcoes.length === 1) {
      copyFileSync(join(dirOp, `${opcoes[0]}-628.png`), lado);
      copyFileSync(join(dirOp, `${opcoes[0]}-tiles.png`), tiles);
    } else {
      execFileSync('ffmpeg', ['-v', 'error', '-y', ...opcoes.flatMap((o) => ['-i', join(dirOp, `${o}-628.png`)]), '-filter_complex', `hstack=inputs=${opcoes.length}`, lado]);
      execFileSync('ffmpeg', ['-v', 'error', '-y', ...opcoes.flatMap((o) => ['-i', join(dirOp, `${o}-tiles.png`)]), '-filter_complex', `vstack=inputs=${opcoes.length}`, tiles]);
    }
    process.stdout.write(`thumb -> ${relative(RAIZ, lado)}\nthumb -> ${relative(RAIZ, tiles)}\n`);
    for (const o of opcoes) {
      const { m, falhas, avisos } = await conferir(o);
      process.stdout.write(`${o}: ${JSON.stringify(m)}${falhas.length ? '\n   fora da regra: ' + falhas.join('; ') : ''}${avisos.length ? '\n   aviso: ' + avisos.join('; ') : ''}\n`);
    }
  }
} finally {
  await c.fechar();
  await fechar();
}
process.exit(codigo);
