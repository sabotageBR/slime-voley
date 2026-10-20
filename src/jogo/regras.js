// Regras do Volei de Gosma: a tabela UNICA de tempos (o render, a IA e os testes leem daqui),
// o saque ativo, o alvo de cada partida e quem ganha o ponto.

/** Tempos em s (jogo-real, exceto onde diz mundo). */
export const TEMPOS = Object.freeze({
  /** comemoracao: duracao ate o saque valer, quando o controle volta e o deslize do sacador */
  festaCompleta: 1.8,
  festaCurta: 1.0,
  controleCompleta: 1.4,
  controleCurta: 0.5,
  deslizeCompleta: [1.0, 1.3],
  deslizeCurta: [0.3, 0.5],
  hitstopCompleta: 0.09,
  hitstopCurta: 0.06,
  /** a CPU saca de 0,5 a 0,8 s depois do saque valer */
  saqueCpu: [0.5, 0.8],
  /** a bola pulsa e a mao fantasma aparece (o jogo espera sem limite) */
  pulsoSaque: 4,
  /** portao de interacao: sem pointerdown/keydown ha 30 s, todo saque espera um toque */
  portao: 30,
  /** primeira partida da vida: a Gota saca 0,6 s depois do primeiro toque */
  saqueOnboarding: 0.6,
  /** bola parada no ar ou na quina: peteleco */
  bolaPresa: 0.8,
  /** toques do mesmo slime mais perto que isso contam um so (mundo) */
  debounceToque: 0.15,
  /** buffer do pulo e coyote (mundo) */
  bufferPulo: 0.12,
  coyote: 0.07,
  /** o fim da partida: palavra, replay (re-simulado) e o cartao */
  fimPartida: 2.6,
});

/** Saque ativo: tempos do segurar (s) e profundidades (|x| do alvo no lado de la). */
export const SAQUE = Object.freeze({
  toque: 0.15,
  fimCarga: 0.9,
  viagem: [0.55, 0.7],
  vermelho: [0.9, 1.2],
  profToque: 6.5,
  profMin: 3.0,
  profMax: 11.5,
  profViagem: 10.5,
  profVermelho: [12.0, 13.2],
  apice: 9.5,
  apiceViagem: 5.2,
  /** o sacador fica entre estes |x| no proprio lado */
  zona: [6.5, 10],
});

/**
 * Profundidade e tipo do saque pelo tempo segurado.
 * @param {number} t  s segurando (0 = toque rapido)
 * @param {number} copa 1..4 (a Copa 1 nunca sai)
 * @returns {{ prof: number, tipo: 'toque'|'fundo'|'viagem'|'vermelho', auto: boolean }}
 */
export function profundidadeSaque(t, copa = 1) {
  if (t <= SAQUE.toque) return { prof: SAQUE.profToque, tipo: 'toque', auto: false };
  if (t >= SAQUE.viagem[0] && t <= SAQUE.viagem[1]) return { prof: SAQUE.profViagem, tipo: 'viagem', auto: false };
  if (t < SAQUE.fimCarga) {
    const k = (t - SAQUE.toque) / (SAQUE.fimCarga - SAQUE.toque);
    return { prof: SAQUE.profMin + (SAQUE.profMax - SAQUE.profMin) * k, tipo: 'fundo', auto: false };
  }
  if (copa <= 1) return { prof: SAQUE.profMax, tipo: 'fundo', auto: true };
  const k = Math.min(1, (t - SAQUE.vermelho[0]) / (SAQUE.vermelho[1] - SAQUE.vermelho[0]));
  const [p0, p1] = SAQUE.profVermelho;
  return { prof: p0 + (p1 - p0) * k, tipo: 'vermelho', auto: t >= SAQUE.vermelho[1] };
}

/**
 * Alvo da partida.
 * @param {{ primeira?: boolean, chefe?: boolean, copa?: number, modo?: string, alvo?: number }} o
 * @returns {{ alvo: number, vaiA2: boolean, teto: number, imperdivel: boolean }}
 */
export function alvoDaPartida(o = {}) {
  if (o.primeira) return { alvo: 5, vaiA2: false, teto: 5, imperdivel: true };
  if (o.modo === 'rapida' || o.modo === 'dois') { const a = o.alvo || 7; return { alvo: a, vaiA2: false, teto: a, imperdivel: false }; }
  if (o.chefe && (o.copa || 1) >= 2) return { alvo: 9, vaiA2: true, teto: 11, imperdivel: false };
  return { alvo: 7, vaiA2: true, teto: 9, imperdivel: false };
}

/**
 * Alguem venceu? (vai-a-2 ate o teto)
 * @param {number[]} p placar [esquerda, direita]
 * @param {{ alvo: number, vaiA2: boolean, teto: number }} r
 * @returns {-1 | 0 | 1} -1 esquerda venceu, 1 direita, 0 segue
 */
export function vencedor(p, r) {
  for (const [i, lado] of [[0, -1], [1, 1]]) {
    const eu = p[i];
    const ele = p[1 - i];
    if (eu >= r.teto) return /** @type {-1|1} */ (lado);
    if (eu >= r.alvo && (!r.vaiA2 || eu - ele >= 2)) return /** @type {-1|1} */ (lado);
  }
  return 0;
}

/**
 * O proximo ponto fecha a partida para quem esta na frente? (faixa "PONTO DA PARTIDA")
 * @param {number[]} p @param {{ alvo: number, vaiA2: boolean, teto: number }} r
 * @returns {-1 | 0 | 1}
 */
export function pontoDaPartida(p, r) {
  for (const [i, lado] of [[0, -1], [1, 1]]) {
    const q = [...p];
    q[i]++;
    if (vencedor(q, r) === lado) return /** @type {-1|1} */ (lado);
  }
  return 0;
}

/** Toques permitidos de um lado (o 4o e falta). */
export const TOQUES = 3;
