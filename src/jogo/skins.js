// Skins do Volei de Gosma: o mundo do futebol, sem nenhuma marca, clube, selecao ou competicao
// real (lista de proibidos no test/estilo.test.js). Logica pura: so dados.
//
// Cada skin tem o pigmento do corpo (KM [ciano, magenta, amarelo, preto]), a cor do desenho
// (hex) e, opcional, um padrao procedural do shader (uAp em src/render/composicao.js): o kit da
// camisa (listras, faixa, metades, xadrez...). O vestiario (src/jogo/visual.js) usa estas como
// skins prontas; a evolucao (Base -> Pro -> Craque -> Lenda) ainda nao existe.

/**
 * Paleta do editor (sRGB). O indice 0 e transparente: o pixel mostra a cor do slime.
 */
export const PALETA = Object.freeze([
  '', '#17161c', '#ffffff', '#a3a8b8', '#ee3b45', '#ff8a2a', '#ffd23a', '#a2e35a',
  '#28a55a', '#3fd6c8', '#3b8cf2', '#2b3a9c', '#8e4fd8', '#ff8ac0', '#8b5634', '#f6dcae',
]);

/**
 * @typedef {Object} Skin
 * @property {string} id
 * @property {number[]} pig     pigmento do corpo
 * @property {string} hex       cor do desenho (rostos, confete, mira)
 * @property {number} [proc]    padrao do kit no shader (0: liso)
 * @property {string} [cor2]    cor do padrao (hex)
 * @property {number} [escala]
 */

/** Catalogo (o M3 completa: 16 skins com kit casa e fora). */
export const SKINS = Object.freeze([
  { id: 'laranjinha', pig: [0, 0.08, 1.0, 0], hex: '#f28c3f' },
  { id: 'listrado', pig: [0.02, 0.05, 0.92, 0], hex: '#ffd23a', proc: 2, cor2: '#2b3a9c' },
  { id: 'faixa', pig: [0, 0.001, 0, 0], hex: '#eee9ed', proc: 15, cor2: '#ee3b45' },
  { id: 'metades', pig: [0.7, 0.1, 0, 0], hex: '#3b8cf2', proc: 16, cor2: '#ffffff' },
  { id: 'xadrez', pig: [0, 0.75, 0.6, 0], hex: '#ee3b45', proc: 4, cor2: '#ffffff' },
].map((s) => Object.freeze(s)));

/** @param {string} id @returns {Skin} */
export const skin = (id) => SKINS.find((s) => s.id === id) || SKINS[0];
