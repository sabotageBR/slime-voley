// Dicas do cartao de derrota (M2d, 2026-10-22): a causa de cada ponto perdido e a principal da
// partida (a dica do cartao e a medida derrota/<rival>/<causa>). Puro: a partida conta, o main.js
// traduz (src/i18n/textos.js dica.derrota.<causa>).

/** As causas, na ordem de desempate (a mais ensinavel primeiro). */
export const CAUSAS = Object.freeze(['ace', 'colocada', 'rede', 'erro', 'toques4', 'cortada', 'forte', 'bloqueio', 'fora']);

/**
 * A causa de um ponto para quem o perdeu. Separa o 'ponto' da partida (colocada: a bola de quem
 * ganhou caiu sem o outro tocar; erro: quem perdeu tocou por ultimo e a bola caiu do lado dele) e a
 * 'bomba' (cortada lenta ou bola forte).
 * @param {string} motivo ponto | ace | bomba | bloqueio | fora | rede | toques4
 * @param {{ ultimoDoVencedor: boolean, cortada: boolean }} c
 */
export function causaDoPonto(motivo, c) {
  if (motivo === 'ponto') return c.ultimoDoVencedor ? 'colocada' : 'erro';
  if (motivo === 'bomba') return c.cortada ? 'cortada' : 'forte';
  return CAUSAS.includes(motivo) ? motivo : 'erro';
}

/**
 * A causa mais frequente (empate: a primeira de CAUSAS), ou '' sem pontos perdidos.
 * @param {Record<string, number>} perdas causa -> pontos
 */
export function causaPrincipal(perdas) {
  let melhor = '';
  let n = 0;
  for (const c of CAUSAS) {
    const k = perdas[c] || 0;
    if (k > n) { melhor = c; n = k; }
  }
  return melhor;
}
