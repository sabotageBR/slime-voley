// Monta a build da Poki (porte de stringcut/tools/empacotar.mjs, com os cortes do
// slime-merge): copia so o jogo para dist/, tira o que e da build de modelos (linhas
// "// modelo" e o gancho __voleiModelo), confere e zipa em dist-poki/slime-voley-<versao>.zip
// (index.html na raiz do zip). Recusa URL externa, console.log, .map, import quebrado e os
// tetos do desenho (§4.9). A thumb ainda nao existe (M3b): sem --thumb, o zip e so um ensaio.
// Uso: node tools/empacotar.mjs [--thumb]
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, extname, basename } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { RAIZ } from './servir.mjs';

const pacote = JSON.parse(readFileSync(join(RAIZ, 'package.json'), 'utf8'));
const nomeZip = `${pacote.name}-${pacote.version}`;
const dist = join(RAIZ, 'dist');
const saida = join(RAIZ, 'dist-poki');
const zip = join(saida, `${nomeZip}.zip`);
const PERMITIDA = 'https://game-cdn.poki.com/scripts/v2/poki-sdk.js';
const THUMB = join(RAIZ, `marketing/thumb/${pacote.name}-1256.png`);
const COM_THUMB = process.argv.includes('--thumb');
const THUMB_MIN = 628;
/** tetos do desenho (§4.9); sem o carregador (M2), tudo carrega no inicio */
const KB = 1024;
const TETO = { fundo: 250 * KB, audio: 200 * KB, inicial: 1.5 * KB * KB, total: 4.5 * KB * KB };

/** @param {string} d @returns {string[]} */
const listar = (d) => readdirSync(d).flatMap((n) => {
  const p = join(d, n);
  return statSync(p).isDirectory() ? listar(p) : [p];
});
const semComentarios = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
for (const item of ['index.html', 'LICENCAS.txt', 'src']) cpSync(join(RAIZ, item), join(dist, item), { recursive: true });

// as linhas "// modelo" (gancho da build de modelos do Artifact) saem de todo .js
const tirarModelo = (t) => t.split('\n').filter((l) => !/\/\/ modelo\s*$/.test(l)).join('\n');
for (const f of listar(join(dist, 'src')).filter((p) => p.endsWith('.js'))) {
  const t = readFileSync(f, 'utf8');
  if (t.includes('// modelo')) writeFileSync(f, tirarModelo(t));
}

const falhas = [];
const textos = listar(dist).filter((p) => /\.(html|js|css)$/.test(p)).map((p) => readFileSync(p, 'utf8')).join('\n');
// arte que nenhum codigo cita (pranchas do M1, ginasios de direcoes que nao vieram) fica fora
for (const f of listar(join(dist, 'src/arte'))) if (!textos.includes(basename(f))) rmSync(f);
// sons: so os do catalogo, e todo o catalogo tem arquivo
const { ARQUIVOS } = await import('../src/som/arquivos.js');
const usados = new Set(Object.values(ARQUIVOS).map((a) => a.arquivo));
const pastaSons = join(dist, 'src/som/arquivos');
for (const f of readdirSync(pastaSons)) if (!usados.has(f)) rmSync(join(pastaSons, f));
for (const f of usados) if (!existsSync(join(pastaSons, f))) falhas.push(`som do catalogo sem arquivo: ${f}`);

const arquivos = listar(dist);
// nenhum import pode apontar para um arquivo que saiu da build
for (const p of arquivos.filter((x) => x.endsWith('.js'))) {
  // sem os comentarios: os tipos do JSDoc citam modulos do slime-merge que nao vieram
  const t = semComentarios(readFileSync(p, 'utf8'));
  for (const m of t.matchAll(/import\s*(?:[^'"]*from\s*)?\(?\s*'(\.[^']+)'/g)) {
    if (!existsSync(join(p, '..', m[1]))) falhas.push(`import quebrado em ${relative(dist, p)}: ${m[1]}`);
  }
  if (/__voleiModelo/.test(t)) falhas.push(`gancho __voleiModelo ficou em ${relative(dist, p)} (falta "// modelo")`);
}
const html = readFileSync(join(dist, 'index.html'), 'utf8');
if (!/viewport-fit=cover/.test(html)) falhas.push('index.html sem viewport-fit=cover');
if (!html.includes(PERMITIDA)) falhas.push('index.html sem o SDK da Poki');
let bruto = 0;
let gz = 0;
let bAudio = 0;
for (const p of arquivos) {
  const r = relative(dist, p);
  const dados = readFileSync(p);
  bruto += dados.length;
  gz += gzipSync(dados, { level: 9 }).length;
  if (r.startsWith('src/som/arquivos/')) bAudio += dados.length;
  if (r.startsWith('src/arte/ginasios/') && dados.length > TETO.fundo) falhas.push(`fundo acima de 250 KB: ${r} (${(dados.length / KB).toFixed(0)} KB)`);
  if (extname(p) === '.map') falhas.push(`mapa de fonte na build: ${r}`);
  if (/\.(html|js|css)$/.test(p)) {
    const t = dados.toString('utf8');
    for (const u of t.match(/https?:\/\/[^\s"'`)<>]+/g) || []) if (u !== PERMITIDA) falhas.push(`URL externa em ${r}: ${u}`);
    if (/console\.(log|info|debug)\s*\(/.test(t)) falhas.push(`console.log em ${r}`);
  }
}
if (bAudio > TETO.audio) falhas.push(`audio acima de 200 KB (${(bAudio / KB).toFixed(0)} KB)`);
if (bruto > TETO.inicial) falhas.push(`inicial acima de 1,5 MB (${(bruto / KB).toFixed(0)} KB)`);
if (bruto > TETO.total) falhas.push(`total acima de 4,5 MB (${(bruto / KB).toFixed(0)} KB)`);
// thumb: assinatura PNG e largura/altura do IHDR (bytes 16..23, big-endian)
let thumbLado = 0;
if (!COM_THUMB) { /* ensaio sem thumb */ } else if (!existsSync(THUMB)) falhas.push(`thumb ausente: ${relative(RAIZ, THUMB)}`);
else {
  const t = readFileSync(THUMB);
  const png = t.length > 24 && t.toString('latin1', 1, 4) === 'PNG';
  const w = png ? t.readUInt32BE(16) : 0, h = png ? t.readUInt32BE(20) : 0;
  if (!png) falhas.push('thumb nao e PNG');
  else if (w !== h) falhas.push(`thumb nao e quadrada (${w}x${h})`);
  else if (w < THUMB_MIN) falhas.push(`thumb menor que ${THUMB_MIN} px (${w})`);
  else thumbLado = w;
}
if (falhas.length) {
  process.stdout.write('FALHOU:\n  ' + falhas.join('\n  ') + '\n');
  process.exit(1);
}

mkdirSync(saida, { recursive: true });
rmSync(zip, { force: true });
const z = spawnSync('zip', ['-qr', '-X', zip, '.'], { cwd: dist, encoding: 'utf8' });
if (z.status !== 0) {
  process.stdout.write('zip falhou: ' + z.stderr + '\n');
  process.exit(1);
}
const teste = spawnSync('unzip', ['-tq', zip], { encoding: 'utf8' });
const lista = spawnSync('unzip', ['-Z1', zip], { encoding: 'utf8' }).stdout.trim().split('\n');
if (teste.status !== 0 || !lista.includes('index.html')) {
  process.stdout.write('zip invalido ou sem index.html na raiz\n');
  process.exit(1);
}
const sha = createHash('sha256').update(readFileSync(zip)).digest('hex');
const tam = statSync(zip).size;
writeFileSync(join(saida, `${nomeZip}.sha256`), `${sha}  ${nomeZip}.zip\n`);
const thumbSaida = join(saida, `${nomeZip}-thumb.png`);
if (COM_THUMB) cpSync(THUMB, thumbSaida);
process.stdout.write(`audio: ${usados.size} arquivos, ${(bAudio / KB).toFixed(1)} KB\n`);
process.stdout.write(`build ok: ${arquivos.length} arquivos, ${(bruto / KB).toFixed(0)} KB (${(gz / KB).toFixed(0)} KB gzip)\n`);
process.stdout.write(`${relative(RAIZ, zip)}: ${(tam / KB).toFixed(0)} KB, sha256 ${sha}\n`);
if (COM_THUMB) process.stdout.write(`${relative(RAIZ, thumbSaida)}: ${thumbLado}x${thumbLado}, ${(statSync(thumbSaida).size / KB).toFixed(0)} KB\n`);
else process.stdout.write('sem thumb (ensaio): a Poki pede a thumb no envio; rode com --thumb quando ela existir\n');
