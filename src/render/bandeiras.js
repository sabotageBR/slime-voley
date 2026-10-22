// Bandeiras dos 195 paises (src/jogo/paises.js), desenhadas em codigo por uma mini-linguagem de
// primitivas. Coordenadas normalizadas no retangulo da bandeira (x de 0 a 1 na largura, y de 0 a 1
// na altura, y para baixo); raios e espessuras em fracao da ALTURA (o circulo fica redondo em
// qualquer proporcao). Brasoes, escritas e animais viram formas simples e respeitosas (escudo,
// disco, silhueta): na Copa e no slime a bandeira mede de 20 a 120 px.
//
//   ['f', cor]                         fundo
//   ['h', [cores], [pesos]?]           faixas horizontais        ['v', [cores], [pesos]?] verticais
//   ['r', cor, x, y, w, h]             retangulo                 ['p', cor, [x, y, ...]] poligono
//   ['c', cor, x, y, r]                disco                     ['o', cor, x, y, r, e]  anel
//   ['e', cor, x, y, r, pontas?, giro?] estrela (giro em voltas)  ['l', cor, x, y, r, dx, r2, dy?] meia-lua
//   ['t', cor, w, y0?, y1?]            triangulo da tralha       ['x', cor, e] diagonais (aspa)
//   ['+', cor, x, y, e]                cruz (barras em x e em y)  ['d', cor, e, dir] faixa diagonal
//   ['uk', x, y, w, h]                 a bandeira do Reino Unido num retangulo
//   ['sol', cor, x, y, r, raios]       sol com raios             ['es', cor, x, y, w, h] escudo
//   ['dav', cor, x, y, r, e]           estrela de seis pontas vazada
//   ['serra', cor, x, n, fundo]        faixa serrilhada na tralha (Bahrein, Catar)
//   ['raios', [cores]]                 leque de faixas do canto de baixo (Seicheles)
//   ['folha', cor, x, y, s]            folha de bordo (Canada)

const AZ = '#0b3d91';
const VM = '#d21034';
const VD = '#009a44';
const AM = '#fcd116';
const BR = '#ffffff';
const PR = '#000000';

/** @type {Readonly<Record<string, any[]>>} */
export const BANDEIRAS = Object.freeze({
  AF: [['v', [PR, '#be0000', '#007a36']], ['c', BR, 0.5, 0.5, 0.18], ['c', '#be0000', 0.5, 0.5, 0.11]],
  AL: [['f', '#e41e20'], ['p', PR, [0.5, 0.2, 0.62, 0.32, 0.72, 0.28, 0.66, 0.5, 0.58, 0.56, 0.56, 0.8, 0.5, 0.7, 0.44, 0.8, 0.42, 0.56, 0.34, 0.5, 0.28, 0.28, 0.38, 0.32]]],
  DZ: [['v', ['#006233', BR]], ['l', VM, 0.5, 0.5, 0.25, 0.06, 0.2], ['e', VM, 0.56, 0.5, 0.11, 5, 0.05]],
  AD: [['v', ['#10069f', '#fedf00', VM], [1, 1.1, 1]], ['es', '#c8a24a', 0.5, 0.5, 0.2, 0.34]],
  AO: [['h', ['#cc092f', PR]], ['o', '#ffcb00', 0.5, 0.5, 0.2, 0.05], ['e', '#ffcb00', 0.45, 0.42, 0.08]],
  AG: [['f', '#ce1126'], ['p', PR, [0, 0, 1, 0, 0.5, 1]], ['sol', '#fcd116', 0.5, 0.36, 0.12, 12], ['p', '#0072c6', [0.27, 0.46, 0.73, 0.46, 0.67, 0.62, 0.33, 0.62]], ['p', BR, [0.33, 0.62, 0.67, 0.62, 0.5, 1]]],
  AR: [['h', ['#74acdf', BR, '#74acdf']], ['sol', '#f6b40e', 0.5, 0.5, 0.09, 16]],
  AM: [['h', ['#d90012', '#0033a0', '#f2a800']]],
  AU: [['f', '#012169'], ['uk', 0, 0, 0.5, 0.5], ['e', BR, 0.25, 0.75, 0.13, 7], ['e', BR, 0.75, 0.2, 0.06, 7], ['e', BR, 0.63, 0.48, 0.06, 7], ['e', BR, 0.88, 0.42, 0.06, 7], ['e', BR, 0.75, 0.82, 0.06, 7], ['e', BR, 0.82, 0.58, 0.035, 5]],
  AT: [['h', ['#ed2939', BR, '#ed2939']]],
  AZ: [['h', ['#0092bc', '#e4002b', '#00af66']], ['l', BR, 0.48, 0.5, 0.15, 0.04, 0.12], ['e', BR, 0.55, 0.5, 0.06, 8]],
  BS: [['h', ['#00778b', '#ffc72c', '#00778b']], ['t', PR, 0.42]],
  BH: [['f', '#ce1126'], ['serra', BR, 0.25, 5, '#ce1126']],
  BD: [['f', '#006a4e'], ['c', '#f42a41', 0.45, 0.5, 0.3]],
  BB: [['v', ['#00267f', '#ffc726', '#00267f']], ['p', PR, [0.5, 0.25, 0.53, 0.45, 0.6, 0.3, 0.58, 0.55, 0.52, 0.55, 0.52, 0.78, 0.48, 0.78, 0.48, 0.55, 0.42, 0.55, 0.4, 0.3, 0.47, 0.45]]],
  BY: [['h', ['#c8313e', '#4aa657'], [2, 1]], ['r', BR, 0, 0, 0.12, 1], ['p', '#c8313e', [0.06, 0.1, 0.1, 0.2, 0.06, 0.3, 0.02, 0.2]], ['p', '#c8313e', [0.06, 0.4, 0.1, 0.5, 0.06, 0.6, 0.02, 0.5]], ['p', '#c8313e', [0.06, 0.7, 0.1, 0.8, 0.06, 0.9, 0.02, 0.8]]],
  BE: [['v', [PR, '#fdda24', '#ef3340']]],
  BZ: [['f', '#003f87'], ['r', '#ce1126', 0, 0, 1, 0.1], ['r', '#ce1126', 0, 0.9, 1, 0.1], ['c', BR, 0.5, 0.5, 0.3], ['o', '#2e7d32', 0.5, 0.5, 0.26, 0.05], ['es', '#8d6e63', 0.5, 0.5, 0.12, 0.2]],
  BJ: [['h', ['#fcd116', '#e8112d']], ['r', '#008751', 0, 0, 0.4, 1]],
  BT: [['p', '#ffd520', [0, 0, 1, 0, 0, 1]], ['p', '#ff4e12', [1, 0, 1, 1, 0, 1]], ['p', BR, [0.2, 0.62, 0.32, 0.42, 0.5, 0.48, 0.62, 0.32, 0.8, 0.38, 0.7, 0.52, 0.52, 0.6, 0.38, 0.7]]],
  BO: [['h', ['#d52b1e', '#f9e300', '#007934']]],
  BA: [['f', '#002395'], ['p', '#fecb00', [0.27, 0, 0.73, 0, 0.73, 1]], ...[0, 1, 2, 3, 4, 5, 6, 7, 8].map((k) => ['e', BR, 0.2 + k * 0.058, 0.04 + k * 0.115, 0.045])],
  BW: [['f', '#6da9d2'], ['r', BR, 0, 0.38, 1, 0.24], ['r', PR, 0, 0.42, 1, 0.16]],
  BR: [['f', '#009c3b'], ['p', '#ffdf00', [0.08, 0.5, 0.5, 0.1, 0.92, 0.5, 0.5, 0.9]], ['c', '#002776', 0.5, 0.5, 0.26], ['arc', BR, 0.4, 1.1, 0.62, 0.05], ['e', BR, 0.43, 0.6, 0.025], ['e', BR, 0.55, 0.65, 0.025], ['e', BR, 0.5, 0.42, 0.02]],
  BN: [['f', '#f7e017'], ['p', BR, [0, 0.18, 1, 0.58, 1, 0.78, 0, 0.38]], ['p', PR, [0, 0.38, 1, 0.78, 1, 0.92, 0, 0.52]], ['c', '#cf1126', 0.5, 0.5, 0.18], ['l', '#f7e017', 0.5, 0.52, 0.13, 0, 0.11, -0.05]],
  BG: [['h', [BR, '#00966e', '#d62612']]],
  BF: [['h', ['#ef2b2d', '#009e49']], ['e', '#fcd116', 0.5, 0.5, 0.17]],
  BI: [['f', '#ce1126'], ['p', '#1eb53a', [0, 0, 0.5, 0.5, 0, 1]], ['p', '#1eb53a', [1, 0, 0.5, 0.5, 1, 1]], ['x', BR, 0.13], ['c', BR, 0.5, 0.5, 0.25], ['e', '#ce1126', 0.5, 0.38, 0.07, 6], ['e', '#ce1126', 0.43, 0.58, 0.07, 6], ['e', '#ce1126', 0.57, 0.58, 0.07, 6]],
  CV: [['f', '#003893'], ['r', BR, 0, 0.5, 1, 0.25], ['r', '#cf2027', 0, 0.58, 1, 0.09], ...[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => ['e', '#f7d116', 0.38 + Math.cos((k * Math.PI) / 5) * 0.2, 0.62 + Math.sin((k * Math.PI) / 5) * 0.3, 0.04])],
  KH: [['h', ['#032ea1', '#e00025', '#032ea1'], [1, 2, 1]], ['p', BR, [0.32, 0.66, 0.68, 0.66, 0.64, 0.56, 0.6, 0.56, 0.58, 0.42, 0.55, 0.42, 0.5, 0.3, 0.45, 0.42, 0.42, 0.42, 0.4, 0.56, 0.36, 0.56]]],
  CM: [['v', ['#007a5e', '#ce1126', '#fcd116']], ['e', '#fcd116', 0.5, 0.5, 0.14]],
  CA: [['v', ['#d52b1e', BR, '#d52b1e'], [1, 2, 1]], ['folha', '#d52b1e', 0.5, 0.52, 0.38]],
  CF: [['h', ['#003082', BR, '#289728', '#ffce00']], ['r', '#d21034', 0.43, 0, 0.14, 1], ['e', '#ffce00', 0.16, 0.12, 0.08]],
  TD: [['v', ['#002664', '#fecb00', '#c60c30']]],
  CL: [['h', [BR, '#d52b1e']], ['r', '#0039a6', 0, 0, 1 / 3, 0.5], ['e', BR, 1 / 6, 0.25, 0.12]],
  CN: [['f', '#de2910'], ['e', '#ffde00', 0.17, 0.27, 0.15], ['e', '#ffde00', 0.33, 0.1, 0.05], ['e', '#ffde00', 0.4, 0.2, 0.05], ['e', '#ffde00', 0.4, 0.35, 0.05], ['e', '#ffde00', 0.33, 0.45, 0.05]],
  CO: [['h', ['#fcd116', '#003893', '#ce1126'], [2, 1, 1]]],
  KM: [['h', ['#ffc61e', BR, '#ce1126', '#3a75c4']], ['t', '#3d8e33', 0.4], ['l', BR, 0.13, 0.5, 0.2, 0.06, 0.17], ...[0, 1, 2, 3].map((k) => ['e', BR, 0.2, 0.32 + k * 0.12, 0.035])],
  CG: [['p', '#009543', [0, 0, 0.6, 0, 0, 1]], ['p', '#fbde4a', [0.6, 0, 1, 0, 0.4, 1, 0, 1]], ['p', '#dc241f', [1, 0, 1, 1, 0.4, 1]]],
  CD: [['f', '#007fff'], ['d', '#f7d618', 0.34, 1], ['d', '#ce1021', 0.22, 1], ['e', '#f7d618', 0.15, 0.22, 0.14]],
  CR: [['h', ['#002b7f', BR, '#ce1126', BR, '#002b7f'], [1, 1, 2, 1, 1]]],
  CI: [['v', ['#f77f00', BR, '#009e60']]],
  HR: [['h', ['#ff0000', BR, '#171796']], ['es', '#ff0000', 0.5, 0.48, 0.2, 0.36], ['xadrez', 0.5, 0.48, 0.2, 0.3]],
  CU: [['h', ['#002a8f', BR, '#002a8f', BR, '#002a8f']], ['t', '#cb1515', 0.45], ['e', BR, 0.15, 0.5, 0.12]],
  CY: [['f', BR], ['p', '#d57800', [0.3, 0.42, 0.42, 0.32, 0.62, 0.3, 0.74, 0.24, 0.7, 0.36, 0.56, 0.46, 0.38, 0.5]], ['p', '#4e5b31', [0.36, 0.62, 0.48, 0.7, 0.5, 0.66, 0.4, 0.6]], ['p', '#4e5b31', [0.64, 0.62, 0.52, 0.7, 0.5, 0.66, 0.6, 0.6]]],
  CZ: [['h', [BR, '#d7141a']], ['t', '#11457e', 0.5]],
  DK: [['f', '#c8102e'], ['+', BR, 0.37, 0.5, 0.14]],
  DJ: [['h', ['#6ab2e7', '#12ad2b']], ['t', BR, 0.5], ['e', '#d7141a', 0.15, 0.5, 0.1]],
  DM: [['f', '#006b3f'], ['+', '#fcd116', 0.45, 0.5, 0.15], ['+', PR, 0.45, 0.5, 0.1], ['+', BR, 0.45, 0.5, 0.05], ['c', '#d41c30', 0.45, 0.5, 0.22], ['p', '#9461c9', [0.42, 0.38, 0.48, 0.38, 0.5, 0.6, 0.44, 0.62]]],
  DO: [['f', BR], ['r', '#002d62', 0, 0, 0.44, 0.43], ['r', '#ce1126', 0.56, 0, 0.44, 0.43], ['r', '#ce1126', 0, 0.57, 0.44, 0.43], ['r', '#002d62', 0.56, 0.57, 0.44, 0.43], ['es', '#2e7d32', 0.5, 0.5, 0.09, 0.12]],
  EC: [['h', ['#ffdd00', '#034ea2', '#ed1c24'], [2, 1, 1]], ['es', '#8d6e63', 0.5, 0.5, 0.14, 0.26]],
  EG: [['h', ['#ce1126', BR, PR]], ['es', '#c09300', 0.5, 0.5, 0.1, 0.2]],
  SV: [['h', ['#0047ab', BR, '#0047ab']], ['p', '#c8a24a', [0.5, 0.4, 0.56, 0.58, 0.44, 0.58]], ['o', '#2e7d32', 0.5, 0.5, 0.1, 0.025]],
  GQ: [['h', ['#3e9a00', BR, '#e32118']], ['t', '#0073ce', 0.22], ['es', '#8d6e63', 0.5, 0.5, 0.09, 0.15]],
  ER: [['p', '#12ad2b', [0, 0, 1, 0, 1, 0.5]], ['p', '#4189dd', [0, 1, 1, 1, 1, 0.5]], ['p', '#ea0437', [0, 0, 1, 0.5, 0, 1]], ['o', '#f9d616', 0.24, 0.5, 0.17, 0.04]],
  EE: [['h', ['#0072ce', PR, BR]]],
  SZ: [['h', ['#3e5eb9', '#ffd900', '#b10c0c', '#ffd900', '#3e5eb9'], [3, 1, 6, 1, 3]], ['p', BR, [0.3, 0.5, 0.5, 0.36, 0.5, 0.64]], ['p', PR, [0.7, 0.5, 0.5, 0.36, 0.5, 0.64]]],
  ET: [['h', ['#078930', '#fcdd09', '#da121a']], ['c', '#0f47af', 0.5, 0.5, 0.25], ['e', '#fcdd09', 0.5, 0.5, 0.17]],
  FJ: [['f', '#68bfe5'], ['uk', 0, 0, 0.5, 0.5], ['es', BR, 0.75, 0.52, 0.2, 0.34], ['r', '#ce1126', 0.65, 0.36, 0.2, 0.08]],
  FI: [['f', BR], ['+', '#002f6c', 0.36, 0.5, 0.25]],
  FR: [['v', ['#002654', BR, '#ce1126']]],
  GA: [['h', ['#009e60', '#fcd116', '#3a75c4']]],
  GM: [['h', ['#ce1126', BR, '#0c1c8c', BR, '#3a7728'], [6, 1, 4, 1, 6]]],
  GE: [['f', BR], ['+', '#ff0000', 0.5, 0.5, 0.2], ...[[0.2, 0.22], [0.8, 0.22], [0.2, 0.78], [0.8, 0.78]].map(([x, y]) => ['+p', '#ff0000', x, y, 0.13, 0.05])],
  DE: [['h', [PR, '#dd0000', '#ffce00']]],
  GH: [['h', ['#ce1126', '#fcd116', '#006b3f']], ['e', PR, 0.5, 0.5, 0.15]],
  GR: [['h', ['#0d5eaf', BR, '#0d5eaf', BR, '#0d5eaf', BR, '#0d5eaf', BR, '#0d5eaf']], ['r', '#0d5eaf', 0, 0, 0.37, 5 / 9], ['r', BR, 0.15, 0, 0.074, 5 / 9], ['r', BR, 0, 2 / 9, 0.37, 1 / 9]],
  GD: [['f', '#ce1126'], ['p', '#fcd116', [0.08, 0.12, 0.92, 0.12, 0.5, 0.5]], ['p', '#fcd116', [0.08, 0.88, 0.92, 0.88, 0.5, 0.5]], ['p', '#007a5e', [0.08, 0.12, 0.5, 0.5, 0.08, 0.88]], ['p', '#007a5e', [0.92, 0.12, 0.5, 0.5, 0.92, 0.88]], ['c', '#ce1126', 0.5, 0.5, 0.12], ['e', '#fcd116', 0.5, 0.5, 0.08]],
  GT: [['v', ['#4997d0', BR, '#4997d0']], ['o', '#2e7d32', 0.5, 0.5, 0.13, 0.03], ['c', '#4997d0', 0.5, 0.48, 0.05]],
  GN: [['v', ['#ce1126', '#fcd116', '#009460']]],
  GW: [['h', ['#fcd116', '#009e49']], ['r', '#ce1126', 0, 0, 0.33, 1], ['e', PR, 0.165, 0.5, 0.13]],
  GY: [['f', '#009e49'], ['p', BR, [0, 0, 1, 0.5, 0, 1]], ['p', '#fcd116', [0, 0.04, 0.95, 0.5, 0, 0.96]], ['p', PR, [0, 0, 0.5, 0.5, 0, 1]], ['p', '#ce1126', [0, 0.05, 0.45, 0.5, 0, 0.95]]],
  HT: [['h', ['#00209f', '#d21034']], ['r', BR, 0.38, 0.32, 0.24, 0.36], ['es', '#2e7d32', 0.5, 0.5, 0.08, 0.18]],
  HN: [['h', ['#0073cf', BR, '#0073cf']], ['e', '#0073cf', 0.5, 0.5, 0.05], ['e', '#0073cf', 0.38, 0.42, 0.05], ['e', '#0073cf', 0.38, 0.58, 0.05], ['e', '#0073cf', 0.62, 0.42, 0.05], ['e', '#0073cf', 0.62, 0.58, 0.05]],
  HU: [['h', ['#ce2939', BR, '#477050']]],
  IS: [['f', '#02529c'], ['+', BR, 0.36, 0.5, 0.25], ['+', '#dc1e35', 0.36, 0.5, 0.12]],
  IN: [['h', ['#ff9933', BR, '#138808']], ['o', '#000080', 0.5, 0.5, 0.13, 0.025], ['c', '#000080', 0.5, 0.5, 0.03]],
  ID: [['h', ['#ce1126', BR]]],
  IR: [['h', ['#239f40', BR, '#da0000']], ['o', '#da0000', 0.5, 0.5, 0.08, 0.025], ['r', '#da0000', 0.495, 0.4, 0.01, 0.2]],
  IQ: [['h', ['#ce1126', BR, PR]], ['r', '#007a3d', 0.3, 0.46, 0.4, 0.035], ['r', '#007a3d', 0.42, 0.4, 0.02, 0.1], ['r', '#007a3d', 0.56, 0.4, 0.02, 0.1]],
  IE: [['v', ['#169b62', BR, '#ff883e']]],
  IL: [['f', BR], ['r', '#0038b8', 0, 0.1, 1, 0.15], ['r', '#0038b8', 0, 0.75, 1, 0.15], ['dav', '#0038b8', 0.5, 0.5, 0.2, 0.04]],
  IT: [['v', ['#009246', BR, '#ce2b37']]],
  JM: [['p', '#009b3a', [0, 0, 1, 0, 0.5, 0.5]], ['p', '#009b3a', [0, 1, 1, 1, 0.5, 0.5]], ['p', PR, [0, 0, 0.5, 0.5, 0, 1]], ['p', PR, [1, 0, 0.5, 0.5, 1, 1]], ['x', '#fed100', 0.14]],
  JP: [['f', BR], ['c', '#bc002d', 0.5, 0.5, 0.3]],
  JO: [['h', [PR, BR, '#007a3d']], ['t', '#ce1126', 0.5], ['e', BR, 0.17, 0.5, 0.07, 7]],
  KZ: [['f', '#00afca'], ['sol', '#fec50c', 0.5, 0.42, 0.13, 24], ['p', '#fec50c', [0.32, 0.66, 0.5, 0.6, 0.68, 0.66, 0.5, 0.7]], ['r', '#fec50c', 0.05, 0.05, 0.05, 0.9]],
  KE: [['h', [PR, BR, '#bb0000', BR, '#006600'], [6, 1, 6, 1, 6]], ['p', '#bb0000', [0.5, 0.15, 0.58, 0.5, 0.5, 0.85, 0.42, 0.5]], ['p', PR, [0.5, 0.25, 0.54, 0.5, 0.5, 0.75, 0.46, 0.5]]],
  KI: [['h', ['#ce1126', '#003f87'], [1, 1]], ['r', BR, 0, 0.62, 1, 0.06], ['r', BR, 0, 0.78, 1, 0.06], ['sol', '#fcd116', 0.5, 0.48, 0.1, 14], ['p', '#fcd116', [0.3, 0.22, 0.5, 0.28, 0.7, 0.2, 0.55, 0.32, 0.45, 0.32]]],
  KP: [['h', ['#024fa2', BR, '#ed1c27', BR, '#024fa2'], [6, 1, 17, 1, 6]], ['c', BR, 0.35, 0.5, 0.21], ['e', '#ed1c27', 0.35, 0.5, 0.19]],
  KR: [['f', BR], ['tg', 0.25], ...[[0.2, 0.22, 1], [0.8, 0.22, -1], [0.2, 0.78, -1], [0.8, 0.78, 1]].map(([x, y, g]) => ['r', PR, x - 0.07, y - 0.08, 0.14, 0.16, g])],
  KW: [['h', ['#007a3d', BR, '#ce1126']], ['p', PR, [0, 0, 0.25, 1 / 3, 0.25, 2 / 3, 0, 1]]],
  KG: [['f', '#e8112d'], ['sol', '#ffef00', 0.5, 0.5, 0.18, 40], ['c', '#e8112d', 0.5, 0.5, 0.1], ['o', '#ffef00', 0.5, 0.5, 0.08, 0.02]],
  LA: [['h', ['#ce1126', '#002868', '#ce1126'], [1, 2, 1]], ['c', BR, 0.5, 0.5, 0.2]],
  LV: [['h', ['#9e3039', BR, '#9e3039'], [2, 1, 2]]],
  LB: [['h', ['#ed1c24', BR, '#ed1c24'], [1, 2, 1]], ['p', '#00a651', [0.5, 0.3, 0.6, 0.55, 0.55, 0.55, 0.62, 0.66, 0.38, 0.66, 0.45, 0.55, 0.4, 0.55]]],
  LS: [['h', ['#00209f', BR, '#009543'], [3, 4, 3]], ['p', PR, [0.42, 0.56, 0.5, 0.34, 0.58, 0.56]]],
  LR: [['h', ['#bf0a30', BR, '#bf0a30', BR, '#bf0a30', BR, '#bf0a30', BR, '#bf0a30', BR, '#bf0a30']], ['r', '#002868', 0, 0, 0.3, 5 / 11], ['e', BR, 0.15, 5 / 22, 0.13]],
  LY: [['h', ['#e70013', PR, '#239e46'], [1, 2, 1]], ['l', BR, 0.48, 0.5, 0.15, 0.04, 0.12], ['e', BR, 0.55, 0.5, 0.06]],
  LI: [['h', ['#002b7f', '#ce1126']], ['p', '#ffd83d', [0.14, 0.32, 0.18, 0.18, 0.22, 0.26, 0.26, 0.14, 0.3, 0.26, 0.34, 0.18, 0.38, 0.32]]],
  LT: [['h', ['#fdb913', '#006a44', '#c1272d']]],
  LU: [['h', ['#ed2939', BR, '#00a1de']]],
  MG: [['h', ['#fc3d32', '#007e3a']], ['r', BR, 0, 0, 1 / 3, 1]],
  MW: [['h', [PR, '#ce1126', '#339e35']], ['sol', '#ce1126', 0.5, 0.33, 0.13, 31]],
  MY: [['h', ['#cc0001', BR, '#cc0001', BR, '#cc0001', BR, '#cc0001', BR, '#cc0001', BR, '#cc0001', BR, '#cc0001', BR]], ['r', '#010066', 0, 0, 0.5, 8 / 14], ['l', '#fc0', 0.2, 0.285, 0.2, 0.05, 0.17], ['e', '#fc0', 0.31, 0.285, 0.11, 14]],
  MV: [['f', '#d21034'], ['r', '#007e3a', 0.25, 0.25, 0.5, 0.5], ['l', BR, 0.48, 0.5, 0.17, 0.06, 0.14]],
  ML: [['v', ['#14b53a', '#fcd116', '#ce1126']]],
  MT: [['v', [BR, '#cf142b']], ['+p', '#9e9e9e', 0.12, 0.18, 0.18, 0.06]],
  MH: [['f', '#003893'], ['p', '#dd7500', [0, 1, 1, 0, 1, 0.12, 0.05, 1]], ['p', BR, [0, 0.95, 1, 0.12, 1, 0.24, 0.1, 1]], ['e', BR, 0.2, 0.25, 0.14, 24]],
  MR: [['f', '#00a95c'], ['r', '#d01c1f', 0, 0, 1, 0.15], ['r', '#d01c1f', 0, 0.85, 1, 0.15], ['l', '#ffd700', 0.5, 0.5, 0.25, 0, 0.22, -0.08], ['e', '#ffd700', 0.5, 0.36, 0.08]],
  MU: [['h', ['#ea2839', '#1a206d', '#ffd500', '#00a551']]],
  MX: [['v', ['#006847', BR, '#ce1126']], ['p', '#2e7d32', [0.43, 0.56, 0.47, 0.5, 0.5, 0.56, 0.53, 0.5, 0.57, 0.56, 0.55, 0.62, 0.45, 0.62]], ['p', '#8d5524', [0.44, 0.38, 0.5, 0.34, 0.56, 0.37, 0.61, 0.46, 0.56, 0.45, 0.55, 0.55, 0.5, 0.58, 0.45, 0.55, 0.44, 0.45, 0.39, 0.46]], ['arcB', '#2e7d32', 0.5, 0.5, 0.15, 0.03]],
  FM: [['f', '#75b2dd'], ['e', BR, 0.5, 0.2, 0.09], ['e', BR, 0.5, 0.8, 0.09], ['e', BR, 0.32, 0.5, 0.09], ['e', BR, 0.68, 0.5, 0.09]],
  MD: [['v', ['#0046ae', '#ffd200', '#cc092f']], ['es', '#8d6e63', 0.5, 0.5, 0.12, 0.26]],
  MC: [['h', ['#ce1126', BR]]],
  MN: [['v', ['#da2032', '#015197', '#da2032']], ['c', '#ffd900', 0.165, 0.36, 0.06], ['r', '#ffd900', 0.12, 0.45, 0.09, 0.3], ['e', '#ffd900', 0.165, 0.2, 0.05]],
  ME: [['f', '#c40308'], ['o', '#d4af37', 0.5, 0.5, 0.48, 0.06], ['r', '#d4af37', 0, 0, 1, 0.05], ['r', '#d4af37', 0, 0.95, 1, 0.05], ['r', '#d4af37', 0, 0, 0.035, 1], ['r', '#d4af37', 0.965, 0, 0.035, 1], ['p', '#d4af37', [0.5, 0.22, 0.62, 0.3, 0.7, 0.26, 0.66, 0.52, 0.56, 0.6, 0.5, 0.78, 0.44, 0.6, 0.34, 0.52, 0.3, 0.26, 0.38, 0.3]]],
  MA: [['f', '#c1272d'], ['es5', '#006233', 0.5, 0.5, 0.25, 0.035]],
  MZ: [['h', ['#007168', BR, PR, BR, '#fce100'], [6, 1, 6, 1, 6]], ['t', '#d21034', 0.42], ['e', '#fce100', 0.14, 0.5, 0.12]],
  MM: [['h', ['#fecb00', '#34b233', '#ea2839']], ['e', BR, 0.5, 0.55, 0.35]],
  NA: [['p', '#003580', [0, 0, 0.75, 0, 0, 1]], ['p', '#009543', [1, 0, 1, 1, 0.25, 1]], ['d', BR, 0.42, 1], ['d', '#d21034', 0.3, 1], ['sol', '#ffce00', 0.18, 0.25, 0.08, 12]],
  NR: [['f', '#002b7f'], ['r', '#ffc61e', 0, 0.46, 1, 0.08], ['e', BR, 0.25, 0.72, 0.1, 12]],
  NP: [['np']],
  NL: [['h', ['#ae1c28', BR, '#21468b']]],
  NZ: [['f', '#012169'], ['uk', 0, 0, 0.5, 0.5], ...[[0.75, 0.22], [0.66, 0.48], [0.86, 0.42], [0.75, 0.78]].map(([x, y]) => ['e', BR, x, y, 0.075]), ...[[0.75, 0.22], [0.66, 0.48], [0.86, 0.42], [0.75, 0.78]].map(([x, y]) => ['e', '#c8102e', x, y, 0.05])],
  NI: [['h', ['#0067c6', BR, '#0067c6']], ['p', '#2a9d8f', [0.5, 0.38, 0.58, 0.58, 0.42, 0.58]], ['o', '#c8a24a', 0.5, 0.5, 0.11, 0.02]],
  NE: [['h', ['#e05206', BR, '#0db02b']], ['c', '#e05206', 0.5, 0.5, 0.11]],
  NG: [['v', ['#008751', BR, '#008751']]],
  MK: [['f', '#d20000'], ['raiosMk', '#ffe600'], ['c', '#ffe600', 0.5, 0.5, 0.16], ['o', '#d20000', 0.5, 0.5, 0.18, 0.03]],
  NO: [['f', '#ba0c2f'], ['+', BR, 0.36, 0.5, 0.25], ['+', '#00205b', 0.36, 0.5, 0.12]],
  OM: [['h', [BR, '#db161b', '#008000']], ['r', '#db161b', 0, 0, 0.27, 1], ['es', BR, 0.13, 0.18, 0.08, 0.14]],
  PK: [['f', '#01411c'], ['r', BR, 0, 0, 0.25, 1], ['l', BR, 0.6, 0.53, 0.3, 0.08, 0.25, -0.07], ['e', BR, 0.7, 0.37, 0.08, 5, 0.1]],
  PW: [['f', '#4aadd6'], ['c', '#ffde00', 0.45, 0.5, 0.3]],
  PA: [['f', BR], ['r', '#da121a', 0.5, 0, 0.5, 0.5], ['r', '#072357', 0, 0.5, 0.5, 0.5], ['e', '#072357', 0.25, 0.25, 0.12], ['e', '#da121a', 0.75, 0.75, 0.12]],
  PG: [['p', PR, [0, 0, 0, 1, 1, 1]], ['p', '#ce1126', [0, 0, 1, 0, 1, 1]], ['p', '#fcd116', [0.62, 0.22, 0.76, 0.18, 0.86, 0.3, 0.74, 0.32, 0.68, 0.44]], ...[[0.25, 0.48], [0.18, 0.62], [0.32, 0.64], [0.25, 0.8], [0.22, 0.7]].map(([x, y]) => ['e', BR, x, y, 0.045])],
  PY: [['h', ['#d52b1e', BR, '#0038a8']], ['o', '#2e7d32', 0.5, 0.5, 0.1, 0.025], ['e', '#fcd116', 0.5, 0.5, 0.04]],
  PE: [['v', ['#d91023', BR, '#d91023']]],
  PH: [['h', ['#0038a8', '#ce1126']], ['t', BR, 0.43], ['sol', '#fcd116', 0.15, 0.5, 0.09, 8], ['e', '#fcd116', 0.05, 0.12, 0.04], ['e', '#fcd116', 0.05, 0.88, 0.04], ['e', '#fcd116', 0.36, 0.5, 0.04]],
  PL: [['h', [BR, '#dc143c']]],
  PT: [['v', ['#046a38', '#da291c'], [2, 3]], ['o', '#ffe900', 0.4, 0.5, 0.2, 0.04], ['es', '#da291c', 0.4, 0.5, 0.15, 0.22], ['es', BR, 0.4, 0.5, 0.1, 0.14]],
  QA: [['f', '#8a1538'], ['serra', BR, 0.32, 9, '#8a1538']],
  RO: [['v', ['#002b7f', '#fcd116', '#ce1126']]],
  RU: [['h', [BR, '#0039a6', '#d52b1e']]],
  RW: [['h', ['#00a1de', '#fad201', '#20603d'], [2, 1, 1]], ['sol', '#e5be01', 0.82, 0.27, 0.07, 24]],
  KN: [['p', '#009e49', [0, 0, 1, 0, 0, 1]], ['p', '#ce1126', [1, 0, 1, 1, 0, 1]], ['d', '#fcd116', 0.42, 1], ['d', PR, 0.3, 1], ['e', BR, 0.38, 0.62, 0.08], ['e', BR, 0.62, 0.38, 0.08]],
  LC: [['f', '#66ccff'], ['p', BR, [0.5, 0.12, 0.72, 0.9, 0.28, 0.9]], ['p', PR, [0.5, 0.2, 0.68, 0.9, 0.32, 0.9]], ['p', '#fcd116', [0.5, 0.5, 0.72, 0.9, 0.28, 0.9]]],
  VC: [['v', ['#002674', '#fcd022', '#007c2e'], [1, 2, 1]], ['p', '#009e60', [0.42, 0.35, 0.46, 0.45, 0.42, 0.55, 0.38, 0.45]], ['p', '#009e60', [0.58, 0.35, 0.62, 0.45, 0.58, 0.55, 0.54, 0.45]], ['p', '#009e60', [0.5, 0.52, 0.54, 0.62, 0.5, 0.72, 0.46, 0.62]]],
  WS: [['f', '#ce1126'], ['r', '#002b7f', 0, 0, 0.5, 0.5], ...[[0.25, 0.1], [0.15, 0.24], [0.33, 0.22], [0.25, 0.4], [0.29, 0.31]].map(([x, y], k) => ['e', BR, x, y, k === 4 ? 0.03 : 0.05])],
  SM: [['h', [BR, '#5eb6e4']], ['es', '#c8a24a', 0.5, 0.5, 0.13, 0.24]],
  ST: [['h', ['#12ad2b', '#ffce00', '#12ad2b'], [2, 3, 2]], ['t', '#d21034', 0.3], ['e', PR, 0.5, 0.5, 0.1], ['e', PR, 0.72, 0.5, 0.1]],
  SA: [['f', '#006c35'], ['r', BR, 0.25, 0.32, 0.5, 0.05], ['r', BR, 0.3, 0.24, 0.4, 0.04], ['p', BR, [0.25, 0.66, 0.7, 0.66, 0.72, 0.62, 0.75, 0.7, 0.72, 0.68, 0.7, 0.72, 0.25, 0.72]]],
  SN: [['v', ['#00853f', '#fdef42', '#e31b23']], ['e', '#00853f', 0.5, 0.5, 0.14]],
  RS: [['h', ['#c6363c', '#0c4076', BR]], ['es', '#c6363c', 0.33, 0.44, 0.13, 0.3], ['+', BR, 0.33, 0.44, 0.02]],
  SC: [['raios', ['#003f87', '#fcd856', '#d62828', BR, '#007a3d']]],
  SL: [['h', ['#1eb53a', BR, '#0072c6']]],
  SG: [['h', ['#ef3340', BR]], ['l', BR, 0.17, 0.25, 0.16, 0.05, 0.14], ...[0, 1, 2, 3, 4].map((k) => ['e', BR, 0.27 + Math.cos(-Math.PI / 2 + (k * 2 * Math.PI) / 5) * 0.06, 0.25 + Math.sin(-Math.PI / 2 + (k * 2 * Math.PI) / 5) * 0.09, 0.035])],
  SK: [['h', [BR, '#0b4ea2', '#ee1c25']], ['es', '#ee1c25', 0.34, 0.5, 0.16, 0.36], ['+', BR, 0.34, 0.45, 0.03], ['r', '#0b4ea2', 0.29, 0.62, 0.1, 0.08]],
  SI: [['h', [BR, '#0000ff', '#ff0000']], ['es', '#0000ff', 0.25, 0.36, 0.1, 0.22], ['p', BR, [0.2, 0.42, 0.25, 0.32, 0.3, 0.42]]],
  SB: [['p', '#0051ba', [0, 0, 1, 0, 0, 1]], ['p', '#215b33', [1, 0, 1, 1, 0, 1]], ['d', '#fcd116', 0.12, 1], ...[[0.1, 0.12], [0.3, 0.12], [0.2, 0.25], [0.1, 0.38], [0.3, 0.38]].map(([x, y]) => ['e', BR, x, y, 0.06])],
  SO: [['f', '#4189dd'], ['e', BR, 0.5, 0.5, 0.25]],
  ZA: [['za']],
  SS: [['h', [PR, BR, '#da121a', BR, '#078930'], [6, 1, 6, 1, 6]], ['t', '#0f47af', 0.35], ['e', '#fcdd09', 0.11, 0.5, 0.12]],
  ES: [['h', ['#aa151b', '#f1bf00', '#aa151b'], [1, 2, 1]], ['es', '#aa151b', 0.33, 0.5, 0.1, 0.2], ['r', '#c8a24a', 0.27, 0.32, 0.02, 0.36], ['r', '#c8a24a', 0.39, 0.32, 0.02, 0.36]],
  LK: [['f', '#ffbe29'], ['r', '#00534e', 0.04, 0.06, 0.13, 0.88], ['r', '#eb7400', 0.17, 0.06, 0.13, 0.88], ['r', '#8d153a', 0.33, 0.06, 0.63, 0.88], ['p', '#ffbe29', [0.5, 0.62, 0.55, 0.4, 0.62, 0.3, 0.72, 0.32, 0.74, 0.45, 0.8, 0.5, 0.78, 0.62]]],
  SD: [['h', ['#d21034', BR, PR]], ['t', '#007229', 0.33]],
  SR: [['h', ['#377e3f', BR, '#b40a2d', BR, '#377e3f'], [2, 1, 4, 1, 2]], ['e', '#ecc81d', 0.5, 0.5, 0.17]],
  SE: [['f', '#006aa7'], ['+', '#fecc00', 0.36, 0.5, 0.2]],
  CH: [['f', '#da291c'], ['+p', BR, 0.5, 0.5, 0.56, 0.17]],
  SY: [['h', ['#007a3d', BR, PR]], ['e', '#ce1126', 0.34, 0.5, 0.07], ['e', '#ce1126', 0.5, 0.5, 0.07], ['e', '#ce1126', 0.66, 0.5, 0.07]],
  TJ: [['h', ['#cc0000', BR, '#006600'], [2, 3, 2]], ['p', '#f8c300', [0.44, 0.56, 0.44, 0.48, 0.47, 0.52, 0.5, 0.44, 0.53, 0.52, 0.56, 0.48, 0.56, 0.56]], ...[0, 1, 2, 3, 4, 5, 6].map((k) => ['e', '#f8c300', 0.5 + Math.cos(Math.PI + (k * Math.PI) / 6) * 0.12, 0.5 + Math.sin(Math.PI + (k * Math.PI) / 6) * 0.16, 0.025])],
  TZ: [['p', '#1eb53a', [0, 0, 1, 0, 0, 1]], ['p', '#00a3dd', [1, 0, 1, 1, 0, 1]], ['d', '#fcd116', 0.4, 1], ['d', PR, 0.28, 1]],
  TH: [['h', ['#a51931', BR, '#2d2a4a', BR, '#a51931'], [1, 1, 2, 1, 1]]],
  TL: [['f', '#dc241f'], ['t', '#ffc726', 0.5], ['t', PR, 1 / 3], ['e', BR, 0.11, 0.5, 0.1, 5, 0.1]],
  TG: [['h', ['#006a4e', '#ffce00', '#006a4e', '#ffce00', '#006a4e']], ['r', '#d21034', 0, 0, 0.4, 0.6], ['e', BR, 0.2, 0.3, 0.16]],
  TO: [['f', '#c10000'], ['r', BR, 0, 0, 0.4, 0.5], ['+p', '#c10000', 0.2, 0.25, 0.3, 0.09]],
  TT: [['f', '#da1a35'], ['d', BR, 0.4, -1], ['d', PR, 0.3, -1]],
  TN: [['f', '#e70013'], ['c', BR, 0.5, 0.5, 0.25], ['l', '#e70013', 0.5, 0.5, 0.19, 0.05, 0.15], ['e', '#e70013', 0.53, 0.5, 0.1]],
  TR: [['f', '#e30a17'], ['l', BR, 0.38, 0.5, 0.25, 0.06, 0.2], ['e', BR, 0.52, 0.5, 0.12, 5, 0.25]],
  TM: [['f', '#00843d'], ['r', '#d22630', 0.15, 0, 0.12, 1], ...[0.12, 0.3, 0.48, 0.66, 0.84].map((y) => ['c', '#ffc72c', 0.21, y + 0.04, 0.035]), ['l', BR, 0.38, 0.22, 0.12, 0.04, 0.1], ...[0, 1, 2, 3, 4].map((k) => ['e', BR, 0.43 + (k % 3) * 0.04, 0.14 + Math.floor(k / 3) * 0.09, 0.025])],
  TV: [['f', '#5b97b1'], ['uk', 0, 0, 0.5, 0.5], ...[[0.6, 0.65], [0.65, 0.85], [0.72, 0.5], [0.8, 0.75], [0.85, 0.3], [0.9, 0.6], [0.93, 0.15], [0.55, 0.88], [0.7, 0.25]].map(([x, y]) => ['e', '#ffce00', x, y, 0.05])],
  UG: [['h', [PR, '#fcdc04', '#d90000', PR, '#fcdc04', '#d90000']], ['c', BR, 0.5, 0.5, 0.2], ['p', PR, [0.46, 0.36, 0.54, 0.34, 0.56, 0.6, 0.48, 0.64, 0.46, 0.5]], ['c', '#d90000', 0.5, 0.36, 0.03]],
  UA: [['h', ['#0057b7', '#ffd700']]],
  AE: [['h', ['#00732f', BR, PR]], ['r', '#ff0000', 0, 0, 0.25, 1]],
  GB: [['f', '#012169'], ['uk', 0, 0, 1, 1]],
  US: [['h', ['#b22234', BR, '#b22234', BR, '#b22234', BR, '#b22234', BR, '#b22234', BR, '#b22234', BR, '#b22234']], ['r', '#3c3b6e', 0, 0, 0.4, 7 / 13], ['pontos', BR, 0, 0, 0.4, 7 / 13, 6, 5]],
  UY: [['h', [BR, '#0038a8', BR, '#0038a8', BR, '#0038a8', BR, '#0038a8', BR]], ['r', BR, 0, 0, 0.36, 5 / 9], ['sol', '#fcd116', 0.18, 0.28, 0.1, 16]],
  UZ: [['h', ['#0099b5', '#ce1126', BR, '#ce1126', '#1eb53a'], [10, 1, 10, 1, 10]], ['l', BR, 0.13, 0.17, 0.12, 0.04, 0.1], ...[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((k) => ['e', BR, 0.22 + (k % 5) * 0.045, 0.08 + Math.floor(k / 5) * 0.08, 0.022])],
  VU: [['h', ['#d21034', '#009543']], ['p', PR, [0, 0, 0.5, 0.5, 0, 1]], ['p', '#fdce12', [0, 0.06, 0.06, 0, 0.6, 0.47, 1, 0.47, 1, 0.53, 0.6, 0.53, 0.06, 1, 0, 0.94, 0.42, 0.5]], ['p', PR, [0, 0.12, 0.38, 0.5, 0, 0.88]], ['o', '#fdce12', 0.14, 0.5, 0.12, 0.03]],
  VE: [['h', ['#ffcc00', '#00247d', '#cf142b']], ...[0, 1, 2, 3, 4, 5, 6, 7].map((k) => ['e', BR, 0.5 + Math.cos(Math.PI * (1.15 + k * 0.1)) * 0.16, 0.6 + Math.sin(Math.PI * (1.15 + k * 0.1)) * 0.28, 0.035])],
  VN: [['f', '#da251d'], ['e', '#ffff00', 0.5, 0.5, 0.3]],
  YE: [['h', ['#ce1126', BR, PR]]],
  ZM: [['f', '#198a00'], ['r', '#de2010', 0.68, 0.38, 0.1, 0.62], ['r', PR, 0.78, 0.38, 0.1, 0.62], ['r', '#ef7d00', 0.88, 0.38, 0.12, 0.62], ['p', '#ef7d00', [0.74, 0.22, 0.84, 0.16, 0.94, 0.22, 0.84, 0.28]]],
  ZW: [['h', ['#006400', '#ffd200', '#d40000', PR, '#d40000', '#ffd200', '#006400']], ['t', BR, 0.4, 0, 1], ['e', '#d40000', 0.13, 0.5, 0.12], ['p', '#ffd200', [0.11, 0.42, 0.16, 0.44, 0.15, 0.56, 0.11, 0.58]]],
  VA: [['v', ['#ffe000', BR]], ['p', '#c8a24a', [0.66, 0.36, 0.84, 0.64, 0.8, 0.66, 0.62, 0.38]], ['p', '#9e9e9e', [0.84, 0.36, 0.66, 0.64, 0.62, 0.62, 0.8, 0.34]], ['es', '#c8a24a', 0.73, 0.28, 0.06, 0.1]],
  PS: [['h', [PR, BR, '#009736']], ['t', '#ee2a35', 0.4]],
});

// ------------------------------------------------------------------ desenho

/** Estrela de n pontas (raio externo r; interno r * k). */
function caminhoEstrela(ctx, x, y, r, n, giro, k = 0.4) {
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / n + giro * Math.PI * 2;
    const rr = i % 2 ? r * (n > 6 ? 0.55 : k) : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

/** Reino Unido no retangulo (x, y, w, h) em px. */
function uniao(ctx, x, y, w, h) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = '#012169';
  ctx.fillRect(x, y, w, h);
  const e = h / 30;
  ctx.lineCap = 'butt';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = e * 6;
  ctx.beginPath();
  ctx.moveTo(x, y); ctx.lineTo(x + w, y + h);
  ctx.moveTo(x + w, y); ctx.lineTo(x, y + h);
  ctx.stroke();
  ctx.strokeStyle = '#c8102e';
  ctx.lineWidth = e * 2;
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x + w / 2 - e * 5, y, e * 10, h);
  ctx.fillRect(x, y + h / 2 - e * 5, w, e * 10);
  ctx.fillStyle = '#c8102e';
  ctx.fillRect(x + w / 2 - e * 3, y, e * 6, h);
  ctx.fillRect(x, y + h / 2 - e * 3, w, e * 6);
  ctx.restore();
}

/** Escudo simples (brasao) centrado em (x, y) px, w x h px. */
function escudo(ctx, x, y, w, h) {
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y - h / 2);
  ctx.lineTo(x + w / 2, y - h / 2);
  ctx.lineTo(x + w / 2, y + h * 0.1);
  ctx.quadraticCurveTo(x + w / 2, y + h * 0.4, x, y + h / 2);
  ctx.quadraticCurveTo(x - w / 2, y + h * 0.4, x - w / 2, y + h * 0.1);
  ctx.closePath();
}

/** Folha de bordo (Canada), centro (x, y), tamanho s (px). */
function folha(ctx, x, y, s) {
  const p = [0, -0.5, 0.08, -0.32, 0.18, -0.38, 0.15, -0.12, 0.32, -0.28, 0.3, -0.2, 0.46, -0.24, 0.4, -0.08, 0.48, -0.04, 0.24, 0.14, 0.28, 0.24, 0.04, 0.2, 0.04, 0.46, -0.04, 0.46, -0.04, 0.2, -0.28, 0.24, -0.24, 0.14, -0.48, -0.04, -0.4, -0.08, -0.46, -0.24, -0.3, -0.2, -0.32, -0.28, -0.15, -0.12, -0.18, -0.38, -0.08, -0.32];
  ctx.beginPath();
  for (let i = 0; i < p.length; i += 2) ctx.lineTo(x + p[i] * s, y + p[i + 1] * s);
  ctx.closePath();
}

/**
 * Desenha a bandeira do pais `cod` no retangulo (x, y, w, h) em px. Sem a bandeira: um pano
 * branco com um "?" (o jogador ainda nao escolheu a selecao).
 * @param {CanvasRenderingContext2D} ctx @param {string} cod
 * @param {number} x @param {number} y @param {number} w @param {number} h
 */
export function desenharBandeira(ctx, cod, x, y, w, h) {
  const spec = BANDEIRAS[(cod || '').toUpperCase()];
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.lineJoin = 'round';
  const X = (v) => x + v * w;
  const Y = (v) => y + v * h;
  if (!spec) {
    ctx.fillStyle = '#f2f2f2';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#9aa0aa';
    ctx.font = `700 ${Math.round(h * 0.7)}px Fredoka, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', x + w / 2, y + h * 0.54);
    ctx.restore();
    return;
  }
  for (const op of spec) {
    const t = op[0];
    if (t === 'f') { ctx.fillStyle = op[1]; ctx.fillRect(x, y, w, h); }
    else if (t === 'h' || t === 'v') {
      const cs = op[1];
      const ps = op[2] || cs.map(() => 1);
      const tot = ps.reduce((a, b) => a + b, 0);
      let acc = 0;
      cs.forEach((c, i) => {
        ctx.fillStyle = c;
        const a = acc / tot;
        const b = (acc + ps[i]) / tot;
        if (t === 'h') ctx.fillRect(x, Y(a), w, (b - a) * h + 0.5);
        else ctx.fillRect(X(a), y, (b - a) * w + 0.5, h);
        acc += ps[i];
      });
    } else if (t === 'r') {
      ctx.fillStyle = op[1];
      if (op[6]) {
        // trigrama da Coreia: tres barras (inteiras ou partidas), giradas na diagonal
        ctx.save();
        ctx.translate(X(op[2] + op[4] / 2), Y(op[3] + op[5] / 2));
        ctx.rotate(op[6] * Math.atan2(h, w));
        const bw = op[4] * w;
        const bh = (op[5] * h) / 5;
        for (let k = -1; k <= 1; k++) ctx.fillRect(-bw / 2, k * bh * 1.6 - bh / 2, bw, bh);
        ctx.restore();
      } else ctx.fillRect(X(op[2]), Y(op[3]), op[4] * w + 0.3, op[5] * h + 0.3);
    } else if (t === 'p') {
      const p = op[2];
      ctx.fillStyle = op[1];
      ctx.beginPath();
      for (let i = 0; i < p.length; i += 2) ctx.lineTo(X(p[i]), Y(p[i + 1]));
      ctx.closePath();
      ctx.fill();
    } else if (t === 'c') {
      ctx.fillStyle = op[1];
      ctx.beginPath();
      ctx.arc(X(op[2]), Y(op[3]), op[4] * h, 0, Math.PI * 2);
      ctx.fill();
    } else if (t === 'o') {
      ctx.strokeStyle = op[1];
      ctx.lineWidth = op[5] * h;
      ctx.beginPath();
      ctx.arc(X(op[2]), Y(op[3]), op[4] * h, 0, Math.PI * 2);
      ctx.stroke();
    } else if (t === 'arc') {
      // faixa curva (o lema do Brasil): arco de raio r passando pelo centro do globo
      ctx.save();
      ctx.beginPath();
      ctx.arc(X(0.5), Y(0.5), 0.26 * h, 0, Math.PI * 2);
      ctx.clip();
      ctx.strokeStyle = op[1];
      ctx.lineWidth = op[5] * h;
      ctx.beginPath();
      ctx.arc(X(op[2]), Y(op[3]), op[4] * h, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else if (t === 'tg') {
      // taegeuk (Coreia do Sul): vermelho em cima, azul embaixo, o "S" no eixo da diagonal
      const r = op[1] * h;
      ctx.save();
      ctx.translate(X(0.5), Y(0.5));
      ctx.rotate(Math.atan2(h, w));
      ctx.fillStyle = '#0047a0';
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#cd2e3a';
      ctx.beginPath(); ctx.arc(0, 0, r, Math.PI, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(-r / 2, 0, r / 2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0047a0';
      ctx.beginPath(); ctx.arc(r / 2, 0, r / 2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    } else if (t === 'arcB') {
      // meia coroa de folhas embaixo (Mexico)
      ctx.strokeStyle = op[1];
      ctx.lineWidth = op[5] * h;
      ctx.beginPath();
      ctx.arc(X(op[2]), Y(op[3]), op[4] * h, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
    } else if (t === 'e') {
      ctx.fillStyle = op[1];
      caminhoEstrela(ctx, X(op[2]), Y(op[3]), op[4] * h, op[5] || 5, op[6] || 0);
      ctx.fill();
    } else if (t === 'es5') {
      // pentagrama vazado (Marrocos)
      ctx.strokeStyle = op[1];
      ctx.lineWidth = op[5] * h;
      ctx.beginPath();
      for (let i = 0; i <= 5; i++) {
        const a = -Math.PI / 2 + (i * 4 * Math.PI) / 5;
        ctx.lineTo(X(op[2]) + Math.cos(a) * op[4] * h, Y(op[3]) + Math.sin(a) * op[4] * h);
      }
      ctx.closePath();
      ctx.stroke();
    } else if (t === 'dav') {
      ctx.strokeStyle = op[1];
      ctx.lineWidth = op[5] * h;
      for (const g of [0, Math.PI]) {
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
          const a = -Math.PI / 2 + g + (i * 2 * Math.PI) / 3;
          ctx.lineTo(X(op[2]) + Math.cos(a) * op[4] * h, Y(op[3]) + Math.sin(a) * op[4] * h);
        }
        ctx.closePath();
        ctx.stroke();
      }
    } else if (t === 'l') {
      // meia-lua: o disco menos outro disco deslocado (dx em fracao da altura)
      const cx = X(op[2]);
      const cy = Y(op[3]);
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, op[4] * h, 0, Math.PI * 2);
      ctx.clip();
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.arc(cx + op[5] * h, cy + (op[7] || 0) * h, op[6] * h, 0, Math.PI * 2);
      ctx.fillStyle = op[1];
      ctx.fill('evenodd');
      ctx.restore();
    } else if (t === 't') {
      const y0 = op[3] ?? 0;
      const y1 = op[4] ?? 1;
      ctx.fillStyle = op[1];
      ctx.beginPath();
      ctx.moveTo(x, Y(y0));
      ctx.lineTo(X(op[2]), Y((y0 + y1) / 2));
      ctx.lineTo(x, Y(y1));
      ctx.closePath();
      ctx.fill();
    } else if (t === 'x') {
      ctx.strokeStyle = op[1];
      ctx.lineWidth = op[2] * h;
      ctx.lineCap = 'butt';
      ctx.beginPath();
      ctx.moveTo(x - w * 0.1, y - h * 0.1); ctx.lineTo(x + w * 1.1, y + h * 1.1);
      ctx.moveTo(x + w * 1.1, y - h * 0.1); ctx.lineTo(x - w * 0.1, y + h * 1.1);
      ctx.stroke();
    } else if (t === '+') {
      ctx.fillStyle = op[1];
      const e = op[4] * h;
      ctx.fillRect(X(op[2]) - e / 2, y, e, h);
      ctx.fillRect(x, Y(op[3]) - e / 2, w, e);
    } else if (t === '+p') {
      // cruz pequena (comprimento c, espessura e, em fracao da altura)
      ctx.fillStyle = op[1];
      const c = op[4] * h;
      const e = op[5] * h;
      ctx.fillRect(X(op[2]) - e / 2, Y(op[3]) - c / 2, e, c);
      ctx.fillRect(X(op[2]) - c / 2, Y(op[3]) - e / 2, c, e);
    } else if (t === 'd') {
      ctx.strokeStyle = op[1];
      ctx.lineWidth = op[2] * h;
      ctx.lineCap = 'butt';
      ctx.beginPath();
      if (op[3] > 0) { ctx.moveTo(x - w * 0.1, y + h * 1.1); ctx.lineTo(x + w * 1.1, y - h * 0.1); }
      else { ctx.moveTo(x - w * 0.1, y - h * 0.1); ctx.lineTo(x + w * 1.1, y + h * 1.1); }
      ctx.stroke();
    } else if (t === 'uk') uniao(ctx, X(op[1]), Y(op[2]), op[3] * w, op[4] * h);
    else if (t === 'sol') {
      const cx = X(op[2]);
      const cy = Y(op[3]);
      const r = op[4] * h;
      const n = op[5];
      ctx.fillStyle = op[1];
      ctx.beginPath();
      for (let i = 0; i < n * 2; i++) {
        const a = (i * Math.PI) / n;
        const rr = i % 2 ? r * 1.15 : r * 1.75;
        ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    } else if (t === 'es') {
      ctx.fillStyle = op[1];
      escudo(ctx, X(op[2]), Y(op[3]), op[4] * h, op[5] * h);
      ctx.fill();
      ctx.lineWidth = Math.max(0.6, h * 0.012);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.stroke();
    } else if (t === 'xadrez') {
      // o xadrez do escudo da Croacia (clip no escudo)
      ctx.save();
      escudo(ctx, X(op[1]), Y(op[2]), op[3] * h, op[4] * h * 1.2);
      ctx.clip();
      const n = 5;
      const s = (op[3] * h) / n;
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < n; i++) for (let j = 0; j < 7; j++) if ((i + j) % 2) ctx.fillRect(X(op[1]) - (op[3] * h) / 2 + i * s, Y(op[2]) - (op[4] * h * 1.2) / 2 + j * s, s, s);
      ctx.restore();
    } else if (t === 'serra') {
      // faixa branca na tralha com a borda serrilhada (n dentes)
      const xe = op[2];
      const n = op[3];
      ctx.fillStyle = op[1];
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let i = 0; i <= n * 2; i++) ctx.lineTo(X(i % 2 ? xe + 0.1 : xe), Y(i / (n * 2)));
      ctx.lineTo(x, y + h);
      ctx.closePath();
      ctx.fill();
    } else if (t === 'raios') {
      const cs = op[1];
      const pts = [[0, 0, 1 / 3, 0], [1 / 3, 0, 2 / 3, 0], [2 / 3, 0, 1, 0, 1, 1 / 3], [1, 1 / 3, 1, 2 / 3], [1, 2 / 3, 1, 1]];
      cs.forEach((c, i) => {
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.moveTo(x, y + h);
        const p = pts[i];
        for (let k = 0; k < p.length; k += 2) ctx.lineTo(X(p[k]), Y(p[k + 1]));
        ctx.closePath();
        ctx.fill();
      });
    } else if (t === 'raiosMk') {
      ctx.fillStyle = op[1];
      const cx = X(0.5);
      const cy = Y(0.5);
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        const ab = 0.12;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a - ab) * w * 1.2, cy + Math.sin(a - ab) * w * 1.2);
        ctx.lineTo(cx + Math.cos(a + ab) * w * 1.2, cy + Math.sin(a + ab) * w * 1.2);
        ctx.closePath();
        ctx.fill();
      }
    } else if (t === 'folha') {
      ctx.fillStyle = op[1];
      folha(ctx, X(op[2]), Y(op[3]), op[4] * h * 1.6);
      ctx.fill();
    } else if (t === 'pontos') {
      // estrelas do cantao em linhas (EUA): pontinhos
      const [, c, x0, y0, cw, ch, nx, ny] = op;
      ctx.fillStyle = c;
      for (let j = 0; j < ny * 2 - 1; j++) {
        const imp = j % 2;
        for (let i = 0; i < nx - imp; i++) {
          ctx.beginPath();
          ctx.arc(X(x0 + ((i + 0.5 + imp * 0.5) / nx) * cw), Y(y0 + ((j + 0.7) / (ny * 2)) * ch), h * 0.016, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (t === 'np') {
      // Nepal: duas flamulas empilhadas (a unica bandeira que nao e retangular), sobre branco
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x, y, w, h);
      const forma = (s) => {
        ctx.beginPath();
        ctx.moveTo(X(0.22 - s), Y(0.04 - s));
        ctx.lineTo(X(0.76 + s), Y(0.46 + s * 0.4));
        ctx.lineTo(X(0.42 + s), Y(0.46 + s * 0.4));
        ctx.lineTo(X(0.76 + s), Y(0.96 + s));
        ctx.lineTo(X(0.22 - s), Y(0.96 + s));
        ctx.closePath();
      };
      forma(0.03);
      ctx.fillStyle = '#003893';
      ctx.fill();
      forma(0);
      ctx.fillStyle = '#dc143c';
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      caminhoEstrela(ctx, X(0.36), Y(0.33), h * 0.08, 12, 0, 0.6);
      ctx.fill();
      caminhoEstrela(ctx, X(0.36), Y(0.72), h * 0.11, 12, 0, 0.6);
      ctx.fill();
    } else if (t === 'za') {
      // Africa do Sul: o Y verde com bordas brancas e douradas
      ctx.fillStyle = '#e03c31'; ctx.fillRect(x, y, w, h / 2);
      ctx.fillStyle = '#001489'; ctx.fillRect(x, y + h / 2, w, h / 2);
      const Yv = (e, c) => {
        ctx.strokeStyle = c;
        ctx.lineWidth = e * h;
        ctx.lineCap = 'butt';
        ctx.beginPath();
        ctx.moveTo(X(-0.02), Y(-0.02)); ctx.lineTo(X(0.42), Y(0.5)); ctx.lineTo(X(1.02), Y(0.5));
        ctx.moveTo(X(-0.02), Y(1.02)); ctx.lineTo(X(0.42), Y(0.5));
        ctx.stroke();
      };
      Yv(0.34, '#ffffff');
      Yv(0.2, '#007749');
      ctx.fillStyle = '#ffb81c';
      ctx.beginPath(); ctx.moveTo(x, Y(0.17)); ctx.lineTo(X(0.3), Y(0.5)); ctx.lineTo(x, Y(0.83)); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.beginPath(); ctx.moveTo(x, Y(0.24)); ctx.lineTo(X(0.24), Y(0.5)); ctx.lineTo(x, Y(0.76)); ctx.closePath(); ctx.fill();
    }
  }
  ctx.restore();
}

/**
 * Bandeira com borda fina e cantos levemente arredondados (chave da Copa, listas).
 * @param {CanvasRenderingContext2D} ctx @param {string} cod
 * @param {number} x @param {number} y @param {number} w @param {number} h
 */
export function desenharBandeirinha(ctx, cod, x, y, w, h) {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.min(w, h) * 0.12);
  ctx.clip();
  desenharBandeira(ctx, cod, x, y, w, h);
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.min(w, h) * 0.12);
  ctx.lineWidth = Math.max(1, h * 0.035);
  ctx.strokeStyle = 'rgba(23,22,28,0.8)';
  ctx.stroke();
  ctx.restore();
}
