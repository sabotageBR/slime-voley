// Rivais do Circuito Gosma: niveis de IA (T0..T5), personalidades e as 4 Copas.
// Os nomes sao chaves de texto (src/i18n/textos.js, rival.<id>). A cor do corpo e uma da paleta
// calibrada do vestiario (src/jogo/visual.js CORES_BASE): distinta dentro de cada caminho e longe
// da laranjinha (pedido de 2026-10-22: "os rivais vem sempre da mesma cor"), com uma reserva (alt)
// para quando o jogador vestir uma cor parecida (corDoRival).

import { CORES_BASE } from './visual.js';
import { deltaE, linearDeHex } from '../cor/km.js';

/**
 * Niveis: velocidade (u/s), reacao (s), erro de posicao (u), chance de pular na bola, de cortar
 * (cortada lenta), de usar o super no saque e de acertar a manchete perfeita; saqueErro e o desvio
 * (s) do tempo da batida no saque "levantar e bater".
 */
export const NIVEIS = Object.freeze({
  T0: Object.freeze({ vel: 7.0, reacao: 0.45, erro: 1.8, pulo: 0, corta: 0, super: 0, perfeita: 0, saqueErro: 0.15 }),
  'T0+': Object.freeze({ vel: 7.25, reacao: 0.425, erro: 1.7, pulo: 0.05, corta: 0, super: 0, perfeita: 0.025, saqueErro: 0.135 }),
  T1: Object.freeze({ vel: 7.5, reacao: 0.4, erro: 1.6, pulo: 0.1, corta: 0, super: 0, perfeita: 0.05, saqueErro: 0.12 }),
  'T1+': Object.freeze({ vel: 8.0, reacao: 0.32, erro: 1.4, pulo: 0.2, corta: 0.05, super: 0, perfeita: 0.1, saqueErro: 0.1 }),
  T2: Object.freeze({ vel: 9.0, reacao: 0.24, erro: 1.1, pulo: 0.35, corta: 0.15, super: 0.3, perfeita: 0.15, saqueErro: 0.08 }),
  T3: Object.freeze({ vel: 10.0, reacao: 0.16, erro: 0.8, pulo: 0.5, corta: 0.35, super: 0.6, perfeita: 0.25, saqueErro: 0.06 }),
  T4: Object.freeze({ vel: 10.5, reacao: 0.12, erro: 0.65, pulo: 0.55, corta: 0.45, super: 0.75, perfeita: 0.35, saqueErro: 0.045 }),
  T5: Object.freeze({ vel: 11, reacao: 0.08, erro: 0.45, pulo: 0.6, corta: 0.55, super: 0.9, perfeita: 0.5, saqueErro: 0.035 }),
});

/**
 * Forca de cada nivel (a ordem e o meio-termo entre eles): os jogos simulados da chave
 * (src/jogo/torneio.js) e o tom do balbucio (main.js) leem daqui.
 */
export const FORCA_NIVEL = Object.freeze({ T0: 0, 'T0+': 0.5, T1: 1, 'T1+': 2, T2: 3, T3: 4, T4: 5, T5: 6 });

/**
 * O jogador automatico do ?auto e dos prints, nos dois lados do bot contra bot (o npm run
 * calibrar e os hashes do modo demo): o T2 de 2026-10-22 em literal, para a Copa poder mexer nos
 * niveis sem mudar o bot.
 */
export const BOT = Object.freeze({ vel: 9.0, reacao: 0.24, erro: 1.1, pulo: 0.35, corta: 0.2, super: 0.3, perfeita: 0.15, saqueErro: 0.08 });

/**
 * @typedef {Object} Rival
 * @property {string} id
 * @property {number} copa      1..4; 0 = figurante (so preenche a chave, nunca cruza o jogador)
 * @property {keyof typeof NIVEIS} nivel
 * @property {string[]} perso   distraida | lob | rede | mira | super | cacaPowerup
 * @property {string} cor       id da paleta CORES_BASE
 * @property {string} alt       a cor reserva (id da paleta)
 * @property {number[]} pig     o pigmento KM da cor [ciano, magenta, amarelo, preto]
 * @property {string} hex
 * @property {number[]} pigAlt
 * @property {string} hexAlt
 * @property {string} acessorio chapeu | faixa | coroa | oculos | apito | laco | gorro | bone
 * @property {string} [super]   fogo | raio | jornada | meteoro
 * @property {boolean} [chefe]
 */

/** @param {string} id */
const corBase = (id) => CORES_BASE.find((c) => c.id === id) || CORES_BASE[0];

/** @type {readonly Rival[]} */
export const RIVAIS = Object.freeze([
  // Copa 1 (Praia)
  { id: 'gota', copa: 1, nivel: 'T0', perso: ['distraida'], cor: 'azul', alt: 'ciano', acessorio: 'chapeu' },
  { id: 'pingo', copa: 1, nivel: 'T0+', perso: ['lob'], cor: 'limao', alt: 'lilas', acessorio: 'bone' },
  { id: 'geleia', copa: 1, nivel: 'T1', perso: [], cor: 'pink', alt: 'verde', acessorio: 'faixa' },
  { id: 'mingau', copa: 1, nivel: 'T1+', perso: ['rede'], cor: 'creme', alt: 'grafite', acessorio: 'gorro' },
  { id: 'rei', copa: 1, nivel: 'T2', perso: ['mira'], cor: 'roxo', alt: 'verde', acessorio: 'coroa', super: 'fogo', chefe: true },
  // Copa 2
  { id: 'quiabo', copa: 2, nivel: 'T2', perso: [], cor: 'verde', alt: 'rosa', acessorio: 'chapeu' },
  { id: 'bolinha', copa: 2, nivel: 'T2', perso: ['lob'], cor: 'pink', alt: 'ciano', acessorio: 'laco' },
  { id: 'muralha', copa: 2, nivel: 'T2', perso: ['rede'], cor: 'cinza', alt: 'amarelo', acessorio: 'oculos' },
  { id: 'pudim', copa: 2, nivel: 'T3', perso: [], cor: 'marrom', alt: 'menta', acessorio: 'oculos' },
  { id: 'faisca', copa: 2, nivel: 'T3', perso: ['super'], cor: 'amarelo', alt: 'marinho', acessorio: 'apito', super: 'raio', chefe: true },
  // Copa 3
  { id: 'onda', copa: 3, nivel: 'T3', perso: ['lob'], cor: 'azul', alt: 'bege', acessorio: 'bone' },
  { id: 'calma', copa: 3, nivel: 'T3', perso: [], cor: 'menta', alt: 'vinho', acessorio: 'gorro' },
  { id: 'chiclete', copa: 3, nivel: 'T3', perso: ['super'], cor: 'rosa', alt: 'verdeEscuro', acessorio: 'bone', super: 'fogo' },
  { id: 'bolota', copa: 3, nivel: 'T3', perso: ['cacaPowerup'], cor: 'vinho', alt: 'ciano', acessorio: 'chapeu' },
  { id: 'nuvem', copa: 3, nivel: 'T4', perso: ['lob', 'super'], cor: 'branco', alt: 'roxo', acessorio: 'gorro', super: 'jornada', chefe: true },
  // Copa 4
  { id: 'vulcao', copa: 4, nivel: 'T4', perso: ['super'], cor: 'preto', alt: 'limao', acessorio: 'faixa', super: 'fogo' },
  { id: 'trovao', copa: 4, nivel: 'T4', perso: ['super'], cor: 'marinho', alt: 'amarelo', acessorio: 'faixa', super: 'raio' },
  { id: 'cometa', copa: 4, nivel: 'T4', perso: ['mira'], cor: 'ciano', alt: 'vinho', acessorio: 'oculos' },
  { id: 'geleiao', copa: 4, nivel: 'T4', perso: ['rede'], cor: 'verdeEscuro', alt: 'pink', acessorio: 'coroa' },
  { id: 'pimenta', copa: 4, nivel: 'T5', perso: ['super', 'mira'], cor: 'vermelho', alt: 'azul', acessorio: 'chapeu', super: 'fogo', chefe: true },
  // figurantes: completam a chave de 32 (jogos simulados pelo nivel)
  { id: 'xarope', copa: 0, nivel: 'T1', perso: [], cor: 'vinho', alt: 'menta', acessorio: 'laco' },
  { id: 'mel', copa: 0, nivel: 'T1+', perso: [], cor: 'amarelo', alt: 'roxo', acessorio: 'chapeu' },
  { id: 'lama', copa: 0, nivel: 'T2', perso: [], cor: 'marrom', alt: 'ciano', acessorio: 'bone' },
  { id: 'musgo', copa: 0, nivel: 'T2', perso: [], cor: 'verdeEscuro', alt: 'rosa', acessorio: 'gorro' },
  { id: 'piche', copa: 0, nivel: 'T3', perso: [], cor: 'preto', alt: 'amarelo', acessorio: 'oculos' },
  { id: 'amora', copa: 0, nivel: 'T3', perso: [], cor: 'roxo', alt: 'limao', acessorio: 'laco' },
  { id: 'kiwi', copa: 0, nivel: 'T1', perso: [], cor: 'limao', alt: 'marinho', acessorio: 'faixa' },
  { id: 'tapioca', copa: 0, nivel: 'T2', perso: [], cor: 'creme', alt: 'vinho', acessorio: 'chapeu' },
  { id: 'grude', copa: 0, nivel: 'T3', perso: [], cor: 'cinza', alt: 'pink', acessorio: 'apito' },
  { id: 'brejo', copa: 0, nivel: 'T4', perso: [], cor: 'verde', alt: 'roxo', acessorio: 'gorro' },
  { id: 'melado', copa: 0, nivel: 'T1+', perso: [], cor: 'bege', alt: 'azul', acessorio: 'bone' },
].map((r) => {
  const c = corBase(r.cor);
  const a = corBase(r.alt);
  return Object.freeze({ ...r, pig: c.pig, hex: c.hex, pigAlt: a.pig, hexAlt: a.hex });
}));

/** @param {string} id */
export const rival = (id) => RIVAIS.find((r) => r.id === id) || RIVAIS[0];

/** Copas: ginasio e a ordem dos rivais, um por rodada da chave de 32 (o ultimo e o chefe). */
export const COPAS = Object.freeze([
  Object.freeze({ n: 1, ginasio: 'praia', rivais: ['gota', 'pingo', 'geleia', 'mingau', 'rei'] }),
  Object.freeze({ n: 2, ginasio: 'escola', rivais: ['quiabo', 'bolinha', 'muralha', 'pudim', 'faisca'] }),
  Object.freeze({ n: 3, ginasio: 'rua', rivais: ['onda', 'calma', 'chiclete', 'bolota', 'nuvem'] }),
  Object.freeze({ n: 4, ginasio: 'arena', rivais: ['vulcao', 'trovao', 'cometa', 'geleiao', 'pimenta'] }),
]);

/** Abaixo disto (OKLab x100) a cor do rival se confunde com a do jogador e ele veste a reserva. */
export const LIMIAR_COR = 12;

/**
 * A cor do rival nesta partida: a dele, ou a reserva quando a do jogador esta perto demais.
 * @param {Rival} r @param {string} [hexJogador]
 * @returns {{ pig: number[], hex: string }}
 */
export function corDoRival(r, hexJogador) {
  const principal = { pig: r.pig, hex: r.hex };
  if (!hexJogador) return principal;
  const j = linearDeHex(hexJogador);
  const dp = deltaE(linearDeHex(r.hex), j);
  if (dp >= LIMIAR_COR) return principal;
  return deltaE(linearDeHex(r.hexAlt), j) > dp ? { pig: r.pigAlt, hex: r.hexAlt } : principal;
}

/**
 * Alivio por derrota seguida (M2d, 2026-10-22): cada derrota seguida do jogador na fase da Copa
 * deixa a CPU um pouco pior (erro e saqueErro multiplicam, reacao soma, pulo e corta dividem), ate
 * `max` derrotas; nos chefes vale `chefe` disso. A vitoria zera (src/jogo/torneio.js). Nunca troca
 * de nivel: o jogador nao ve o degrau.
 */
export const ALIVIO = Object.freeze({ max: 4, chefe: 0.75, erro: 0.12, reacao: 0.03, pulo: 0.15, corta: 0.25, saqueErro: 0.15 });

/**
 * Elastico (so contra a CPU): funcao continua do placar, limitada, que nunca troca de nivel no meio
 * da partida. `normal` (as partidas a 7 e a 1a da vida) e a de antes do M2d; `curta` (as partidas
 * a 5) comeca antes, porque a 5 a vantagem de 3 ja decidiu. ini: a diferenca em que comeca; passo:
 * quantos pontos ate o teto. `atras`: a CPU muito atras erra menos. Os chefes usam `chefe` disso.
 */
const ELASTICO_NORMAL = Object.freeze({ ini: 3, passo: 2, erro: 0.3, reacao: 0.06, corta: 0.5, pulo: 0, saqueErro: 0, atras: true });
export const ELASTICO = Object.freeze({
  normal: ELASTICO_NORMAL,
  curta: Object.freeze({ ini: 1, passo: 2, erro: 0.45, reacao: 0.09, corta: 0.6, pulo: 0.4, saqueErro: 0.5, atras: false }),
  atras: Object.freeze({ ini: 4, passo: 2, erro: 0.15 }),
  chefe: 0.5,
});

/**
 * Parametros efetivos da IA de um rival nesta partida: o nivel, com o alivio das derrotas seguidas
 * e o elastico do placar.
 * @param {Rival} r
 * @param {{ placarCpu: number, placarHumano: number, alvo?: number, imperdivel?: boolean, derrotas?: number }} ctx
 */
export function paramsIA(r, ctx) {
  const base = { ...NIVEIS[r.nivel] };
  const d = Math.min(ALIVIO.max, Math.max(0, ctx.derrotas | 0)) * (r.chefe ? ALIVIO.chefe : 1);
  if (d > 0) {
    base.erro *= 1 + ALIVIO.erro * d;
    base.reacao += ALIVIO.reacao * d;
    base.pulo *= Math.max(0, 1 - ALIVIO.pulo * d);
    base.corta *= Math.max(0, 1 - ALIVIO.corta * d);
    base.saqueErro *= 1 + ALIVIO.saqueErro * d;
  }
  const E = !ctx.imperdivel && (ctx.alvo || 7) <= 5 ? ELASTICO.curta : ELASTICO.normal;
  const f = r.chefe ? ELASTICO.chefe : 1;
  const dif = ctx.placarCpu - ctx.placarHumano;
  if (dif >= E.ini) {
    const k = Math.min(1, (dif - E.ini + 1) / E.passo) * f;
    base.erro *= 1 + E.erro * k;
    base.reacao += E.reacao * k;
    base.corta *= 1 - E.corta * k;
    if (E.pulo) base.pulo *= 1 - E.pulo * k;
    if (E.saqueErro) base.saqueErro *= 1 + E.saqueErro * k;
  } else if (E.atras && dif <= -ELASTICO.atras.ini) {
    const k = Math.min(1, (-dif - ELASTICO.atras.ini + 1) / ELASTICO.atras.passo) * f;
    base.erro *= 1 - ELASTICO.atras.erro * k;
  }
  return base;
}
