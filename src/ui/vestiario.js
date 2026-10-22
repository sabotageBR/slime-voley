// Vestiario (pedido de 2026-10-22: "customizar meu personagem, customizar a pintura, editar
// pintura, escolher skins prontas, adicionar acessorio"): DOM por cima da cena. A vitrine (a area
// livre, a esquerda ou em cima no retrato) mostra o slime do jogador grande, pelo proprio motor
// da gosma (a cena enquadra o slime nela); o pincel pinta direto nele. O painel tem as abas:
//   Prontas     as skins da trilha, os arquetipos (Gotas) e os personagens do pacote local;
//   Bandeiras   as 195, com busca pelo nome (a bandeira vira a estampa e a selecao da Copa);
//   Cores       cor base (24 pigmentos), padrao (0 a 16) e a cor do padrao;
//   Pintar      pincel (16 cores, 3 tamanhos, borracha, balde, desfazer, limpar);
//   Acessorios  cabeca, rosto e boca.
// Tudo vale na hora (o main.js aplica o visual no slime); o que custa Gotas so entra comprado.
// Teclado: o hud.js navega pelos botoes; o campo de busca recebe as teclas (os controles e o hud
// ignoram eventos de input).

import { desenharMiniSlime } from '../render/vitrine.js';
import { desenharBandeirinha } from '../render/bandeiras.js';
import { CORES_BASE, CORES_2, PADROES, ACESSORIOS, ARQUETIPOS, SKINS_PRONTAS, ENCAIXES, prontasExtras, temItem, precoDe, visualDaSkin, visualDoArquetipo } from '../jogo/visual.js';
import { PAISES } from '../jogo/paises.js';
import { TRILHA } from '../jogo/perfil.js';

const ABAS = ['prontas', 'bandeiras', 'cores', 'pintar', 'acessorios'];
const TAMANHOS = [3, 6, 11];

/**
 * @param {HTMLElement} raiz
 * @param {(k: string) => string} T
 * @param {{
 *   visual: () => any, definir: (v: any) => void, perfil: () => any, comprar: (chave: string) => boolean,
 *   escolherPais: (cod: string) => void, nomePais: (cod: string) => string, pintura: () => HTMLCanvasElement,
 *   pincel: { definir: (p: { cor: string, tam: number, borracha: boolean }) => void, desfazer: () => void, limpar: () => void, balde: () => void },
 *   pintar: (x: number, y: number, fase: 'ini'|'mov'|'fim') => void, aoFechar: () => void, som: (id: string) => void, icone: (ctx: CanvasRenderingContext2D, lado: number) => void,
 * }} cb
 */
export function criarVestiario(raiz, T, cb) {
  raiz.insertAdjacentHTML('beforeend', `
    <div class="vestiario" id="vestiario" hidden>
      <div class="vitrineArea"><div class="dicaPintar" hidden></div></div>
      <div class="painel">
        <div class="vTopo"><b class="vTitulo"></b><span class="vGotas"><canvas width="44" height="44"></canvas><b></b></span><button class="bt principal vPronto"></button></div>
        <div class="vAbas"></div>
        <div class="vConteudo"></div>
        <div class="vAviso" hidden></div>
      </div>
    </div>`);
  const $ = (s) => /** @type {HTMLElement} */ (raiz.querySelector(s));
  const el = {
    raiz: $('#vestiario'), vitrine: $('#vestiario .vitrineArea'), dica: $('#vestiario .dicaPintar'), titulo: $('#vestiario .vTitulo'),
    gotas: $('#vestiario .vGotas b'), icGota: /** @type {HTMLCanvasElement} */ ($('#vestiario .vGotas canvas')),
    pronto: $('#vestiario .vPronto'), abas: $('#vestiario .vAbas'), conteudo: $('#vestiario .vConteudo'), aviso: $('#vestiario .vAviso'),
  };
  let aberto = false;
  let aba = 'prontas';
  let busca = '';
  const pincel = { cor: '#17161c', tam: TAMANHOS[1], borracha: false };
  let tAviso = 0;
  const dpr = () => Math.min(2, window.devicePixelRatio || 1);

  el.pronto.addEventListener('click', () => { cb.som('botao'); fechar(); });
  const g0 = el.icGota.getContext('2d');
  if (g0) cb.icone(g0, 44);

  // pincel na vitrine (so na aba Pintar)
  let pintando = false;
  el.vitrine.addEventListener('pointerdown', (e) => {
    if (!aberto || aba !== 'pintar') return;
    pintando = true;
    try { el.vitrine.setPointerCapture(e.pointerId); } catch { /* ignora */ }
    cb.pintar(e.clientX, e.clientY, 'ini');
  });
  el.vitrine.addEventListener('pointermove', (e) => { if (pintando) cb.pintar(e.clientX, e.clientY, 'mov'); });
  const soltar = (e) => { if (!pintando) return; pintando = false; cb.pintar(e.clientX, e.clientY, 'fim'); };
  el.vitrine.addEventListener('pointerup', soltar);
  el.vitrine.addEventListener('pointercancel', soltar);

  /** Um canvas de miniatura (px CSS w x h) com o desenho fn(ctx, W, H) na resolucao da tela. */
  function mini(w, h, fn, classe = 'mini') {
    const cv = document.createElement('canvas');
    cv.className = classe;
    const k = dpr();
    cv.width = Math.round(w * k);
    cv.height = Math.round(h * k);
    cv.style.width = `${w}px`;
    cv.style.height = `${h}px`;
    const g = cv.getContext('2d');
    if (g) fn(g, cv.width, cv.height);
    return cv;
  }

  function avisar(txt) {
    el.aviso.textContent = txt;
    el.aviso.hidden = false;
    const t = (tAviso = performance.now());
    setTimeout(() => { if (tAviso === t) el.aviso.hidden = true; }, 1800);
  }

  /** Usa (ou compra, se custa) e aplica. */
  function usar(chave, aplicar) {
    const p = cb.perfil();
    if (chave && !temItem(p, chave)) {
      const preco = precoDe(chave) || 0;
      if (p.gotas < preco) { cb.som('botao'); avisar(T('vest.faltam').replace('{n}', String(preco - p.gotas))); return; }
      if (!cb.comprar(chave)) return;
      cb.som('compra');
      avisar(T('vest.comprou'));
    } else cb.som('botao');
    aplicar();
    pintarAba();
  }

  /** Cartao de item: miniatura, nome e o preco (ou o cadeado). */
  function cartao(rotulo, canvas, { sel = false, preco = 0, tem = true, trava = '' } = {}) {
    const b = document.createElement('button');
    b.className = 'bt item' + (sel ? ' sel' : '');
    b.append(canvas);
    const s = document.createElement('span');
    s.textContent = rotulo;
    b.append(s);
    if (trava) { const i = document.createElement('i'); i.className = 'trava'; i.textContent = trava; b.append(i); b.disabled = true; }
    else if (!tem && preco) { const i = document.createElement('i'); i.className = 'preco'; i.textContent = `${preco}`; b.append(i); }
    return b;
  }

  const secao = (titulo) => {
    const h = document.createElement('h3');
    h.textContent = titulo;
    el.conteudo.append(h);
    const d = document.createElement('div');
    d.className = 'grade';
    el.conteudo.append(d);
    return d;
  };

  const miniVisual = (v, w = 76, h = 60) => mini(w, h, (g, W, H) => desenharMiniSlime(g, W, H, v, { pais: cb.perfil().pais, pintura: cb.pintura() }));

  function abaProntas() {
    const p = cb.perfil();
    const atual = cb.visual();
    const g1 = secao(T('vest.skins'));
    for (const s of SKINS_PRONTAS) {
      const nivel = Number(Object.keys(TRILHA).find((n) => TRILHA[n].some((pr) => pr.tipo === 'skin' && pr.id === s.id)) || 0);
      const liberada = p.liberados.skins.includes(s.id);
      const v = visualDaSkin(s.id);
      const b = cartao(T('skin.' + s.id), miniVisual(v), { sel: atual.pronta === s.id, trava: liberada ? '' : `${T('ui.nivel')} ${nivel}` });
      b.addEventListener('click', () => usar('', () => cb.definir({ ...v, cabeca: atual.cabeca, rosto: atual.rosto, boca: atual.boca })));
      g1.append(b);
    }
    const g2 = secao(T('vest.personagens'));
    for (const a of ARQUETIPOS) {
      const chave = 'arq:' + a.id;
      const v = visualDoArquetipo(a.id);
      const b = cartao(T('arq.' + a.id), miniVisual(v), { sel: atual.pronta === a.id, preco: a.preco, tem: temItem(p, chave) });
      b.addEventListener('click', () => usar(chave, () => cb.definir(v)));
      g2.append(b);
    }
    const extras = prontasExtras();
    if (extras.length) {
      const g3 = secao(T('vest.famosos'));
      for (const a of extras) {
        const v = visualDoArquetipo(a.id);
        const b = cartao(a.nome || a.id, miniVisual(v), { sel: atual.pronta === a.id });
        b.addEventListener('click', () => usar('', () => cb.definir(v)));
        g3.append(b);
      }
    }
  }

  function abaBandeiras() {
    const p = cb.perfil();
    const atual = cb.visual();
    const campo = document.createElement('input');
    campo.type = 'search';
    campo.className = 'vBusca';
    campo.placeholder = T('vest.buscar');
    campo.value = busca;
    el.conteudo.append(campo);
    const grade = document.createElement('div');
    grade.className = 'grade bandeiras';
    el.conteudo.append(grade);
    const nomes = PAISES.map((c) => [c, cb.nomePais(c)]).sort((a, b) => a[1].localeCompare(b[1]));
    const sem = cartao(T('vest.semBandeira'), mini(48, 32, (g, W, H) => desenharBandeirinha(g, '', 1, 1, W - 2, H - 2), 'flag'), { sel: atual.estampa !== 'bandeira' });
    sem.addEventListener('click', () => usar('', () => cb.definir({ ...cb.visual(), estampa: cb.visual().estampa === 'bandeira' ? '' : cb.visual().estampa })));
    grade.append(sem);
    const itens = [];
    for (const [cod, nome] of nomes) {
      const b = cartao(nome, mini(48, 32, (g, W, H) => desenharBandeirinha(g, cod, 1, 1, W - 2, H - 2), 'flag'), { sel: atual.estampa === 'bandeira' && p.pais === cod });
      b.dataset.nome = nome.toLowerCase();
      b.addEventListener('click', () => usar('', () => { cb.escolherPais(cod); cb.definir({ ...cb.visual(), estampa: 'bandeira' }); }));
      grade.append(b);
      itens.push(b);
    }
    const filtrar = () => {
      const q = busca.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      for (const b of itens) b.hidden = !!q && !(b.dataset.nome || '').normalize('NFD').replace(/[̀-ͯ]/g, '').includes(q);
    };
    campo.addEventListener('input', () => { busca = campo.value; filtrar(); });
    filtrar();
  }

  function abaCores() {
    const atual = cb.visual();
    const g1 = secao(T('vest.cor'));
    for (const c of CORES_BASE) {
      const b = document.createElement('button');
      b.className = 'bt cor' + (atual.hex === c.hex ? ' sel' : '');
      b.style.background = c.hex;
      b.setAttribute('aria-label', c.id);
      b.addEventListener('click', () => usar('', () => cb.definir({ ...cb.visual(), pig: [...c.pig], hex: c.hex, pronta: '' })));
      g1.append(b);
    }
    const g2 = secao(T('vest.padrao'));
    for (const pd of PADROES) {
      const v = { ...atual, padrao: pd, estampa: '', cabeca: '', rosto: '', boca: '' };
      const b = cartao('', miniVisual(v, 60, 46), { sel: atual.padrao === pd });
      b.classList.add('pequeno');
      b.addEventListener('click', () => usar('', () => cb.definir({ ...cb.visual(), padrao: pd, pronta: '' })));
      g2.append(b);
    }
    const g3 = secao(T('vest.cor2'));
    for (const c of CORES_2) {
      const b = document.createElement('button');
      b.className = 'bt cor' + (atual.cor2 === c ? ' sel' : '');
      b.style.background = c;
      b.addEventListener('click', () => usar('', () => cb.definir({ ...cb.visual(), cor2: c, pronta: '' })));
      g3.append(b);
    }
  }

  function abaPintar() {
    const g1 = secao(T('vest.tinta'));
    for (const c of [...CORES_2, cb.visual().hex]) {
      const b = document.createElement('button');
      b.className = 'bt cor' + (!pincel.borracha && pincel.cor === c ? ' sel' : '');
      b.style.background = c;
      b.addEventListener('click', () => { pincel.cor = c; pincel.borracha = false; cb.pincel.definir(pincel); cb.som('botao'); pintarAba(); });
      g1.append(b);
    }
    const g2 = secao(T('vest.ferramentas'));
    TAMANHOS.forEach((tam, k) => {
      const b = document.createElement('button');
      b.className = 'bt ferr' + (pincel.tam === tam ? ' sel' : '');
      b.innerHTML = `<i style="width:${6 + k * 6}px;height:${6 + k * 6}px"></i>`;
      b.setAttribute('aria-label', String(tam));
      b.addEventListener('click', () => { pincel.tam = tam; cb.pincel.definir(pincel); cb.som('botao'); pintarAba(); });
      g2.append(b);
    });
    const ferr = (rot, fn, sel = false) => {
      const b = document.createElement('button');
      b.className = 'bt ferr texto' + (sel ? ' sel' : '');
      b.textContent = rot;
      b.addEventListener('click', () => { fn(); cb.som('botao'); });
      g2.append(b);
    };
    ferr(T('vest.borracha'), () => { pincel.borracha = !pincel.borracha; cb.pincel.definir(pincel); pintarAba(); }, pincel.borracha);
    ferr(T('vest.balde'), () => cb.pincel.balde());
    ferr(T('vest.desfazer'), () => cb.pincel.desfazer());
    ferr(T('vest.limpar'), () => cb.pincel.limpar());
    cb.pincel.definir(pincel);
  }

  function abaAcessorios() {
    const p = cb.perfil();
    const atual = cb.visual();
    for (const enc of ENCAIXES) {
      const g = secao(T('vest.' + enc));
      const nenhum = cartao(T('vest.nenhum'), miniVisual({ ...atual, [enc]: '' }, 60, 50), { sel: !atual[enc] });
      nenhum.classList.add('pequeno');
      nenhum.addEventListener('click', () => usar('', () => cb.definir({ ...cb.visual(), [enc]: '' })));
      g.append(nenhum);
      for (const a of ACESSORIOS[enc]) {
        const chave = `ac:${enc}:${a.id}`;
        const b = cartao(T('ac.' + a.id), miniVisual({ ...atual, [enc]: a.id }, 60, 50), { sel: atual[enc] === a.id, preco: a.preco, tem: temItem(p, chave) });
        b.classList.add('pequeno');
        b.addEventListener('click', () => usar(chave, () => cb.definir({ ...cb.visual(), [enc]: a.id })));
        g.append(b);
      }
    }
  }

  function pintarAbas() {
    el.abas.replaceChildren(...ABAS.map((id) => {
      const b = document.createElement('button');
      b.className = 'bt aba' + (aba === id ? ' sel' : '');
      b.textContent = T('vest.aba.' + id);
      b.addEventListener('click', () => { aba = id; cb.som('botao'); pintarAba(); });
      return b;
    }));
  }

  function pintarAba() {
    const rolagem = el.conteudo.scrollTop;
    pintarAbas();
    el.conteudo.replaceChildren();
    el.gotas.textContent = String(cb.perfil().gotas);
    el.dica.hidden = aba !== 'pintar';
    el.dica.textContent = T('vest.dicaPintar');
    el.vitrine.classList.toggle('pincel', aba === 'pintar');
    if (aba === 'prontas') abaProntas();
    else if (aba === 'bandeiras') abaBandeiras();
    else if (aba === 'cores') abaCores();
    else if (aba === 'pintar') abaPintar();
    else abaAcessorios();
    el.conteudo.scrollTop = rolagem;
  }

  function fechar() {
    aberto = false;
    el.raiz.hidden = true;
    cb.aoFechar();
  }

  return {
    abrir(abaInicial = 'prontas') {
      aberto = true;
      aba = ABAS.includes(abaInicial) ? abaInicial : 'prontas';
      el.raiz.hidden = false;
      el.titulo.textContent = T('ui.vestiario');
      el.pronto.textContent = T('vest.pronto');
      el.conteudo.scrollTop = 0;
      pintarAba();
      requestAnimationFrame(() => el.pronto.focus());
    },
    fechar,
    /** redesenha as miniaturas (a pintura mudou) */
    atualizar() { if (aberto) pintarAba(); },
    get aberto() { return aberto; },
    get caixa() { return aberto ? el.raiz : null; },
    /** o retangulo da vitrine (px CSS) para a cena enquadrar o slime */
    vitrine() { const r = el.vitrine.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; },
  };
}
