// Todo tipo de evento que a logica emite (src/jogo, e os da fisica que a partida repassa) tem
// tratador no TRATADORES do main.js: a logica nunca toca em som nem em DOM.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const ler = (p) => readFileSync(join(RAIZ, p), 'utf8');

test('cada evento de src/jogo e da fisica tem tratador no main.js', () => {
  const tipos = new Set();
  for (const f of readdirSync(join(RAIZ, 'src/jogo')).filter((n) => n.endsWith('.js'))) {
    for (const m of ler('src/jogo/' + f).matchAll(/(?:ev\(|\.push\()\{\s*tipo:\s*'([a-z0-9-]+)'/g)) tipos.add(m[1]);
  }
  // da fisica, a partida repassa o que nao trata (rede, placa, fundo...)
  for (const m of ler('src/fisica/volei.js').matchAll(/ev\.push\(\{\s*tipo:\s*'([a-z0-9-]+)'/g)) tipos.add(m[1]);
  const main = ler('src/main.js');
  const bloco = main.slice(main.indexOf('const TRATADORES = {'), main.indexOf('\n};', main.indexOf('const TRATADORES = {')));
  const tratados = new Set([...bloco.matchAll(/^\s+'([a-z0-9-]+)':/gm)].map((m) => m[1]));
  const faltam = [...tipos].filter((t) => !tratados.has(t));
  assert.ok(tipos.size > 20, `achou ${tipos.size} tipos`);
  assert.deepEqual(faltam, [], `sem tratador: ${faltam.join(', ')}`);
});
