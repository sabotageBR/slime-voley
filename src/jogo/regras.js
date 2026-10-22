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
  /**
   * o cartao depois da 1a partida da vida avanca sozinho nisto (os outros: ?avanco, 8 s). O Player
   * Fit Test de 2026-10-21 perdeu 47% de quem venceu a 1a partida antes de terminar a 2a.
   */
  avancoPrimeira: 3,
});

/**
 * Saque "levantar e bater" (decisao de 2026-10-21): o 1o toque levanta a bola, um anel fecha ate o
 * instante ideal (a bola comecando a cair) e o 2o toque pula; a batida acontece no contato da
 * cupula com a bola. A qualidade vem do erro de tempo do 2o toque; sem ele a bola volta para a
 * mao, sem falta e sem saque automatico. Distancias em u, tempos em s de mundo; profundidade =
 * |x| do alvo no lado de la.
 */
export const SAQUE = Object.freeze({
  /** a bola parada fica isto acima do topo da cupula */
  folga: 1.7,
  /** quanto a bola sobe no levantamento */
  subida: 5.0,
  /** o 2o toque nao conta neste comeco do levantamento (toque duplo sem querer) */
  ignora: 0.15,
  /** meia janela de cada qualidade em volta do ideal */
  janela: Object.freeze({ perfeito: 0.07, perfeitoPrimeira: 0.12, bom: 0.18 }),
  /** alvo pela mira: para tras = curto, neutro = medio, rumo ao rival = fundo */
  prof: Object.freeze({ curto: 4.5, medio: 8, fundo: 11 }),
  profMin: 3.5,
  profMax: 11.5,
  /** o fraco sai em lob alto e curto */
  profFraco: 6,
  apice: 9.5,
  /** o perfeito (VIAGEM) sobe so isto acima do contato: chapado e rapido */
  subidaViagem: 0.6,
  apiceFraco: 11,
  /** o sacador fica entre estes |x| no proprio lado (na levantada ele anda: zonaLevantada) */
  zona: [6.5, 10],
  zonaLevantada: [6.0, 10.5],
  /** a bola parada fica isto a frente do centro do sacador (rumo a rede) */
  frente: 0.25,
  /**
   * Mira pela posicao (decisao de 2026-10-22: depois do 1o toque o slime anda): a bola a frente
   * do corpo vai funda e chapada, em cima vai media, atras vai curta. desvioMira u alem do
   * `frente` ja e o fundo (ou o curto, para tras).
   */
  desvioMira: 0.9,
  /** a batida precisa da bola ao alcance da cupula: |bola.x - s.x| <= alcanceA * a + alcanceRB * RB */
  alcanceA: 0.95,
  alcanceRB: 0.5,
});

/**
 * Profundidade do saque pela posicao da bola em relacao ao corpo no contato.
 * @param {number} dBola (bola.x - s.x) * -lado: positivo com a bola a frente (rumo a rede)
 */
export function profundidadePorPosicao(dBola) {
  return profundidadeSaque((dBola - SAQUE.frente) / SAQUE.desvioMira);
}

/**
 * Onde o sacador fica para mirar `rumo` (-1 curto .. 1 fundo) com a bola levantada em x0.
 * @param {number} x0 @param {number} lado @param {number} rumo
 */
export function posicaoParaRumo(x0, lado, rumo) {
  return x0 + lado * (SAQUE.frente + Math.max(-1, Math.min(1, rumo)) * SAQUE.desvioMira);
}

/**
 * Tempos do levantamento (s depois do 1o toque): o apice da bola, o 2o toque ideal (o pulo encontra
 * a bola com o slime no alto do pulo), o contato ideal e a volta para a mao.
 * @param {{ g: number, gSlime: number, pulo: number, rb: number }} f gravidades, pulo e raio da bola
 */
export function temposSaque(f) {
  const apice = Math.sqrt((2 * SAQUE.subida) / f.g);
  const hPulo = (f.pulo * f.pulo) / (2 * f.gSlime);
  const queda = Math.max(0.2, SAQUE.folga + SAQUE.subida - hPulo - f.rb);
  const contato = apice + Math.sqrt((2 * queda) / f.g);
  return { vy: f.g * apice, apice, ideal: contato - f.pulo / f.gSlime, contato, pega: 2 * apice };
}

/**
 * Qualidade da batida pelo erro de tempo em relacao ao ideal.
 * @param {number} erro s (negativo = cedo) @param {boolean} [primeira] janela maior na 1a partida
 * @returns {'perfeito'|'bom'|'fraco'}
 */
export function qualidadeSaque(erro, primeira = false) {
  const a = Math.abs(erro);
  if (a <= (primeira ? SAQUE.janela.perfeitoPrimeira : SAQUE.janela.perfeito)) return 'perfeito';
  if (a <= SAQUE.janela.bom) return 'bom';
  return 'fraco';
}

/**
 * Profundidade pela mira.
 * @param {number} rumo -1 (para tras) .. 1 (rumo ao rival)
 */
export function profundidadeSaque(rumo) {
  const { curto, medio, fundo } = SAQUE.prof;
  const e = Math.max(-1, Math.min(1, rumo));
  return e >= 0 ? medio + (fundo - medio) * e : medio + (medio - curto) * e;
}

/**
 * Alvo da partida. curta: a 2a partida da vida (as oitavas da Copa 1) vai a 5 sem vai-a-2, para a
 * passagem do tutorial para o circuito ser curta (retencao, 2026-10-22).
 * @param {{ primeira?: boolean, curta?: boolean, chefe?: boolean, copa?: number, modo?: string, alvo?: number }} o
 * @returns {{ alvo: number, vaiA2: boolean, teto: number, imperdivel: boolean }}
 */
export function alvoDaPartida(o = {}) {
  if (o.primeira) return { alvo: 5, vaiA2: false, teto: 5, imperdivel: true };
  if (o.curta && o.modo !== 'rapida' && o.modo !== 'dois') return { alvo: 5, vaiA2: false, teto: 5, imperdivel: false };
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
