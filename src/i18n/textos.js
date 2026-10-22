// Textos do Volei de Gosma: EN (base), PT e ES. Chaves em ASCII; quase tudo e icone.
// Folga de 35% para FR/IT/DE/TR (o cabe() da comemoracao ajusta a palavra).

/** @type {Record<string, Record<string, string>>} */
const T = {
  en: {
    titulo: 'Goo Spike!',
    'grito.ponto': 'POINT!', 'grito.ace': 'ACE!', 'grito.bomba': 'SPIKE!', 'grito.bloqueio': 'BLOCK!', 'grito.fora': 'OUT!',
    'grito.rede': 'NET!', 'grito.toques4': '4 TOUCHES!', 'grito.virada': 'COMEBACK!', 'grito.rali': 'WHAT A RALLY!',
    'grito.fogo': 'FIRE!', 'grito.raio': 'BOLT!', 'grito.jornada': 'SKY SERVE!', 'grito.manchete': 'NICE DIG!', 'grito.saquePerfeito': 'PERFECT!',
    'pw.cortadaGratis': 'FREE SPIKE!', 'pw.puloMola': 'SPRING JUMP!', 'pw.gosmao': 'BIG GOO!', 'pw.segmento': '+1 BAR!',
    'pw.congelar': 'FREEZE!', 'pw.fogo': 'FIREBALL!', 'pw.turbo': 'TURBO!', 'pw.ima': 'MAGNET!', 'pw.encolher': 'SHRINK!',
    // Copa Gosma (src/jogo/torneio.js), menu e nomes de pais que o navegador escreve torto
    'copa.nome': 'Goo Cup {n}', 'copa.dezesseisavos': 'Round of 32', 'copa.oitavas': 'Round of 16', 'copa.quartas': 'Quarterfinal', 'copa.semi': 'Semifinal', 'copa.final': 'Final', 'copa.campeao': 'CHAMPION!', 'copa.proxima': 'Next: {fase} vs {rival}', 'copa.liberada': 'Goo Cup {n} unlocked!', 'copa.titulo': '+{g} Drops for the title', 'copa.selecao': 'Your team', 'ui.menu': 'Menu', 'ui.chave': 'Bracket', 'ui.voltar': 'Back', 'ui.opcoes': 'Options', 'pais.PS': 'Palestine', 'pais.CD': 'DR Congo', 'pais.CG': 'Congo',
    // vestiario (src/ui/vestiario.js), arquetipos e acessorios (src/jogo/visual.js)
    'vest.pronto': 'Done', 'vest.aba.prontas': 'Ready', 'vest.aba.bandeiras': 'Flags', 'vest.aba.cores': 'Colors', 'vest.aba.pintar': 'Paint', 'vest.aba.acessorios': 'Accessories', 'vest.skins': 'Skins', 'vest.personagens': 'Characters', 'vest.famosos': 'Famous (local test only)', 'vest.buscar': 'Search country…', 'vest.semBandeira': 'No flag', 'vest.cor': 'Color', 'vest.padrao': 'Pattern', 'vest.cor2': 'Pattern color', 'vest.tinta': 'Paint', 'vest.ferramentas': 'Brush', 'vest.borracha': 'Eraser', 'vest.balde': 'Bucket', 'vest.desfazer': 'Undo', 'vest.limpar': 'Clear', 'vest.cabeca': 'Head', 'vest.rosto': 'Face', 'vest.boca': 'Mouth', 'vest.nenhum': 'None', 'vest.faltam': '{n} more Drops', 'vest.comprou': 'Bought!', 'vest.dicaPintar': 'Paint right on the slime', 'ui.vestiarioBt': 'Locker Room', 'arq.goleiroMascarado': 'Masked Keeper', 'arq.pesadeloListrado': 'Striped Nightmare', 'arq.vampiro': 'Vampire', 'arq.mumia': 'Mummy', 'arq.monstroCosturado': 'Stitched Monster', 'arq.abobora': 'Pumpkin', 'arq.abelha': 'Bee', 'arq.pirata': 'Pirate', 'arq.ninja': 'Ninja', 'arq.viking': 'Viking', 'arq.astronauta': 'Astronaut', 'arq.robo': 'Robot', 'arq.mago': 'Wizard', 'arq.heroiMascarado': 'Masked Hero', 'arq.luchador': 'Luchador', 'arq.saci': 'Saci', 'ac.bone': 'Cap', 'ac.laco': 'Bow', 'ac.gorro': 'Beanie', 'ac.flor': 'Flower', 'ac.cartola': 'Top hat', 'ac.coroa': 'Crown', 'ac.bruxa': 'Wizard hat', 'ac.pirata': 'Pirate hat', 'ac.tiara': 'Tiara', 'ac.aureola': 'Halo', 'ac.viking': 'Viking helmet', 'ac.chef': 'Chef hat', 'ac.natal': 'Santa hat', 'ac.orelhasGato': 'Cat ears', 'ac.orelhasCoelho': 'Bunny ears', 'ac.orelhasPanda': 'Panda ears', 'ac.astronauta': 'Space helmet', 'ac.cowboy': 'Cowboy hat', 'ac.fedora': 'Fedora', 'ac.antena': 'Antenna', 'ac.antenasAbelha': 'Feelers', 'ac.cabeloVampiro': 'Vampire hair', 'ac.cabeloReto': 'Flat hair', 'ac.cabinho': 'Stem', 'ac.gorroSaci': 'Red cap', 'ac.bandana': 'Bandana', 'ac.oculosEscuros': 'Sunglasses', 'ac.oculosRedondos': 'Round glasses', 'ac.mascaraHoquei': 'Goalie mask', 'ac.mascaraHeroi': 'Hero mask', 'ac.luchador': 'Luchador mask', 'ac.tapaOlho': 'Eye patch', 'ac.faixaNinja': 'Ninja band', 'ac.parafusos': 'Bolts', 'ac.bigode': 'Mustache', 'ac.presas': 'Fangs', 'ac.barba': 'Beard', 'ac.barbaBranca': 'Wizard beard', 'ac.apito': 'Whistle', 'ac.gravata': 'Bow tie',
    'reacao.rindo': 'Laugh', 'reacao.gargalhada': 'LOL', 'reacao.convencido': 'Smug', 'reacao.bravo': 'Angry', 'reacao.chorando': 'Cry',
    // falas dos slimes (src/jogo/falas.js): 14 caracteres no maximo
    'fala.nemViu': "Didn't see it!", 'fala.saqueBruto': 'What a serve!', 'fala.bomba': 'Boom!', 'fala.tomaEssa': 'Take that!', 'fala.aquiNao': 'Not here!', 'fala.paredao': 'The wall!', 'fala.virou': 'Comeback!', 'fala.isso': 'Yes!', 'fala.uhuu': 'Woohoo!', 'fala.facil': 'Easy!', 'fala.valeuRede': 'Thanks, net!', 'fala.ops': 'Oops!', 'fala.aff': 'Ugh!', 'fala.quase': 'So close!', 'fala.sorte': 'Lucky...', 'fala.faltaUma': 'One more!', 'fala.aindaNao': 'Not yet!', 'fala.naoCai': 'Keep it up!', 'fala.ufa': 'Phew!', 'fala.laVai': 'Here it comes!', 'fala.defendi': 'Saved!', 'fala.nadaPassa': 'No way!', 'fala.laVaiBomba': 'Incoming!', 'fala.poder': 'Power up!', 'fala.brrr': 'Brrr!', 'fala.queimou': 'Hot! Hot!', 'fala.foiMalJuiz': 'Sorry, ref!', 'fala.boraJogar': "Let's play!", 'fala.souRei': "I'm the king!", 'fala.jaE': 'Huh? Now?', 'fala.fraquinho': 'Too easy!', 'fala.deJoelhos': 'Bow down!',
    'reacao.coracao': 'Love', 'reacao.oculos': 'Cool', 'reacao.zzz': 'Sleepy', 'reacao.fogo': 'On fire', 'reacao.coroa': 'King',
    'ui.nivel': 'Level', 'ui.nivelN': 'LEVEL {n}!', 'ui.premio2': 'Reward ×2', 'ui.dobrado': 'doubled!',
    'pwn.cortadaGratis': 'Free Spike', 'pwn.puloMola': 'Spring Jump', 'pwn.gosmao': 'Big Goo', 'pwn.segmento': '+1 Bar', 'pwn.congelar': 'Freeze',
    'pwn.fogo': 'Fireball', 'pwn.turbo': 'Turbo', 'pwn.ima': 'Magnet', 'pwn.encolher': 'Shrink', 'pwn.pisoMola': 'Bouncy Floor', 'pwn.cola': 'Sticky',
    'pwn.pesada': 'Heavy Ball',
    'skin.laranjinha': 'Orangey', 'skin.listrado': 'Striped', 'skin.faixa': 'Sash', 'skin.metades': 'Halves', 'skin.xadrez': 'Checkered',
    'pw.pisoMola': 'BOUNCY FLOOR!', 'pw.cola': 'STICKY!', 'pw.pesada': 'HEAVY BALL!',
    'grito.vitoria': 'VICTORY!', 'grito.derrota': 'DEFEAT', 'grito.vai': 'GO!', 'grito.matchPoint': 'MATCH POINT',
    'rival.gota': 'Drop', 'rival.geleia': 'Jelly', 'rival.rei': 'Goo King', 'rival.bolinha': 'Bubbles', 'rival.muralha': 'The Wall',
    'rival.pudim': 'Ms. Pudding', 'rival.faisca': 'Spark', 'rival.calma': 'Mrs. Calm', 'rival.chiclete': 'Bubblegum',
    'rival.bolota': 'Chunky', 'rival.nuvem': 'Granny Cloud', 'rival.trovao': 'Thunder', 'rival.cometa': 'Comet',
    'rival.geleiao': 'Big Jelly', 'rival.pimenta': 'Pepper',
    'rival.pingo': 'Drip', 'rival.mingau': 'Porridge', 'rival.quiabo': 'Okra', 'rival.onda': 'Wave', 'rival.vulcao': 'Volcano',
    'rival.xarope': 'Syrup', 'rival.mel': 'Honey', 'rival.lama': 'Mud', 'rival.musgo': 'Moss', 'rival.piche': 'Tar', 'rival.amora': 'Berry',
    'rival.kiwi': 'Kiwi', 'rival.tapioca': 'Tapioca', 'rival.grude': 'Sticky', 'rival.brejo': 'Bog', 'rival.melado': 'Molasses',
    'ui.jogar': 'Play', 'ui.proxima': 'Next', 'ui.revanche': 'Rematch', 'ui.continuar': 'Continue', 'ui.voce': 'You',
    'ui.pausa': 'Paused', 'ui.dois': '2 Players', 'ui.amistoso': 'Friendly', 'ui.circuito': 'Goo Circuit', 'ui.vestiario': 'Locker Room',
    'ui.som': 'Sound', 'ui.vibrar': 'Vibration', 'ui.controle': 'Controls', 'ui.metades': 'Halves', 'ui.botoes': 'Buttons',
    'ui.venceu': 'You won!', 'ui.perdeu': 'You lost', 'ui.gotas': 'Drops',
    'dica.toque': 'tap to jump', 'dica.cortada': 'jump · tap again and hold', 'dica.clique': 'click to jump',
    'dica.teclas': 'A/D move · W jump', 'dica.receber': 'tap to receive',
    'dica.sacar': 'tap to toss', 'dica.sacarTecla': 'W or click to toss', 'dica.bater': 'move to aim, tap when the ring closes', 'dica.girar': 'Turn your phone for 2 players',
    'nome.cortada': 'Slow-Mo Spike', 'nome.fogo': 'Fire Serve', 'nome.raio': 'Bolt Serve', 'nome.jornada': 'Sky Serve',
    'ginasio.praia': 'Serve Beach', 'ginasio.escola': 'School Gym', 'ginasio.rua': 'Street Court', 'ginasio.arena': 'Jelly Arena',
  },
  pt: {
    titulo: 'Vôlei de Gosma',
    'grito.ponto': 'PONTO!', 'grito.ace': 'ACE!', 'grito.bomba': 'BOMBA!', 'grito.bloqueio': 'BLOQUEIO!', 'grito.fora': 'FORA!',
    'grito.rede': 'NA REDE!', 'grito.toques4': '4 TOQUES!', 'grito.virada': 'VIRADA!', 'grito.rali': 'QUE RALI!',
    'grito.fogo': 'FOGO!', 'grito.raio': 'RAIO!', 'grito.jornada': 'JORNADA!', 'grito.manchete': 'MANCHETE!', 'grito.saquePerfeito': 'PERFEITO!',
    'pw.cortadaGratis': 'CORTADA GRÁTIS!', 'pw.puloMola': 'PULO MOLA!', 'pw.gosmao': 'GOSMÃO!', 'pw.segmento': '+1 SEGMENTO!',
    'pw.congelar': 'CONGELA!', 'pw.fogo': 'BOLA DE FOGO!', 'pw.turbo': 'TURBO!', 'pw.ima': 'ÍMÃ!', 'pw.encolher': 'ENCOLHE!',
    // Copa Gosma (src/jogo/torneio.js), menu e nomes de pais que o navegador escreve torto
    'copa.nome': 'Copa Gosma {n}', 'copa.dezesseisavos': '16-avos', 'copa.oitavas': 'Oitavas', 'copa.quartas': 'Quartas', 'copa.semi': 'Semifinal', 'copa.final': 'Final', 'copa.campeao': 'CAMPEÃO!', 'copa.proxima': 'Próxima: {fase} contra {rival}', 'copa.liberada': 'Copa Gosma {n} liberada!', 'copa.titulo': '+{g} Gotas pelo título', 'copa.selecao': 'Sua seleção', 'ui.menu': 'Menu', 'ui.chave': 'Chave', 'ui.voltar': 'Voltar', 'ui.opcoes': 'Opções', 'pais.PS': 'Palestina', 'pais.CD': 'RD Congo', 'pais.CG': 'Congo',
    // vestiario (src/ui/vestiario.js), arquetipos e acessorios (src/jogo/visual.js)
    'vest.pronto': 'Pronto', 'vest.aba.prontas': 'Prontas', 'vest.aba.bandeiras': 'Bandeiras', 'vest.aba.cores': 'Cores', 'vest.aba.pintar': 'Pintar', 'vest.aba.acessorios': 'Acessórios', 'vest.skins': 'Skins', 'vest.personagens': 'Personagens', 'vest.famosos': 'Famosos (só no teste local)', 'vest.buscar': 'Buscar país…', 'vest.semBandeira': 'Sem bandeira', 'vest.cor': 'Cor', 'vest.padrao': 'Padrão', 'vest.cor2': 'Cor do padrão', 'vest.tinta': 'Tinta', 'vest.ferramentas': 'Pincel', 'vest.borracha': 'Borracha', 'vest.balde': 'Balde', 'vest.desfazer': 'Desfazer', 'vest.limpar': 'Limpar', 'vest.cabeca': 'Cabeça', 'vest.rosto': 'Rosto', 'vest.boca': 'Boca', 'vest.nenhum': 'Nenhum', 'vest.faltam': 'Faltam {n} Gotas', 'vest.comprou': 'Comprado!', 'vest.dicaPintar': 'Pinte direto no slime', 'ui.vestiarioBt': 'Vestiário', 'arq.goleiroMascarado': 'Goleiro Mascarado', 'arq.pesadeloListrado': 'Pesadelo Listrado', 'arq.vampiro': 'Vampiro', 'arq.mumia': 'Múmia', 'arq.monstroCosturado': 'Monstro Costurado', 'arq.abobora': 'Abóbora', 'arq.abelha': 'Abelha', 'arq.pirata': 'Pirata', 'arq.ninja': 'Ninja', 'arq.viking': 'Viking', 'arq.astronauta': 'Astronauta', 'arq.robo': 'Robô', 'arq.mago': 'Mago', 'arq.heroiMascarado': 'Herói Mascarado', 'arq.luchador': 'Luchador', 'arq.saci': 'Saci', 'ac.bone': 'Boné', 'ac.laco': 'Laço', 'ac.gorro': 'Gorro', 'ac.flor': 'Flor', 'ac.cartola': 'Cartola', 'ac.coroa': 'Coroa', 'ac.bruxa': 'Chapéu de mago', 'ac.pirata': 'Chapéu pirata', 'ac.tiara': 'Tiara', 'ac.aureola': 'Auréola', 'ac.viking': 'Elmo viking', 'ac.chef': 'Chapéu de chef', 'ac.natal': 'Gorro de Natal', 'ac.orelhasGato': 'Orelhas de gato', 'ac.orelhasCoelho': 'Orelhas de coelho', 'ac.orelhasPanda': 'Orelhas de panda', 'ac.astronauta': 'Capacete espacial', 'ac.cowboy': 'Chapéu de caubói', 'ac.fedora': 'Chapéu de feltro', 'ac.antena': 'Antena', 'ac.antenasAbelha': 'Anteninhas', 'ac.cabeloVampiro': 'Cabelo de vampiro', 'ac.cabeloReto': 'Franja reta', 'ac.cabinho': 'Cabinho', 'ac.gorroSaci': 'Gorro vermelho', 'ac.bandana': 'Bandana', 'ac.oculosEscuros': 'Óculos escuros', 'ac.oculosRedondos': 'Óculos redondos', 'ac.mascaraHoquei': 'Máscara de goleiro', 'ac.mascaraHeroi': 'Máscara de herói', 'ac.luchador': 'Máscara de luchador', 'ac.tapaOlho': 'Tapa-olho', 'ac.faixaNinja': 'Faixa ninja', 'ac.parafusos': 'Parafusos', 'ac.bigode': 'Bigode', 'ac.presas': 'Presas', 'ac.barba': 'Barba', 'ac.barbaBranca': 'Barba de mago', 'ac.apito': 'Apito', 'ac.gravata': 'Gravata-borboleta',
    'reacao.rindo': 'Rindo', 'reacao.gargalhada': 'Gargalhada', 'reacao.convencido': 'Convencido', 'reacao.bravo': 'Bravo', 'reacao.chorando': 'Chorando',
    // falas dos slimes (src/jogo/falas.js): 14 caracteres no maximo
    'fala.nemViu': 'Nem viu!', 'fala.saqueBruto': 'Saque bruto!', 'fala.bomba': 'Bomba!', 'fala.tomaEssa': 'Toma essa!', 'fala.aquiNao': 'Aqui não!', 'fala.paredao': 'Paredão!', 'fala.virou': 'Virou!', 'fala.isso': 'Isso!', 'fala.uhuu': 'Uhuu!', 'fala.facil': 'Fácil!', 'fala.valeuRede': 'Valeu, rede!', 'fala.ops': 'Ops!', 'fala.aff': 'Aff!', 'fala.quase': 'Quase!', 'fala.sorte': 'Sorte...', 'fala.faltaUma': 'Falta uma!', 'fala.aindaNao': 'Ainda não!', 'fala.naoCai': 'Não cai!', 'fala.ufa': 'Ufa!', 'fala.laVai': 'Lá vai!', 'fala.defendi': 'Defendi!', 'fala.nadaPassa': 'Nada passa!', 'fala.laVaiBomba': 'Lá vai bomba!', 'fala.poder': 'Poder!', 'fala.brrr': 'Brrr!', 'fala.queimou': 'Queimou!', 'fala.foiMalJuiz': 'Foi mal, juiz!', 'fala.boraJogar': 'Bora jogar!', 'fala.souRei': 'Sou o rei!', 'fala.jaE': 'Oi? Já é?', 'fala.fraquinho': 'Fraquinho!', 'fala.deJoelhos': 'Curve-se!',
    'reacao.coracao': 'Coração', 'reacao.oculos': 'Óculos escuros', 'reacao.zzz': 'Sono', 'reacao.fogo': 'Pegando fogo', 'reacao.coroa': 'Coroa',
    'ui.nivel': 'Nível', 'ui.nivelN': 'NÍVEL {n}!', 'ui.premio2': 'Prêmio ×2', 'ui.dobrado': 'dobrado!',
    'pwn.cortadaGratis': 'Cortada Grátis', 'pwn.puloMola': 'Pulo Mola', 'pwn.gosmao': 'Gosmão', 'pwn.segmento': '+1 Segmento', 'pwn.congelar': 'Congelar',
    'pwn.fogo': 'Bola de Fogo', 'pwn.turbo': 'Turbo', 'pwn.ima': 'Ímã', 'pwn.encolher': 'Encolher', 'pwn.pisoMola': 'Piso Mola', 'pwn.cola': 'Cola',
    'pwn.pesada': 'Bola Pesada',
    'skin.laranjinha': 'Laranjinha', 'skin.listrado': 'Listrado', 'skin.faixa': 'Faixa', 'skin.metades': 'Metades', 'skin.xadrez': 'Xadrez',
    'pw.pisoMola': 'PISO MOLA!', 'pw.cola': 'COLA!', 'pw.pesada': 'BOLA PESADA!',
    'grito.vitoria': 'VITÓRIA!', 'grito.derrota': 'DERROTA', 'grito.vai': 'VAI!', 'grito.matchPoint': 'PONTO DA PARTIDA',
    'rival.gota': 'Gota', 'rival.geleia': 'Geleia', 'rival.rei': 'Rei Gosma', 'rival.bolinha': 'Bolinha', 'rival.muralha': 'Muralha',
    'rival.pudim': 'Professora Pudim', 'rival.faisca': 'Faísca', 'rival.calma': 'Dona Calma', 'rival.chiclete': 'Chiclete',
    'rival.bolota': 'Bolota', 'rival.nuvem': 'Vovó Nuvem', 'rival.trovao': 'Trovão', 'rival.cometa': 'Cometa',
    'rival.geleiao': 'Geleião', 'rival.pimenta': 'Pimenta',
    'rival.pingo': 'Pingo', 'rival.mingau': 'Mingau', 'rival.quiabo': 'Quiabo', 'rival.onda': 'Onda', 'rival.vulcao': 'Vulcão',
    'rival.xarope': 'Xarope', 'rival.mel': 'Mel', 'rival.lama': 'Lama', 'rival.musgo': 'Musgo', 'rival.piche': 'Piche', 'rival.amora': 'Amora',
    'rival.kiwi': 'Kiwi', 'rival.tapioca': 'Tapioca', 'rival.grude': 'Grude', 'rival.brejo': 'Brejo', 'rival.melado': 'Melado',
    'ui.jogar': 'Jogar', 'ui.proxima': 'Próxima', 'ui.revanche': 'Revanche', 'ui.continuar': 'Continuar', 'ui.voce': 'Você',
    'ui.pausa': 'Pausa', 'ui.dois': '2 Jogadores', 'ui.amistoso': 'Amistoso', 'ui.circuito': 'Circuito Gosma', 'ui.vestiario': 'Vestiário',
    'ui.som': 'Som', 'ui.vibrar': 'Vibração', 'ui.controle': 'Controle', 'ui.metades': 'Metades', 'ui.botoes': 'Botões',
    'ui.venceu': 'Você venceu!', 'ui.perdeu': 'Você perdeu', 'ui.gotas': 'Gotas',
    'dica.toque': 'toque para pular', 'dica.cortada': 'pule · toque de novo e segure', 'dica.clique': 'clique para pular',
    'dica.teclas': 'A/D anda · W pula', 'dica.receber': 'toque para receber',
    'dica.sacar': 'toque para levantar', 'dica.sacarTecla': 'W ou clique para levantar', 'dica.bater': 'ande para mirar e toque quando o anel fechar', 'dica.girar': 'Gire o celular para 2 jogadores',
    'nome.cortada': 'Cortada Câmera Lenta', 'nome.fogo': 'Saque de Fogo', 'nome.raio': 'Saque Raio', 'nome.jornada': 'Saque Jornada',
    'ginasio.praia': 'Praia do Saque', 'ginasio.escola': 'Quadra da Escola', 'ginasio.rua': 'Quadra da Rua', 'ginasio.arena': 'Arena Gelatão',
  },
  es: {
    titulo: 'Goo Spike!',
    'grito.ponto': '¡PUNTO!', 'grito.ace': '¡ACE!', 'grito.bomba': '¡REMATE!', 'grito.bloqueio': '¡BLOQUEO!', 'grito.fora': '¡FUERA!',
    'grito.rede': '¡RED!', 'grito.toques4': '¡4 TOQUES!', 'grito.virada': '¡REMONTADA!', 'grito.rali': '¡QUÉ RALLY!',
    'grito.fogo': '¡FUEGO!', 'grito.raio': '¡RAYO!', 'grito.jornada': '¡AL CIELO!', 'grito.manchete': '¡QUÉ DEFENSA!', 'grito.saquePerfeito': '¡PERFECTO!',
    'pw.cortadaGratis': '¡REMATE GRATIS!', 'pw.puloMola': '¡SALTO MUELLE!', 'pw.gosmao': '¡GOSMÓN!', 'pw.segmento': '¡+1 SEGMENTO!',
    'pw.congelar': '¡CONGELA!', 'pw.fogo': '¡BOLA DE FUEGO!', 'pw.turbo': '¡TURBO!', 'pw.ima': '¡IMÁN!', 'pw.encolher': '¡ENCOGE!',
    // Copa Gosma (src/jogo/torneio.js), menu e nomes de pais que o navegador escreve torto
    'copa.nome': 'Copa Slime {n}', 'copa.dezesseisavos': 'Dieciseisavos', 'copa.oitavas': 'Octavos', 'copa.quartas': 'Cuartos', 'copa.semi': 'Semifinal', 'copa.final': 'Final', 'copa.campeao': '¡CAMPEÓN!', 'copa.proxima': 'Sigue: {fase} contra {rival}', 'copa.liberada': '¡Copa Slime {n} desbloqueada!', 'copa.titulo': '+{g} Gotas por el título', 'copa.selecao': 'Tu selección', 'ui.menu': 'Menú', 'ui.chave': 'Cuadro', 'ui.voltar': 'Volver', 'ui.opcoes': 'Opciones', 'pais.PS': 'Palestina', 'pais.CD': 'RD del Congo', 'pais.CG': 'Congo',
    // vestiario (src/ui/vestiario.js), arquetipos e acessorios (src/jogo/visual.js)
    'vest.pronto': 'Listo', 'vest.aba.prontas': 'Listas', 'vest.aba.bandeiras': 'Banderas', 'vest.aba.cores': 'Colores', 'vest.aba.pintar': 'Pintar', 'vest.aba.acessorios': 'Accesorios', 'vest.skins': 'Skins', 'vest.personagens': 'Personajes', 'vest.famosos': 'Famosos (solo prueba local)', 'vest.buscar': 'Buscar país…', 'vest.semBandeira': 'Sin bandera', 'vest.cor': 'Color', 'vest.padrao': 'Patrón', 'vest.cor2': 'Color del patrón', 'vest.tinta': 'Pintura', 'vest.ferramentas': 'Pincel', 'vest.borracha': 'Goma', 'vest.balde': 'Cubo', 'vest.desfazer': 'Deshacer', 'vest.limpar': 'Borrar', 'vest.cabeca': 'Cabeza', 'vest.rosto': 'Cara', 'vest.boca': 'Boca', 'vest.nenhum': 'Ninguno', 'vest.faltam': 'Faltan {n} Gotas', 'vest.comprou': '¡Comprado!', 'vest.dicaPintar': 'Pinta directo en el slime', 'ui.vestiarioBt': 'Vestuario', 'arq.goleiroMascarado': 'Portero Enmascarado', 'arq.pesadeloListrado': 'Pesadilla a Rayas', 'arq.vampiro': 'Vampiro', 'arq.mumia': 'Momia', 'arq.monstroCosturado': 'Monstruo Cosido', 'arq.abobora': 'Calabaza', 'arq.abelha': 'Abeja', 'arq.pirata': 'Pirata', 'arq.ninja': 'Ninja', 'arq.viking': 'Vikingo', 'arq.astronauta': 'Astronauta', 'arq.robo': 'Robot', 'arq.mago': 'Mago', 'arq.heroiMascarado': 'Héroe Enmascarado', 'arq.luchador': 'Luchador', 'arq.saci': 'Saci', 'ac.bone': 'Gorra', 'ac.laco': 'Lazo', 'ac.gorro': 'Gorro', 'ac.flor': 'Flor', 'ac.cartola': 'Chistera', 'ac.coroa': 'Corona', 'ac.bruxa': 'Sombrero de mago', 'ac.pirata': 'Sombrero pirata', 'ac.tiara': 'Tiara', 'ac.aureola': 'Aureola', 'ac.viking': 'Casco vikingo', 'ac.chef': 'Gorro de chef', 'ac.natal': 'Gorro navideño', 'ac.orelhasGato': 'Orejas de gato', 'ac.orelhasCoelho': 'Orejas de conejo', 'ac.orelhasPanda': 'Orejas de panda', 'ac.astronauta': 'Casco espacial', 'ac.cowboy': 'Sombrero vaquero', 'ac.fedora': 'Sombrero de fieltro', 'ac.antena': 'Antena', 'ac.antenasAbelha': 'Antenitas', 'ac.cabeloVampiro': 'Pelo de vampiro', 'ac.cabeloReto': 'Flequillo recto', 'ac.cabinho': 'Rabito', 'ac.gorroSaci': 'Gorro rojo', 'ac.bandana': 'Bandana', 'ac.oculosEscuros': 'Gafas de sol', 'ac.oculosRedondos': 'Gafas redondas', 'ac.mascaraHoquei': 'Máscara de portero', 'ac.mascaraHeroi': 'Antifaz de héroe', 'ac.luchador': 'Máscara de luchador', 'ac.tapaOlho': 'Parche', 'ac.faixaNinja': 'Cinta ninja', 'ac.parafusos': 'Tornillos', 'ac.bigode': 'Bigote', 'ac.presas': 'Colmillos', 'ac.barba': 'Barba', 'ac.barbaBranca': 'Barba de mago', 'ac.apito': 'Silbato', 'ac.gravata': 'Pajarita',
    'reacao.rindo': 'Risa', 'reacao.gargalhada': 'Carcajada', 'reacao.convencido': 'Creído', 'reacao.bravo': 'Enojado', 'reacao.chorando': 'Llorando',
    // falas dos slimes (src/jogo/falas.js): 14 caracteres no maximo
    'fala.nemViu': '¡Ni la viste!', 'fala.saqueBruto': '¡Qué saque!', 'fala.bomba': '¡Bum!', 'fala.tomaEssa': '¡Toma esa!', 'fala.aquiNao': '¡Aquí no!', 'fala.paredao': '¡Muralla!', 'fala.virou': '¡Remontada!', 'fala.isso': '¡Sí!', 'fala.uhuu': '¡Yuju!', 'fala.facil': '¡Fácil!', 'fala.valeuRede': '¡Gracias, red!', 'fala.ops': '¡Uy!', 'fala.aff': '¡Uf!', 'fala.quase': '¡Casi!', 'fala.sorte': 'Suerte...', 'fala.faltaUma': '¡Una más!', 'fala.aindaNao': '¡Aún no!', 'fala.naoCai': '¡No cae!', 'fala.ufa': '¡Uf!', 'fala.laVai': '¡Ahí va!', 'fala.defendi': '¡Salvada!', 'fala.nadaPassa': '¡Nada pasa!', 'fala.laVaiBomba': '¡Ahí va!', 'fala.poder': '¡Poder!', 'fala.brrr': '¡Brrr!', 'fala.queimou': '¡Quema!', 'fala.foiMalJuiz': '¡Perdón, juez!', 'fala.boraJogar': '¡A jugar!', 'fala.souRei': '¡Soy el rey!', 'fala.jaE': '¿Eh? ¿Ya?', 'fala.fraquinho': '¡Muy fácil!', 'fala.deJoelhos': '¡Arrodíllate!',
    'reacao.coracao': 'Corazón', 'reacao.oculos': 'Gafas de sol', 'reacao.zzz': 'Sueño', 'reacao.fogo': 'En llamas', 'reacao.coroa': 'Corona',
    'ui.nivel': 'Nivel', 'ui.nivelN': '¡NIVEL {n}!', 'ui.premio2': 'Premio ×2', 'ui.dobrado': '¡doble!',
    'pwn.cortadaGratis': 'Remate Gratis', 'pwn.puloMola': 'Salto Muelle', 'pwn.gosmao': 'Gosmón', 'pwn.segmento': '+1 Segmento', 'pwn.congelar': 'Congelar',
    'pwn.fogo': 'Bola de Fuego', 'pwn.turbo': 'Turbo', 'pwn.ima': 'Imán', 'pwn.encolher': 'Encoger', 'pwn.pisoMola': 'Suelo Muelle', 'pwn.cola': 'Pegajoso',
    'pwn.pesada': 'Bola Pesada',
    'skin.laranjinha': 'Naranjita', 'skin.listrado': 'Rayado', 'skin.faixa': 'Franja', 'skin.metades': 'Mitades', 'skin.xadrez': 'Cuadros',
    'pw.pisoMola': '¡SUELO MUELLE!', 'pw.cola': '¡PEGAJOSO!', 'pw.pesada': '¡BOLA PESADA!',
    'grito.vitoria': '¡VICTORIA!', 'grito.derrota': 'DERROTA', 'grito.vai': '¡YA!', 'grito.matchPoint': 'PUNTO DE PARTIDO',
    'rival.gota': 'Gota', 'rival.geleia': 'Gelatina', 'rival.rei': 'Rey Baba', 'rival.bolinha': 'Burbuja', 'rival.muralha': 'Muralla',
    'rival.pudim': 'Profe Flan', 'rival.faisca': 'Chispa', 'rival.calma': 'Doña Calma', 'rival.chiclete': 'Chicle',
    'rival.bolota': 'Bolita', 'rival.nuvem': 'Abuela Nube', 'rival.trovao': 'Trueno', 'rival.cometa': 'Cometa',
    'rival.geleiao': 'Gelatón', 'rival.pimenta': 'Pimienta',
    'rival.pingo': 'Gotita', 'rival.mingau': 'Gachas', 'rival.quiabo': 'Quimbombó', 'rival.onda': 'Ola', 'rival.vulcao': 'Volcán',
    'rival.xarope': 'Jarabe', 'rival.mel': 'Miel', 'rival.lama': 'Barro', 'rival.musgo': 'Musgo', 'rival.piche': 'Brea', 'rival.amora': 'Mora',
    'rival.kiwi': 'Kiwi', 'rival.tapioca': 'Tapioca', 'rival.grude': 'Pegote', 'rival.brejo': 'Ciénaga', 'rival.melado': 'Melaza',
    'ui.jogar': 'Jugar', 'ui.proxima': 'Siguiente', 'ui.revanche': 'Revancha', 'ui.continuar': 'Continuar', 'ui.voce': 'Tú',
    'ui.pausa': 'Pausa', 'ui.dois': '2 Jugadores', 'ui.amistoso': 'Amistoso', 'ui.circuito': 'Circuito Baba', 'ui.vestiario': 'Vestuario',
    'ui.som': 'Sonido', 'ui.vibrar': 'Vibración', 'ui.controle': 'Control', 'ui.metades': 'Mitades', 'ui.botoes': 'Botones',
    'ui.venceu': '¡Ganaste!', 'ui.perdeu': 'Perdiste', 'ui.gotas': 'Gotas',
    'dica.toque': 'toca para saltar', 'dica.cortada': 'salta · toca otra vez y mantén', 'dica.clique': 'clic para saltar',
    'dica.teclas': 'A/D mover · W saltar', 'dica.receber': 'toca para recibir',
    'dica.sacar': 'toca para lanzar', 'dica.sacarTecla': 'W o clic para lanzar', 'dica.bater': 'muévete para apuntar y toca cuando el anillo se cierre', 'dica.girar': 'Gira el móvil para 2 jugadores',
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
