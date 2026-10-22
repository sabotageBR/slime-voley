// Regras de estilo e da Poki vigiadas no codigo-fonte.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const listar = (d) => readdirSync(d).flatMap((n) => {
  const p = join(d, n);
  return statSync(p).isDirectory() ? listar(p) : [p];
});
const fontes = listar(join(RAIZ, 'src')).filter((p) => p.endsWith('.js'));
const ler = (p) => readFileSync(p, 'utf8');
const rel = (p) => relative(RAIZ, p);
const semComentarios = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

test('zero stopPropagation em src/', () => {
  for (const p of fontes) assert.ok(!/stopPropagation|stopImmediatePropagation/.test(semComentarios(ler(p))), rel(p));
});

test('nenhum ouvinte em fase de captura (exceto o destrave do audio)', () => {
  for (const p of fontes) {
    if (rel(p) === 'src/core/audio.js') continue;
    const t = semComentarios(ler(p));
    assert.ok(!/addEventListener\([^)]*,\s*true\s*\)/.test(t) && !/capture:\s*true/.test(t), rel(p));
  }
});

test('src/jogo e src/fisica: puros (sem Math.random, Date, DOM) e so importam rng e cor', () => {
  for (const p of fontes.filter((f) => /src\/(jogo|fisica)\//.test(f))) {
    const t = semComentarios(ler(p));
    assert.ok(!/Math\.random|Date\.now|new Date\(|performance\.now|document\.|window\./.test(t), rel(p));
    for (const m of t.matchAll(/from\s+'([^']+)'/g)) {
      const alvo = m[1];
      if (alvo.startsWith('./') || alvo.startsWith('../fisica/') || alvo.startsWith('../jogo/')) continue;
      assert.ok(alvo === '../core/rng.js' || alvo.startsWith('../cor/'), `${rel(p)} importa ${alvo}`);
    }
  }
});

test('src/render nao importa ui, som nem o SDK', () => {
  for (const p of fontes.filter((f) => /src\/render\//.test(f))) {
    const t = ler(p);
    assert.ok(!/from\s+'[^']*\/(ui|som)\//.test(t) && !/core\/poki/.test(t), rel(p));
  }
});

test('so o main.js importa o SDK', () => {
  for (const p of fontes) {
    if (rel(p) === 'src/main.js' || rel(p) === 'src/core/poki.js') continue;
    assert.ok(!/core\/poki\.js/.test(ler(p)), rel(p));
  }
});

test('nenhuma URL externa alem do SDK da Poki', () => {
  const PERMITIDA = 'https://game-cdn.poki.com/scripts/v2/poki-sdk.js';
  for (const p of [...fontes, join(RAIZ, 'index.html'), join(RAIZ, 'src/ui/estilo.css')]) {
    for (const u of semComentarios(ler(p)).match(/https?:\/\/[^\s"'`)<>]+/g) || []) assert.equal(u, PERMITIDA, rel(p));
  }
});

test('sem IP do futebol nem de Star Trek no jogo (textos, skins, rivais)', () => {
  const PROIBIDOS = /\b(FIFA|World Cup|Copa do Mundo|Mundial|Copa Am[eé]rica|Libertadores|Champions|Brasileir[aã]o|CBF|UEFA|Maracan[aã]|Star Trek|Jornada nas Estrelas|Nike|Adidas|Mikasa|Molten|Puma)\b/i;
  for (const p of fontes) assert.ok(!PROIBIDOS.test(ler(p)), rel(p));
});

test('nenhum nao-ASCII no codigo de src/jogo (fora de comentarios)', () => {
  for (const p of fontes.filter((f) => /src\/jogo\//.test(f))) {
    const t = semComentarios(ler(p));
    assert.ok(!/[^\x00-\x7f]/.test(t), rel(p));
  }
});

test('pointermove nunca dispara gameplayStart (so pointerdown/keydown chamam interagir)', () => {
  const t = ler(join(RAIZ, 'src/ui/controles.js'));
  const mover = t.slice(t.indexOf('function mover'), t.indexOf('function cima'));
  assert.ok(!/aoInteragir/.test(mover));
});

test('o pacote local de personagens (src/extra) so e citado em linha "// modelo" (fora da build da Poki)', () => {
  for (const p of fontes) {
    if (rel(p).startsWith('src/extra/')) continue;
    for (const linha of ler(p).split('\n')) {
      if (/extra\//.test(linha) && !/\/\/ modelo\s*$/.test(linha) && !/^\s*(\/\/|\/?\*)/.test(linha)) assert.fail(`${rel(p)}: ${linha.trim()}`);
    }
  }
});
