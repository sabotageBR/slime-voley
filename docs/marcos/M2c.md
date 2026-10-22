# M2c: retenção, a partir do Player Fit Test de 2026-10-22

O usuário pediu uma análise do Player Fit Test da Poki e depois todas as melhorias propostas ("Faça todos").

## O teste

- **Build e amostra:** 0.1.1, de 21/10 (o M2a: sem Copa, menu, vestiário, juiz, falas nem controle novo), com 500 gameplays.
- **Resultado:** passou raspando. A média foi de 3m07s (o corte é 3 min) e os engajados, que jogam 3 min ou mais, foram 27% (o corte é 25%). FPS mediano de 60; o carregamento perde 0,7%.
- **Histograma:**

| Tempo | Gameplays | O que bate nos eventos |
|---|---|---|
| 0–1 min | 30% | 44% dos loads não terminam a 1ª partida (imperdível, a 5, mediana de 65 s) |
| 1–2 min | 31% | 151 venceram a 1ª e não terminaram a 2ª (a faixa tem 154; a 2ª acaba em 155 s, na mediana) |
| 2–3 min | 13% | terminam a 2ª e largam a 3ª |
| 3+ min | 27% | chegam à 3ª; da 4ª para a 5ª, 80% continuam |

- **Funil (570 loads):** terminam a 1ª 56%, a 2ª 30%, a 3ª 17%, a 4ª 11% e a 5ª 8,6%. Desktop e celular deram o mesmo.
- **Cortada lenta:** 38% das partidas tiveram mira automática, 36% uma soltura em menos de 0,26 s (a câmera lenta mal aparece) e só 16% miraram. A conta incluía a CPU.
- **Falha da medição:** o jogo não mandava `level/mN/start`, então o painel mostrava 0% em Started, Completed, Failed e Left.

## Feito

**1. Medição** (`src/main.js`, desenho §3.8)
- `level/m<N>/start` no 1º `gameplayStart` de cada partida. Junto com o `complete`/`fail`, o painel passa a mostrar quem sai em cada partida.
- `tutorial/<receber|saque|cortada>/start|complete`, só na 1ª partida.
- `cartao/<proxima|revanche|menu|vestiario>/visible|interact`, mais `cartao/<proxima|revanche>/auto` no avanço automático.
- `rewarded/dobrar/visible|interact`. Saiu o `premio|sem-premio`, que duplicava o que o SDK já mede.
- A cortada passou a contar só o humano: `cortada/gesto/toque|segurou` e `cortada/mira/auto|manual`. Saiu o `powerup/cortada-lenta/interact`, que contava a CPU.
- `saque/simples/humano` (o saque de um toque) e `presente/<id>/ganhou`.

**2. A passagem da 1ª para a 2ª partida**
- **Cartão rápido:** depois da 1ª partida da vida, o cartão avança sozinho em 3 s (`TEMPOS.avancoPrimeira`, mais 1,5 s de espera). Os outros cartões seguem em 8 s.
- **2ª partida curta:** as oitavas da Copa 1, contra o Pingo, vão a 5 sem vai-a-2 (`alvoDaPartida({ curta })`).
- **Presentes:** nas 3 primeiras vitórias da vida, um acessório por vitória (Orelhas de gato, Óculos redondos e Coroa; `PRESENTES` em `src/jogo/perfil.js`).
  - O cartão mostra o novo ("NOVO!") e o da próxima vitória ("Vença Pingo"), com o slime do jogador vestindo o item.
  - O presente é vestido na hora, se o encaixe estiver livre ou com outro presente.
  - Enquanto há presentes, a trilha de níveis sai do cartão.

**3. O primeiro minuto**
- **Saque de um toque na 1ª partida** (`saqueSimples`): o toque levanta e a batida sai sozinha no instante ideal, sempre PERFEITO. O 2º toque não conta e a dica diz "toque para sacar". O anel e o "levantar e bater" começam na 2ª partida.
- **Câmera lenta mínima na cortada** (`CORTADA.tMinToque`, 0,5 s, gatilho "novo"): o humano que solta antes (o toque simples) fica em câmera lenta até lá e corta com a mira padrão. Quem segura mira como antes. A CPU já segurava de 0,4 a 0,6 s. A variante "segura" fica igual.

**4. Meta cedo:** um toque no presente novo abre o vestiário na aba Acessórios, e o Pronto volta ao menu. É o primeiro caminho até o vestiário na 1ª sessão.

**5. Versão:** 0.2.0. O zip `0.1.1` local tinha sido refeito com o M2b com o mesmo nome; agora o painel da Poki separa as versões.

**Cartão**
- **Rolagem no notebook:** com o Prêmio ×2, o cartão já rolava em 1280×800 (39 px) antes do M2c. Em telas deitadas de 461 a 960 px de altura, o presente fica em linha e a chave fica mais baixa, e tudo cabe de 360×740 a 1920×1080.
- **Enter sem foco:** aciona o botão normal do cartão. O presente, que é um botão, vem antes dele na ordem.
- **Guarda no `proximaPartida`:** com o cartão já fechado, ele não faz nada.

**Testes:** 91 (eram 87):
- `regras`: 2ª partida curta e saque de um toque;
- `cortada`: o toque segura a câmera lenta até o mínimo; segurando, solta com o dedo; a variante "segura" não tem mínimo;
- `perfil`: os presentes.

## Conferido

**Fluxo com entrada real pelo CDP** (perfil novo, SDK falso que registra as chamadas):
- dica "toque para pular" e depois "toque para sacar";
- `level/m1/start` no 1º toque; `tutorial/receber` e `tutorial/saque` completos; `saque/simples/humano`;
- o cartão com "NOVO! Orelhas de gato · Vença Pingo · Óculos redondos";
- o avanço automático em cerca de 4,5 s, sem anúncio;
- a 2ª partida contra o Pingo a 5, com o slime de orelhas de gato e `level/m2/start`;
- a cortada por toque em câmera lenta, com `cortada/gesto/toque`;
- o presente abrindo o vestiário nos acessórios, e o Pronto voltando ao menu;
- zero erros no console.

**Build:** `npm run empacotar -- --thumb` ok, com 867 KB (357 KB gzip). A build carrega e mede `level/m1/start` sem erros.

**Calibragem** (`npm run calibrar`, 30 partidas): a mesma de antes, porque os bots não passam pelos caminhos novos.
- Rali com mediana de 5,8 s (p90 de 15,6 s).
- 33% dos pontos na rede.
- Saque perfeito do T2 em 70%.

## Fica para depois

- **Novo Player Fit Test** com a 0.2.0, para medir o M2b e o M2c juntos. O gráfico da Poki compara as duas últimas versões.
- **Dificuldade por partida:** com o `start`, o painel vai dar a taxa de derrota de cada uma. Se a 2ª ou a 3ª derrubarem muita gente, o próximo passo é a proteção/elástico do Pingo e da Geleia.
- **Arco de 7 minutos (§3.9):** refazer com o humano simulado, que ainda não existe.
