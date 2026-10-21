# M2a: pedidos de 2026-10-21

Seis pedidos do usuário, aprovados no plano. As respostas do AskUserQuestion: Congelar de 0,6 s com escorregão, saque "levantar e bater", nível com trilha visível e a barra de emoji depois do ponto.

**Feito**
- **A bola nunca sai:**
  - as duas paredes de fundo seguram a bola o tempo todo (desenhadas como painel translúcido);
  - `{ fora: true }` / `?fora=1` mantém a regra antiga para comparar;
  - o erro proposital da CPU na 1ª partida agora morre na rede.
- **Saque "levantar e bater":**
  - o 1º toque levanta a bola, um anel fecha até o instante ideal e o 2º toque faz o slime pular; a batida acontece no contato;
  - resultados: PERFEITO (chapado), BOM ou FRACO; sem 2º toque, a bola volta para a mão, sem falta e sem saque automático;
  - a CPU erra o tempo com `saqueErro` por nível, de 0,15 s no T0 a 0,035 s no T5.
- **Power-ups (`src/jogo/powerups.js`):** os 12 aprovados (a Bola Gigante ficou de fora):
  - bolhas com aviso e ícone; é a bola que pega;
  - gelo de 0,6 s com escorregão; aviso de 0,5 s antes de todo efeito contra o rival;
  - Bola de Fogo re-mirada para a mesma queda, com empurrão na recepção;
  - Bola Pesada com `gMult`, que o `prever()` respeita;
  - chips no HUD e rng próprio.
- **Reações (`src/jogo/reacoes.js`, `src/render/carinhas.js`):**
  - 6 da base e 4 da trilha, desenhadas em código;
  - a barra aparece depois de cada ponto (teclas 1 a 0 no desktop) e o balão sobe sobre o slime;
  - a CPU reage e responde.
- **Progressão (`src/jogo/perfil.js`):**
  - XP e nível, Gotas pela tabela do §3.7 e a trilha de 13 níveis (a skin liberada já é equipada);
  - cartão com contagem, barra de XP, "NÍVEL N!", próximos marcos e Prêmio ×2 (premiado);
  - o save antigo continua valendo.
- **Correções:**
  - o "VITÓRIA!" que ficava congelado atrás do cartão;
  - os canvases pequenos do HUD herdavam o tamanho das camadas do jogo.
- **Testes:**
  - novos: `powerups`, `reacoes`, `perfil` e `eventos` (todo evento tem tratador);
  - `regras` refeito para a parede e o saque;
  - 54 testes, cerca de 3,5 s.
- **Roteiros novos:** `?roteiro=saque|bolha|gelo|fogo|reacao|fim`.

**Medido (bot contra bot, 30 partidas)**
- **Rali:** a mediana foi de 6,1 s para 5,9 s (p90 de 15 s). Antes, 16% dos pontos eram fora; agora são 0%. Os erros na rede ficaram em 39%.
- **Saque do bot (T2):** 61% perfeito e 38% bom.
- **Power-ups:** 2,7 bolhas e 1,6 power-ups pegos por partida (cerca de 2 min).
- **Custo** (`medir.mjs 4`): desenho de 4,5 a 4,9 ms e passo de 0,16 a 0,23 ms, na faixa do M1.
- **Build:** `npm run empacotar` ok, com 676 KB (331 KB gzip).

**Fica para depois**
- A personalidade `cacaPowerup` (Bolota) mirar as bolhas, e a alternância dos lados no 2P.
- A prova grátis dos supers, que depende do `poderes.js`.
- O Vestiário e a loja, onde as Gotas serão gastas.
- A recalibragem do rali, se no celular ele ficar longo: os erros na rede do bot seguem altos (ver M0).
- O teste no celular (`npm run lan`), que o usuário faz.
