// Textos do Volei de Gosma: EN (base), PT e ES. Chaves em ASCII; quase tudo e icone.
// Folga de 35% para FR/IT/DE/TR (o cabe() da comemoracao ajusta a palavra).

/** @type {Record<string, Record<string, string>>} */
const T = {
  en: {
    titulo: 'Goo Spike!',
    'grito.ponto': 'POINT!', 'grito.ace': 'ACE!', 'grito.bomba': 'SPIKE!', 'grito.bloqueio': 'BLOCK!', 'grito.fora': 'OUT!',
    'grito.rede': 'NET!', 'grito.toques4': '4 TOUCHES!', 'grito.virada': 'COMEBACK!', 'grito.rali': 'WHAT A RALLY!',
    'grito.fogo': 'FIRE!', 'grito.raio': 'BOLT!', 'grito.jornada': 'SKY SERVE!', 'grito.manchete': 'NICE DIG!',
    'grito.vitoria': 'VICTORY!', 'grito.derrota': 'DEFEAT', 'grito.vai': 'GO!', 'grito.matchPoint': 'MATCH POINT',
    'rival.gota': 'Drop', 'rival.geleia': 'Jelly', 'rival.rei': 'Goo King', 'rival.bolinha': 'Bubbles', 'rival.muralha': 'The Wall',
    'rival.pudim': 'Ms. Pudding', 'rival.faisca': 'Spark', 'rival.calma': 'Mrs. Calm', 'rival.chiclete': 'Bubblegum',
    'rival.bolota': 'Chunky', 'rival.nuvem': 'Granny Cloud', 'rival.trovao': 'Thunder', 'rival.cometa': 'Comet',
    'rival.geleiao': 'Big Jelly', 'rival.pimenta': 'Pepper',
    'ui.jogar': 'Play', 'ui.proxima': 'Next', 'ui.revanche': 'Rematch', 'ui.continuar': 'Continue', 'ui.voce': 'You',
    'ui.pausa': 'Paused', 'ui.dois': '2 Players', 'ui.amistoso': 'Friendly', 'ui.circuito': 'Goo Circuit', 'ui.vestiario': 'Locker Room',
    'ui.som': 'Sound', 'ui.vibrar': 'Vibration', 'ui.controle': 'Controls', 'ui.metades': 'Halves', 'ui.botoes': 'Buttons',
    'ui.venceu': 'You won!', 'ui.perdeu': 'You lost', 'ui.gotas': 'Drops',
    'dica.toque': 'tap to jump', 'dica.cortada': 'jump · tap again and hold', 'dica.clique': 'click to jump',
    'dica.teclas': 'A/D move · W jump', 'dica.receber': 'tap to receive', 'dica.girar': 'Turn your phone for 2 players',
    'nome.cortada': 'Slow-Mo Spike', 'nome.fogo': 'Fire Serve', 'nome.raio': 'Bolt Serve', 'nome.jornada': 'Sky Serve',
    'ginasio.praia': 'Serve Beach', 'ginasio.escola': 'School Gym', 'ginasio.rua': 'Street Court', 'ginasio.arena': 'Jelly Arena',
  },
  pt: {
    titulo: 'Vôlei de Gosma',
    'grito.ponto': 'PONTO!', 'grito.ace': 'ACE!', 'grito.bomba': 'BOMBA!', 'grito.bloqueio': 'BLOQUEIO!', 'grito.fora': 'FORA!',
    'grito.rede': 'NA REDE!', 'grito.toques4': '4 TOQUES!', 'grito.virada': 'VIRADA!', 'grito.rali': 'QUE RALI!',
    'grito.fogo': 'FOGO!', 'grito.raio': 'RAIO!', 'grito.jornada': 'JORNADA!', 'grito.manchete': 'MANCHETE!',
    'grito.vitoria': 'VITÓRIA!', 'grito.derrota': 'DERROTA', 'grito.vai': 'VAI!', 'grito.matchPoint': 'PONTO DA PARTIDA',
    'rival.gota': 'Gota', 'rival.geleia': 'Geleia', 'rival.rei': 'Rei Gosma', 'rival.bolinha': 'Bolinha', 'rival.muralha': 'Muralha',
    'rival.pudim': 'Professora Pudim', 'rival.faisca': 'Faísca', 'rival.calma': 'Dona Calma', 'rival.chiclete': 'Chiclete',
    'rival.bolota': 'Bolota', 'rival.nuvem': 'Vovó Nuvem', 'rival.trovao': 'Trovão', 'rival.cometa': 'Cometa',
    'rival.geleiao': 'Geleião', 'rival.pimenta': 'Pimenta',
    'ui.jogar': 'Jogar', 'ui.proxima': 'Próxima', 'ui.revanche': 'Revanche', 'ui.continuar': 'Continuar', 'ui.voce': 'Você',
    'ui.pausa': 'Pausa', 'ui.dois': '2 Jogadores', 'ui.amistoso': 'Amistoso', 'ui.circuito': 'Circuito Gosma', 'ui.vestiario': 'Vestiário',
    'ui.som': 'Som', 'ui.vibrar': 'Vibração', 'ui.controle': 'Controle', 'ui.metades': 'Metades', 'ui.botoes': 'Botões',
    'ui.venceu': 'Você venceu!', 'ui.perdeu': 'Você perdeu', 'ui.gotas': 'Gotas',
    'dica.toque': 'toque para pular', 'dica.cortada': 'pule · toque de novo e segure', 'dica.clique': 'clique para pular',
    'dica.teclas': 'A/D anda · W pula', 'dica.receber': 'toque para receber', 'dica.girar': 'Gire o celular para 2 jogadores',
    'nome.cortada': 'Cortada Câmera Lenta', 'nome.fogo': 'Saque de Fogo', 'nome.raio': 'Saque Raio', 'nome.jornada': 'Saque Jornada',
    'ginasio.praia': 'Praia do Saque', 'ginasio.escola': 'Quadra da Escola', 'ginasio.rua': 'Quadra da Rua', 'ginasio.arena': 'Arena Gelatão',
  },
  es: {
    titulo: 'Goo Spike!',
    'grito.ponto': '¡PUNTO!', 'grito.ace': '¡ACE!', 'grito.bomba': '¡REMATE!', 'grito.bloqueio': '¡BLOQUEO!', 'grito.fora': '¡FUERA!',
    'grito.rede': '¡RED!', 'grito.toques4': '¡4 TOQUES!', 'grito.virada': '¡REMONTADA!', 'grito.rali': '¡QUÉ RALLY!',
    'grito.fogo': '¡FUEGO!', 'grito.raio': '¡RAYO!', 'grito.jornada': '¡AL CIELO!', 'grito.manchete': '¡QUÉ DEFENSA!',
    'grito.vitoria': '¡VICTORIA!', 'grito.derrota': 'DERROTA', 'grito.vai': '¡YA!', 'grito.matchPoint': 'PUNTO DE PARTIDO',
    'rival.gota': 'Gota', 'rival.geleia': 'Gelatina', 'rival.rei': 'Rey Baba', 'rival.bolinha': 'Burbuja', 'rival.muralha': 'Muralla',
    'rival.pudim': 'Profe Flan', 'rival.faisca': 'Chispa', 'rival.calma': 'Doña Calma', 'rival.chiclete': 'Chicle',
    'rival.bolota': 'Bolita', 'rival.nuvem': 'Abuela Nube', 'rival.trovao': 'Trueno', 'rival.cometa': 'Cometa',
    'rival.geleiao': 'Gelatón', 'rival.pimenta': 'Pimienta',
    'ui.jogar': 'Jugar', 'ui.proxima': 'Siguiente', 'ui.revanche': 'Revancha', 'ui.continuar': 'Continuar', 'ui.voce': 'Tú',
    'ui.pausa': 'Pausa', 'ui.dois': '2 Jugadores', 'ui.amistoso': 'Amistoso', 'ui.circuito': 'Circuito Baba', 'ui.vestiario': 'Vestuario',
    'ui.som': 'Sonido', 'ui.vibrar': 'Vibración', 'ui.controle': 'Control', 'ui.metades': 'Mitades', 'ui.botoes': 'Botones',
    'ui.venceu': '¡Ganaste!', 'ui.perdeu': 'Perdiste', 'ui.gotas': 'Gotas',
    'dica.toque': 'toca para saltar', 'dica.cortada': 'salta · toca otra vez y mantén', 'dica.clique': 'clic para saltar',
    'dica.teclas': 'A/D mover · W saltar', 'dica.receber': 'toca para recibir', 'dica.girar': 'Gira el móvil para 2 jugadores',
    'nome.cortada': 'Remate en Cámara Lenta', 'nome.fogo': 'Saque de Fuego', 'nome.raio': 'Saque Rayo', 'nome.jornada': 'Saque al Cielo',
    'ginasio.praia': 'Playa del Saque', 'ginasio.escola': 'Gimnasio Escolar', 'ginasio.rua': 'Cancha de Barrio', 'ginasio.arena': 'Arena Gelatón',
  },
};

export const IDIOMAS = Object.freeze(Object.keys(T));

/**
 * Idioma: o da plataforma (PokiSDK.getLanguage(), pelo wrapper), o forcado (?lang= no
 * loopback), o do navegador, ou 'en'.
 * @param {string} [forcado] @param {string} [plataforma]
 */
export function escolherIdioma(forcado, plataforma) {
  const c = [forcado, plataforma, ...((globalThis.navigator && navigator.languages) || []), globalThis.navigator && navigator.language];
  for (const l of c) {
    if (!l) continue;
    const k = String(l).toLowerCase().slice(0, 2);
    if (T[k]) return k;
  }
  return 'en';
}

/** @param {string} idioma @returns {(k: string) => string} */
export function textos(idioma) {
  const d = T[idioma] || T.en;
  return (k) => d[k] ?? T.en[k] ?? k;
}

/** Todas as chaves (o i18n.test confere que os 3 idiomas tem as mesmas). */
export const CHAVES = Object.freeze(Object.keys(T.en));
export const TABELA = T;
