// Midia do checkpoint M1 (comparacao justa das 3 direcoes): a mesma semente, os mesmos 3
// quadros (desktop 836x470 no rali, retrato 390x844 na festa completa, paisagem 844x390 na mira
// da cortada) e um GIF de ~6 s por direcao (rali + cortada lenta + ponto). Sai em docs/modelos/.
// Uso: node tools/midia-m1.mjs
import { mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { shot } from './shot.mjs';
import { gravarGif } from './gif.mjs';
import { RAIZ } from './servir.mjs';

const SAIDA = join(RAIZ, 'docs/modelos');
mkdirSync(SAIDA, { recursive: true });
const jpg = (png, out) => spawnSync('python3', ['-I', '-c', `from PIL import Image; Image.open(${JSON.stringify(png)}).convert('RGB').save(${JSON.stringify(out)}, quality=84)`]);
for (const v of ['a', 'b', 'c']) {
  const base = `semblur&semente=7&primeira=0&visual=${v}`;
  const quadros = [
    [`${base}&auto`, '836x470', 'desktop', 3200, false],
    [`${base}&roteiro=ponto`, '390x844', 'retrato', 900, true],
    [`${base}&roteiro=cortada`, '844x390', 'paisagem', 800, true],
  ];
  for (const [q, tam, nome, ms, toque] of quadros) {
    const png = join(RAIZ, `.tmp/m1-${v}-${nome}.png`);
    const erros = await shot(q, tam, png, ms, { toque });
    jpg(png, join(SAIDA, `${v}-${nome}.jpg`));
    process.stdout.write(`${v} ${nome}${erros.length ? ' ERROS: ' + erros.join(' | ') : ''}\n`);
  }
  const n = await gravarGif(join(SAIDA, `${v}.gif`), '844x390', 480, [`${base}&auto@3200`, `${base}&roteiro=cortada@3400`], 12);
  process.stdout.write(`${v}.gif ${n} quadros\n`);
}
