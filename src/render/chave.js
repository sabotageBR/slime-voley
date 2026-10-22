// Chave da Copa Gosma (src/jogo/torneio.js) num canvas, em px CSS: espelhada, com a final no meio
// e a taca de gosma (desenho nosso) por cima. Em paisagem as rodadas vao da borda para o centro na
// horizontal; em retrato (mais alto que largo), na vertical. Cada vaga: bandeira, nome curto e
// placar; quem venceu fica em destaque, quem perdeu esmaece, o jogador vai na cor dele e o jogo
// atual pulsa. k (0..1) anima a ultima rodada revelada (as linhas crescem, os placares aparecem).

import { TINTA } from './fundo.js';
import { desenharBandeirinha } from './bandeiras.js';

const OURO = '#ffc83a';

/**
 * @typedef {{ nome: string, pais: string, cor: string }} VagaVis
 * @typedef {{ chave: ReturnType<typeof import('../jogo/torneio.js').chaveDaCopa>, vagas: VagaVis[], corJogador: string, k?: number, t?: number, nomes?: boolean }} DadosChave
 */

/** Taca de gosma: copa, alcas, base e pingos (centro x, topo y, tamanho s). */
export function desenharTaca(ctx, x, y, s, brilho = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(1.5, s * 0.06);
  ctx.strokeStyle = TINTA;
  if (brilho > 0) {
    ctx.fillStyle = `rgba(255, 220, 90, ${0.35 * brilho})`;
    ctx.beginPath();
    ctx.arc(0, s * 0.42, s * 0.85, 0, Math.PI * 2);
    ctx.fill();
  }
  // alcas
  ctx.beginPath();
  ctx.arc(-s * 0.42, s * 0.3, s * 0.16, Math.PI * 0.5, Math.PI * 1.6);
  ctx.moveTo(s * 0.42 + s * 0.16 * Math.cos(Math.PI * 1.4), s * 0.3 + s * 0.16 * Math.sin(Math.PI * 1.4));
  ctx.arc(s * 0.42, s * 0.3, s * 0.16, Math.PI * 1.4, Math.PI * 0.5);
  ctx.lineWidth = Math.max(2.5, s * 0.1);
  ctx.stroke();
  ctx.lineWidth = Math.max(1.2, s * 0.05);
  ctx.strokeStyle = OURO;
  ctx.stroke();
  ctx.strokeStyle = TINTA;
  ctx.lineWidth = Math.max(1.5, s * 0.06);
  // copa (meia gota) com pingos escorrendo
  ctx.beginPath();
  ctx.moveTo(-s * 0.42, s * 0.05);
  ctx.lineTo(s * 0.42, s * 0.05);
  ctx.quadraticCurveTo(s * 0.44, s * 0.55, 0, s * 0.62);
  ctx.quadraticCurveTo(-s * 0.44, s * 0.55, -s * 0.42, s * 0.05);
  ctx.closePath();
  ctx.fillStyle = OURO;
  ctx.fill();
  ctx.stroke();
  for (const [px, comp] of [[-0.24, 0.16], [0.08, 0.24], [0.3, 0.12]]) {
    ctx.beginPath();
    ctx.moveTo(s * (px - 0.05), s * 0.06);
    ctx.lineTo(s * (px - 0.04), s * (0.06 + comp));
    ctx.arc(s * px, s * (0.06 + comp), s * 0.045, Math.PI, 0, true);
    ctx.lineTo(s * (px + 0.05), s * 0.06);
    ctx.fill();
  }
  // pe e base
  ctx.fillStyle = OURO;
  ctx.fillRect(-s * 0.07, s * 0.6, s * 0.14, s * 0.18);
  ctx.strokeRect(-s * 0.07, s * 0.6, s * 0.14, s * 0.18);
  ctx.beginPath();
  ctx.roundRect(-s * 0.3, s * 0.76, s * 0.6, s * 0.16, s * 0.05);
  ctx.fill();
  ctx.stroke();
  // brilho
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = Math.max(1, s * 0.05);
  ctx.beginPath();
  ctx.moveTo(-s * 0.28, s * 0.14);
  ctx.quadraticCurveTo(-s * 0.26, s * 0.38, -s * 0.12, s * 0.48);
  ctx.stroke();
  ctx.restore();
}

/**
 * @param {CanvasRenderingContext2D} ctx (transform: px CSS)
 * @param {number} W @param {number} H
 * @param {DadosChave} d
 */
export function desenharChave(ctx, W, H, d) {
  const C = d.chave;
  const R = C.fases.length;
  const tam = C.tam;
  const k = d.k ?? 1;
  const t = d.t || 0;
  const ultima = C.fase - 1;
  const retrato = H > W * 1.15;
  const ncol = 2 * R - 1;
  const porLado = tam / 2;
  // eixos logicos: u = coluna (rodada), v = posicao da vaga; em retrato u vira y e v vira x
  const topoTaca = retrato ? 0 : Math.min(54, H * 0.2);
  const U = retrato ? H : W;
  const V = retrato ? W : H - topoTaca;
  const colU = U / ncol;
  const passoV = V / porLado;
  const caixaU = retrato ? Math.min(colU * 0.62, 46) : colU * 0.86;
  const caixaV = retrato ? Math.max(18, passoV * 0.9) : Math.min(passoV * 0.8, 34);
  const tela = (u, v) => (retrato ? [v, u] : [u, topoTaca + v]);
  // posicao v de cada vaga local de cada rodada (por lado)
  const vs = [];
  vs[0] = Array.from({ length: porLado }, (_, s) => (s + 0.5) * passoV);
  for (let r = 1; r < R; r++) vs[r] = Array.from({ length: porLado >> r }, (_, q) => (vs[r - 1][2 * q] + vs[r - 1][2 * q + 1]) / 2);
  /** centro u da coluna de uma rodada num lado (0 esquerda/topo, 1 direita/baixo) */
  const colDe = (r, lado) => (r === R - 1 ? (R - 1 + 0.5) * colU : lado === 0 ? (r + 0.5) * colU : (ncol - r - 0.5) * colU);
  /** vagas a desenhar: [u, v, indice da vaga, jogo, e a vaga 'a' ou 'b'] */
  const caixas = [];
  const linhas = [];
  C.rodadas.forEach((jogos, r) => {
    const M = jogos.length;
    jogos.forEach((j, m) => {
      let lado;
      let q;
      let u;
      let va;
      let vb;
      if (r === R - 1) {
        // final: os dois finalistas no centro, um em cima do outro
        u = colDe(r, 0);
        const meio = V / 2;
        const sep = Math.max(caixaV * 0.75, passoV * 0.55);
        va = meio - sep;
        vb = meio + sep;
        lado = 0;
      } else {
        lado = m < M / 2 ? 0 : 1;
        q = (m % (M / 2)) * 2;
        u = colDe(r, lado);
        va = vs[r][q];
        vb = vs[r][q + 1];
      }
      const revelado = r < ultima || (r === ultima ? k : 0);
      const fresco = r === ultima ? k : 1;
      caixas.push({ u, v: va, vaga: j.a, jogo: j, r, eA: true, fresco, atual: r === C.fase && j.doJogador });
      caixas.push({ u, v: vb, vaga: j.b, jogo: j, r, eA: false, fresco, atual: r === C.fase && j.doJogador });
      // linhas ate a proxima rodada
      if (r < R - 1) {
        const prox = r + 1 === R - 1 ? colDe(R - 1, 0) : colDe(r + 1, lado);
        const dir = r + 1 === R - 1 ? (lado === 0 ? 1 : -1) : lado === 0 ? 1 : -1;
        const sai = u + dir * caixaU * 0.5;
        const entra = prox - dir * caixaU * 0.5;
        const meioU = (sai + entra) / 2;
        let vProx;
        if (r + 1 === R - 1) vProx = lado === 0 ? V / 2 - Math.max(caixaV * 0.75, passoV * 0.55) : V / 2 + Math.max(caixaV * 0.75, passoV * 0.55);
        else vProx = vs[r + 1][Math.floor(q / 2)];
        const venc = j.venc >= 0 ? (j.venc === j.a ? va : vb) : null;
        linhas.push({ pts: [[sai, va], [meioU, va], [meioU, vb], [sai, vb]], cor: 'rgba(23,22,28,0.35)', larg: 2 });
        linhas.push({ pts: [[meioU, (va + vb) / 2], [entra, vProx]], cor: 'rgba(23,22,28,0.35)', larg: 2, quebra: true });
        if (venc !== null && revelado) {
          const doJogador = j.venc === 0;
          linhas.push({ pts: [[sai, venc], [meioU, venc], [meioU, vProx], [entra, vProx]], cor: doJogador ? d.corJogador : OURO, larg: 3.5, k: r === ultima ? k : 1 });
        }
      }
    });
  });
  // linhas
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (const l of linhas) {
    let pts = l.pts;
    if (l.quebra) pts = [l.pts[0], [l.pts[0][0], l.pts[1][1]], l.pts[1]];
    if (l.k !== undefined && l.k < 1) {
      // cresce do vencedor para a proxima vaga
      let tot = 0;
      for (let i = 1; i < pts.length; i++) tot += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      let resta = tot * l.k;
      const p2 = [pts[0]];
      for (let i = 1; i < pts.length && resta > 0; i++) {
        const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
        const f = Math.min(1, resta / seg);
        p2.push([pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f]);
        resta -= seg;
      }
      pts = p2;
    }
    ctx.beginPath();
    pts.forEach(([u, v], i) => { const [x, y] = tela(u, v); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
    ctx.strokeStyle = l.cor;
    ctx.lineWidth = l.larg;
    ctx.stroke();
  }
  // taca: no topo, acima da final (em retrato, na borda direita da linha da final)
  const sT = retrato ? Math.min(46, colU * 0.9) : Math.min(48, topoTaca * 0.95);
  const [tx, ty] = retrato ? [W - sT * 0.62, H / 2 - sT * 0.48] : [W / 2, 2];
  desenharTaca(ctx, tx, ty, sT, C.campeao ? 0.6 + 0.4 * Math.sin(t * 4) : 0);
  // caixas
  const fonte = Math.round(Math.max(10, Math.min(15, caixaV * 0.44)));
  for (const c of caixas) {
    const [x, y] = tela(c.u, c.v);
    const w = retrato ? caixaV : caixaU;
    const h = retrato ? caixaU : caixaV;
    const x0 = x - w / 2;
    const y0 = y - h / 2;
    const v = c.vaga;
    const jogo = c.jogo;
    const decidido = jogo.venc >= 0;
    const perdeu = decidido && jogo.venc !== v;
    ctx.save();
    ctx.globalAlpha = perdeu ? 0.45 + 0.55 * (1 - c.fresco) : 1;
    if (v < 0) {
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = 'rgba(23,22,28,0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(x0, y0, w, h, 6);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(23,22,28,0.35)';
      ctx.font = `700 ${fonte}px Fredoka, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', x, y + 1);
      ctx.restore();
      continue;
    }
    const vis = d.vagas[v];
    const jogador = v === 0;
    // fundo da caixa (sombra de tinta, como os botoes do HUD)
    ctx.fillStyle = TINTA;
    ctx.beginPath();
    ctx.roundRect(x0, y0 + 2, w, h, 6);
    ctx.fill();
    ctx.fillStyle = jogador ? '#fff7e8' : '#ffffff';
    ctx.beginPath();
    ctx.roundRect(x0, y0, w, h, 6);
    ctx.fill();
    const pulso = c.atual ? 0.5 + 0.5 * Math.sin(t * 6) : 0;
    ctx.lineWidth = jogador ? 2.5 + pulso : 1.8;
    ctx.strokeStyle = jogador ? vis.cor : decidido && !perdeu ? OURO : TINTA;
    ctx.stroke();
    // bandeira (e o pinguinho com a cor do slime)
    const fh = retrato ? Math.min(h * 0.42, w * 0.5) : h * 0.62;
    const fw = fh * 1.5;
    const fx = retrato ? x - fw / 2 : x0 + 5;
    const fy = retrato ? y0 + 4 : y - fh / 2;
    desenharBandeirinha(ctx, vis.pais, fx, fy, fw, fh);
    ctx.fillStyle = vis.cor;
    ctx.beginPath();
    ctx.arc(fx + fw, fy + fh, Math.max(3, fh * 0.28), Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = TINTA;
    ctx.stroke();
    // nome e placar
    ctx.fillStyle = TINTA;
    ctx.font = `700 ${fonte}px Fredoka, system-ui, sans-serif`;
    ctx.textBaseline = 'middle';
    const placar = decidido && jogo.placar && c.fresco > 0.5 ? String(c.eA ? jogo.placar[0] : jogo.placar[1]) : '';
    if (retrato) {
      ctx.textAlign = 'center';
      if (d.nomes !== false && w >= 52) {
        ctx.fillText(cortar(ctx, vis.nome, w - 6), x, y0 + h - fonte * 0.62);
        if (placar) { ctx.font = `700 ${fonte + 1}px Fredoka, system-ui, sans-serif`; ctx.fillText(placar, x0 + w - 7, y0 + 9); }
      } else if (placar) {
        // caixa estreita (chave de 16 no retrato): o placar embaixo da bandeira
        ctx.font = `700 ${fonte + 1}px Fredoka, system-ui, sans-serif`;
        ctx.fillText(placar, x, y0 + h - fonte * 0.62);
      }
    } else {
      ctx.textAlign = 'left';
      const xn = fx + fw + 7;
      const larg = x0 + w - xn - (placar ? fonte * 1.4 : 4);
      if (d.nomes !== false && larg > 16) ctx.fillText(cortar(ctx, vis.nome, larg), xn, y + 1);
      if (placar) {
        ctx.textAlign = 'right';
        ctx.font = `700 ${fonte + 1}px Fredoka, system-ui, sans-serif`;
        ctx.fillText(placar, x0 + w - 6, y + 1);
      }
    }
    ctx.restore();
  }
}

/** Corta o texto com reticencias ate caber em `max` px. */
function cortar(ctx, s, max) {
  if (ctx.measureText(s).width <= max) return s;
  let r = s;
  while (r.length > 1 && ctx.measureText(r + '…').width > max) r = r.slice(0, -1);
  return r + '…';
}
