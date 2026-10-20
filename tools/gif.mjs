// GIF do jogo de verdade: Chrome headless em tempo real, frames pelo screencast do CDP, ffmpeg
// com paleta. Uso: node tools/gif.mjs <saida.gif> <LxA> <largura_gif> <seg1_query>@<ms> [<seg2_query>@<ms> ...]
// Cada segmento abre a pagina com a query e grava por ms. Porta 4385 / CDP 9382.
import { mkdirSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { servir } from './servir.mjs';
import { abrirChrome, espera } from './cdp.mjs';

export async function gravarGif(saida, tam, largura, segmentos, fps = 15) {
  const [w, h] = tam.split('x').map(Number);
  const dir = join('.tmp', 'gif-' + Math.random().toString(36).slice(2));
  mkdirSync(dir, { recursive: true });
  const fechar = await servir(4385);
  let n = 0;
  for (const seg of segmentos) {
    const [query, msTxt] = seg.split('@');
    const ms = Number(msTxt) || 3000;
    const c = await abrirChrome({ largura: w, altura: h, toque: true, porta: 9382 });
    const frames = [];
    try {
      await c.ir(`http://127.0.0.1:4385/index.html?semblur&${query}`, 900);
      // screencast: cada quadro chega como JPEG com o carimbo de tempo
      const ws = c;
      let t0 = 0;
      const ouvir = (msg) => msg;
      void ouvir;
      await c.cmd('Page.startScreencast', { format: 'jpeg', quality: 85, everyNthFrame: 1 });
      const inicio = Date.now();
      // o cdp.mjs nao expoe eventos: busca com captureScreenshot em ritmo fixo
      await c.cmd('Page.stopScreencast');
      while (Date.now() - inicio < ms) {
        const r = await c.cmd('Page.captureScreenshot', { format: 'jpeg', quality: 88 });
        frames.push({ t: Date.now() - inicio, b: Buffer.from(r.result.data, 'base64') });
        await espera(Math.max(0, 1000 / fps - 25));
      }
      void ws; void t0;
    } finally {
      await c.fechar();
    }
    // reamostra no tempo real para fps fixo
    const total = frames.length ? frames[frames.length - 1].t : 0;
    for (let t = 0; t <= total; t += 1000 / fps) {
      let melhor = frames[0];
      for (const f of frames) if (Math.abs(f.t - t) < Math.abs(melhor.t - t)) melhor = f;
      writeFileSync(join(dir, `f${String(n++).padStart(4, '0')}.jpg`), melhor.b);
    }
  }
  await fechar();
  const filtro = `fps=${fps},scale=${largura}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=160:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle`;
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', join(dir, 'f%04d.jpg'), '-vf', filtro, '-loop', '0', saida], { encoding: 'utf8' });
  const quantos = readdirSync(dir).length;
  rmSync(dir, { recursive: true, force: true });
  if (r.status !== 0) throw new Error('ffmpeg: ' + r.stderr);
  return quantos;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [saida, tam, larg, ...segs] = process.argv.slice(2);
  const n = await gravarGif(saida, tam, Number(larg) || 480, segs);
  process.stdout.write(`${saida}: ${n} quadros\n`);
}
