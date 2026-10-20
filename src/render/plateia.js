// Plateia de slimes: meias-luas pequenas nas fileiras da arquibancada, cada uma com cor, tamanho
// e fase proprios; repouso (respira), excitacao (pulam mais), onda do lado de quem marcou e
// "ohh" (encolhem). A lotacao (0..1) decide quantos aparecem. Px CSS, desenho em Canvas2D.

import { paraTela } from './camera.js';
import { TINTA } from './fundo.js';

const h = (k) => { const s = Math.sin(k * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const CORES = ['#ff8a2a', '#3fd6c8', '#ffd23a', '#ff8ac0', '#8e4fd8', '#a2e35a', '#3b8cf2', '#ee3b45', '#f6dcae', '#28a55a'];

export function criarPlateia() {
  const st = { exc: 0, onda: { lado: 0, t: 9 }, ohh: 0, t: 0 };
  return {
    /** @param {number} dt */
    passo(dt) {
      st.t += dt;
      st.exc = Math.max(0, st.exc - dt * 0.6);
      st.onda.t += dt;
      st.ohh = Math.max(0, st.ohh - dt * 1.4);
    },
    /** ponto: onda do lado de quem marcou (lado -1/1) */
    festa(lado, forca = 1) { st.exc = Math.min(1.5, st.exc + forca); st.onda = { lado, t: 0 }; },
    /** a CPU marcou: a plateia faz "ohh" */
    lamentar() { st.ohh = 1; },
    /** excita um pouco (rali longo, super) */
    animar(k = 0.3) { st.exc = Math.min(1.5, st.exc + k); },
    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {import('./camera.js').Camera} cam
     * @param {number} dpr @param {number} W
     * @param {{ id: string }} est
     * @param {{ fileiras: number, lotacao: number, alt: number, y0?: number }} o  y0: u do chao da primeira fileira
     */
    desenhar(ctx, cam, dpr, W, est, o) {
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const u = cam.s;
      const yChao = paraTela(cam, 0, 0)[1];
      const tr = est.id === 'c' ? 1 : Math.max(1, Math.min(2.1, u * 0.055));
      const alt = u * o.alt;
      const passo = Math.max(16, u * 1.05);
      const n = Math.ceil(W / passo) + 1;
      for (let f = o.fileiras - 1; f >= 0; f--) {
        const yBase = yChao - alt * f - u * 0.15 - alt * 0.08;
        const r0 = u * (0.42 - f * 0.03);
        for (let i = 0; i < n; i++) {
          const k = i * 13 + f * 101;
          if (h(k + 2) > o.lotacao) continue;
          const x = (i + (f % 2) * 0.5) * passo + (h(k) - 0.5) * passo * 0.35;
          const fase = h(k + 7) * 6.28;
          // onda: passa pela fileira do lado de quem marcou
          let pulo = Math.max(0, Math.sin(st.t * (3 + st.exc * 5) + fase)) * (0.06 + st.exc * 0.28);
          if (st.onda.t < 1.6) {
            const xm = paraTela(cam, 0, 0)[0];
            const lado = st.onda.lado;
            const dist = lado < 0 ? xm - x : x - xm;
            const frente = st.onda.t * W * 0.9;
            if (dist > 0 && Math.abs(dist - frente) < passo * 2.2) pulo += 0.55 * (1 - Math.abs(dist - frente) / (passo * 2.2));
          }
          const enc = 1 - st.ohh * 0.12;
          const r = r0 * (0.85 + h(k + 3) * 0.3);
          const yy = yBase - pulo * u;
          const cor = CORES[(k * 7) % CORES.length];
          ctx.beginPath();
          ctx.ellipse(x, yy, r * (1 + st.ohh * 0.08), r * 0.95 * enc, 0, Math.PI, 0);
          ctx.closePath();
          ctx.fillStyle = cor;
          ctx.fill();
          if (tr) { ctx.lineWidth = tr; ctx.strokeStyle = TINTA; ctx.stroke(); }
          // olhinhos (olham a bola: so desenho, para a quadra)
          const ox = (paraTela(cam, 0, 0)[0] - x) / W * 0.12 * r;
          ctx.fillStyle = TINTA;
          for (const s of [-1, 1]) {
            ctx.beginPath();
            ctx.ellipse(x + s * r * 0.32 + ox, yy - r * 0.42 * enc, r * 0.11, r * 0.15 * (st.ohh > 0.3 ? 0.6 : 1), 0, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      ctx.restore();
    },
    get estado() { return st; },
  };
}
