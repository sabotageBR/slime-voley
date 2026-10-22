// Laboratorio da Cortada Camera Lenta (checkpoint M1, ?lab): sliders que mexem nos parametros
// ao vivo (src/jogo/cortada.js CORTADA), "Repetir" (a cena pronta da mira) e "Copiar ajuste"
// (JSON para colar de volta no CORTADA). So existe na build de modelos e no loopback.

import { CORTADA } from '../jogo/cortada.js';

const CAMPOS = [
  ['escalaMundo', 'Mundo na mira (‰)', 20, 200, 5],
  ['escalaDefensor', 'Defensor (‰)', 60, 600, 10],
  ['entrada', 'Entrada (s)', 0, 0.2, 0.01],
  ['saida', 'Saída (s)', 0, 0.15, 0.01],
  ['hitstop', 'Hitstop (s)', 0, 0.15, 0.005],
  ['tMira', 'Mira máx. (s)', 0.5, 3, 0.1],
  ['pushIn', 'Push-in', 1, 1.12, 0.005],
  ['coroa.r1', 'Coroa raio (u)', 1, 4.5, 0.1],
  ['coroa.dur', 'Coroa (s)', 0.1, 0.6, 0.01],
  ['rastro.vida', 'Rastro (s)', 0.08, 0.6, 0.01],
];

/**
 * @param {HTMLElement} raiz
 * @param {{ repetir: () => void, gatilho: () => string, definirGatilho: (g: string) => void }} cb
 */
export function criarLab(raiz, cb) {
  const ler = (k) => k.split('.').reduce((o, p) => o[p], CORTADA);
  const gravar = (k, v) => { const ps = k.split('.'); const ult = ps.pop(); ps.reduce((o, p) => o[p], CORTADA)[ult] = v; };
  const painel = document.createElement('div');
  painel.className = 'lab';
  painel.innerHTML = `<div class="labTopo"><b>Laboratório da cortada</b><button class="bt principal labRep2">Repetir</button><button class="labFechar" aria-label="fechar">–</button></div>
    <div class="labCorpo">${CAMPOS.map(([k, nome, a, b, p]) => `<label>${nome}<input type="range" data-k="${k}" min="${a}" max="${b}" step="${p}"><output></output></label>`).join('')}
    <label>Gatilho <select data-g><option value="novo">pressão nova no ar</option><option value="segura">segurar contínuo</option></select></label>
    <div class="labBotoes"><button class="bt principal labRep">Repetir</button><button class="bt labCopiar">Copiar ajuste</button></div>
    <textarea class="labJson" readonly rows="4"></textarea></div>`;
  raiz.appendChild(painel);
  const json = /** @type {HTMLTextAreaElement} */ (painel.querySelector('.labJson'));
  const atualizarJson = () => {
    const o = {};
    for (const [k] of CAMPOS) o[k] = ler(k);
    o.gatilho = cb.gatilho();
    json.value = JSON.stringify(o);
  };
  for (const inp of /** @type {NodeListOf<HTMLInputElement>} */ (painel.querySelectorAll('input[type=range]'))) {
    const k = inp.dataset.k;
    inp.value = String(ler(k));
    const out = /** @type {HTMLOutputElement} */ (inp.nextElementSibling);
    out.value = String(ler(k));
    inp.addEventListener('input', () => { gravar(k, Number(inp.value)); out.value = inp.value; atualizarJson(); });
  }
  const sel = /** @type {HTMLSelectElement} */ (painel.querySelector('select[data-g]'));
  sel.value = cb.gatilho();
  sel.addEventListener('change', () => { cb.definirGatilho(sel.value); atualizarJson(); });
  painel.querySelector('.labRep').addEventListener('click', () => cb.repetir());
  painel.querySelector('.labRep2').addEventListener('click', () => cb.repetir());
  if (window.innerHeight < 520) painel.classList.add('fechado');
  painel.querySelector('.labCopiar').addEventListener('click', async () => {
    atualizarJson();
    json.select();
    try { await navigator.clipboard.writeText(json.value); } catch { try { document.execCommand('copy'); } catch { /* ignora */ } }
  });
  painel.querySelector('.labFechar').addEventListener('click', () => painel.classList.toggle('fechado'));
  atualizarJson();
  return { painel };
}
