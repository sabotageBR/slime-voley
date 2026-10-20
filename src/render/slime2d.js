// Reserva sem WebGL2 (e enquanto o shader compila): cada slime e a meia elipse da cupula, na
// cor do corpo, com o contorno de tinta e o brilho. Mesmo enquadramento da composicao.

import { aplicar } from './camera.js';
import { TINTA } from './fundo.js';

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ slimes: Array<{ x: number, y: number, a: number, b: number }> }} vista
 * @param {any} m mundo de desenho (cores)
 * @param {import('./camera.js').Camera} cam
 * @param {number} dpr
 * @param {number} traco px CSS
 */
export function desenharSlimes2D(ctx, vista, m, cam, dpr, traco = 2) {
  aplicar(ctx, cam, dpr);
  const tr = Math.max(0.03, traco / cam.s);
  for (let i = 0; i < 2; i++) {
    const v = vista.slimes[i];
    const cor = m.slimes[i].dados.hex || '#ff8a2a';
    ctx.beginPath();
    ctx.ellipse(v.x, v.y, v.a, v.b, 0, 0, Math.PI);
    ctx.closePath();
    ctx.fillStyle = cor;
    ctx.fill();
    ctx.lineWidth = tr * 1.6;
    ctx.strokeStyle = TINTA;
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = v.b * 0.08;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.ellipse(v.x, v.y, v.a * 0.72, v.b * 0.72, 0, Math.PI * 0.62, Math.PI * 0.85);
    ctx.stroke();
  }
}
