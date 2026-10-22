// Paises (pedido de 2026-10-22: "todas as bandeiras de todos os paises"): os 193 membros da ONU e
// os 2 observadores (Vaticano e Palestina), pelo codigo ISO 3166-1 alfa-2. Puro: os nomes vem do
// navegador (Intl.DisplayNames, no main.js/ui) e as bandeiras sao desenhadas em codigo
// (src/render/bandeiras.js). Bandeira de pais nao e marca de ninguem; o nome do torneio e nosso
// (Copa Gosma) e nao ha numero nem escudo de selecao.

/** @type {readonly string[]} */
export const PAISES = Object.freeze([
  'AF', 'AL', 'DZ', 'AD', 'AO', 'AG', 'AR', 'AM', 'AU', 'AT', 'AZ',
  'BS', 'BH', 'BD', 'BB', 'BY', 'BE', 'BZ', 'BJ', 'BT', 'BO', 'BA', 'BW', 'BR', 'BN', 'BG', 'BF', 'BI',
  'CV', 'KH', 'CM', 'CA', 'CF', 'TD', 'CL', 'CN', 'CO', 'KM', 'CG', 'CD', 'CR', 'CI', 'HR', 'CU', 'CY', 'CZ',
  'DK', 'DJ', 'DM', 'DO',
  'EC', 'EG', 'SV', 'GQ', 'ER', 'EE', 'SZ', 'ET',
  'FJ', 'FI', 'FR',
  'GA', 'GM', 'GE', 'DE', 'GH', 'GR', 'GD', 'GT', 'GN', 'GW', 'GY',
  'HT', 'HN', 'HU',
  'IS', 'IN', 'ID', 'IR', 'IQ', 'IE', 'IL', 'IT',
  'JM', 'JP', 'JO',
  'KZ', 'KE', 'KI', 'KW', 'KG',
  'LA', 'LV', 'LB', 'LS', 'LR', 'LY', 'LI', 'LT', 'LU',
  'MG', 'MW', 'MY', 'MV', 'ML', 'MT', 'MH', 'MR', 'MU', 'MX', 'FM', 'MD', 'MC', 'MN', 'ME', 'MA', 'MZ', 'MM',
  'NA', 'NR', 'NP', 'NL', 'NZ', 'NI', 'NE', 'NG', 'KP', 'MK', 'NO',
  'OM',
  'PK', 'PW', 'PA', 'PG', 'PY', 'PE', 'PH', 'PL', 'PT',
  'QA',
  'KR', 'RO', 'RU', 'RW',
  'KN', 'LC', 'VC', 'WS', 'SM', 'ST', 'SA', 'SN', 'RS', 'SC', 'SL', 'SG', 'SK', 'SI', 'SB', 'SO', 'ZA', 'SS', 'ES', 'LK', 'SD', 'SR', 'SE', 'CH', 'SY',
  'TJ', 'TZ', 'TH', 'TL', 'TG', 'TO', 'TT', 'TN', 'TR', 'TM', 'TV',
  'UG', 'UA', 'AE', 'GB', 'US', 'UY', 'UZ',
  'VU', 'VE', 'VN',
  'YE',
  'ZM', 'ZW',
  'VA', 'PS',
]);

/** @param {string} cod */
export const ehPais = (cod) => typeof cod === 'string' && PAISES.includes(cod.toUpperCase());

/**
 * Pais pela regiao do idioma do navegador (ex.: 'pt-BR' -> 'BR'), ou '' se nao houver.
 * @param {readonly string[]} idiomas
 */
export function paisDoIdioma(idiomas) {
  for (const l of idiomas || []) {
    const m = /^[a-z]{2,3}[-_]([a-z]{2})\b/i.exec(String(l || ''));
    if (m && ehPais(m[1])) return m[1].toUpperCase();
  }
  return '';
}

/**
 * Embaralha os paises (Fisher-Yates com o rng dado), sem os excluidos.
 * @param {() => number} rng @param {readonly string[]} [excluir]
 */
export function embaralharPaises(rng, excluir = []) {
  const l = PAISES.filter((p) => !excluir.includes(p));
  for (let i = l.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [l[i], l[j]] = [l[j], l[i]];
  }
  return l;
}
