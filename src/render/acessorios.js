// Acessorios do vestiario (pedido de 2026-10-22: "adicionar acessorio como oculos, etc."): tres
// encaixes por slime, cabeca, rosto e boca, desenhados por cima do rosto no canvas do topo, no
// espaco local do rosto (quadro(s) de src/render/rostos.js: amassam e giram com o corpo). As
// medidas vao em fracao de R (raio0 * 0,9): os olhos ficam em (+-0,36, 0,16) com raio 0,27, a boca
// em (0, -0,17) e o alto da cupula em 0,67. Os ids e os precos ficam em src/jogo/visual.js; os
// personagens do pacote local (src/extra/famosos.js) registram os deles com registrarAcessorio().

import { aplicar } from './camera.js';
import { TINTA } from './fundo.js';
import { quadro } from './rostos.js';

/** alto da cupula e a base dos chapeus (fracao de R, no repouso) */
const TOPO = 0.66;
const BASE = 0.54;

/** @typedef {ReturnType<typeof kit>} Kit */

/** Ferramentas de desenho no espaco local do slime (x, y e raios em fracao de R). */
function kit(ctx, s, traco) {
  const q = quadro(s);
  const { R, a11, a22, tr } = q;
  const P = (x, y) => tr(x * R, y * R);
  const caminho = (pts) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => { const [X, Y] = P(x, y); if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); });
    ctx.closePath();
  };
  const pintar = (cor, contorno = true) => {
    ctx.fillStyle = cor;
    ctx.fill('evenodd');
    if (contorno) { ctx.lineWidth = traco; ctx.strokeStyle = TINTA; ctx.stroke(); }
  };
  const poli = (pts, cor, contorno = true) => { caminho(pts); pintar(cor, contorno); };
  const elipse = (x, y, rx, ry, cor, contorno = true, a0 = 0, a1 = Math.PI * 2) => {
    const [X, Y] = P(x, y);
    ctx.beginPath();
    ctx.ellipse(X, Y, Math.max(1e-3, rx * R * a11), Math.max(1e-3, ry * R * a22), 0, a0, a1);
    if (a1 - a0 < Math.PI * 2 - 1e-6) ctx.closePath();
    pintar(cor, contorno);
  };
  const disco = (x, y, r, cor, contorno = true) => elipse(x, y, r, r, cor, contorno);
  const linha = (pts, larg, cor) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => { const [X, Y] = P(x, y); if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); });
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = larg * R + traco * 2;
    ctx.strokeStyle = TINTA;
    ctx.stroke();
    ctx.lineWidth = larg * R;
    ctx.strokeStyle = cor;
    ctx.stroke();
  };
  /** forma com furos nos olhos (mascaras): o contorno e os furos em evenodd */
  const comFuros = (pts, furos, cor) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => { const [X, Y] = P(x, y); if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); });
    ctx.closePath();
    for (const [x, y, rx, ry] of furos) {
      const [X, Y] = P(x, y);
      ctx.moveTo(X + rx * R * a11, Y);
      ctx.ellipse(X, Y, rx * R * a11, ry * R * a22, 0, 0, Math.PI * 2);
    }
    pintar(cor);
  };
  return { R, P, poli, elipse, disco, linha, comFuros, traco, ctx };
}

/** furos nos olhos (com folga) */
const OLHOS = [[-0.36, 0.16, 0.33, 0.33], [0.36, 0.16, 0.33, 0.33]];
/** meia elipse (pontos), para chapeus e mascaras */
function arco(cx, cy, rx, ry, a0, a1, n = 14) {
  const l = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    l.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return l;
}

/** @type {Record<'cabeca'|'rosto'|'boca', Record<string, (k: Kit, t: number) => void>>} */
const REG = {
  cabeca: {
    bone(k) {
      k.poli([...arco(0, BASE, 0.62, 0.42, 0, Math.PI)], '#3b8cf0');
      k.elipse(0, BASE - 0.02, 0.78, 0.13, '#2a62d6');
      k.disco(0, BASE + 0.42, 0.07, '#2a62d6');
    },
    cartola(k) {
      k.elipse(0, BASE + 0.02, 0.85, 0.14, '#222233');
      k.poli([[-0.5, BASE], [0.5, BASE], [0.46, BASE + 0.95], [-0.46, BASE + 0.95]], '#222233');
      k.poli([[-0.49, BASE + 0.1], [0.49, BASE + 0.1], [0.485, BASE + 0.24], [-0.485, BASE + 0.24]], '#ef3e4f');
    },
    coroa(k) {
      k.poli([[-0.55, BASE], [0.55, BASE], [0.66, BASE + 0.62], [0.32, BASE + 0.32], [0, BASE + 0.72], [-0.32, BASE + 0.32], [-0.66, BASE + 0.62]], '#ffd23a');
      k.disco(0, BASE + 0.73, 0.09, '#ff4d6d');
      k.disco(-0.66, BASE + 0.63, 0.07, '#5fd9ff');
      k.disco(0.66, BASE + 0.63, 0.07, '#5fd9ff');
      k.disco(0, BASE + 0.16, 0.08, '#ff4d6d');
    },
    gorro(k) {
      k.poli(arco(0, BASE - 0.02, 0.66, 0.55, 0, Math.PI), '#ef3e4f');
      k.poli([[-0.7, BASE - 0.1], [0.7, BASE - 0.1], [0.7, BASE + 0.1], [-0.7, BASE + 0.1]], '#ffffff');
      k.disco(0, BASE + 0.6, 0.14, '#ffffff');
    },
    bruxa(k) {
      k.elipse(0, BASE + 0.02, 0.9, 0.15, '#4b3fd6');
      k.poli([[-0.5, BASE + 0.05], [0.5, BASE + 0.05], [0.18, BASE + 0.9], [0.42, BASE + 1.28], [0.02, BASE + 1.02]], '#4b3fd6');
      k.disco(0.05, BASE + 0.4, 0.06, '#ffd23a');
      k.disco(-0.2, BASE + 0.2, 0.045, '#ffd23a');
    },
    pirata(k) {
      k.poli([[-1.0, BASE + 0.05], [-0.5, BASE + 0.22], [0, BASE + 0.12], [0.5, BASE + 0.22], [1.0, BASE + 0.05], [0.7, BASE + 0.6], [0, BASE + 0.5], [-0.7, BASE + 0.6]], '#2a2a33');
      k.disco(0, BASE + 0.34, 0.09, '#ffffff');
    },
    laco(k) {
      k.poli([[0.3, TOPO - 0.02], [-0.05, TOPO + 0.28], [-0.05, TOPO - 0.22]], '#ff6fa8');
      k.poli([[0.3, TOPO - 0.02], [0.65, TOPO + 0.28], [0.65, TOPO - 0.22]], '#ff6fa8');
      k.disco(0.3, TOPO - 0.02, 0.09, '#ff3d8b');
    },
    flor(k) {
      for (let p = 0; p < 5; p++) { const a = (p / 5) * Math.PI * 2; k.disco(0.42 + Math.cos(a) * 0.12, TOPO - 0.02 + Math.sin(a) * 0.12, 0.1, '#ffffff'); }
      k.disco(0.42, TOPO - 0.02, 0.08, '#ffd23a');
    },
    tiara(k) {
      k.poli([[-0.42, BASE + 0.06], [-0.3, BASE + 0.3], [-0.14, BASE + 0.16], [0, BASE + 0.4], [0.14, BASE + 0.16], [0.3, BASE + 0.3], [0.42, BASE + 0.06]], '#d9e6ff');
      k.disco(0, BASE + 0.26, 0.06, '#6fd3ff');
    },
    aureola(k) {
      const [x, y] = k.P(0, TOPO + 0.32);
      for (const [larg, cor] of [[0.14 * k.R + k.traco * 2, TINTA], [0.14 * k.R, '#ffd23a']]) {
        k.ctx.lineWidth = larg;
        k.ctx.strokeStyle = cor;
        k.ctx.beginPath();
        k.ctx.ellipse(x, y, 0.5 * k.R, 0.14 * k.R, 0, 0, Math.PI * 2);
        k.ctx.stroke();
      }
    },
    viking(k) {
      k.poli([[-0.62, BASE - 0.05], [-0.95, BASE + 0.25], [-0.98, BASE + 0.7], [-0.78, BASE + 0.35]], '#f3ead2');
      k.poli([[0.62, BASE - 0.05], [0.95, BASE + 0.25], [0.98, BASE + 0.7], [0.78, BASE + 0.35]], '#f3ead2');
      k.poli(arco(0, BASE - 0.05, 0.68, 0.5, 0, Math.PI), '#9aa3b5');
      k.poli([[-0.7, BASE - 0.12], [0.7, BASE - 0.12], [0.7, BASE + 0.04], [-0.7, BASE + 0.04]], '#c8a24a');
    },
    chef(k) {
      k.poli([[-0.42, BASE], [0.42, BASE], [0.42, BASE + 0.3], [-0.42, BASE + 0.3]], '#ffffff');
      k.disco(-0.3, BASE + 0.5, 0.26, '#ffffff');
      k.disco(0.3, BASE + 0.5, 0.26, '#ffffff');
      k.disco(0, BASE + 0.62, 0.3, '#ffffff');
    },
    natal(k) {
      k.poli([[-0.62, BASE], [0.62, BASE], [0.3, BASE + 0.62], [0.78, BASE + 0.35]], '#e02d3c');
      k.poli([[-0.7, BASE - 0.1], [0.7, BASE - 0.1], [0.7, BASE + 0.1], [-0.7, BASE + 0.1]], '#ffffff');
      k.disco(0.82, BASE + 0.33, 0.13, '#ffffff');
    },
    orelhasGato(k) {
      for (const l of [-1, 1]) {
        k.poli([[l * 0.2, TOPO - 0.08], [l * 0.75, TOPO - 0.3], [l * 0.65, TOPO + 0.38]], '#2a2a33');
        k.poli([[l * 0.35, TOPO - 0.08], [l * 0.65, TOPO - 0.2], [l * 0.6, TOPO + 0.18]], '#ff8ac0', false);
      }
    },
    orelhasCoelho(k) {
      for (const l of [-1, 1]) {
        k.elipse(l * 0.3, TOPO + 0.45, 0.16, 0.48, '#ffffff');
        k.elipse(l * 0.3, TOPO + 0.45, 0.07, 0.34, '#ff8ac0', false);
      }
    },
    orelhasPanda(k) {
      for (const l of [-1, 1]) k.disco(l * 0.62, TOPO - 0.08, 0.24, '#1d1d24');
    },
    astronauta(k) {
      // capacete de vidro em volta da cabeca, com o colar e o reflexo
      const [x, y] = k.P(0, 0.12);
      k.ctx.beginPath();
      k.ctx.arc(x, y, 0.92 * k.R, 0, Math.PI * 2);
      k.ctx.fillStyle = 'rgba(190, 225, 255, 0.28)';
      k.ctx.fill();
      k.ctx.lineWidth = k.traco * 1.6;
      k.ctx.strokeStyle = TINTA;
      k.ctx.stroke();
      k.ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      k.ctx.lineWidth = 0.08 * k.R;
      k.ctx.beginPath();
      k.ctx.arc(x, y, 0.74 * k.R, Math.PI * 0.62, Math.PI * 0.88);
      k.ctx.stroke();
      k.poli([[-0.62, -0.62], [0.62, -0.62], [0.58, -0.48], [-0.58, -0.48]], '#c9ced7');
    },
    cowboy(k) {
      k.elipse(0, BASE + 0.03, 1.0, 0.16, '#a0662f');
      k.poli([[-0.48, BASE + 0.05], [0.48, BASE + 0.05], [0.42, BASE + 0.55], [0, BASE + 0.45], [-0.42, BASE + 0.55]], '#a0662f');
      k.poli([[-0.47, BASE + 0.12], [0.47, BASE + 0.12], [0.46, BASE + 0.22], [-0.46, BASE + 0.22]], '#4a2c14');
    },
    fedora(k) {
      k.elipse(0, BASE + 0.03, 0.86, 0.13, '#6b4a2b');
      k.poli([[-0.48, BASE + 0.05], [0.48, BASE + 0.05], [0.4, BASE + 0.58], [0, BASE + 0.5], [-0.4, BASE + 0.58]], '#6b4a2b');
      k.poli([[-0.47, BASE + 0.1], [0.47, BASE + 0.1], [0.46, BASE + 0.2], [-0.46, BASE + 0.2]], '#2a1c10');
    },
    antena(k) {
      k.linha([[0, TOPO - 0.05], [0.05, TOPO + 0.42]], 0.05, '#9aa3b5');
      k.disco(0.05, TOPO + 0.46, 0.1, '#ef3e4f');
    },
    antenasAbelha(k) {
      for (const l of [-1, 1]) {
        k.linha([[l * 0.18, TOPO - 0.05], [l * 0.32, TOPO + 0.38]], 0.04, '#1d1d24');
        k.disco(l * 0.32, TOPO + 0.42, 0.08, '#1d1d24');
      }
    },
    cabeloVampiro(k) {
      k.poli([...arco(0, BASE - 0.05, 0.74, 0.32, 0, Math.PI), [-0.55, BASE - 0.28], [-0.2, BASE - 0.12], [0, BASE - 0.36], [0.2, BASE - 0.12], [0.55, BASE - 0.28]], '#1d1d24');
    },
    cabeloReto(k) {
      k.poli([[-0.7, BASE - 0.15], [0.7, BASE - 0.15], [0.66, BASE + 0.2], [-0.66, BASE + 0.2]], '#1d1d24');
      k.linha([[-0.5, BASE - 0.15], [-0.48, BASE - 0.28]], 0.03, '#1d1d24');
      k.linha([[0.1, BASE - 0.15], [0.12, BASE - 0.3]], 0.03, '#1d1d24');
    },
    cabinho(k) {
      k.poli([[-0.06, TOPO - 0.05], [0.08, TOPO - 0.05], [0.12, TOPO + 0.28], [0.0, TOPO + 0.3]], '#5b8a2f');
      k.elipse(0.24, TOPO + 0.18, 0.18, 0.08, '#7cc14b');
    },
    gorroSaci(k) {
      k.poli([[-0.6, BASE - 0.04], [0.6, BASE - 0.04], [0.22, BASE + 0.62], [0.66, BASE + 0.98], [0.02, BASE + 0.74]], '#e02d3c');
    },
    bandana(k) {
      k.poli([[-0.95, 0.5], [0.95, 0.5], [0.92, 0.62], [-0.92, 0.62]], '#ef3e4f');
      k.poli([[0.85, 0.58], [1.15, 0.72], [1.1, 0.48]], '#ef3e4f');
    },
  },
  rosto: {
    oculosEscuros(k) {
      for (const l of [-1, 1]) k.elipse(l * 0.36, 0.16, 0.3, 0.22, '#17161c');
      k.linha([[-0.08, 0.2], [0.08, 0.2]], 0.04, '#17161c');
      for (const l of [-1, 1]) k.poli([[l * 0.36 - 0.17, 0.2], [l * 0.36 - 0.07, 0.2], [l * 0.36 - 0.07, 0.25], [l * 0.36 - 0.17, 0.25]], 'rgba(255,255,255,0.6)', false);
    },
    oculosRedondos(k) {
      for (const l of [-1, 1]) {
        k.comFuros(arco(l * 0.36, 0.16, 0.34, 0.34, 0, Math.PI * 2, 20), [[l * 0.36, 0.16, 0.28, 0.28]], '#3a2a1a');
      }
      k.linha([[-0.04, 0.22], [0.04, 0.22]], 0.04, '#3a2a1a');
    },
    mascaraHoquei(k) {
      // mascara de goleiro: branca, com furos de respiro e duas listras no queixo
      const contorno = [...arco(0, 0.12, 0.8, 0.62, Math.PI * 0.05, Math.PI * 0.95, 16), ...arco(0, 0.0, 0.6, 0.72, Math.PI * 1.05, Math.PI * 1.95, 16)];
      k.comFuros(contorno, OLHOS, '#f2efe6');
      for (const [x, y] of [[-0.12, -0.12], [0.12, -0.12], [0, -0.28], [-0.2, -0.36], [0.2, -0.36], [0, -0.5], [-0.55, 0.42], [0.55, 0.42]]) k.disco(x, y, 0.045, '#3a3a44', false);
      k.linha([[-0.05, 0.56], [-0.05, 0.4]], 0.05, '#3a6fd8');
      k.linha([[0.05, 0.56], [0.05, 0.4]], 0.05, '#3a6fd8');
    },
    mascaraHeroi(k) {
      k.comFuros([[-0.85, 0.32], [-0.6, 0.42], [0, 0.32], [0.6, 0.42], [0.85, 0.32], [0.7, -0.05], [0.25, -0.02], [0, 0.08], [-0.25, -0.02], [-0.7, -0.05]], [[-0.36, 0.16, 0.24, 0.24], [0.36, 0.16, 0.24, 0.24]], '#17161c');
    },
    luchador(k) {
      const contorno = arco(0, 0.12, 0.92, 0.74, 0, Math.PI * 2, 24);
      k.comFuros(contorno, [...OLHOS, [0, -0.2, 0.2, 0.12]], '#2a62d6');
      for (const l of [-1, 1]) k.poli([[l * 0.05, 0.62], [l * 0.36, 0.5], [l * 0.7, 0.42], [l * 0.36, 0.56]], '#ffd23a');
      k.poli([[-0.12, 0.62], [0.12, 0.62], [0, 0.82]], '#ef3e4f');
    },
    tapaOlho(k) {
      k.linha([[-0.9, 0.42], [0.9, -0.02]], 0.04, '#17161c');
      k.elipse(0.36, 0.16, 0.3, 0.26, '#17161c');
    },
    faixaNinja(k) {
      k.comFuros([[-0.95, 0.42], [0.95, 0.42], [0.92, -0.06], [-0.92, -0.06]], [[-0.36, 0.16, 0.3, 0.2], [0.36, 0.16, 0.3, 0.2]], '#1d1d24');
      k.poli([[0.9, 0.3], [1.25, 0.42], [1.22, 0.18]], '#ef3e4f');
      k.poli([[0.9, 0.22], [1.2, 0.02], [1.1, -0.1]], '#ef3e4f');
    },
    parafusos(k) {
      for (const l of [-1, 1]) {
        k.poli([[l * 0.9, -0.1], [l * 1.18, -0.1], [l * 1.18, 0.02], [l * 0.9, 0.02]], '#9aa3b5');
        k.disco(l * 1.2, -0.04, 0.08, '#c9ced7');
      }
      k.linha([[-0.3, 0.5], [0.1, 0.46]], 0.025, '#1d1d24');
      for (const x of [-0.22, -0.06, 0.06]) k.linha([[x, 0.53], [x + 0.02, 0.42]], 0.02, '#1d1d24');
    },
  },
  boca: {
    bigode(k) {
      for (const l of [-1, 1]) k.poli([[0, -0.06], [l * 0.2, -0.02], [l * 0.42, -0.12], [l * 0.36, -0.2], [l * 0.18, -0.12], [0, -0.14]], '#3a2516');
    },
    presas(k) {
      for (const l of [-1, 1]) k.poli([[l * 0.06, -0.14], [l * 0.18, -0.14], [l * 0.12, -0.32]], '#ffffff');
    },
    barba(k) {
      k.poli([[-0.62, -0.06], [-0.3, -0.3], [0, -0.22], [0.3, -0.3], [0.62, -0.06], [0.5, -0.5], [0, -0.7], [-0.5, -0.5]], '#d9772b');
    },
    barbaBranca(k) {
      k.poli([[-0.55, -0.08], [-0.28, -0.26], [0, -0.2], [0.28, -0.26], [0.55, -0.08], [0.3, -0.7], [0, -0.98], [-0.3, -0.7]], '#f4f4f4');
    },
    apito(k) {
      k.linha([[-0.5, -0.42], [-0.02, -0.18]], 0.025, '#3a3f4a');
      k.poli([[0, -0.12], [0.22, -0.12], [0.22, -0.28], [0, -0.28]], '#c9ced7');
      k.disco(0.08, -0.2, 0.05, '#3a3f4a', false);
    },
    gravata(k) {
      k.poli([[0, -0.52], [-0.28, -0.4], [-0.28, -0.66], [0, -0.54], [0.28, -0.66], [0.28, -0.4]], '#ef3e4f');
      k.disco(0, -0.53, 0.06, '#c41f2f');
    },
  },
};

/** Os ids desenhados de cada encaixe (o teste confere com src/jogo/visual.js). */
export const ACESSORIOS_DESENHADOS = Object.freeze({
  cabeca: () => Object.keys(REG.cabeca), rosto: () => Object.keys(REG.rosto), boca: () => Object.keys(REG.boca),
});

/**
 * Registra um acessorio novo (o pacote local de personagens, src/extra/famosos.js).
 * @param {'cabeca'|'rosto'|'boca'} encaixe @param {string} id @param {(k: Kit, t: number) => void} fn
 */
export function registrarAcessorio(encaixe, id, fn) {
  REG[encaixe][id] = fn;
}

/**
 * Os acessorios de um slime (proxy da vista; s.dados.acessorios = { cabeca, rosto, boca }) num
 * contexto ja na camera.
 * @param {CanvasRenderingContext2D} ctx @param {any} s @param {number} traco (u) @param {number} t
 */
export function desenharAcessoriosDe(ctx, s, traco, t) {
  const a = s.dados && s.dados.acessorios;
  if (!a) return;
  const k = kit(ctx, s, traco);
  // o presente que acabou de ganhar (a transicao direta): desce do alto e assenta, como a taca
  const novo = s.dados.novo;
  ctx.save();
  ctx.lineJoin = 'round';
  for (const enc of /** @type {const} */ (['boca', 'rosto', 'cabeca'])) {
    const fn = a[enc] && REG[enc][a[enc]];
    if (!fn) continue;
    if (novo && novo.encaixe === enc) {
      if (novo.k <= 0) continue;
      const u = Math.min(1, novo.k);
      const c = 1.9;
      const x = u - 1;
      const pouso = 1 + (c + 1) * x * x * x + c * x * x;
      ctx.save();
      ctx.translate(0, (1 - pouso) * 3.2);
      fn(k, t);
      ctx.restore();
    } else fn(k, t);
  }
  ctx.restore();
}

/**
 * Os acessorios de todos os slimes do mundo de desenho (depois dos rostos).
 * @param {CanvasRenderingContext2D} ctx @param {any} m @param {import('./camera.js').Camera} cam @param {number} dpr @param {number} t
 */
export function desenharAcessorios(ctx, m, cam, dpr, t) {
  aplicar(ctx, cam, dpr);
  const traco = Math.max(0.035, 1.6 / cam.s);
  for (const s of m.slimes) if (s.ativo && !(s.dados && s.dados.semRosto)) desenharAcessoriosDe(ctx, s, traco, t);
}
