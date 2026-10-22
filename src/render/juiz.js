// Desenho do juiz da rede (src/jogo/juiz.js): a cadeirinha atras do poste e o boneco pequeno de
// bigode, em u pela camera. Cores apagadas e traco fino: fica abaixo da rede na hierarquia (bola >
// jogador > rival > rede > juiz > plateia) e nao tira a atencao do jogo.

import { TINTA } from './fundo.js';
import { JUIZ } from '../jogo/juiz.js';

const COR = Object.freeze({
  pele: '#d6a681', peleSombra: '#b9876a', camisa: '#86a0b2', gola: '#eef1f4', calcao: '#3e4859', sapato: '#2a2a31',
  bone: '#ece6da', aba: '#c9c0ae', bigode: '#2e231d', cadeira: '#c8ced7', galo: '#f08aa0', cartao: '#ffd23a', apito: '#3a3f4a',
});

/**
 * Cadeirinha atras do poste: plataforma, duas pernas e os degraus (desenhar antes da rede).
 * @param {CanvasRenderingContext2D} ctx @param {number} tr traco em u
 */
export function desenharCadeira(ctx, tr) {
  const y = JUIZ.piso;
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.lineCap = 'round';
  ctx.strokeStyle = TINTA;
  ctx.lineWidth = tr * 1.6;
  ctx.beginPath();
  for (const x of [-0.36, 0.36]) { ctx.moveTo(x, 0); ctx.lineTo(x * 0.92, y); }
  for (let h = 0.35; h < y - 0.1; h += 0.42) { ctx.moveTo(-0.35, h); ctx.lineTo(0.35, h); }
  ctx.stroke();
  ctx.strokeStyle = COR.cadeira;
  ctx.lineWidth = tr * 0.8;
  ctx.stroke();
  ctx.fillStyle = COR.cadeira;
  ctx.fillRect(-0.44, y - 0.09, 0.88, 0.09);
  ctx.lineWidth = tr * 0.7;
  ctx.strokeStyle = TINTA;
  ctx.strokeRect(-0.44, y - 0.09, 0.88, 0.09);
  ctx.restore();
}

/** Estrelinha de 5 pontas. */
function estrela(ctx, x, y, r) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = Math.PI / 2 + (k * Math.PI) / 5;
    const rr = k % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

/** Braco do ombro (sx, sy) ate a mao (hx, hy). */
function braco(ctx, sx, sy, hx, hy, tr) {
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(hx, hy);
  ctx.lineWidth = 0.1;
  ctx.strokeStyle = TINTA;
  ctx.stroke();
  ctx.lineWidth = 0.1 - tr * 1.4;
  ctx.strokeStyle = COR.camisa;
  ctx.stroke();
  ctx.fillStyle = COR.pele;
  ctx.beginPath();
  ctx.arc(hx, hy, 0.055, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = tr * 0.7;
  ctx.strokeStyle = TINTA;
  ctx.stroke();
}

/**
 * O juiz (pes em (x, y)), interpolado pelo alfa do canal do mundo.
 * @param {CanvasRenderingContext2D} ctx
 * @param {ReturnType<typeof import('../jogo/juiz.js').criarJuiz>} j
 * @param {number} alfa @param {number} t s de jogo-real (piscar natural, estrelinhas) @param {number} tr traco em u
 */
export function desenharJuiz(ctx, j, alfa, t, tr) {
  const x = j.ant.x + (j.x - j.ant.x) * alfa;
  const y = j.ant.y + (j.y - j.ant.y) * alfa;
  const ang = j.ant.ang + (j.ang - j.ant.ang) * alfa;
  const tl = tr * 0.75;
  const giro = Math.cos(j.giro);
  const sx = Math.sign(giro || 1) * Math.max(0.18, Math.abs(giro));
  const pend = j.reacao === 'pendurado' && j.t > 0.12;
  ctx.save();
  ctx.translate(x, y);
  // gira em volta do meio do corpo; pendurado, em volta da mao que segura a plataforma
  const piv = pend ? 1.5 : 0.6;
  ctx.translate(0, piv);
  ctx.rotate(ang);
  ctx.translate(0, -piv);
  ctx.scale(sx, 1);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // pernas e sapatos
  ctx.fillStyle = COR.pele;
  ctx.strokeStyle = TINTA;
  ctx.lineWidth = tl;
  for (const lx of [-0.085, 0.085]) {
    ctx.fillRect(lx - 0.045, 0.04, 0.09, 0.34);
    ctx.strokeRect(lx - 0.045, 0.04, 0.09, 0.34);
  }
  ctx.fillStyle = COR.sapato;
  for (const lx of [-0.1, 0.1]) {
    ctx.beginPath();
    ctx.ellipse(lx + 0.02, 0.035, 0.085, 0.045, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // calcao e camisa
  ctx.fillStyle = COR.calcao;
  ctx.beginPath();
  ctx.roundRect(-0.18, 0.3, 0.36, 0.2, 0.04);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = COR.camisa;
  ctx.beginPath();
  ctx.roundRect(-0.22, 0.45, 0.44, 0.48, 0.1);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = COR.gola;
  ctx.beginPath();
  ctx.moveTo(-0.1, 0.92);
  ctx.lineTo(0, 0.82);
  ctx.lineTo(0.1, 0.92);
  ctx.closePath();
  ctx.fill();
  // apito no cordao (quando nao esta voando)
  if (!(j.objeto && j.objeto.tipo === 'apito')) {
    ctx.strokeStyle = 'rgba(23,22,28,0.6)';
    ctx.lineWidth = tl * 0.7;
    ctx.beginPath();
    ctx.moveTo(-0.08, 0.9);
    ctx.lineTo(0.02, 0.7);
    ctx.lineTo(0.08, 0.9);
    ctx.stroke();
    ctx.fillStyle = COR.apito;
    ctx.fillRect(-0.01, 0.64, 0.08, 0.06);
  }
  // bracos: o do lado de quem ganhou aponta; pendurado, um segura a plataforma; cartao erguido
  const lado = j.lado || 1;
  const ap = j.aponta * sx;
  const k = j.braco;
  for (const s of [-1, 1]) {
    const ox = s * 0.21;
    let hx = s * 0.27;
    let hy = 0.5;
    if (ap === s) { hx = s * (0.27 + 0.4 * k); hy = 0.5 + 0.48 * k; }
    if (pend && s === -lado) { hx = 0; hy = 1.5; }
    if (j.reacao === 'cartao' && s === lado && j.cartao > 0) { hx = s * 0.42; hy = 0.5 + 0.62 * j.cartao; }
    if (j.reacao === 'bigode' && j.t > 0.7 && j.t < 1.2 && s === lado) { hx = s * 0.12; hy = 1.1; }
    if (j.reacao === 'galo' && s === lado) { hx = s * 0.2; hy = 0.5 + 0.85 * j.galo; }
    braco(ctx, ox, 0.86, hx, hy, tl);
    if (j.reacao === 'cartao' && s === lado && j.cartao > 0) {
      ctx.save();
      ctx.translate(hx, hy + 0.12);
      ctx.rotate(-s * 0.15);
      ctx.fillStyle = COR.cartao;
      ctx.fillRect(-0.07, -0.08, 0.14, 0.2);
      ctx.lineWidth = tl;
      ctx.strokeStyle = TINTA;
      ctx.strokeRect(-0.07, -0.08, 0.14, 0.2);
      ctx.restore();
    }
  }
  // cabeca: vira um pouco para onde olha
  const ol = j.olhar * sx;
  const cy = 1.18;
  ctx.save();
  ctx.translate(0, cy);
  ctx.rotate(-ol * 0.18);
  ctx.fillStyle = COR.pele;
  ctx.beginPath();
  ctx.arc(0, 0, 0.24, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = tl;
  ctx.strokeStyle = TINTA;
  ctx.stroke();
  // galo
  if (j.galo > 0) {
    ctx.fillStyle = COR.galo;
    ctx.beginPath();
    ctx.arc(-0.08, 0.2, 0.09 * j.galo, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  // bone (quando nao esta voando), com a aba para onde olha
  if (!(j.objeto && j.objeto.tipo === 'bone')) desenharBone(ctx, 0, 0.1, ol >= 0 ? 1 : -1, tl);
  // olhos (piscam de vez em quando, piscam forte na bola raspando, espiral no tonto)
  const ex = ol * 0.07;
  const ey = 0.02 + j.olharY * 0.03;
  const fechado = j.piscar > 0 || (t % 3.4) < 0.12;
  ctx.fillStyle = TINTA;
  ctx.strokeStyle = TINTA;
  for (const s of [-1, 1]) {
    const px = s * 0.085 + ex;
    if (j.tonto > 0) {
      ctx.lineWidth = tl * 0.8;
      ctx.beginPath();
      for (let a = 0; a < 9; a++) {
        const r = 0.012 + a * 0.0055;
        const th = a * 1.2 + t * 9 * s;
        ctx.lineTo(px + Math.cos(th) * r, ey + Math.sin(th) * r);
      }
      ctx.stroke();
    } else if (fechado) {
      ctx.lineWidth = tl;
      ctx.beginPath();
      ctx.moveTo(px - 0.04, ey);
      ctx.lineTo(px + 0.04, ey);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(px, ey, 0.05, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = tl * 0.7;
      ctx.stroke();
      ctx.fillStyle = TINTA;
      ctx.beginPath();
      ctx.arc(px + ol * 0.018, ey + j.olharY * 0.015, 0.026, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // sobrancelhas bravas no cartao
  if (j.reacao === 'cartao') {
    ctx.lineWidth = tl * 1.2;
    ctx.beginPath();
    for (const s of [-1, 1]) { ctx.moveTo(s * 0.13 + ex, ey + 0.08); ctx.lineTo(s * 0.04 + ex, ey + 0.05); }
    ctx.stroke();
  }
  // nariz e bigode (o bigode entorta na bolada e ele arruma)
  ctx.fillStyle = COR.peleSombra;
  ctx.beginPath();
  ctx.arc(ex * 1.1, -0.06, 0.045, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(ex * 1.1, -0.1);
  ctx.rotate(j.bigode);
  ctx.fillStyle = COR.bigode;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(0, 0.01);
    ctx.quadraticCurveTo(s * 0.1, 0.04, s * 0.17, -0.03);
    ctx.quadraticCurveTo(s * 0.12, -0.04, s * 0.19, -0.08);
    ctx.quadraticCurveTo(s * 0.08, -0.07, 0, -0.03);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  ctx.restore();
  // estrelinhas do tonto
  if (j.tonto > 0) {
    ctx.fillStyle = '#ffe680';
    for (let s = 0; s < 3; s++) {
      const a = t * 5 + (s * Math.PI * 2) / 3;
      estrela(ctx, Math.cos(a) * 0.3, cy + 0.34 + Math.sin(a) * 0.08, 0.06);
    }
  }
  ctx.restore();
  // apito ou bone voando
  const o = j.objeto;
  if (o) {
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.rotate(o.ang);
    if (o.tipo === 'apito') {
      ctx.fillStyle = COR.apito;
      ctx.fillRect(-0.06, -0.035, 0.12, 0.07);
    } else desenharBone(ctx, 0, 0, 1, tl);
    ctx.restore();
  }
}

/** Bone: copa e aba (dir = para onde a aba aponta). */
function desenharBone(ctx, x, y, dir, tl) {
  ctx.fillStyle = COR.bone;
  ctx.strokeStyle = TINTA;
  ctx.lineWidth = tl;
  ctx.beginPath();
  ctx.ellipse(x, y, 0.25, 0.17, 0, 0, Math.PI);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = COR.aba;
  ctx.beginPath();
  ctx.ellipse(x + dir * 0.22, y + 0.005, 0.15, 0.04, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}
