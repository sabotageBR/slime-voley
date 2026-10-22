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
