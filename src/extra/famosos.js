// Personagens famosos como slime (pedido do usuario em 2026-10-22: "faca as 2 opcoes, arquetipos e
// personagens"). PACOTE LOCAL: so carrega em loopback, na LAN e na build de modelos (import() numa
// linha "// modelo" do main.js); o tools/empacotar.mjs tira src/extra/ do zip da Poki e falha se
// algum arquivo citar este modulo fora de uma linha "// modelo". Motivo: os personagens sao de
// terceiros (direitos autorais e marcas), e a Poki recusa jogo com IP alheio. Para publicar com
// eles, a decisao e do dono do jogo. Os arquetipos genericos ficam em src/jogo/visual.js.

import { registrarAcessorio } from '../render/acessorios.js';
import { registrarEstampa } from '../render/estampas.js';
import { registrarProntasExtras, CORES_BASE } from '../jogo/visual.js';

const cor = (id) => (CORES_BASE.find((c) => c.id === id) || CORES_BASE[0]).pig;
const OLHOS = [[-0.36, 0.16, 0.33, 0.33], [0.36, 0.16, 0.33, 0.33]];
function arco(cx, cy, rx, ry, a0, a1, n = 16) {
  const l = [];
  for (let i = 0; i <= n; i++) { const a = a0 + ((a1 - a0) * i) / n; l.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
  return l;
}

/** Acessorios de cada personagem (mesma linguagem de src/render/acessorios.js). */
function acessorios() {
  registrarAcessorio('rosto', 'mascaraJason', (k) => {
    const contorno = [...arco(0, 0.12, 0.8, 0.62, Math.PI * 0.05, Math.PI * 0.95), ...arco(0, 0.0, 0.6, 0.72, Math.PI * 1.05, Math.PI * 1.95)];
    k.comFuros(contorno, OLHOS, '#efe9dc');
    for (const l of [-1, 1]) k.poli([[l * 0.2, 0.58], [l * 0.36, 0.5], [l * 0.3, 0.64]], '#c8202f');
    k.poli([[-0.06, 0.66], [0.06, 0.66], [0, 0.5]], '#c8202f');
    k.poli([[l0(-1), 0.02], [l0(-1) + 0.12, -0.04], [l0(-1) + 0.08, 0.06]], '#c8202f');
    k.poli([[l0(1), 0.02], [l0(1) - 0.12, -0.04], [l0(1) - 0.08, 0.06]], '#c8202f');
    for (const [x, y] of [[-0.12, -0.14], [0.12, -0.14], [0, -0.3], [-0.2, -0.38], [0.2, -0.38], [0, -0.52]]) k.disco(x, y, 0.04, '#2b2b33', false);
  });
  function l0(l) { return l * 0.55; }
  registrarAcessorio('rosto', 'mascaraGhost', (k) => {
    k.comFuros([...arco(0, 0.18, 0.62, 0.62, 0, Math.PI), ...arco(0, 0.0, 0.5, 1.0, Math.PI, Math.PI * 2)], [], '#f7f7f5');
    for (const l of [-1, 1]) k.poli([[l * 0.12, 0.34], [l * 0.5, 0.18], [l * 0.42, 0.02], [l * 0.16, 0.1]], '#141418');
    k.poli([[-0.12, -0.12], [0.12, -0.12], [0.16, -0.5], [0, -0.78], [-0.16, -0.5]], '#141418');
  });
  registrarAcessorio('cabeca', 'capuz', (k) => {
    k.comFuros([...arco(0, 0.1, 1.08, 0.86, 0, Math.PI), [-1.08, -0.4], [1.08, -0.4]], [[0, 0.0, 0.66, 0.8]], '#1b1b20');
  });
  registrarAcessorio('cabeca', 'capaceteVader', (k) => {
    // capacete com a abertura do rosto (a grade e as lentes do rosto aparecem por ela)
    k.comFuros([...arco(0, 0.28, 0.82, 0.62, 0, Math.PI), [-1.05, -0.45], [-0.62, -0.38], [0.62, -0.38], [1.05, -0.45]], [[0, 0.06, 0.7, 0.5]], '#121215');
    k.linha([[-0.5, 0.62], [0.5, 0.62]], 0.03, '#3a3a44');
  });
  registrarAcessorio('rosto', 'grelhaVader', (k) => {
    for (const l of [-1, 1]) k.poli([[l * 0.06, 0.3], [l * 0.62, 0.36], [l * 0.6, 0.0], [l * 0.12, 0.0]], '#2a2a33');
    k.poli([[-0.24, -0.06], [0.24, -0.06], [0, -0.44]], '#3a3a44');
    for (const x of [-0.08, 0, 0.08]) k.linha([[x, -0.12], [x, -0.3]], 0.02, '#9aa3b5');
  });
  registrarAcessorio('rosto', 'mascaraTrooper', (k) => {
    k.comFuros([...arco(0, 0.2, 0.9, 0.62, 0, Math.PI), [-0.85, -0.3], [-0.3, -0.6], [0.3, -0.6], [0.85, -0.3]], [], '#f4f4f2');
    for (const l of [-1, 1]) k.poli([[l * 0.12, 0.3], [l * 0.6, 0.32], [l * 0.52, 0.04], [l * 0.18, 0.12]], '#141418');
    k.poli([[-0.32, -0.2], [0.32, -0.2], [0.18, -0.42], [-0.18, -0.42]], '#3a3a44');
  });
  registrarAcessorio('cabeca', 'boneMario', (k) => {
    k.poli(arco(0, 0.52, 0.66, 0.44, 0, Math.PI), '#e02d3c');
    k.elipse(0.18, 0.5, 0.74, 0.12, '#c41f2f');
    k.disco(0, 0.74, 0.16, '#ffffff');
    k.linha([[-0.08, 0.68], [-0.08, 0.82], [0, 0.74], [0.08, 0.82], [0.08, 0.68]], 0.03, '#e02d3c');
  });
  registrarAcessorio('boca', 'bocaPac', (k) => {
    k.poli([[1.25, 0.55], [0.15, -0.12], [1.25, -0.55]], '#17161c', false);
  });
  registrarAcessorio('rosto', 'bochechasKirby', (k) => {
    for (const l of [-1, 1]) k.elipse(l * 0.62, -0.12, 0.16, 0.08, '#ff6fa8', false);
  });
  registrarAcessorio('cabeca', 'orelhasPika', (k) => {
    for (const l of [-1, 1]) {
      k.poli([[l * 0.25, 0.6], [l * 0.95, 1.35], [l * 0.55, 0.52]], '#f7d23a');
      k.poli([[l * 0.75, 1.13], [l * 0.95, 1.35], [l * 0.68, 1.0]], '#17161c', false);
    }
  });
  registrarAcessorio('rosto', 'bochechasPika', (k) => {
    for (const l of [-1, 1]) k.disco(l * 0.66, -0.12, 0.15, '#e8323c');
  });
  registrarAcessorio('rosto', 'oculosMinion', (k) => {
    k.linha([[-1.2, 0.18], [1.2, 0.18]], 0.12, '#2a2a33');
    for (const l of [-1, 1]) k.comFuros(arco(l * 0.36, 0.16, 0.36, 0.36, 0, Math.PI * 2, 20), [[l * 0.36, 0.16, 0.28, 0.28]], '#a9b0bd');
  });
  registrarAcessorio('rosto', 'olhosAranha', (k) => {
    for (const l of [-1, 1]) k.poli([[l * 0.08, 0.34], [l * 0.66, 0.46], [l * 0.6, 0.0], [l * 0.18, -0.02]], '#f4f4f2');
  });
  registrarAcessorio('cabeca', 'orelhasBat', (k) => {
    for (const l of [-1, 1]) k.poli([[l * 0.28, 0.6], [l * 0.6, 1.08], [l * 0.7, 0.56]], '#1d1d24');
  });
  registrarAcessorio('rosto', 'mascaraBat', (k) => {
    k.comFuros([...arco(0, 0.06, 1.0, 0.62, 0, Math.PI), [-1.0, -0.06], [-0.35, -0.02], [0, -0.1], [0.35, -0.02], [1.0, -0.06]], [[-0.36, 0.16, 0.24, 0.16], [0.36, 0.16, 0.24, 0.16]], '#1d1d24');
  });
  registrarAcessorio('cabeca', 'cabeloHulk', (k) => {
    k.poli([...arco(0, 0.48, 0.72, 0.32, 0, Math.PI), [-0.62, 0.32], [-0.4, 0.42], [-0.22, 0.28], [0, 0.4], [0.22, 0.28], [0.42, 0.42], [0.62, 0.32]], '#141418');
  });
  registrarAcessorio('cabeca', 'orelhasShrek', (k) => {
    for (const l of [-1, 1]) {
      k.poli([[l * 0.88, 0.3], [l * 1.25, 0.5], [l * 1.25, 0.66], [l * 1.1, 0.62], [l * 0.84, 0.44]], '#8fbf3a');
      k.disco(l * 1.25, 0.58, 0.07, '#6e9a2a');
    }
  });
  registrarAcessorio('cabeca', 'boneChaves', (k) => {
    k.poli(arco(0, 0.5, 0.68, 0.42, 0, Math.PI), '#6c8a4a');
    for (const l of [-1, 1]) k.poli([[l * 0.6, 0.52], [l * 0.82, 0.48], [l * 0.82, 0.1], [l * 0.62, 0.14]], '#6c8a4a');
    k.elipse(0, 0.5, 0.72, 0.1, '#4f6b33');
  });
}

/** Estampas dos personagens (128 x 64; a linha 0 e o topo da cupula). */
function estampas() {
  registrarEstampa('macacaoMario', (g) => {
    g.fillStyle = '#e02d3c'; g.fillRect(0, 0, 128, 64);
    g.fillStyle = '#2a52c9'; g.fillRect(0, 44, 128, 20);
    g.fillRect(36, 34, 14, 12); g.fillRect(78, 34, 14, 12);
    g.fillStyle = '#ffd23a'; g.beginPath(); g.arc(43, 40, 3, 0, Math.PI * 2); g.arc(85, 40, 3, 0, Math.PI * 2); g.fill();
  });
  registrarEstampa('esponja', (g) => {
    g.fillStyle = 'rgba(160, 140, 30, 0.6)';
    for (const [x, y, r] of [[20, 14, 5], [100, 18, 6], [30, 32, 4], [104, 34, 4], [64, 8, 4]]) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#ffffff'; g.fillRect(0, 46, 128, 6);
    g.fillStyle = '#8b5634'; g.fillRect(0, 52, 128, 12);
    g.fillStyle = '#e02d3c'; g.beginPath(); g.moveTo(60, 46); g.lineTo(68, 46); g.lineTo(66, 58); g.lineTo(64, 61); g.lineTo(62, 58); g.closePath(); g.fill();
  });
  registrarEstampa('jardineira', (g) => {
    g.fillStyle = '#2a62d6'; g.fillRect(0, 46, 128, 18);
    g.fillRect(48, 40, 32, 8);
    g.strokeStyle = '#1b3f8f'; g.lineWidth = 2; g.strokeRect(56, 48, 16, 8);
  });
  registrarEstampa('teia', (g) => {
    g.strokeStyle = 'rgba(20, 20, 24, 0.8)';
    g.lineWidth = 1.3;
    const cx = 64;
    const cy = 30;
    for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * 140, cy + Math.sin(a) * 140); g.stroke(); }
    for (let r = 12; r < 90; r += 12) { g.beginPath(); for (let k = 0; k <= 12; k++) { const a = (k / 12) * Math.PI * 2; const rr = r * (k % 2 ? 0.92 : 1); g.lineTo(cx + Math.cos(a) * rr * 1.4, cy + Math.sin(a) * rr * 0.7); } g.stroke(); }
    g.fillStyle = '#2a52c9'; g.fillRect(0, 50, 128, 14);
  });
  registrarEstampa('simboloBat', (g) => {
    g.fillStyle = '#ffd23a'; g.beginPath(); g.ellipse(64, 52, 14, 8, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#141418'; g.beginPath(); g.moveTo(52, 52); g.quadraticCurveTo(58, 46, 62, 49); g.lineTo(64, 46); g.lineTo(66, 49); g.quadraticCurveTo(70, 46, 76, 52); g.quadraticCurveTo(70, 52, 64, 58); g.quadraticCurveTo(58, 52, 52, 52); g.fill();
  });
  registrarEstampa('calcaRoxa', (g) => {
    g.fillStyle = '#6a3fa8';
    g.beginPath(); g.moveTo(0, 50); for (let x = 0; x <= 128; x += 8) g.lineTo(x, 50 + (x % 16 ? 5 : 0)); g.lineTo(128, 64); g.lineTo(0, 64); g.closePath(); g.fill();
  });
  registrarEstampa('colete', (g) => {
    g.fillStyle = '#f2efe6'; g.fillRect(28, 38, 72, 26);
    g.fillStyle = '#5a3a1e'; g.fillRect(16, 38, 26, 26); g.fillRect(86, 38, 26, 26);
  });
  registrarEstampa('suspensorio', (g) => {
    g.fillStyle = '#c8b28a'; g.fillRect(0, 36, 128, 28);
    g.fillStyle = '#7a5a34'; g.fillRect(38, 36, 6, 28); g.fillRect(84, 36, 6, 28);
    g.fillStyle = '#a3602f'; g.fillRect(56, 50, 12, 9);
    g.fillStyle = '#3b6fa8'; g.fillRect(96, 44, 10, 8);
  });
}

/** As 16 skins prontas (nome proprio, sem traducao; gratis no pacote local). */
const FAMOSOS = [
  { id: 'jason', nome: 'Jason', v: { pig: cor('verdeEscuro'), padrao: 0, estampa: '', cabeca: '', rosto: 'mascaraJason', boca: '' } },
  { id: 'freddy', nome: 'Freddy Krueger', v: { pig: cor('vermelho'), padrao: 15, cor2: '#28a55a', estampa: '', cabeca: 'fedora', rosto: '', boca: '' } },
  { id: 'ghostface', nome: 'Ghostface', v: { pig: cor('preto'), padrao: 0, estampa: '', cabeca: 'capuz', rosto: 'mascaraGhost', boca: '' } },
  { id: 'vader', nome: 'Darth Vader', v: { pig: cor('preto'), padrao: 0, estampa: '', cabeca: 'capaceteVader', rosto: 'grelhaVader', boca: '' } },
  { id: 'trooper', nome: 'Stormtrooper', v: { pig: cor('branco'), padrao: 0, estampa: '', cabeca: '', rosto: 'mascaraTrooper', boca: '' } },
  { id: 'mario', nome: 'Mario', v: { pig: cor('vermelho'), padrao: 0, estampa: 'famoso:macacaoMario', cabeca: 'boneMario', rosto: '', boca: 'bigode' } },
  { id: 'pacman', nome: 'Pac-Man', v: { pig: cor('amarelo'), padrao: 0, estampa: '', cabeca: '', rosto: '', boca: 'bocaPac' } },
  { id: 'kirby', nome: 'Kirby', v: { pig: cor('rosa'), padrao: 0, estampa: '', cabeca: '', rosto: 'bochechasKirby', boca: '' } },
  { id: 'pikachu', nome: 'Pikachu', v: { pig: cor('amarelo'), padrao: 0, estampa: '', cabeca: 'orelhasPika', rosto: 'bochechasPika', boca: '' } },
  { id: 'bobEsponja', nome: 'Bob Esponja', v: { pig: cor('amarelo'), padrao: 0, estampa: 'famoso:esponja', cabeca: '', rosto: '', boca: '' } },
  { id: 'minion', nome: 'Minion', v: { pig: cor('amarelo'), padrao: 0, estampa: 'famoso:jardineira', cabeca: '', rosto: 'oculosMinion', boca: '' } },
  { id: 'aranha', nome: 'Homem-Aranha', v: { pig: cor('vermelho'), padrao: 0, estampa: 'famoso:teia', cabeca: '', rosto: 'olhosAranha', boca: '' } },
  { id: 'batman', nome: 'Batman', v: { pig: cor('grafite'), padrao: 0, estampa: 'famoso:simboloBat', cabeca: 'orelhasBat', rosto: 'mascaraBat', boca: '' } },
  { id: 'hulk', nome: 'Hulk', v: { pig: cor('verde'), padrao: 0, estampa: 'famoso:calcaRoxa', cabeca: 'cabeloHulk', rosto: '', boca: '' } },
  { id: 'shrek', nome: 'Shrek', v: { pig: cor('limao'), padrao: 0, estampa: 'famoso:colete', cabeca: 'orelhasShrek', rosto: '', boca: '' } },
  { id: 'chaves', nome: 'Chaves', v: { pig: cor('bege'), padrao: 0, estampa: 'famoso:suspensorio', cabeca: 'boneChaves', rosto: '', boca: '' } },
];

/** Registra tudo (o main.js chama depois do import()). */
export function instalar() {
  acessorios();
  estampas();
  registrarProntasExtras(FAMOSOS.map((f) => ({ ...f, preco: 0 })));
  return FAMOSOS.length;
}
