// Gera ou repinta imagens com o Grok Imagine em modo headless, restrito a image_gen/image_edit
// (decisao do usuario de 2026-10-20). Roda numa pasta propria fora do repositorio
// (~/.cache/slime-voley-grok, com git init vazio e SEM CLAUDE.md: o Grok nao carrega as regras
// deste projeto). A falha e detectada pelo stderr ("permission required") ou pela falta de um
// N.jpg novo na sessao: o codigo de saida e 0 mesmo quando falha. Nunca usa --yolo, bypass nem
// --always-approve.
//
// Uso:
//   node tools/grok.mjs gerar <id> <16:9|9:16|1:1> "<prompt>"
//   node tools/grok.mjs editar <id> <imagem.png> "<prompt>"
// Copia o resultado para assets/brutos/<id>.jpg e acrescenta o registro em docs/autoria.md.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, copyFileSync, appendFileSync, writeFileSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { RAIZ } from './servir.mjs';

const PASTA = join(homedir(), '.cache/slime-voley-grok');
const SESSOES = join(homedir(), '.grok/sessions', encodeURIComponent(PASTA));
const BRUTOS = join(RAIZ, 'assets/brutos');
const AUTORIA = join(RAIZ, 'docs/autoria.md');

function rodar(args, ms = 300000) {
  return new Promise((ok) => {
    const p = spawn('grok', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    p.stdout.on('data', (d) => { out += d; });
    p.stderr.on('data', (d) => { err += d; });
    const t = setTimeout(() => p.kill('SIGKILL'), ms);
    p.on('close', (codigo) => { clearTimeout(t); ok({ out, err, codigo }); });
  });
}

/**
 * @param {'gerar'|'editar'} modo @param {string} id @param {string} prompt
 * @param {{ aspecto?: string, imagem?: string }} o
 */
export async function grok(modo, id, prompt, o = {}) {
  mkdirSync(PASTA, { recursive: true });
  if (!existsSync(join(PASTA, '.git'))) await new Promise((r) => spawn('git', ['init', '-q'], { cwd: PASTA }).on('close', r));
  mkdirSync(BRUTOS, { recursive: true });
  const sid = randomUUID();
  const pedido = modo === 'gerar'
    ? `Call image_gen exactly once with aspect ratio ${o.aspecto || '16:9'} and this prompt verbatim: '${prompt.replace(/'/g, '’')}'. Then reply with only the returned file path.`
    : `Call image_edit exactly once with image ['${resolve(o.imagem)}'] and this prompt verbatim: '${prompt.replace(/'/g, '’')}'. Then reply with only the returned file path.`;
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    const r = await rodar(['-p', pedido, '--cwd', PASTA, '--tools', 'image_gen,image_edit', '--disable-web-search', '--no-subagents', '--reasoning-effort', 'low', '--output-format', 'json', '--max-turns', '4', '-s', tentativa ? randomUUID() : sid]);
    if (/permission required/i.test(r.err)) throw new Error('o Grok pediu permissao (rode pela TUI ou libere so image_gen/image_edit com --allow)');
    const pasta = join(SESSOES, tentativa ? '' : sid, 'images');
    let arq = '';
    try {
      const j = JSON.parse(r.out);
      if (j.text && existsSync(j.text.trim())) arq = j.text.trim();
    } catch { /* sem json */ }
    if (!arq && existsSync(pasta)) {
      const imgs = readdirSync(pasta).filter((n) => n.endsWith('.jpg')).sort();
      if (imgs.length) arq = join(pasta, imgs[imgs.length - 1]);
    }
    if (arq) {
      const destino = join(BRUTOS, `${id}.jpg`);
      copyFileSync(arq, destino);
      registrar({ id, modo, prompt, sessao: tentativa ? '(nova tentativa)' : sid, arquivo: arq });
      return destino;
    }
    if (/429|rate/i.test(r.err + r.out)) await new Promise((ok) => setTimeout(ok, 20000));
  }
  throw new Error(`o Grok nao devolveu imagem para ${id}`);
}

function registrar(r) {
  if (!existsSync(AUTORIA)) writeFileSync(AUTORIA, '# Autoria dos assets\n\nArte gerada com o Grok Imagine (headless, so image_gen/image_edit) e depois tratada a mao (recorte, curvas de cor, desfoque de profundidade). Nada de pessoas, texto, logos ou marcas.\n\n| id | modo | data | sessao | prompt | passe manual |\n|---|---|---|---|---|---|\n');
  const data = new Date().toISOString().slice(0, 10);
  const prompt = r.prompt.replace(/\|/g, '/').replace(/\n/g, ' ');
  appendFileSync(AUTORIA, `| ${r.id} | ${r.modo} | ${data} | ${r.sessao} | ${prompt} | pendente |\n`);
  void readFileSync;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [modo, id, a3, a4] = process.argv.slice(2);
  if (modo === 'gerar') process.stdout.write((await grok('gerar', id, a4, { aspecto: a3 })) + '\n');
  else if (modo === 'editar') process.stdout.write((await grok('editar', id, a4, { imagem: a3 })) + '\n');
  else process.stdout.write('uso: node tools/grok.mjs gerar <id> <aspecto> "<prompt>" | editar <id> <imagem> "<prompt>"\n');
}
