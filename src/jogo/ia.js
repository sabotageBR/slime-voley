// IA do Volei de Gosma (CPU, bot do ?auto e humano simulado dos testes).
//
// Plano do toque: onde a bola vai estar na altura do contato (prever(), o mesmo integrador da
// fisica) e onde o centro da cupula tem que estar para a normal mandar a bola para o outro lado
// no angulo pedido. Com a elipse exata: o ponto da cupula com normal n e
// (a^2 nx, b^2 ny) / sqrt(a^2 nx^2 + b^2 ny^2). Pulando, o contato e mais alto e o slime sobe
// (soma na velocidade). So replaneja depois do tempo de reacao; o erro e sorteado por jogada.
// Durante a mira do outro lado, le a reticula (vai para o ponto de queda); no saque, le a sombra.

import { prever, passoBola, pertoCupula, eixos, limitesX, RB, E_SLIME, V_MIN, PULO, G_SLIME, G_BOLA, REDE_H, LARG, SOMA_X, SOMA_Y, PASSO, FREIO, limitar } from '../fisica/volei.js';
import { TOQUES } from './regras.js';

/** Contatos do pulo tentados, s depois de sair do chao (0,2 s: base a 3,24 u, subindo a 9,4 u/s). */
const TEMPOS_PULO = [0.2, 0.12, 0.07];
/** Contato do pulo padrao. */
const T_PULO = 0.2;
const H_PULO = PULO * T_PULO - (G_SLIME * T_PULO * T_PULO) / 2;
const V_PULO = PULO - G_SLIME * T_PULO;

/**
 * @typedef {Object} ContextoIA
 * @property {import('../fisica/volei.js').Bola} bola
 * @property {import('../fisica/volei.js').Slime} eu
 * @property {import('../fisica/volei.js').Slime} outro
 * @property {number} meus        toques do meu lado neste rali
 * @property {string} estado      saque | jogo | ponto | fim | mira
 * @property {boolean} souSacador
 * @property {{ x: number }|null} mira  reticula do outro lado (camera lenta), ou null
 * @property {number} [vento]
 * @property {number} [teto]
 * @property {number} tJogo
 */

/**
 * @param {ReturnType<typeof import('./rivais.js').paramsIA>} p
 * @param {() => number} rng
 * @param {{ perso?: string[] }} [o]
 */
export function criarIA(p, rng, o = {}) {
  const perso = o.perso || [];
  const ia = {
    p,
    t: 0,
    alvo: 0,
    erro: 0,
    vaiPular: false,
    pula: false,
    meu: false,
    tq: 9,
    desvio: 0,
    distraida: 0,
    /** a CPU quer cortar (cortada lenta) nesta jogada */
    corte: false,
    novaJogada: true,
    tPulo: T_PULO,
    lob: false,
    falha: false,
  };

  /** Sorteia o erro e as intencoes da jogada (alguem tocou, ou saque). */
  function sortear(ctx, reage) {
    const v = Math.hypot(ctx.bola.vx, ctx.bola.vy);
    ia.erro = (rng() * 2 - 1) * ia.p.erro * (0.3 + v / 40);
    ia.vaiPular = rng() < ia.p.pulo;
    ia.corte = rng() < (ia.p.corta || 0);
    ia.desvio = (rng() * 2 - 1) * 0.12;
    ia.lob = perso.includes('lob') ? rng() < 0.6 : rng() < 0.2;
    // falha: o erro inteiro vai para a posicao (toque torto); senao o erro so muda onde cai
    ia.falha = rng() < ia.p.erro / 6;
    ia.t = reage ? ia.p.reacao : 0;
  }

  /**
   * Plano do toque: simula, para cada posicao candidata da cupula (passo de 0,1 u), o primeiro
   * contato de verdade ao longo da trajetoria prevista (pertoCupula, o mesmo reflexo da fisica:
   * E_SLIME, V_MIN e a velocidade do slime somada) e a queda depois dele; fica com a que cai mais
   * perto do alvo, passa a rede e da tempo de chegar.
   * @param {ContextoIA} ctx
   */
  function planejar(ctx) {
    const { bola, eu } = ctx;
    const lado = eu.lado;
    const [x0, x1] = limitesX(eu);
    const casa = lado * 7;
    // trajetoria prevista (x, y, vx, vy por passo) ate cair ou passar para o outro lado
    const cam = trajetoria(bola, ctx);
    const fraca = ctx.meus >= 1 && bola.vx * bola.vx + bola.vy * bola.vy < 110;
    const quer = ia.vaiPular || fraca || ia.corte;
    let fundo = 7.5 + ia.desvio * 14 + (ia.falha ? 0 : ia.erro * 1.6);
    if (perso.includes('mira')) fundo = Math.abs(ctx.outro.x) < 6 ? 10 : 4.5;
    const xT = -lado * limitar(fundo, 4, 10.8);
    const pr = cam.n ? cam.x[cam.n - 1] : bola.x;
    const levanta = ctx.meus < 2 && pr * lado > 0 && Math.abs(pr) < 2.4;
    const xLev = lado * 4.2;
    let melhor = { custo: Infinity, xs: casa, t: 9, pula: false, tp: 0 };
    const opcoes = quer ? [[true, 0.2], [true, 0.12], [false, 0]] : [[false, 0]];
    const [a, b] = eixos(eu);
    for (const [pula, tp] of opcoes) {
      const hb = pula ? PULO * tp - (G_SLIME * tp * tp) / 2 : 0;
      const vs = pula ? (PULO - G_SLIME * tp) * SOMA_Y : 0;
      for (let xs = x0; xs <= x1 + 1e-6; xs += 0.1) {
        const c = contatoNaTrajetoria(cam, xs, hb, a, b, lado);
        if (!c) continue;
        // velocidade do slime no contato: parado se chega antes, andando se chega no limite
        const tDisp0 = c.t - Math.max(0, ia.t) - (pula ? tp : 0);
        const dist0 = xs - eu.x;
        const vEst = tDisp0 > 0.05 && Math.abs(dist0) > (tDisp0 - 0.12) * ia.p.vel * 0.85 ? Math.sign(dist0) * Math.min(ia.p.vel, Math.abs(dist0) / Math.max(0.05, tDisp0)) : 0;
        const ux = vEst * SOMA_X;
        // reflexo como na fisica
        let rvx = c.vx - ux;
        let rvy = c.vy - vs;
        const vn = rvx * c.nx + rvy * c.ny;
        if (vn >= 0) continue;
        let vx = rvx - (1 + E_SLIME) * vn * c.nx;
        let vy = rvy - (1 + E_SLIME) * vn * c.ny;
        const sai = vx * c.nx + vy * c.ny;
        if (c.ny > 0.3 && sai < V_MIN) { vx += (V_MIN - sai) * c.nx; vy += (V_MIN - sai) * c.ny; }
        vy += vs;
        vx += ux;
        const q = queda(c.x, c.y, vx, vy, ctx.vento || 0);
        let custo;
        if (levanta) custo = Math.abs(q.x - xLev) + (q.x * lado < 0 ? 40 : 0) + (q.apice < c.y + 2 ? 6 : 0);
        else {
          custo = Math.abs(q.x - xT);
          if (q.x * lado > 0) custo += 40;
          if (q.yRede < REDE_H + RB + 0.25) custo += 50;
          else custo += Math.max(0, REDE_H + RB + 1.0 - q.yRede) * 6;
          if (Math.abs(q.x) > 12) custo += 30;
          if (ia.lob) custo += Math.max(0, 8.5 - q.apice) * 0.8;
        }
        // da tempo de chegar? (o pulo precisa sair tp antes)
        const tDisp = c.t - Math.max(0, ia.t) - (pula ? tp : 0);
        const alc = Math.max(0, tDisp) * ia.p.vel * 0.85 + 0.15;
        const dist = Math.abs(xs - eu.x);
        if (dist > alc) custo += 6 + (dist - alc) * 8;
        if (tDisp < 0) custo += 30;
        if (pula && !quer) custo += 3;
        if (custo < melhor.custo) melhor = { custo, xs, t: c.t, pula, tp, q: q.x, yRede: q.yRede };
      }
    }
    const meu = melhor.custo < Infinity;
    ia.meu = meu;
    ia.plano = melhor;
    ia.tq = melhor.t;
    ia.pula = melhor.pula;
    ia.tPulo = melhor.tp;
    ia.alvo = limitar(meu ? melhor.xs + (ia.falha ? ia.erro : ia.erro * 0.15) : casa * (perso.includes('rede') ? 0.55 : 1), x0, x1);
    // ja deu os 3 toques: sai de baixo da bola (o 4o seria falta)
    if (ctx.meus >= TOQUES && meu) {
      ia.pula = false;
      const fuga = melhor.xs > (x0 + x1) / 2 ? melhor.xs - 5.5 : melhor.xs + 5.5;
      ia.alvo = limitar(fuga, x0, x1);
    }
  }

  /**
   * Intencao deste passo de mundo.
   * @param {ContextoIA} ctx
   * @param {number} dt
   * @returns {{ eixo: number, pulo: boolean }}
   */
  function pensar(ctx, dt) {
    const { eu, bola } = ctx;
    ia.t -= dt;
    ia.tq -= dt;
    if (ia.novaJogada) { sortear(ctx, true); ia.novaJogada = false; }
    if (ia.distraida > 0) {
      ia.distraida -= dt;
      return { eixo: 0, pulo: false };
    }
    if (perso.includes('distraida') && ctx.estado === 'jogo' && bola.x * eu.lado < 0 && rng() < 0.22 * dt) {
      ia.distraida = 0.5 + rng() * 0.5;
      return { eixo: 0, pulo: false };
    }
    // mira do outro lado: vai para baixo da reticula
    if (ctx.mira) {
      const [x0, x1] = limitesX(eu);
      ia.alvo = limitar(ctx.mira.x - eu.lado * 0.6 + ia.erro * 0.5, x0, x1);
      return { eixo: irPara(eu.x, ia.alvo, 11, eu.vx), pulo: false };
    }
    if (ia.t <= 0) {
      ia.t = ia.p.reacao;
      planejar(ctx);
    }
    let pulo = false;
    if (ctx.estado === 'jogo' && ia.meu && ia.pula && ia.tq > 0 && ia.tq < ia.tPulo + 0.02 && Math.abs(eu.x - ia.alvo) < 0.9) pulo = true;
    return { eixo: irPara(eu.x, ia.alvo, 11, eu.vx), pulo };
  }

  return {
    pensar,
    /** alguem tocou (ou saque): nova jogada, replaneja depois da reacao */
    jogada() { ia.novaJogada = true; },
    get estado() { return ia; },
    /** troca os parametros (o elastico do placar: entre pontos, nunca no meio do rali) */
    definirParams(np) { ia.p = np; },
    /** a CPU quer a cortada lenta agora? (no ar, na janela: a partida confere a elegibilidade) */
    querCortar() { return ia.corte; },
    /** sorteia o tempo de segurar o saque */
    segurarSaque() { return rng() < ia.p.saqueSegura ? 0.2 + rng() * 0.6 : 0; },
  };
}

/**
 * Trajetoria prevista da bola (sem slimes), passo a passo, ate cair, sair ou 3 s.
 * @returns {{ n: number, x: Float64Array, y: Float64Array, vx: Float64Array, vy: Float64Array }}
 */
function trajetoria(bola, ctx) {
  const N = 360;
  const cam = TRAJ;
  const b = { ...bola, fundo: [...bola.fundo], colide: [false, false], solta: true };
  const ev = [];
  cam.n = 0;
  for (let k = 0; k < N; k++) {
    ev.length = 0;
    passoBola(b, [], PASSO, { vento: ctx.vento, teto: ctx.teto }, ev);
    cam.x[k] = b.x; cam.y[k] = b.y; cam.vx[k] = b.vx; cam.vy[k] = b.vy;
    cam.n = k + 1;
    if (ev.some((e) => e.tipo === 'chao' || e.tipo === 'fora')) break;
  }
  return cam;
}
const TRAJ = { n: 0, x: new Float64Array(400), y: new Float64Array(400), vx: new Float64Array(400), vy: new Float64Array(400) };

/**
 * Primeiro contato da trajetoria com a cupula parada em (xs, hb): o centro da bola, a normal e
 * a velocidade da bola nesse passo (ou null).
 */
function contatoNaTrajetoria(cam, xs, hb, a, b, lado) {
  const topo = hb + b + RB;
  for (let k = 0; k < cam.n; k++) {
    const x = cam.x[k];
    const y = cam.y[k];
    if (x * lado <= 0 || y > topo + 0.2 || Math.abs(x - xs) > a + RB + 0.2) continue;
    const p = pertoCupula(xs, hb, a, b, x, y);
    if (p.d < RB) return { x, y, vx: cam.vx[k], vy: cam.vy[k], nx: p.nx, ny: p.ny, t: (k + 1) * PASSO };
  }
  return null;
}

/**
 * Onde a bola cai (balistica, com vento), a altura ao cruzar a rede e o apice.
 * @returns {{ x: number, yRede: number, apice: number }}
 */
export function queda(x0, y0, vx, vy, vento) {
  const g = G_BOLA;
  const disc = vy * vy + 2 * g * Math.max(0, y0 - RB);
  const t = (vy + Math.sqrt(disc)) / g;
  const x = x0 + vx * t + 0.5 * vento * t * t;
  let yRede = Infinity;
  if ((x0 < 0) !== (x < 0) && Math.abs(vx) > 1e-3) {
    const tr = -x0 / vx;
    yRede = y0 + vy * tr - (g * tr * tr) / 2;
  }
  const apice = vy > 0 ? y0 + (vy * vy) / (2 * g) : y0;
  return { x, yRede, apice };
}

/**
 * Direcao (unitaria) para a bola sair de (x0, y0) com velocidade V e cair em xT (no chao). A
 * rasante quando passa a rede com folga e nao se quer lob; senao, a alta. Sem alcance: 45 graus.
 */
export function anguloPara(V, x0, y0, xT, lob) {
  const g = G_BOLA;
  const s = Math.sign(xT - x0) || 1;
  const D = Math.abs(xT - x0);
  const dy = RB - y0;
  const disc = V ** 4 - g * (g * D * D + 2 * dy * V * V);
  if (disc < 0 || D < 0.05) return [s * Math.SQRT1_2, Math.SQRT1_2];
  const r = Math.sqrt(disc);
  const baixo = Math.atan((V * V - r) / (g * D));
  const alto = Math.atan((V * V + r) / (g * D));
  const passa = (th) => {
    const dn = Math.abs(x0);
    const vx = V * Math.cos(th);
    if (vx <= 0.01) return false;
    const t = dn / vx;
    return y0 + V * Math.sin(th) * t - (g * t * t) / 2 >= REDE_H + RB + 0.3;
  };
  const th = !lob && passa(baixo) ? baixo : alto;
  return [s * Math.cos(th), Math.sin(th)];
}

/**
 * Eixo (-1..1) para chegar em x: a toda ate a distancia de frenagem (v^2 / 2 FREIO), depois
 * proporcional. Sem vx, so proporcional (deslizes da comemoracao).
 * @param {number} x @param {number} alvo @param {number} [vel] escala (11 = tudo) @param {number} [vx]
 */
export function irPara(x, alvo, vel = 11, vx = 0) {
  const d = alvo - x;
  if (Math.abs(d) < 0.05 && Math.abs(vx) < 0.5) return 0;
  const freio = (vx * vx) / (2 * FREIO) + 0.05;
  if (Math.sign(vx) === Math.sign(d) && Math.abs(d) <= freio) return limitar(d * 1.2, -1, 1) * 0.3 * (vel / 11);
  return limitar(d * 2.5, -1, 1) * (vel / 11);
}

/** Exportado para os testes: o contato do pulo. */
export const PULO_IA = Object.freeze({ t: T_PULO, h: H_PULO, v: V_PULO });

/** A altura da rede mais a bola (usada para saber se uma trajetoria passa). */
export const LIVRE_REDE = REDE_H + RB;
export { LARG };
