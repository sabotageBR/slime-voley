// Visual do slime do jogador (pedido de 2026-10-22: o vestiario no menu). Puro: so dados, a
// normalizacao do save e a compra com Gotas. O visual e completo por si:
//   { pig, hex, padrao, cor2, estampa, cabeca, rosto, boca, pronta }
//   pig/hex: o pigmento KM do corpo e a cor do desenho (sempre hexDaMistura(pig));
//   padrao: o procedural do shader (0 liso .. 16; src/render/composicao.js procAp) na cor2;
//   estampa: '' | 'bandeira' (a selecao, perfil.pais) | 'pintura' (o pincel, so no aparelho) |
//            'arq:<id>' | 'famoso:<id>' (o pacote local, fora da build da Poki);
//   cabeca/rosto/boca: os acessorios (src/render/acessorios.js);
//   pronta: a skin pronta aplicada por ultimo (so para o vestiario marcar).
// As "prontas" (skins da trilha e arquetipos) so preenchem esses campos. Economia (desenho §3.7):
// cores, padroes, bandeiras e pintura sao gratis; os arquetipos custam de 120 a 250 Gotas e os
// acessorios novos de 30 a 80 (alguns gratis). Nada de caixa aleatoria.

import { hexDaMistura } from '../cor/km.js';
import { SKINS, skin as acharSkin } from './skins.js';

/** Paleta de cores base (pigmentos KM achados para cada cor-alvo; o hex sai do pigmento). */
export const CORES_BASE = Object.freeze([
  { id: 'laranja', pig: [0, 0.072, 0.912, 0] },
  { id: 'amarelo', pig: [0.001, 0.001, 0.822, 0] },
  { id: 'dourado', pig: [0.001, 0.021, 0.972, 0.001] },
  { id: 'limao', pig: [0.016, 0, 0.899, 0] },
  { id: 'verde', pig: [0.135, 0.001, 0.847, 0] },
  { id: 'verdeEscuro', pig: [0.424, 0.001, 0.562, 0.013] },
  { id: 'menta', pig: [0.031, 0, 0.061, 0] },
  { id: 'ciano', pig: [0.062, 0, 0.037, 0] },
  { id: 'azul', pig: [0.454, 0.003, 0.001, 0] },
  { id: 'marinho', pig: [0.607, 0.387, 0, 0.002] },
  { id: 'roxo', pig: [0.111, 0.18, 0.001, 0] },
  { id: 'lilas', pig: [0.014, 0.028, 0, 0] },
  { id: 'rosa', pig: [0.001, 0.053, 0.003, 0] },
  { id: 'pink', pig: [0.001, 0.189, 0.003, 0] },
  { id: 'vermelho', pig: [0.001, 0.394, 0.58, 0] },
  { id: 'coral', pig: [0, 0.097, 0.333, 0] },
  { id: 'vinho', pig: [0.001, 0.739, 0.25, 0.008] },
  { id: 'marrom', pig: [0.001, 0.193, 0.783, 0.015] },
  { id: 'bege', pig: [0, 0.006, 0.078, 0] },
  { id: 'creme', pig: [0, 0.001, 0.019, 0] },
  { id: 'branco', pig: [0, 0.001, 0, 0] },
  { id: 'cinza', pig: [0.043, 0.023, 0.026, 0] },
  { id: 'grafite', pig: [0.401, 0.193, 0.114, 0.041] },
  { id: 'preto', pig: [0.112, 0.379, 0.054, 0.45] },
].map((c) => Object.freeze({ ...c, hex: hexDaMistura(c.pig) })));

/** Cores do padrao (sRGB, sem pigmento: o shader pinta por cima). */
export const CORES_2 = Object.freeze([
  '#ffffff', '#17161c', '#ee3b45', '#ff8a2a', '#ffd23a', '#a2e35a', '#28a55a', '#3fd6c8',
  '#3b8cf2', '#2b3a9c', '#8e4fd8', '#ff8ac0', '#8b5634', '#f6dcae', '#a3a8b8', '#c8a24a',
]);

/** Padroes do shader: 0 liso e 1..16 (src/render/composicao.js procAp). */
export const PADROES = Object.freeze([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);

export const ENCAIXES = Object.freeze(['cabeca', 'rosto', 'boca']);

/** Acessorios por encaixe, com preco (0 = gratis). Os desenhos: src/render/acessorios.js. */
export const ACESSORIOS = Object.freeze({
  cabeca: Object.freeze([
    { id: 'bone', preco: 0 }, { id: 'laco', preco: 0 }, { id: 'gorro', preco: 30 }, { id: 'flor', preco: 30 },
    { id: 'cartola', preco: 50 }, { id: 'coroa', preco: 80 }, { id: 'bruxa', preco: 60 }, { id: 'pirata', preco: 50 },
    { id: 'tiara', preco: 40 }, { id: 'aureola', preco: 60 }, { id: 'viking', preco: 60 }, { id: 'chef', preco: 40 },
    { id: 'natal', preco: 40 }, { id: 'orelhasGato', preco: 40 }, { id: 'orelhasCoelho', preco: 40 }, { id: 'orelhasPanda', preco: 40 },
    { id: 'astronauta', preco: 80 }, { id: 'cowboy', preco: 50 }, { id: 'fedora', preco: 50 }, { id: 'antena', preco: 30 },
    { id: 'antenasAbelha', preco: 30 }, { id: 'cabeloVampiro', preco: 40 }, { id: 'cabeloReto', preco: 40 }, { id: 'cabinho', preco: 30 },
    { id: 'gorroSaci', preco: 50 }, { id: 'bandana', preco: 30 },
  ].map((a) => Object.freeze(a))),
  rosto: Object.freeze([
    { id: 'oculosEscuros', preco: 0 }, { id: 'oculosRedondos', preco: 30 }, { id: 'mascaraHoquei', preco: 70 }, { id: 'mascaraHeroi', preco: 50 },
    { id: 'luchador', preco: 70 }, { id: 'tapaOlho', preco: 40 }, { id: 'faixaNinja', preco: 50 }, { id: 'parafusos', preco: 40 },
  ].map((a) => Object.freeze(a))),
  boca: Object.freeze([
    { id: 'bigode', preco: 0 }, { id: 'presas', preco: 40 }, { id: 'barba', preco: 40 }, { id: 'barbaBranca', preco: 50 },
    { id: 'apito', preco: 30 }, { id: 'gravata', preco: 30 },
  ].map((a) => Object.freeze(a))),
});

const corBase = (id) => (CORES_BASE.find((c) => c.id === id) || CORES_BASE[0]).pig;

/**
 * Arquetipos (skins prontas nossas, na build da Poki): lembram personagens conhecidos pelo tipo,
 * sem copiar nenhum (o "Goleiro Mascarado" usa a mascara de hoquei generica, sem faca nem
 * nome). Os personagens de verdade ficam no pacote local (src/extra/famosos.js).
 */
export const ARQUETIPOS = Object.freeze([
  { id: 'goleiroMascarado', preco: 200, v: { pig: corBase('verdeEscuro'), padrao: 0, estampa: '', cabeca: '', rosto: 'mascaraHoquei', boca: '' } },
  { id: 'pesadeloListrado', preco: 200, v: { pig: corBase('vermelho'), padrao: 15, cor2: '#28a55a', estampa: '', cabeca: 'fedora', rosto: '', boca: '' } },
  { id: 'vampiro', preco: 160, v: { pig: corBase('lilas'), padrao: 0, estampa: '', cabeca: 'cabeloVampiro', rosto: '', boca: 'presas' } },
  { id: 'mumia', preco: 160, v: { pig: corBase('bege'), padrao: 0, estampa: 'arq:mumia', cabeca: '', rosto: '', boca: '' } },
  { id: 'monstroCosturado', preco: 160, v: { pig: corBase('verde'), padrao: 0, estampa: 'arq:costuras', cabeca: 'cabeloReto', rosto: 'parafusos', boca: '' } },
  { id: 'abobora', preco: 120, v: { pig: corBase('laranja'), padrao: 0, estampa: 'arq:gomosAbobora', cabeca: 'cabinho', rosto: '', boca: '' } },
  { id: 'abelha', preco: 120, v: { pig: corBase('amarelo'), padrao: 15, cor2: '#17161c', estampa: '', cabeca: 'antenasAbelha', rosto: '', boca: '' } },
  { id: 'pirata', preco: 160, v: { pig: corBase('coral'), padrao: 0, estampa: '', cabeca: 'pirata', rosto: 'tapaOlho', boca: 'bigode' } },
  { id: 'ninja', preco: 160, v: { pig: corBase('preto'), padrao: 0, estampa: '', cabeca: '', rosto: 'faixaNinja', boca: '' } },
  { id: 'viking', preco: 180, v: { pig: corBase('bege'), padrao: 0, estampa: '', cabeca: 'viking', rosto: '', boca: 'barba' } },
  { id: 'astronauta', preco: 220, v: { pig: corBase('branco'), padrao: 0, estampa: 'arq:astronauta', cabeca: 'astronauta', rosto: '', boca: '' } },
  { id: 'robo', preco: 200, v: { pig: corBase('cinza'), padrao: 0, estampa: 'arq:robo', cabeca: 'antena', rosto: '', boca: '' } },
  { id: 'mago', preco: 200, v: { pig: corBase('marinho'), padrao: 5, cor2: '#ffd23a', estampa: '', cabeca: 'bruxa', rosto: '', boca: 'barbaBranca' } },
  { id: 'heroiMascarado', preco: 220, v: { pig: corBase('vermelho'), padrao: 0, estampa: 'arq:raio', cabeca: '', rosto: 'mascaraHeroi', boca: '' } },
  { id: 'luchador', preco: 220, v: { pig: corBase('azul'), padrao: 0, estampa: '', cabeca: '', rosto: 'luchador', boca: '' } },
  { id: 'saci', preco: 250, v: { pig: corBase('marrom'), padrao: 0, estampa: '', cabeca: 'gorroSaci', rosto: '', boca: '' } },
].map((a) => Object.freeze(a)));

/** Pacote local (src/extra/famosos.js): o main.js registra aqui quando carrega. */
const EXTRAS = [];
/** @param {{ id: string, preco: number, v: any }[]} lista */
export function registrarProntasExtras(lista) {
  for (const a of lista) if (!EXTRAS.some((x) => x.id === a.id)) EXTRAS.push(a);
}
export const prontasExtras = () => EXTRAS;

/** O visual de uma skin pronta do catalogo (src/jogo/skins.js). @param {string} id */
export function visualDaSkin(id) {
  const s = acharSkin(id);
  return { pig: [...s.pig], hex: hexDaMistura(s.pig), padrao: s.proc || 0, cor2: s.cor2 || '#ffffff', estampa: '', cabeca: '', rosto: '', boca: '', pronta: s.id };
}

/** O visual de um arquetipo (ou extra) por cima do atual. @param {string} id */
export function visualDoArquetipo(id) {
  const a = ARQUETIPOS.find((x) => x.id === id) || EXTRAS.find((x) => x.id === id);
  if (!a) return null;
  const v = a.v;
  return { pig: [...v.pig], hex: hexDaMistura(v.pig), padrao: v.padrao || 0, cor2: v.cor2 || '#ffffff', estampa: v.estampa || '', cabeca: v.cabeca || '', rosto: v.rosto || '', boca: v.boca || '', pronta: id };
}

/** Preco de um item ('ac:<encaixe>:<id>' ou 'arq:<id>'); undefined se nao existe. @param {string} chave */
export function precoDe(chave) {
  const [tipo, a, b] = chave.split(':');
  if (tipo === 'arq') {
    const x = ARQUETIPOS.find((y) => y.id === a) || EXTRAS.find((y) => y.id === a);
    return x ? x.preco : undefined;
  }
  if (tipo === 'ac' && ACESSORIOS[a]) {
    const x = ACESSORIOS[a].find((y) => y.id === b);
    return x ? x.preco : undefined;
  }
  return undefined;
}

/** O item ja e do jogador? (gratis conta como dele) @param {any} perfil @param {string} chave */
export function temItem(perfil, chave) {
  const p = precoDe(chave);
  if (p === undefined) return false;
  return p === 0 || (perfil.liberados.itens || []).includes(chave);
}

/**
 * Compra com Gotas. Devolve o perfil novo (ou o mesmo, com ok false, sem Gotas ou ja comprado).
 * @param {any} perfil @param {string} chave
 */
export function comprar(perfil, chave) {
  const p = precoDe(chave);
  if (p === undefined || temItem(perfil, chave) || perfil.gotas < p) return { ok: false, perfil };
  const n = structuredClone(perfil);
  n.gotas -= p;
  n.liberados.itens = [...(n.liberados.itens || []), chave];
  return { ok: true, perfil: n };
}

const ehHex = (v) => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
/** id de acessorio (o pacote local registra os dele depois do load: qualquer id simples vale; o desenho ignora o desconhecido) */
const ehAcessorio = (id) => typeof id === 'string' && /^[a-zA-Z]{0,24}$/.test(id);

/**
 * O visual salvo, validado (sem visual: o da skin equipada).
 * @param {any} v @param {string} [skinId]
 */
export function normalizarVisual(v, skinId = 'laranjinha') {
  const base = visualDaSkin(skinId);
  if (!v || typeof v !== 'object') return base;
  const pig = Array.isArray(v.pig) && v.pig.length === 4 && v.pig.every((x) => Number.isFinite(x) && x >= 0 && x <= 1) && v.pig.reduce((a, b) => a + b, 0) <= 1.0001 ? v.pig.map(Number) : base.pig;
  const estampa = typeof v.estampa === 'string' && /^(|bandeira|pintura|arq:[a-zA-Z]+|famoso:[a-zA-Z]+)$/.test(v.estampa) ? v.estampa : '';
  const ac = (enc) => (ehAcessorio(v[enc]) ? v[enc] : '');
  return {
    pig, hex: hexDaMistura(pig),
    padrao: PADROES.includes(v.padrao) ? v.padrao : 0,
    cor2: ehHex(v.cor2) ? v.cor2.toLowerCase() : '#ffffff',
    estampa, cabeca: ac('cabeca'), rosto: ac('rosto'), boca: ac('boca'),
    pronta: typeof v.pronta === 'string' ? v.pronta : '',
  };
}

/** As skins prontas da trilha (src/jogo/skins.js), para o vestiario. */
export const SKINS_PRONTAS = SKINS;
