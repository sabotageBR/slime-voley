// Rivais do Circuito Gosma: niveis de IA (T0..T5), personalidades e as 4 Copas.
// Os nomes sao chaves de texto (src/i18n/textos.js, rival.<id>); pig e o pigmento KM do corpo
// [ciano, magenta, amarelo, preto].

/**
 * Niveis: velocidade (u/s), reacao (s), erro de posicao (u), chance de pular na bola, de cortar
 * (cortada lenta), de usar o super no saque e de acertar a manchete perfeita; saqueErro e o desvio
 * (s) do tempo da batida no saque "levantar e bater".
 */
export const NIVEIS = Object.freeze({
  T0: Object.freeze({ vel: 7.0, reacao: 0.45, erro: 1.8, pulo: 0, corta: 0, super: 0, perfeita: 0, saqueErro: 0.15 }),
  T1: Object.freeze({ vel: 7.5, reacao: 0.4, erro: 1.6, pulo: 0.1, corta: 0, super: 0, perfeita: 0.05, saqueErro: 0.12 }),
  'T1+': Object.freeze({ vel: 8.0, reacao: 0.32, erro: 1.4, pulo: 0.2, corta: 0.05, super: 0, perfeita: 0.1, saqueErro: 0.1 }),
  T2: Object.freeze({ vel: 9.0, reacao: 0.24, erro: 1.1, pulo: 0.35, corta: 0.15, super: 0.3, perfeita: 0.15, saqueErro: 0.08 }),
  T3: Object.freeze({ vel: 10.0, reacao: 0.16, erro: 0.8, pulo: 0.5, corta: 0.35, super: 0.6, perfeita: 0.25, saqueErro: 0.06 }),
  T4: Object.freeze({ vel: 10.5, reacao: 0.12, erro: 0.65, pulo: 0.55, corta: 0.45, super: 0.75, perfeita: 0.35, saqueErro: 0.045 }),
  T5: Object.freeze({ vel: 11, reacao: 0.08, erro: 0.45, pulo: 0.6, corta: 0.55, super: 0.9, perfeita: 0.5, saqueErro: 0.035 }),
});

/** O jogador automatico do ?auto, dos prints e do humano simulado de base. */
export const BOT = Object.freeze({ ...NIVEIS.T2, corta: 0.2 });

/**
 * @typedef {Object} Rival
 * @property {string} id
 * @property {number} copa
 * @property {keyof typeof NIVEIS} nivel
 * @property {string[]} perso   distraida | lob | rede | mira | super | cacaPowerup
 * @property {number[]} pig
 * @property {string} acessorio chapeu | faixa | coroa | oculos | apito | laco | gorro | boné
 * @property {string} [super]   fogo | raio | jornada | meteoro
 * @property {boolean} [chefe]
 */

/** @type {readonly Rival[]} */
export const RIVAIS = Object.freeze([
  { id: 'gota', copa: 1, nivel: 'T0', perso: ['distraida'], pig: [0.42, 0, 0.04, 0], acessorio: 'chapeu' },
  { id: 'geleia', copa: 1, nivel: 'T1+', perso: [], pig: [0.62, 0.02, 0, 0], acessorio: 'faixa' },
  { id: 'rei', copa: 1, nivel: 'T2', perso: ['mira'], pig: [0.6, 0.38, 0, 0], acessorio: 'coroa', super: 'fogo', chefe: true },
  { id: 'bolinha', copa: 2, nivel: 'T2', perso: ['lob'], pig: [0, 0.45, 0.1, 0], acessorio: 'laco' },
  { id: 'muralha', copa: 2, nivel: 'T2', perso: ['rede'], pig: [0.3, 0.3, 0.3, 0.1], acessorio: 'oculos' },
  { id: 'pudim', copa: 2, nivel: 'T3', perso: [], pig: [0, 0.2, 0.75, 0.05], acessorio: 'oculos' },
  { id: 'faisca', copa: 2, nivel: 'T3', perso: ['super'], pig: [0, 0.05, 0.95, 0], acessorio: 'apito', super: 'raio', chefe: true },
  { id: 'calma', copa: 3, nivel: 'T3', perso: [], pig: [0.35, 0, 0.35, 0], acessorio: 'gorro' },
  { id: 'chiclete', copa: 3, nivel: 'T3', perso: ['super'], pig: [0, 0.6, 0, 0], acessorio: 'bone', super: 'fogo' },
  { id: 'bolota', copa: 3, nivel: 'T3', perso: ['cacaPowerup'], pig: [0, 0.35, 0.6, 0.15], acessorio: 'chapeu' },
  { id: 'nuvem', copa: 3, nivel: 'T4', perso: ['lob', 'super'], pig: [0.15, 0.1, 0, 0], acessorio: 'gorro', super: 'jornada', chefe: true },
  { id: 'trovao', copa: 4, nivel: 'T4', perso: ['super'], pig: [0.75, 0.5, 0, 0.1], acessorio: 'faixa', super: 'raio' },
  { id: 'cometa', copa: 4, nivel: 'T4', perso: ['mira'], pig: [0.1, 0.4, 0, 0], acessorio: 'oculos' },
  { id: 'geleiao', copa: 4, nivel: 'T4', perso: ['rede'], pig: [0.8, 0, 0.5, 0], acessorio: 'coroa' },
  { id: 'pimenta', copa: 4, nivel: 'T5', perso: ['super', 'mira'], pig: [0, 0.85, 0.75, 0], acessorio: 'chapeu', super: 'fogo', chefe: true },
].map((r) => Object.freeze(r)));

/** @param {string} id */
export const rival = (id) => RIVAIS.find((r) => r.id === id) || RIVAIS[0];

/** Copas: ginasio e a ordem dos rivais (o ultimo e o chefe). */
export const COPAS = Object.freeze([
  Object.freeze({ n: 1, ginasio: 'praia', rivais: ['gota', 'geleia', 'rei'] }),
  Object.freeze({ n: 2, ginasio: 'escola', rivais: ['bolinha', 'muralha', 'pudim', 'faisca'] }),
  Object.freeze({ n: 3, ginasio: 'rua', rivais: ['calma', 'chiclete', 'bolota', 'nuvem'] }),
  Object.freeze({ n: 4, ginasio: 'arena', rivais: ['trovao', 'cometa', 'geleiao', 'pimenta'] }),
]);

/**
 * Parametros efetivos da IA de um rival nesta partida: o nivel, com o elastico (funcao continua
 * do placar, nunca troca de nivel no meio) e a protecao da primeira partida.
 * @param {Rival} r
 * @param {{ placarCpu: number, placarHumano: number, partida: number }} ctx
 */
export function paramsIA(r, ctx) {
  const base = { ...NIVEIS[r.nivel] };
  // Geleia na primeira vez: erro x1,4 (T1+ fixo)
  if (r.id === 'geleia' && ctx.partida <= 2) base.erro *= 1.4;
  const dif = ctx.placarCpu - ctx.placarHumano;
  const f = r.chefe ? 0.5 : 1;
  if (dif >= 3) {
    const k = Math.min(1, (dif - 2) / 2) * f;
    base.erro *= 1 + 0.3 * k;
    base.reacao += 0.06 * k;
    base.corta *= 1 - 0.5 * k;
  } else if (dif <= -4) {
    const k = Math.min(1, (-dif - 3) / 2) * f;
    base.erro *= 1 - 0.15 * k;
  }
  return base;
}
