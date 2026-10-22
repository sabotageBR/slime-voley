# M2b: pedidos de 2026-10-22

Dez pedidos do usuário, mais as bandeiras, aprovados no plano. As respostas do AskUserQuestion:
- **Copa:** mata-mata de 8 e de 16.
- **Pintura:** pincel livre, mais cores e padrões.
- **Juiz:** a bola quase não desvia.
- **Personagens:** arquétipos e personagens reais.
- **Bandeiras:** as de todos os países.

O trabalho foi dividido em 5 etapas, cada uma com o seu commit.

## Etapa 1: sensação

**Gosmão do jeito certo**
- **A causa:** a pele nascia com R = 2 e só se espalhava, com o núcleo do campo fixo em 0,48 u. Com R = 2,5, 176 de 761 células ficavam abaixo do limiar, e o shader desenhava contorno em volta dos buracos: são os arcos finos do print do usuário.
- **A correção:**
  - o núcleo agora escala com a pele (`escNucleo` = Rv/R0 · passo/0,31, por slime);
  - o contorno da meia-lua fica 0,22 u para dentro (era 0,32) e o núcleo tem 0,55 u (era 0,48).
- **Ganhos:** o miolo fica sólido em todos os raios e nas duas qualidades (a mínima também tinha buracos), e o topo da gosma passa a cair em cima da cúpula física: antes ficava 0,16 u abaixo, e a bola batia no ar.
- **Efeito:** o raio do desenho (`Rv`) é uma mola que incha passando uns 28% do degrau e assenta, com o som `inflar` e gotinhas; ao acabar, murcha (`murcho`). A colisão continua no `R`.
- **Teste e roteiro:** `test/pele.test.js` mede o campo real; `?roteiro=gosmao` mostra o Gosmão e o rival encolhido.

**Controle sem atraso**
- **Física:** `ACEL_CHAO` 85→150, `FREIO` 130→200, `ACEL_AR` 45→90 e `FREIO_AR` novo, de 150, para frear e inverter no ar. A inversão no ar foi de 0,49 s para 0,2 s.
- **Mouse:**
  - a intenção leva o `alvoX` e a partida acha o eixo com `seguirAlvo`, a maior velocidade que ainda freia até o alvo;
  - o cursor passa a ser convertido pela câmera do quadro desenhado (antes, pela câmera base, que fica até 0,6 u ao lado da que segue a bola);
  - o atraso com o cursor a 8 u/s foi de 0,39 u para 0,11 u, sem passar do ponto.
- **Stick:** a origem acompanha o dedo a partir de 40 px (era 56) e a curva é `^0,65`.
- **`tools/calibrar.mjs` (novo, `npm run calibrar`):** com 30 partidas, a mediana do rali foi de 5,8 s para 5,8 s (p90 de 17,3 s para 15,6 s) e os pontos na rede, de 39% para 33%. A IA não precisou de ajuste.

**Mira reta**
- **Desenho:** o feixe reto da bola até a retícula substitui as 9 gotas pela trajetória:
  - halo, corpo afilado e mais grosso com a força, tinta e núcleo claro;
  - chevrons andando rumo ao alvo e ponta de flecha com brilho;
  - tamanho mínimo na tela (até 1,8× no retrato).
- **Retícula nova:** zona, anel, 4 marcas, miolo e onda, sem a linha achatada pela perspectiva.
- **Resolvedor:** agora confere o topo do poste ao longo do voo e, sem solução, procura o lob mais baixo que passa limpo. Todo alvo cai a até 0,15 u da retícula (antes, os alvos de 1,15 a 2,9 batiam na rede).
- **Thumb:** passa `feixe: false` e mantém as setas dela.

**Saque com movimento**
- **Movimento:** depois do 1º toque, o sacador anda entre |x| 6,0 e 10,5.
- **Mira pela posição:** a bola à frente do corpo vai funda e chapada, em cima vai média e atrás vai curta. Saíram a mira pelo eixo, pelo cursor e pelo arrasto.
- **Alcance:** a batida exige a bola ao alcance da cúpula; longe dela, a bola volta para a mão, sem falta.
- **CPU:** anda até a posição do plano (`posicaoParaRumo`) e telegrafa o saque.
- A dica diz "ande para mirar e toque quando o anel fechar".

**Reações**
- **Quando:** o jogador reage a qualquer hora, inclusive no rali, com recarga de 2,5 s. A CPU segue com 1 por ponto, só fora do rali. Na cortada lenta, o rosto fica `focado`.
- **Como:**
  - um botão fixo, embaixo da pausa, abre a barra;
  - as teclas 1 a 0 valem sempre;
  - a barra tem botões de 64 px.
- **Balão:** de 64 a 136 px de diâmetro (antes, 32 a 95 px), e a 75% no rali.

**Testes:** 62, com os novos `pele`, os de controle no `fisica`, o da retícula no `cortada`, os do saque andando no `regras` e os de reação no rali.

## Etapa 2: juiz

- **Juiz da rede:** um humano pequeno, de boné e bigode, numa cadeirinha atrás do poste, no lugar da bandeirinha.
  - O módulo `src/jogo/juiz.js` é puro, com rng próprio, e anda no relógio do mundo.
  - O desenho fica em `src/render/juiz.js`, com cores apagadas e traço fino.
- **Olhar e ponto:** a cabeça e os olhos seguem a bola; no ponto, ele olha e aponta para quem ganhou.
- **Bolada:**
  - quando a bola passa pelo corpo dele, um sorteio decide se pegou "no plano dele" (4%, ou 9% em bola forte); se não pegou, ele pisca;
  - a bola não desvia, e o `hash()` da partida é igual com e sem o juiz;
  - deu 1,0 a 1,1 bolada por partida no `calibrar`.
- **8 reações:** tombo, pendurado, pião, galo, apito, boné, bigode e cartão amarelo, todas de volta ao posto em até 2,5 s. Os prints foram conferidos quadro a quadro, com `?roteiro=juiz-<reação>&filme=1&cada=N`.
- **Testes:** `test/juiz.test.js` (determinismo, hash com e sem o juiz, volta ao posto, apontar, olhar e taxa de boladas). São 67 testes.

## Etapa 3: falas

- **Catálogo:** `src/jogo/falas.js`, puro e com rng próprio, tem 22 gatilhos com chance e 32 falas curtas (`fala.<id>` em pt, en e es, até 14 caracteres). Entre elas:
  - ACE, BOMBA, bloqueio e virada;
  - match point ("Falta uma!" / "Ainda não!") e rali longo;
  - saque perfeito, manchete e cortada;
  - power-up, gelo, Bola de Fogo e bolada no juiz ("Foi mal, juiz!");
  - a abertura da CPU (o Rei se gaba, a Gota não viu que começou).
- **Ritmo:** uma fala por vez, 3,5 s de recarga por slime e 1 s de intervalo geral, nunca junto da reação. Deu cerca de 12 falas por partida no bot.
- **Balão de texto:** em px da tela, foge da bola e fica dentro da tela.
- **Voz:** o balbucio sintetizado (`som/falas.js`, 0 KB), que antes não era usado, agora toca no tom de cada slime.
- **Gravações:**
  - agora tocam `vozCombo4`, `vozCuidado` (efeito do rival vindo contra o jogador) e `vozNivel` (subida de nível);
  - saíram 9 arquivos que nunca tocavam (cerca de 37 KB a menos na build).
- **Testes:** `test/falas.test.js` (textos nas 3 línguas, balbucio, recarga, intervalo, frequência e determinismo). São 70 testes.

## Etapa 4: Copa Gosma e menu

- **Copa Gosma** (`src/jogo/torneio.js`, puro): mata-mata de 8 na Copa 1 e de 16 nas Copas 2 a 4.
  - O caminho é fixo pelos rivais da Copa, com o chefe na final.
  - Os outros jogos são simulados pelo nível, e cada vitória revela a rodada inteira.
  - Perder é revanche da mesma fase.
  - O save guarda só `{ n, semente, fase, placares, pais }`, e o save antigo (`perfil.fase`) vira a fase da Copa 1.
  - O título dá +50 Gotas (+20 nos seguintes) e `vozParabens`, e libera a Copa seguinte.
- **Bandeiras:**
  - `src/jogo/paises.js` tem os 195 códigos (ONU + Vaticano e Palestina);
  - `src/render/bandeiras.js` desenha as 195 numa mini-linguagem de primitivas, com brasões simplificados; foram conferidas numa folha inteira e de perto nas mais vistas;
  - os nomes vêm do `Intl.DisplayNames`, com 3 corrigidos no i18n;
  - a seleção do jogador vem do idioma do navegador.
- **Chave** (`src/render/chave.js`): espelhada na horizontal ou na vertical no retrato, com taça de gosma, bandeiras, nomes, placares, vencedor em ouro, o jogador na cor dele e a rodada nova animando. Aparece no cartão de fim, com o "Próxima: Semifinal contra Geleia (Kuwait)", e na tela da chave.
- **Menu principal** (`src/ui/menu.js`):
  - opções: Jogar (com a seleção e o próximo jogo), Chave, Controle e Som;
  - abre a partir da 2ª sessão, pelo cartão (Menu) e pela pausa (Menu);
  - teclado e Esc.
  - O fluxo pausa → Menu → Chave → Esc → Jogar foi conferido com cliques reais pelo CDP.
- **Parâmetros:** `?menu`, `?chave` e `?copa=N&fase=F`.
- **Testes:** `test/torneio.test.js` (tamanhos, caminho, revelação, placares, revanche, título, Copa seguinte e save) e `test/bandeiras.test.js` (195 sem repetir, todas desenhadas, nomes nas 3 línguas e o país pelo idioma). São 78 testes.

## Etapa 5: vestiário

- **Vestiário** (`src/ui/vestiario.js`, aberto pelo menu): a vitrine mostra o slime grande pelo motor da gosma, e tudo vale na hora.
  - **Prontas:** as skins, os 16 arquétipos e os famosos (local).
  - **Bandeiras:** as 195, com busca.
  - **Cores:** 24 pigmentos, 17 padrões e a 2ª cor.
  - **Pintar:** pincel direto no slime, com borracha, balde, desfazer e limpar.
  - **Acessórios:** 40, em 3 encaixes.
- **Shader:** estampa RGBA por slime (`uT4`, 128×64 no espaço da cúpula) e os padrões 15 (faixas) e 16 (metades); as skins "faixa" e "metades" deixaram de virar degradê.
- **Acessórios** (`src/render/acessorios.js`): no espaço do rosto, amassam junto. Os rivais passaram a usar o acessório deles (o Rei Gosma de coroa).
- **Economia:** os arquétipos custam de 120 a 250 Gotas e os acessórios de 0 a 80; o resto é grátis. É o primeiro uso das Gotas.
- **Famosos:** 16 personagens reais em `src/extra/famosos.js`, só no local, na LAN e na build de modelos. O empacotar apaga a pasta e falha se algo ainda a citar; o `estilo.test` vigia.
- **Conferido com entrada real (CDP):**
  - pincel na vitrine (3 riscos);
  - busca "jap" → Japão aplicado no corpo;
  - Pronto volta ao menu e grava `volei.perfil` e `volei.pintura`;
  - os famosos (Mario, Pikachu, Vader) vestidos.
- **Build:** `npm run empacotar` ok, com 842 KB (359 KB gzip), áudio de 51,8 KB e nada de `src/extra` no zip. A versão continua 0.1.1: o zip local foi refeito.
- **Custo** (`medir.mjs 4`): o desenho foi de 4,5–4,9 ms para 5,4–6,1 ms, mais provavelmente pelo núcleo maior do campo (o Gosmão sólido) e pelo juiz. Fica para o M6, junto com o Android real.
- **Thumb:** a oficial não mudou. Regenerada agora, sairia com os slimes mais cheios, a retícula nova e sem a bandeirinha. A `tools/thumb.html` passou a criar a partida sem o juiz; regenerar é decisão do usuário.
- **Testes:** `test/vestiario.test.js` (save do visual, compra, desenhos e textos de todo item, a trilha mantendo os acessórios e o pacote local) e a regra nova do `estilo.test`. São 84 testes.

## Fica para depois
- Os ginásios Escola, Rua e Arena; as Copas 2 a 4 jogam na Praia.
- As evoluções de skin (Pro, Craque, Lenda), a loja de bolas e as comemorações.
- O código de compartilhar o visual (`GS1-`), que o desenho §3.6 prevê.
- O pincel e a estampa no `?render=2d` (a reserva sem WebGL2 mostra só a cor e os acessórios).
- A medida no Android real (`npm run lan`) do controle novo, do saque com movimento e do custo do campo maior.
