// Calibragem. Sem modo: bot contra bot (modo demo), N partidas com sementes 1..N, medindo o rali (do
// saque batido ao ponto, em s de jogo-real), os motivos dos pontos, as travessias por ponto, a
// qualidade dos saques e a duracao das partidas. Rodar ao mexer na fisica ou na IA e comparar com o
// marco (CLAUDE.md).
//
// Modos do novato simulado (M2d; test/apoio/humano-simulado.js, o jogador humano de mentira):
//   --novato [N=300] --rival=pingo [--curta] [--primeira] [--derrotas=D] [--anjo=A] [--ajuda=0..1]
//       partidas avulsas contra um rival (iterar rapido no ajuste)
//   --copa [N=200] [--max=40] [--cartao=4] [--sem-alivio] [--sem-ajuda] [--ajuda=0..1] [--conferir]
//       N vidas na Copa 1 com as revanches: vitoria por rival na 1a, 2a e 3a tentativa, tentativas
//       por fase, o funil m1..m16, o tempo ate o titulo, como a CPU fez os pontos e os saques do
//       novato pesados pelo funil real da 0.2.0 (o Player Fit Test de 2026-10-22)
//   --m1 [N=1000]   o novato nunca perde a 1a partida da vida (imperdivel)
// Em todos: --h=0.4 fixa o talento; --param=chave:valor,saque.vies:0.1 troca parametros do novato;
// --perfil=desenho e o humano do desenho §2.8 (h = 1, sem espalhamento); --par=8 reparte as
// sementes em worker_threads (o resultado e o mesmo); --json.
//
// Uso: node tools/calibrar.mjs [N=30] [--json]
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { criarPartida } from '../src/jogo/partida.js';
import { PASSO } from '../src/fisica/volei.js';
import { criarNovato, jogarPartida, paramsNovato } from '../test/apoio/humano-simulado.js';
import { jogarCopa } from '../test/apoio/copa-simulada.js';

const argv = isMainThread ? process.argv.slice(2) : workerData.argv;
const flag = (k) => argv.includes('--' + k);
const opt = (k, d) => {
  const a = argv.find((x) => x.startsWith('--' + k + '='));
  return a ? a.slice(k.length + 3) : d;
};
const N0 = Number(argv.find((a) => /^\d+$/.test(a))) || 0;
const json = flag('json');

/** Parametros do novato pela linha de comando (--h, --param, --perfil). */
function paramsDaLinha() {
  /** @type {any} */
  const o = {};
  if (opt('perfil', '') === 'desenho') o.h = 1;
  if (opt('h', '') !== '') o.h = Number(opt('h'));
  for (const par of (opt('param', '') || '').split(',').filter(Boolean)) {
    const [k, v] = par.split(':');
    const n = Number(v);
    const [a, b] = k.split('.');
    if (b) o[a] = { ...(o[a] || {}), [b]: n };
    else o[a] = n;
  }
  return o;
}

// ------------------------------------------------------------------ bot contra bot (o padrao)

function botContraBot(N) {
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
  if (json) return void process.stdout.write(JSON.stringify(r, null, 2) + '\n');
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

// ------------------------------------------------------------------ util

const ord = (v) => [...v].sort((a, b) => a - b);
const pct = (v, q) => { const o = ord(v); return o.length ? o[Math.min(o.length - 1, Math.floor(q * o.length))] : 0; };
const fx = (v, d = 1) => v.toFixed(d);
const pc = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${fx(v * 100, 0)}%`).join(', ');
const pcs = (v) => `${fx(v * 100, 0)}%`;
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
const somar = (a, b) => { for (const [k, v] of Object.entries(b || {})) a[k] = (a[k] || 0) + v; return a; };

/** Roda f(semente) para as sementes, em `par` workers (o resultado volta na ordem das sementes). */
async function repartir(sementes, modo) {
  const par = Math.max(1, Number(opt('par', 1)) | 0);
  if (par === 1) return sementes.map((s) => rodar(modo, s));
  const fatias = Array.from({ length: par }, (_, k) => sementes.filter((_, j) => j % par === k));
  const res = await Promise.all(fatias.map((f) => new Promise((ok, erro) => {
    const w = new Worker(new URL(import.meta.url), { workerData: { argv, modo, sementes: f } });
    w.once('message', ok);
    w.once('error', erro);
  })));
  const porSemente = new Map();
  fatias.forEach((f, k) => f.forEach((s, j) => porSemente.set(s, res[k][j])));
  return sementes.map((s) => porSemente.get(s));
}

/** Uma unidade de trabalho (partida avulsa ou vida inteira). */
function rodar(modo, s) {
  const params = paramsDaLinha();
  if (modo === 'copa') {
    const v = jogarCopa(s, params, { max: Number(opt('max', 40)), semAlivio: flag('sem-alivio'), semAjuda: flag('sem-ajuda'), ajuda: opt('ajuda', '') === '' ? undefined : Number(opt('ajuda')) });
    return { campeao: v.campeao, partidas: v.partidas };
  }
  const rival = modo === 'm1' ? 'gota' : opt('rival', 'pingo');
  const novato = criarNovato(s, params);
  const r = jogarPartida(criarPartida, {
    semente: s, rival, primeira: modo === 'm1' || flag('primeira'), curta: flag('curta'),
    derrotas: Number(opt('derrotas', 0)), anjo: Number(opt('anjo', 0)), ajuda: Number(opt('ajuda', 0)),
    powerups: ['cortadaGratis', 'segmento', 'congelar', 'fogo', 'gosmao', 'puloMola'],
  }, novato);
  return { venceu: r.venceu, acabou: r.acabou, placar: r.placar, t: r.t, anjos: r.anjos, pontosCpu: r.pontosCpu, saques: novato.stats.saques, cortadas: novato.stats.cortadas, bombas: r.resumo.bombas, h: novato.h };
}

/**
 * O funil real da 0.2.0 (Player Fit Test de 2026-10-22): quantas gameplays comecaram cada partida
 * da vida (m2..m16). Pesa as vidas simuladas pelo ponto em que as pessoas param, para comparar os
 * saques "por gameplay" do painel (saque/<q>/humano: % das gameplays com pelo menos um).
 */
const FUNIL_020 = [287, 164, 115, 81, 66, 52, 43, 30, 22, 17, 15, 14, 12, 11, 11];
const SAQUES_020 = { perfeito: 114 / 287, bom: 161 / 287, fraco: 293 / 287 };
/**
 * Quem continua jogando na 0.2.0: 81% comecam a 2a depois da 1a vitoria (287 de 354); depois,
 * cerca de 85% continuam depois de uma vitoria e 52% depois de uma derrota (m3: 164 = 80 x 0,85 +
 * 184 x 0,52). O funil "com desistencia" pesa cada partida simulada pela chance de a pessoa ainda
 * estar jogando, para comparar com o painel (que so ve quem ficou).
 */
const CONTINUA_020 = { primeira: 0.81, vitoria: 0.85, derrota: 0.52 };
/** Vitoria por partida na 0.2.0 (completed / (completed + failed) do painel, m2..m10). */
const VITORIA_020 = [0.30, 0.33, 0.38, 0.39, 0.33, 0.34, 0.25, 0.29, 0.35];

function relatorioCopa(vidas, N) {
  const cartao = Number(opt('cartao', 4));
  const rivais = ['gota', 'pingo', 'geleia', 'mingau', 'rei'];
  const por = Object.fromEntries(rivais.map((r) => [r, { t1: [0, 0], t2: [0, 0], t3: [0, 0], tent: [], dur: [], ate3: 0, chegaram: 0, anjos: 0, partidas: 0, pontos: {} }]));
  const funil = Array.from({ length: 16 }, () => [0, 0]);
  /** com desistencia: [vitorias pesadas, partidas pesadas, peso de quem comecou] */
  const funilD = Array.from({ length: 16 }, () => [0, 0]);
  const ateTitulo = [];
  const tempoTitulo = [];
  let todas3 = 0;
  let deprimeira = 0;
  for (const v of vidas) {
    const tentativas = {};
    let t = 0;
    let ok3 = true;
    let w = 1;
    for (const p of v.partidas) {
      if (p.n <= 16) { funilD[p.n - 1][1] += w; if (p.venceu) funilD[p.n - 1][0] += w; }
      w *= p.n === 1 ? CONTINUA_020.primeira : p.venceu ? CONTINUA_020.vitoria : CONTINUA_020.derrota;
      const R = por[p.rival];
      R.partidas++;
      R.dur.push(p.t);
      R.anjos += p.anjos;
      somar(R.pontos, p.pontosCpu);
      tentativas[p.rival] = p.tentativa;
      for (const [k, key] of [[1, 't1'], [2, 't2'], [3, 't3']]) if (p.tentativa === k) { R[key][1]++; if (p.venceu) R[key][0]++; }
      if (p.n <= 16) { funil[p.n - 1][1]++; if (p.venceu) funil[p.n - 1][0]++; }
      t += p.t + (p.n === 1 ? 4.5 : cartao + 1);
    }
    for (const r of rivais) {
      if (!tentativas[r]) continue;
      const venceu = v.partidas.some((p) => p.rival === r && p.venceu);
      por[r].chegaram++;
      por[r].tent.push(venceu ? tentativas[r] : 99);
      if (venceu && tentativas[r] <= 3) por[r].ate3++;
      else ok3 = false;
    }
    if (v.campeao) {
      ateTitulo.push(v.partidas.length);
      tempoTitulo.push(t);
      if (ok3) todas3++;
      if (v.partidas.length === 5) deprimeira++;
    }
  }
  // saques pesados pelo funil: a gameplay que parou na partida k teve os saques de m2..mk
  const pesos = FUNIL_020.map((n, k) => n - (FUNIL_020[k + 1] || 0));
  const totalPeso = pesos.reduce((a, b) => a + b, 0);
  const comPeloMenos = { perfeito: 0, bom: 0, fraco: 0 };
  const porSaque = {};
  for (const v of vidas) {
    for (const q of Object.keys(comPeloMenos)) {
      let acum = 0;
      for (let k = 0; k < pesos.length; k++) {
        const ps = v.partidas.slice(1, k + 2);
        if (ps.length < k + 1) break;
        if (ps.some((p) => p.saques[q] > 0)) acum += pesos[k];
      }
      comPeloMenos[q] += acum / totalPeso / vidas.length;
    }
    for (const p of v.partidas.slice(1)) somar(porSaque, p.saques);
  }
  const tps = Object.values(porSaque).reduce((a, b) => a + b, 0) || 1;
  const metas = [];
  const linha = (r) => {
    const R = por[r];
    const f = (a) => (a[1] ? `${pcs(a[0] / a[1])} (${a[1]})` : '-');
    const tents = R.tent.filter((x) => x < 99);
    const pontos = Object.values(R.pontos).reduce((a, b) => a + b, 0) || 1;
    return `${r.padEnd(7)} ${f(R.t1).padEnd(11)} ${f(R.t2).padEnd(11)} ${f(R.t3).padEnd(11)} ${tents.length ? `${pct(tents, 0.5)}/${pct(tents, 0.9)}/${Math.max(...tents)}` : '-'}`.padEnd(62)
      + ` ${R.chegaram ? pcs(R.ate3 / R.chegaram) : '-'}`.padEnd(7) + ` ${mmss(pct(R.dur, 0.5))}  anjos/p ${fx(R.anjos / Math.max(1, R.partidas), 2)}  CPU: ${pc(Object.fromEntries(Object.entries(R.pontos).map(([k, x]) => [k, x / pontos])))}`;
  };
  const out = {
    N,
    porRival: Object.fromEntries(rivais.map((r) => [r, { t1: por[r].t1[1] ? por[r].t1[0] / por[r].t1[1] : null, ate3: por[r].chegaram ? por[r].ate3 / por[r].chegaram : null, anjos: por[r].anjos / Math.max(1, por[r].partidas) }])),
    funil: funil.map(([v, n]) => (n ? v / n : null)),
    funilDesistencia: funilD.map(([v, n]) => (n ? v / n : null)),
    comecaram: funilD.map(([, n]) => n / N),
    campeao: vidas.filter((v) => v.campeao).length / N,
    todas3: todas3 / N,
    deprimeira: deprimeira / N,
    ateTitulo: { mediana: pct(ateTitulo, 0.5), p90: pct(ateTitulo, 0.9) },
    tempoTitulo: { mediana: pct(tempoTitulo, 0.5), p90: pct(tempoTitulo, 0.9) },
    saquesPorGameplay: comPeloMenos,
    saquesPorSaque: Object.fromEntries(Object.entries(porSaque).map(([k, x]) => [k, x / tps])),
    params: paramsDaLinha(),
  };
  if (flag('conferir')) {
    const m = (ok, txt) => metas.push(`${ok ? 'ok ' : 'FALHA'} ${txt}`);
    const t1 = out.porRival;
    m(t1.gota.t1 === 1, `gota 100% (${pcs(t1.gota.t1 ?? 0)})`);
    m((t1.pingo.t1 ?? 0) >= 0.7, `pingo >= 70% na 1a (${pcs(t1.pingo.t1 ?? 0)})`);
    for (const [r, alvo] of [['geleia', 0.6], ['mingau', 0.55], ['rei', 0.45]]) m(Math.abs((t1[r].t1 ?? 0) - alvo) <= 0.08, `${r} ~${pcs(alvo)} na 1a (${pcs(t1[r].t1 ?? 0)})`);
    for (const r of rivais) m((t1[r].ate3 ?? 0) >= 0.9, `${r}: 90% em ate 3 tentativas (${pcs(t1[r].ate3 ?? 0)})`);
    m(t1.pingo.anjos <= 0.5, `pingo: ate 0,5 anjo por partida (${fx(t1.pingo.anjos, 2)})`);
  }
  if (json) process.stdout.write(JSON.stringify(out, null, 2) + '\n');
  else {
    process.stdout.write([
      `Copa 1, novato ${JSON.stringify(out.params)}: ${N} vidas, ${vidas.reduce((a, v) => a + v.partidas.length, 0)} partidas${flag('sem-alivio') ? ', sem alivio' : ''}${flag('sem-ajuda') ? ', sem anjo' : ''}`,
      `rival   1a tent.    2a          3a          tentativas med/p90/max      <=3    duracao`,
      ...rivais.map(linha),
      `campeao ${pcs(out.campeao)} | todas as fases em <=3: ${pcs(out.todas3)} | 5 em 5: ${pcs(out.deprimeira)}`,
      `ate o titulo: ${out.ateTitulo.mediana} partidas (p90 ${out.ateTitulo.p90}), ${mmss(out.tempoTitulo.mediana)} (p90 ${mmss(out.tempoTitulo.p90)}; cartoes de ${cartao} s, sem anuncios)`,
      `funil (vitorias/partidas): ${out.funil.map((x, k) => `m${k + 1} ${x === null ? '-' : pcs(x)}`).join(' ')}`,
      `com desistencia (0.2.0): ${out.funilDesistencia.slice(1, 10).map((x, k) => `m${k + 2} ${x === null ? '-' : pcs(x)}`).join(' ')} | real ${VITORIA_020.map((x, k) => `m${k + 2} ${pcs(x)}`).join(' ')}`,
      `comecam (por 100 que vencem a m1, com desistencia): ${out.comecaram.slice(1, 10).map((x, k) => `m${k + 2} ${fx((x * 100) / CONTINUA_020.primeira * CONTINUA_020.primeira, 0)}`).join(' ')}`,
      `saques do novato (m2+): por saque ${pc(out.saquesPorSaque)}; por gameplay (pesado pelo funil 0.2.0) perfeito ${pcs(comPeloMenos.perfeito)} bom ${pcs(comPeloMenos.bom)} fraco ${pcs(comPeloMenos.fraco)} | real 0.2.0: ${pcs(SAQUES_020.perfeito)} / ${pcs(SAQUES_020.bom)} / ${pcs(SAQUES_020.fraco)}`,
      ...metas,
    ].join('\n') + '\n');
  }
  if (flag('conferir') && metas.some((m) => m.startsWith('FALHA'))) process.exitCode = 1;
}

if (!isMainThread) {
  parentPort.postMessage(workerData.sementes.map((s) => rodar(workerData.modo, s)));
} else if (flag('novato') || flag('m1')) {
  const modo = flag('m1') ? 'm1' : 'novato';
  const N = N0 || (modo === 'm1' ? 1000 : 300);
  const rs = await repartir(Array.from({ length: N }, (_, k) => k + 1), modo);
  const v = rs.filter((r) => r.venceu).length;
  const sq = rs.reduce((a, r) => somar(a, r.saques), {});
  const tsq = Object.values(sq).reduce((a, b) => a + b, 0) || 1;
  const pts = rs.reduce((a, r) => somar(a, r.pontosCpu), {});
  const tpts = Object.values(pts).reduce((a, b) => a + b, 0) || 1;
  const out = {
    modo, rival: modo === 'm1' ? 'gota' : opt('rival', 'pingo'), N, vitoria: v / N, naoAcabou: rs.filter((r) => !r.acabou).length,
    duracao: { mediana: pct(rs.map((r) => r.t), 0.5), p90: pct(rs.map((r) => r.t), 0.9) },
    anjosPorPartida: rs.reduce((a, r) => a + r.anjos, 0) / N,
    cortadasPorPartida: rs.reduce((a, r) => a + r.cortadas, 0) / N,
    bombasPorPartida: rs.reduce((a, r) => a + r.bombas, 0) / N,
    saques: Object.fromEntries(Object.entries(sq).map(([k, x]) => [k, x / tsq])),
    pontosCpu: Object.fromEntries(Object.entries(pts).map(([k, x]) => [k, x / tpts])),
    params: paramsDaLinha(),
  };
  if (json) process.stdout.write(JSON.stringify(out, null, 2) + '\n');
  else {
    process.stdout.write([
      `${modo === 'm1' ? 'm1 (Gota, imperdivel)' : out.rival + (flag('curta') ? ' (curta, a 5)' : '')}: ${N} partidas, novato ${JSON.stringify(out.params)}`,
      `vitoria ${pcs(out.vitoria)}${out.naoAcabou ? ` (${out.naoAcabou} sem fim)` : ''} | duracao med ${mmss(out.duracao.mediana)} p90 ${mmss(out.duracao.p90)}`,
      `anjos/partida ${fx(out.anjosPorPartida, 2)} | cortadas do novato/partida ${fx(out.cortadasPorPartida, 2)}, bombas ${fx(out.bombasPorPartida, 2)}`,
      `saques do novato: ${pc(out.saques)}`,
      `pontos da CPU: ${pc(out.pontosCpu)}`,
    ].join('\n') + '\n');
  }
} else if (flag('copa')) {
  const N = N0 || 200;
  const vidas = await repartir(Array.from({ length: N }, (_, k) => k + 1), 'copa');
  relatorioCopa(vidas, N);
} else {
  botContraBot(N0 || 30);
}

export { paramsNovato };
