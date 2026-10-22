// Chave da Copa Gosma (src/jogo/torneio.js) num canvas, em px CSS: espelhada, com a final no meio
// e a taca de gosma (desenho nosso) por cima. Em paisagem as rodadas vao da borda para o centro na
// horizontal; em retrato (mais alto que largo), na vertical. Cada vaga: bandeira, nome curto e
// placar (a caixa cresce a cada rodada: os 16-avos da chave de 32 ficam so com bandeira e placar);
// quem venceu fica em destaque e quem perdeu esmaece. O jogador e a caixa cheia na cor dele,
// brilhando, com o caminho dele por cima de tudo; o adversario da vez pulsa com o selo VS. k (0..1)
// anima a ultima rodada revelada (as linhas crescem, os placares aparecem). Embaixo, a faixa "seu
// caminho" do cartao de fim (desenharCaminho).

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
  // a caixa cresce a cada rodada (sobra espaco entre os jogos): na chave de 32 os 16-avos ficam so
  // com a bandeira e o placar, e o nome aparece quando cabe
  const caixaVDe = (r) => (retrato ? Math.max(18, Math.min(passoV * 2 ** r * 0.9, 64)) : Math.min(passoV * 2 ** r * 0.8, 26));
  const sepFinal = Math.max(caixaVDe(R - 1) * 0.75, passoV * 0.55);
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
  /** o caminho do jogador: por cima de todas, na cor dele com contorno */
  const linhasJ = [];
  /** o selo VS no jogo atual do jogador */
  let selo = null;
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
        va = V / 2 - sepFinal;
        vb = V / 2 + sepFinal;
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
      const atual = r === C.fase && j.doJogador;
      caixas.push({ u, v: va, vaga: j.a, jogo: j, r, eA: true, fresco, atual });
      caixas.push({ u, v: vb, vaga: j.b, jogo: j, r, eA: false, fresco, atual });
      if (atual && j.b >= 0) selo = r === R - 1 ? { u, v: V / 2 } : { u: u + colU * 0.5, v: (va + vb) / 2 };
      // linhas ate a proxima rodada
      if (r < R - 1) {
        const prox = r + 1 === R - 1 ? colDe(R - 1, 0) : colDe(r + 1, lado);
        const dir = r + 1 === R - 1 ? (lado === 0 ? 1 : -1) : lado === 0 ? 1 : -1;
        const sai = u + dir * caixaU * 0.5;
        const entra = prox - dir * caixaU * 0.5;
        const meioU = (sai + entra) / 2;
        let vProx;
        if (r + 1 === R - 1) vProx = lado === 0 ? V / 2 - sepFinal : V / 2 + sepFinal;
        else vProx = vs[r + 1][Math.floor(q / 2)];
        const venc = j.venc >= 0 ? (j.venc === j.a ? va : vb) : null;
        linhas.push({ pts: [[sai, va], [meioU, va], [meioU, vb], [sai, vb]], cor: 'rgba(23,22,28,0.22)', larg: 1.6 });
        linhas.push({ pts: [[meioU, (va + vb) / 2], [entra, vProx]], cor: 'rgba(23,22,28,0.22)', larg: 1.6, quebra: true });
        if (venc !== null && revelado) {
          const doJogador = j.venc === 0;
          const l = { pts: [[sai, venc], [meioU, venc], [meioU, vProx], [entra, vProx]], cor: doJogador ? d.corJogador : OURO, larg: doJogador ? 4.5 : 2.5, k: r === ultima ? k : 1 };
          (doJogador ? linhasJ : linhas).push(l);
        }
      }
    });
  });
  // linhas (as do jogador por ultimo, com contorno de tinta)
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const tracar = (l, cor, larg) => {
    let pts = l.pts;
    if (l.quebra) pts = [l.pts[0], [l.pts[0][0], l.pts[1][1]], l.pts[1]];
    if (l.k !== undefined && l.k < 1) pts = parcial(pts, l.k);
    ctx.beginPath();
    pts.forEach(([u, v], i) => { const [x, y] = tela(u, v); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
    ctx.strokeStyle = cor;
    ctx.lineWidth = larg;
    ctx.stroke();
  };
  for (const l of linhas) tracar(l, l.cor, l.larg);
  for (const l of linhasJ) tracar(l, TINTA, l.larg + 2.5);
  for (const l of linhasJ) tracar(l, l.cor, l.larg);
  // taca: no topo, acima da final (em retrato, na borda direita da linha da final)
  const sT = retrato ? Math.min(46, colU * 0.9) : Math.min(48, topoTaca * 0.95);
  const [tx, ty] = retrato ? [W - sT * 0.62, H / 2 - sT * 0.48] : [W / 2, 2];
  desenharTaca(ctx, tx, ty, sT, C.campeao ? 0.6 + 0.4 * Math.sin(t * 4) : 0);
  // caixas: o jogador por ultimo, por cima dos vizinhos
  for (const c of caixas) if (c.vaga !== 0) caixa(c);
  for (const c of caixas) if (c.vaga === 0) caixa(c);
  // selo VS entre o jogador e o adversario da rodada atual
  if (selo && !C.campeao) {
    const [x, y] = tela(selo.u, selo.v);
    const rb = Math.max(7, Math.min(11, colU * 0.2));
    seloVs(ctx, x, y, rb * (1 + 0.08 * Math.sin(t * 6)));
  }

  /** Uma vaga: bandeira, pinguinho com a cor do slime, nome (se couber) e placar. */
  function caixa(c) {
    const [x, y] = tela(c.u, c.v);
    const cv = caixaVDe(c.r);
    const v = c.vaga;
    const jogador = v === 0;
    let w = retrato ? cv : caixaU;
    let h = retrato ? caixaU : cv;
    // a do jogador um pouco maior (legivel mesmo nos 16-avos)
    if (jogador && retrato) w = Math.max(w, Math.min(30, passoV * 2 ** c.r * 0.98));
    else if (jogador) h = Math.max(h, Math.min(18, passoV * 2 ** c.r * 0.98));
    const x0 = x - w / 2;
    const y0 = y - h / 2;
    const raio = Math.min(6, h / 2, w / 2);
    const fonte = Math.round(Math.max(jogador ? 9 : 8, Math.min(15, cv * 0.44)));
    const jogo = c.jogo;
    const decidido = jogo.venc >= 0;
    const perdeu = decidido && jogo.venc !== v;
    ctx.save();
    ctx.globalAlpha = perdeu ? 0.35 + 0.65 * (1 - c.fresco) : 1;
    if (v < 0) {
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = 'rgba(23,22,28,0.35)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.roundRect(x0, y0, w, h, raio);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(23,22,28,0.35)';
      ctx.font = `700 ${fonte}px Fredoka, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', x, y + 1);
      ctx.restore();
      return;
    }
    const vis = d.vagas[v];
    // fundo da caixa (sombra de tinta, como os botoes do HUD)
    ctx.fillStyle = TINTA;
    ctx.beginPath();
    ctx.roundRect(x0, y0 + 2, w, h, raio);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(x0, y0, w, h, raio);
    if (jogador) {
      // o jogador: a caixa inteira na cor dele, brilhando
      ctx.shadowColor = vis.cor;
      ctx.shadowBlur = 7 + 7 * (0.5 + 0.5 * Math.sin(t * 4));
      ctx.fillStyle = vis.cor;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = TINTA;
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      // o adversario da rodada atual pulsa em vermelho; quem venceu fica dourado
      const pulso = c.atual ? 0.5 + 0.5 * Math.sin(t * 6) : 0;
      ctx.lineWidth = c.atual ? 2 + pulso * 1.2 : 1.5;
      ctx.strokeStyle = c.atual ? VS : decidido && !perdeu ? OURO : TINTA;
    }
    ctx.stroke();
    // bandeira (e o pinguinho com a cor do slime)
    const fh = retrato ? Math.min(h * 0.42, w * 0.5) : Math.min(h * 0.64, 13);
    const fw = fh * 1.5;
    const fx = retrato ? x - fw / 2 : x0 + Math.min(5, h * 0.25);
    const fy = retrato ? y0 + 4 : y - fh / 2;
    desenharBandeirinha(ctx, vis.pais, fx, fy, fw, fh);
    if (!jogador && (retrato ? w >= 26 : h >= 14)) {
      ctx.fillStyle = vis.cor;
      ctx.beginPath();
      ctx.arc(fx + fw, fy + fh, Math.max(3, fh * 0.28), Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = TINTA;
      ctx.stroke();
    }
    // nome e placar (o jogador em branco com contorno, sobre a cor dele)
    const escrever = (txt, tx, ty) => {
      if (jogador) {
        ctx.lineJoin = 'round';
        ctx.lineWidth = Math.max(2, fonte * 0.32);
        ctx.strokeStyle = TINTA;
        ctx.strokeText(txt, tx, ty);
        ctx.fillStyle = '#ffffff';
      } else ctx.fillStyle = TINTA;
      ctx.fillText(txt, tx, ty);
    };
    ctx.font = `700 ${fonte}px Fredoka, system-ui, sans-serif`;
    ctx.textBaseline = 'middle';
    const placar = decidido && jogo.placar && c.fresco > 0.5 ? String(c.eA ? jogo.placar[0] : jogo.placar[1]) : '';
    if (retrato) {
      ctx.textAlign = 'center';
      if (d.nomes !== false && w >= 52) {
        escrever(cortar(ctx, vis.nome, w - 6), x, y0 + h - fonte * 0.62);
        if (placar) { ctx.font = `700 ${fonte + 1}px Fredoka, system-ui, sans-serif`; escrever(placar, x0 + w - 7, y0 + 9); }
      } else if (placar) {
        // caixa estreita (chave grande no retrato): o placar embaixo da bandeira
        ctx.font = `700 ${fonte + 1}px Fredoka, system-ui, sans-serif`;
        escrever(placar, x, y0 + h - fonte * 0.62);
      }
    } else {
      ctx.textAlign = 'left';
      const xn = fx + fw + (jogador ? 5 : 7);
      const larg = x0 + w - xn - (placar ? fonte * 1.4 : 4);
      if (d.nomes !== false && larg > 14 && (jogador || h >= 15)) escrever(cortar(ctx, vis.nome, larg), xn, y + 1);
      if (placar) {
        ctx.textAlign = 'right';
        ctx.font = `700 ${fonte + 1}px Fredoka, system-ui, sans-serif`;
        escrever(placar, x0 + w - Math.min(6, h * 0.35), y + 1);
      }
    }
    ctx.restore();
  }
}

/** Vermelho do adversario da vez (o selo VS e a borda que pulsa). */
const VS = '#ff5a4f';

/** Selo "VS" (centro x, y; raio r). */
function seloVs(ctx, x, y, r) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = VS;
  ctx.fill();
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = TINTA;
  ctx.stroke();
  ctx.font = `700 ${Math.round(r * 0.95)}px Fredoka, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(1.5, r * 0.28);
  ctx.strokeText('VS', x, y + 1);
  ctx.fillStyle = '#ffffff';
  ctx.fillText('VS', x, y + 1);
  ctx.restore();
}

/** O comeco de uma polilinha (k de 0 a 1 do comprimento): a linha que cresce. */
function parcial(pts, k) {
  let tot = 0;
  for (let i = 1; i < pts.length; i++) tot += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  let resta = tot * k;
  const p2 = [pts[0]];
  for (let i = 1; i < pts.length && resta > 0; i++) {
    const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    const f = Math.min(1, resta / seg);
    p2.push([pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f]);
    resta -= seg;
  }
  return p2;
}

/**
 * Faixa "seu caminho" no cartao de fim (pedido de 2026-10-22: "destaque o time do jogador"): o
 * slime do jogador, as rodadas dele ate a final e a taca, ligados por uma linha na cor dele que
 * mostra ate onde ele chegou. Rodada jogada: a bandeira do adversario com o visto e o placar; a
 * atual pulsa com o VS e o nome do adversario; as seguintes ficam em aberto. k anima o avanco.
 * @param {CanvasRenderingContext2D} ctx (transform: px CSS)
 * @param {number} W @param {number} H
 * @param {DadosChave & { nomesFases?: string[] }} d
 */
export function desenharCaminho(ctx, W, H, d) {
  const C = d.chave;
  const R = C.fases.length;
  const k = d.k ?? 1;
  const t = d.t || 0;
  const TAU = Math.PI * 2;
  const passo = W / (R + 2);
  const xDe = (i) => passo * (i + 0.5);
  const fonte = Math.round(Math.max(9, Math.min(14, passo * 0.16, H * 0.15)));
  const r0 = Math.max(9, Math.min(passo * 0.3, (H - fonte * 2.9) / 2.3));
  const y0 = Math.max(0, (H - (fonte * 2.9 + r0 * 2.3)) / 2);
  const yRot = y0 + fonte * 0.6;
  const yMeio = y0 + fonte * 1.3 + r0 * 1.15;
  const yNome = yMeio + r0 * 1.15 + fonte * 0.8;
  const fonteDe = (px) => `700 ${px}px Fredoka, system-ui, sans-serif`;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // trilho em aberto e o avanco do jogador (a rodada recem-ganha cresce com k)
  ctx.setLineDash([2, 7]);
  ctx.strokeStyle = 'rgba(23,22,28,0.3)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(xDe(0), yMeio);
  ctx.lineTo(xDe(R + 1), yMeio);
  ctx.stroke();
  ctx.setLineDash([]);
  const alvo = C.campeao ? R + 1 : C.fase + 1;
  const xProg = xDe(alvo - 1) + (xDe(alvo) - xDe(alvo - 1)) * k;
  for (const [cor, larg] of [[TINTA, 8], [d.corJogador, 5]]) {
    ctx.strokeStyle = cor;
    ctx.lineWidth = larg;
    ctx.beginPath();
    ctx.moveTo(xDe(0), yMeio);
    ctx.lineTo(xProg, yMeio);
    ctx.stroke();
  }
  // o jogador: uma gotinha na cor dele, olhando para o caminho, com a bandeira
  {
    const x = xDe(0);
    const rj = r0 * 1.12;
    const base = yMeio + rj * 0.6;
    ctx.beginPath();
    ctx.moveTo(x - rj, base);
    ctx.bezierCurveTo(x - rj, yMeio - rj * 1.15, x + rj, yMeio - rj * 1.15, x + rj, base);
    ctx.closePath();
    ctx.fillStyle = d.corJogador;
    ctx.fill();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = TINTA;
    ctx.stroke();
    for (const s of [-1, 1]) {
      const ox = x + s * rj * 0.3;
      const oy = yMeio - rj * 0.08;
      ctx.beginPath();
      ctx.arc(ox, oy, rj * 0.22, 0, TAU);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(ox + rj * 0.07, oy, rj * 0.11, 0, TAU);
      ctx.fillStyle = TINTA;
      ctx.fill();
    }
    desenharBandeirinha(ctx, d.vagas[0].pais, x + rj * 0.2, base - rj * 0.5, rj * 0.66, rj * 0.44);
    ctx.font = fonteDe(fonte + 1);
    ctx.fillStyle = TINTA;
    ctx.fillText(cortar(ctx, d.vagas[0].nome, passo - 4), x, yNome);
  }
  // as rodadas
  for (let r = 0; r < R; r++) {
    const x = xDe(r + 1);
    const jogo = C.rodadas[r][0];
    const op = jogo.b;
    const jogada = r < C.fase;
    const atual = r === C.fase && !C.campeao;
    const fresco = r === C.fase - 1 ? k : 1;
    ctx.font = fonteDe(fonte);
    ctx.fillStyle = atual ? TINTA : 'rgba(23,22,28,0.55)';
    ctx.fillText(cortar(ctx, (d.nomesFases && d.nomesFases[r]) || C.fases[r], passo - 2), x, yRot);
    if (op < 0 || r > C.fase) {
      // ainda em aberto
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(x, yMeio, r0 * 0.82, 0, TAU);
      ctx.fillStyle = '#f6efe2';
      ctx.fill();
      ctx.strokeStyle = 'rgba(23,22,28,0.4)';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(23,22,28,0.45)';
      ctx.font = fonteDe(Math.round(r0 * 0.8));
      ctx.fillText('?', x, yMeio + 1);
      continue;
    }
    const vis = d.vagas[op];
    const rr = r0 * (atual ? 1.1 + 0.05 * Math.sin(t * 5) : 1);
    if (atual) {
      // aura pulsando no adversario da vez
      ctx.beginPath();
      ctx.arc(x, yMeio, rr + 4 + 2 * Math.sin(t * 5), 0, TAU);
      ctx.strokeStyle = VS;
      ctx.globalAlpha = 0.35 + 0.3 * Math.sin(t * 5);
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // a bandeira do adversario no circulo (esmaecida depois de batido)
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, yMeio, rr, 0, TAU);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.clip();
    if (jogada) ctx.globalAlpha = 1 - 0.45 * fresco;
    desenharBandeirinha(ctx, vis.pais, x - rr * 1.5, yMeio - rr, rr * 3, rr * 2);
    ctx.restore();
    ctx.beginPath();
    ctx.arc(x, yMeio, rr, 0, TAU);
    if (jogada) {
      ctx.lineWidth = 4.5;
      ctx.strokeStyle = TINTA;
      ctx.stroke();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = d.corJogador;
    } else {
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = atual ? VS : TINTA;
    }
    ctx.stroke();
    // o pinguinho com a cor do slime do adversario
    ctx.beginPath();
    ctx.arc(x - rr * 0.72, yMeio + rr * 0.72, Math.max(3.5, rr * 0.26), 0, TAU);
    ctx.fillStyle = vis.cor;
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = TINTA;
    ctx.stroke();
    const bx = x + rr * 0.74;
    const by = yMeio - rr * 0.7;
    const rb = Math.max(6, rr * 0.4);
    if (jogada && fresco > 0.2) {
      // o visto (cresce quando a rodada acaba de ser ganha)
      const e = Math.min(1, fresco * 1.25);
      ctx.save();
      ctx.translate(bx, by);
      ctx.scale(e, e);
      ctx.beginPath();
      ctx.arc(0, 0, rb, 0, TAU);
      ctx.fillStyle = '#22b05a';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = TINTA;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-rb * 0.45, 0);
      ctx.lineTo(-rb * 0.1, rb * 0.38);
      ctx.lineTo(rb * 0.5, -rb * 0.38);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1.6, rb * 0.32);
      ctx.stroke();
      ctx.restore();
    } else if (atual) seloVs(ctx, bx, by, rb * 1.1 * (1 + 0.08 * Math.sin(t * 6)));
    // embaixo: o placar da rodada jogada ou o nome do adversario da vez
    ctx.font = fonteDe(atual ? fonte + 1 : fonte);
    ctx.fillStyle = TINTA;
    if (jogada && jogo.placar) {
      ctx.globalAlpha = Math.min(1, fresco * 1.5);
      ctx.fillText(`${jogo.placar[0]} · ${jogo.placar[1]}`, x, yNome);
      ctx.globalAlpha = 1;
    } else if (atual) ctx.fillText(cortar(ctx, vis.nome, passo - 2), x, yNome);
  }
  // a taca no fim do caminho (brilha no titulo)
  const sT = r0 * 2.1;
  ctx.save();
  if (!C.campeao) ctx.globalAlpha = 0.55;
  desenharTaca(ctx, xDe(R + 1), yMeio - sT * 0.5, sT, C.campeao ? 0.6 + 0.4 * Math.sin(t * 4) : 0);
  ctx.restore();
}

/** Corta o texto com reticencias ate caber em `max` px. */
function cortar(ctx, s, max) {
  if (ctx.measureText(s).width <= max) return s;
  let r = s;
  while (r.length > 1 && ctx.measureText(r + '…').width > max) r = r.slice(0, -1);
  return r + '…';
}
