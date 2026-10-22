// Parametros de teste na URL. So valem em file://, localhost, 127.0.0.1 e na rede local
// (192.168.x, 10.x e 172.16-31.x: o celular pela Wi-Fi). Na Poki nada disso existe.
// Unico modulo que le a URL (vigiado por test/estilo.test.js).
//   ?semente=123          semente fixa (prints e GIFs reprodutiveis)
//   ?roteiro=cortada      cena pronta: cortada | ponto | ponto-curto | reacao | saque | bolha | gelo | fogo | gosmao | juiz | juiz-<reacao> | fim
//                         (citados no desenho e ainda sem roteiro: jornada | raio | rali8 | onboarding)
//   ?quadro=ms            congela o jogo-real nesse instante do roteiro (prints)
//   ?filme=N&cada=K       grava N quadros (K passos entre eles) em <pre id="filme">
//   ?ginasio=praia ?skin=listrado ?rival=geleia ?nivel=T2
//   ?controle=a|b         esquema de controle no celular (metades | botoes)
//   ?visual=a|b|c         direcao visual do checkpoint M1
//   ?gatilho=novo|segura  gatilho da cortada lenta
//   ?defensor=0.3         escala do defensor na camera lenta; ?lenta=0.06 escala do mundo
//   ?fora=1               liga a regra antiga do fora (por padrao a bola nunca sai: parede de fundo)
//   ?assist=0             desliga as assistencias (ima e devolucao)
//   ?qualidade=0..3 ?render=2d ?lang=pt ?semhud ?semanuncio ?debug ?auto ?primeira
//   ?semblur              o blur nao pausa (o Chrome headless das ferramentas perde o foco sozinho)
//   ?lab                  laboratorio da cortada lenta (sliders ao vivo)
//   ?menu ?chave          abre o menu principal (e a tela da chave) no comeco; ?vestiario=cores abre o vestiario na aba
//   ?copa=2&fase=3        poe a Copa Gosma N na fase F (0 = primeira rodada; grava no save do navegador)
//   ?look=pirata          veste o jogador com um arquetipo (src/jogo/visual.js); ?bandeira=BR a estampa da bandeira
//
// Fora disso, a build de modelos (tools/artifact.mjs) liga window.__voleiModelo = { visual,
// controle, gatilho, ... } antes do main.js: vale fora do loopback e o empacotar apaga o gancho.

export function lerDepuracao() {
  const base = {
    local: false, ganchos: false, modelo: false, debug: false, semente: 0, roteiro: '', quadro: -1, filme: 0, cada: 4,
    ginasio: '', skin: '', rival: '', nivel: '', controle: '', visual: '', gatilho: '', defensor: 0, lenta: 0, fora: false, assist: true,
    qualidade: -1, render: '', lang: '', semHud: false, semAnuncio: false, semBlur: false, auto: false, primeira: null, lab: false,
    menu: false, chave: false, vestiario: '', copa: 0, fase: 0, look: '', bandeira: '',
  };
  let local = false;
  try {
    local = location.protocol === 'file:'
      || /^(127\.0\.0\.1|localhost|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/.test(location.hostname);
  } catch {
    local = false;
  }
  const q = local ? new URLSearchParams(location.search || location.hash.slice(1)) : new URLSearchParams();
  // gancho da build de modelos (Artifact): vale em qualquer host; o empacotar corta a linha "// modelo"
  let mod = null;
  mod = /** @type {any} */ (globalThis).__voleiModelo || null; // modelo
  if (mod && typeof mod === 'object') {
    for (const [k, v] of Object.entries(mod)) if (!q.has(k)) q.set(k, String(v));
  }
  if (!local && !mod) return base;
  const num = (k, d = 0) => (q.has(k) ? Number(q.get(k)) || d : 0);
  return Object.assign(base, {
    local,
    ganchos: true,
    modelo: !!mod,
    debug: q.has('debug'),
    semente: num('semente', 1) >>> 0,
    roteiro: q.get('roteiro') || '',
    quadro: q.has('quadro') ? Math.max(0, Number(q.get('quadro')) || 0) : -1,
    filme: Math.max(0, num('filme') | 0),
    cada: Math.max(1, num('cada', 4) | 0),
    ginasio: q.get('ginasio') || '',
    skin: q.get('skin') || '',
    rival: q.get('rival') || '',
    nivel: q.get('nivel') || '',
    controle: q.get('controle') || '',
    visual: q.get('visual') || '',
    gatilho: q.get('gatilho') || '',
    defensor: Number(q.get('defensor')) || 0,
    lenta: Number(q.get('lenta')) || 0,
    fora: q.get('fora') === '1',
    assist: q.get('assist') !== '0',
    qualidade: q.has('qualidade') ? Math.max(0, Math.min(3, Number(q.get('qualidade')) | 0)) : -1,
    render: q.get('render') || '',
    lang: q.get('lang') || '',
    semHud: q.has('semhud'),
    semAnuncio: q.has('semanuncio'),
    semBlur: q.has('semblur'),
    auto: q.has('auto'),
    primeira: q.has('primeira') ? q.get('primeira') !== '0' : null,
    lab: q.has('lab'),
    menu: q.has('menu'),
    chave: q.has('chave'),
    vestiario: q.has('vestiario') ? q.get('vestiario') || 'prontas' : '',
    copa: Math.max(0, Math.min(4, num('copa') | 0)),
    fase: Math.max(0, num('fase') | 0),
    look: q.get('look') || '',
    bandeira: /^[a-z]{2}$/i.test(q.get('bandeira') || '') ? String(q.get('bandeira')) : '',
  });
}
