// Monta o checkpoint no formato do Artifact do claude.ai em .tmp/artifact/ (porte de
// slime-merge/tools/artifact-modelos.mjs):
//   index.html               o hub (modelos/hub.html, ja sem doctype: o publicador poe o esqueleto)
//   jogo-<v><c>-<g>.html     o jogo com window.__voleiModelo = { visual, controle, gatilho } e SEM a
//                            tag do SDK da Poki (no claude.ai nao ha Poki; o wrapper segue sem anuncios)
//   jogo-lab.html            o laboratorio da cortada
//   src/** e modelos/* (GIFs e quadros de docs/modelos)
// Imprime o mapa de arquivos (JSON) para o campo `files` do publish.
// Uso: node tools/artifact.mjs
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { RAIZ } from './servir.mjs';

const pasta = join(RAIZ, '.tmp/artifact');
rmSync(pasta, { recursive: true, force: true });
mkdirSync(pasta, { recursive: true });
writeFileSync(join(pasta, 'index.html'), readFileSync(join(RAIZ, 'modelos/hub.html'), 'utf8'));

const jogo = readFileSync(join(RAIZ, 'index.html'), 'utf8');
const semSdk = jogo.replace(/<!-- Unico script externo permitido pela Poki. -->\s*<script src="https:\/\/game-cdn\.poki\.com\/scripts\/v2\/poki-sdk\.js"><\/script>\s*/, '');
if (semSdk === jogo) throw new Error('nao achei a tag do SDK no index.html');
const pagina = (modelo) => semSdk.replace('<script type="module" src="src/main.js"></script>',
  `<script>window.__voleiModelo = ${JSON.stringify(modelo)};</script>\n<script type="module" src="src/main.js"></script>`);
for (const v of ['a', 'b', 'c']) for (const c of ['a', 'b']) for (const g of ['novo', 'segura']) {
  writeFileSync(join(pasta, `jogo-${v}${c}-${g}.html`), pagina({ visual: v, controle: c, gatilho: g }));
}
writeFileSync(join(pasta, 'jogo-lab.html'), pagina({ visual: 'a', controle: 'a', gatilho: 'novo', lab: 1, primeira: 0 }));
cpSync(join(RAIZ, 'src'), join(pasta, 'src'), { recursive: true });
mkdirSync(join(pasta, 'modelos'), { recursive: true });
for (const f of readdirSync(join(RAIZ, 'docs/modelos'))) cpSync(join(RAIZ, 'docs/modelos', f), join(pasta, 'modelos', f));

const listar = (d) => readdirSync(d).flatMap((n) => {
  const p = join(d, n);
  return statSync(p).isDirectory() ? listar(p) : [p];
});
const mapa = {};
let total = 0;
for (const p of listar(pasta)) {
  const r = relative(pasta, p);
  total += statSync(p).size;
  if (r !== 'index.html') mapa[r] = relative(RAIZ, p);
}
writeFileSync(join(RAIZ, '.tmp/artifact-mapa.json'), JSON.stringify(mapa));
process.stdout.write(JSON.stringify(mapa) + '\n');
process.stderr.write(`${Object.keys(mapa).length + 1} arquivos, ${(total / 1024 / 1024).toFixed(2)} MB em ${relative(RAIZ, pasta)}\n`);
