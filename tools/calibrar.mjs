// Calibragem bot contra bot (modo demo): roda N partidas com sementes 1..N e mede o rali (do saque
// batido ao ponto, em s de jogo-real), os motivos dos pontos, as travessias por ponto, a qualidade
// dos saques e a duracao das partidas. Rodar ao mexer na fisica ou na IA e comparar com o marco.
// Uso: node tools/calibrar.mjs [N=30] [--json]
import { criarPartida } from '../src/jogo/partida.js';
import { PASSO } from '../src/fisica/volei.js';

const N = Math.max(1, Number(process.argv.slice(2).find((a) => /^\d+$/.test(a))) || 30);
const json = process.argv.includes('--json');

const ralis = [];
const partidas = [];
const motivos = {};
const saques = {};
let pontos = 0;
let travessias = 0;
let extras = {};

for (let sem = 1; sem <= N; sem++) {
  const p = criarPartida({ modo: 'demo', semente: sem });
  p.interacao();
  let k = 0;
  let tSaque = -1;
  for (; k < 120 * 900 && p.estado !== 'fim'; k++) {
    p.passo();
    const t = k * PASSO;
    for (const e of p.eventos) {
      if (e.tipo === 'saque') { tSaque = t; saques[e.tipoSaque] = (saques[e.tipoSaque] || 0) + 1; }
      else if (e.tipo === 'cruzou') travessias++;
      else if (e.tipo === 'ponto') {
        pontos++;
        motivos[e.motivo] = (motivos[e.motivo] || 0) + 1;
        if (tSaque >= 0) ralis.push(t - tSaque);
        tSaque = -1;
      } else if (e.tipo === 'juiz-bolada') extras.boladas = (extras.boladas || 0) + 1;
    }
    p.eventos.length = 0;
  }
  partidas.push(k * PASSO);
}

const ord = (v) => [...v].sort((a, b) => a - b);
const pct = (v, q) => { const o = ord(v); return o.length ? o[Math.min(o.length - 1, Math.floor(q * o.length))] : 0; };
const fx = (v, d = 1) => v.toFixed(d);
const totalSaques = Object.values(saques).reduce((a, b) => a + b, 0) || 1;
const r = {
  partidas: N,
  pontos,
  rali: { mediana: pct(ralis, 0.5), p90: pct(ralis, 0.9) },
  partida: { mediana: pct(partidas, 0.5) },
  travessiasPorPonto: travessias / Math.max(1, pontos),
  motivos: Object.fromEntries(Object.entries(motivos).map(([k, v]) => [k, v / pontos])),
  saques: Object.fromEntries(Object.entries(saques).map(([k, v]) => [k, v / totalSaques])),
  porPartida: Object.fromEntries(Object.entries(extras).map(([k, v]) => [k, v / N])),
};

if (json) process.stdout.write(JSON.stringify(r, null, 2) + '\n');
else {
  const pc = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${fx(v * 100, 0)}%`).join(', ');
  process.stdout.write([
    `${N} partidas, ${pontos} pontos`,
    `rali: mediana ${fx(r.rali.mediana)} s, p90 ${fx(r.rali.p90)} s`,
    `partida: mediana ${fx(r.partida.mediana / 60, 2)} min`,
    `travessias por ponto: ${fx(r.travessiasPorPonto, 2)}`,
    `pontos: ${pc(r.motivos)}`,
    `saques: ${pc(r.saques)}`,
    ...Object.entries(r.porPartida).map(([k, v]) => `${k} por partida: ${fx(v, 2)}`),
  ].join('\n') + '\n');
}
