// Estampas RGBA do slime (128 x 64 px, sRGB): cobrem a cupula no espaco de repouso (u na largura
// 2R, v da base ao topo; a linha 0 e o topo) e amassam junto (src/render/composicao.js, uT4). A
// cupula e uma meia elipse dentro do retangulo: os cantos de cima nao aparecem; o rosto fica no
// meio, um pouco acima do centro (olhos perto da linha 30). Uma estampa e a bandeira do pais, a
// pintura do jogador (o pincel do vestiario) ou o desenho de um arquetipo (abaixo). O pacote local
// de personagens (src/extra/famosos.js) registra os dele com registrarEstampa().

import { desenharBandeira } from './bandeiras.js';

export const EST_W = 128;
export const EST_H = 64;

/** @type {Record<string, (g: CanvasRenderingContext2D) => void>} */
const REG = {
  /** faixas de mumia: tiras bege em diagonal, com sombra */
  mumia(g) {
    g.lineCap = 'butt';
    for (let k = -3; k < 9; k++) {
      const y = k * 9;
      g.strokeStyle = 'rgba(120, 100, 70, 0.55)';
      g.lineWidth = 7.5;
      g.beginPath(); g.moveTo(-10, y + 14); g.lineTo(140, y - 6 + (k % 2) * 8); g.stroke();
      g.strokeStyle = k % 2 ? '#efe2c4' : '#e2d2ae';
      g.lineWidth = 6;
      g.stroke();
    }
    // a faixa solta na frente
    g.strokeStyle = '#efe2c4';
    g.lineWidth = 5;
    g.beginPath(); g.moveTo(88, 40); g.quadraticCurveTo(100, 54, 92, 64); g.stroke();
  },
  /** monstro costurado: pontos de costura na testa e na bochecha */
  costuras(g) {
    g.strokeStyle = '#1d1d24';
    g.lineWidth = 1.6;
    const costura = (x0, y0, x1, y1, n) => {
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
      for (let i = 0; i <= n; i++) {
        const x = x0 + ((x1 - x0) * i) / n;
        const y = y0 + ((y1 - y0) * i) / n;
        g.beginPath(); g.moveTo(x - 1, y - 3); g.lineTo(x + 1, y + 3); g.stroke();
      }
    };
    costura(44, 14, 82, 11, 7);
    costura(86, 42, 100, 52, 3);
    costura(30, 46, 24, 56, 2);
  },
  /** robo: placas, rebites e um visor no peito */
  robo(g) {
    g.strokeStyle = 'rgba(40, 44, 56, 0.55)';
    g.lineWidth = 1.5;
    for (const x of [32, 96]) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 64); g.stroke(); }
    g.beginPath(); g.moveTo(0, 46); g.lineTo(128, 46); g.stroke();
    g.fillStyle = 'rgba(40, 44, 56, 0.6)';
    for (const [x, y] of [[36, 50], [92, 50], [36, 60], [92, 60], [28, 20], [100, 20]]) { g.beginPath(); g.arc(x, y, 1.6, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#1d1d24';
    g.fillRect(54, 50, 20, 10);
    g.fillStyle = '#5fe08a';
    for (let i = 0; i < 4; i++) g.fillRect(56 + i * 4.5, 56 - (i % 3) * 2, 3, 2 + (i % 3) * 2);
  },
  /** emblema de raio no peito (heroi mascarado, generico) */
  raio(g) {
    g.fillStyle = '#ffd23a';
    g.strokeStyle = '#17161c';
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(68, 44); g.lineTo(58, 55); g.lineTo(64, 55); g.lineTo(57, 64); g.lineTo(72, 51); g.lineTo(66, 51); g.lineTo(72, 44);
    g.closePath(); g.fill(); g.stroke();
  },
  /** gomos da abobora: arcos mais escuros de cima a baixo */
  gomosAbobora(g) {
    g.strokeStyle = 'rgba(150, 60, 0, 0.45)';
    g.lineWidth = 2.5;
    for (const dx of [-36, -16, 16, 36]) {
      g.beginPath();
      g.moveTo(64 + dx * 0.4, 0);
      g.quadraticCurveTo(64 + dx * 1.5, 32, 64 + dx * 1.1, 64);
      g.stroke();
    }
  },
  /** listra de astronauta: o emblema redondo e a bandeirinha no braco */
  astronauta(g) {
    g.fillStyle = '#2a62d6';
    g.beginPath(); g.arc(92, 52, 6, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffffff';
    g.beginPath(); g.arc(92, 52, 2.4, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ef3e4f';
    g.fillRect(24, 48, 12, 8);
  },
};

/**
 * Registra uma estampa (o pacote local de personagens).
 * @param {string} id @param {(g: CanvasRenderingContext2D) => void} fn
 */
export function registrarEstampa(id, fn) {
  REG[id] = fn;
}

/** As estampas de arquetipo desenhadas (o teste confere com src/jogo/visual.js). */
export const estampasDesenhadas = () => Object.keys(REG);

/**
 * Desenha a estampa `qual` num contexto de 128 x 64 (limpo antes).
 * @param {CanvasRenderingContext2D} g
 * @param {string} qual '' | 'bandeira' | 'pintura' | 'arq:<id>' | 'famoso:<id>'
 * @param {{ pais?: string, pintura?: CanvasImageSource|null }} o
 * @returns {boolean} se desenhou alguma coisa
 */
export function desenharEstampa(g, qual, o = {}) {
  g.clearRect(0, 0, EST_W, EST_H);
  if (!qual) return false;
  if (qual === 'bandeira') {
    if (!o.pais) return false;
    desenharBandeira(g, o.pais, 0, 0, EST_W, EST_H);
    return true;
  }
  if (qual === 'pintura') {
    if (!o.pintura) return false;
    g.drawImage(o.pintura, 0, 0, EST_W, EST_H);
    return true;
  }
  const id = qual.replace(/^(arq|famoso):/, '');
  const fn = REG[id];
  if (!fn) return false;
  g.save();
  fn(g);
  g.restore();
  return true;
}
