# M2d: retenção 2, a curva de dificuldade (a partir do Player Fit Test da 0.2.0)

O usuário pediu a análise do último Player Fit Test e um plano para aumentar a retenção. Decisões dele:
- dificuldade invisível e adaptativa;
- calibrar com um novato simulado;
- transição direta da 1ª para a 2ª partida;
- tudo num marco só.

## O teste (0.2.0, 22/10 14:08, 500 gameplays)

Passou com mais folga que o 1º, mas o ganho veio quase todo da cauda (o 5+ subiu de 14% para 20%):

| | 0.1.1 (M2a) | 0.2.0 (M2b + M2c) |
|---|---|---|
| Média | 3m07s | 3m57s |
| Engajados (3+ min) | 27% | 30% |
| Histograma, de 0–1 min até 5+ | 30 / 31 / 13 / 8 / 5 / 14% | 28 / 28 / 14 / 6,4 / 3,8 / 20% |

**Funil do Game Events** (572 loads; o painel dá Completed e Failed relativos a quem deu start):

| Partida da vida | Start | Venceu / perdeu |
|---|---|---|
| m1 (Gota, imperdível) | 521 (91%) | 68% / **1,7%** |
| m2 (Pingo T1, a 5) | 287 | **28% / 64%** |
| m3 a m16 | 164 → 11 | 23–43% / 64–85% |

- **Vitórias na vida:** a 2ª chega a 19% dos loads, e o título da Copa 1 a 4,7%. Desktop e celular dão o mesmo.
- **Cortada guiada:** só 55% de quem começa o m1 a recebia (ela dependia do medidor cheio e de 1 ponto do jogador), e 55% desses conseguiam cortar.
- **Cartões:** depois da 1ª vitória, 19% não começavam o m2. No cartão de derrota, cerca de 21% saíam; o avanço automático quase nunca disparava (3,7%).
- **Saque:** quase todas as gameplays que chegam ao m2 têm um saque fraco, 56% têm um bom e 40% um perfeito. O novato ajustado a isso dá **87% dos saques fracos**.
- **Playtests:** 10 gravações da 0.2.0. Elas só pegam o canvas (o placar e o cartão, em DOM, não aparecem). Na da Polônia, o jogador sai no cartão de 3 s depois da 1ª vitória.

## Feito

**1. Novato simulado e calibragem**
- **O novato** (`test/apoio/humano-simulado.js` e `copa-simulada.js`, fora da build):
  - dirige o slime 0 pela entrada do `main.js` (`p.intencao`, `p.interacao`);
  - por baixo, uma IA com a velocidade e o talento de um humano, mais os erros de gente (pulo fora de hora, distração, saque de dois toques, cortada quase sempre por toque);
  - joga vidas inteiras sobre o save real.
- **Ajuste à 0.2.0** (h0 0,33 ± 0,3, aprendendo 0,085 por partida):
  - 30% contra o Pingo;
  - de m3 a m10, cerca de 33% no funil "com desistência", que pesa cada partida pela chance de a pessoa ainda estar jogando (continua 85% depois de vitória e 52% depois de derrota);
  - a m1 em cerca de 1 min.
- **`tools/calibrar.mjs`:** o padrão (bot contra bot) não mudou; entram `--novato`, `--copa [--conferir]` e `--m1`, com `--par=8`.
- **O que o novato mostrou:**
  - cerca de 70% dos pontos perdidos são erro do próprio jogador (bola do próprio lado ou na rede), e não ataque da CPU;
  - o nível da CPU sozinho não tirava o Pingo dos 36%, nem no T0;
  - a cortada por toque quase nunca pontuava (0,02 BOMBA por partida).

**2. Dificuldade (invisível)**
- **Ajuda ao jogador** (`regras.js` AJUDA, `partida.js`):
  - a devolução assistida também puxa o toque andando e o que não cruzaria, e o ímã cresce;
  - na Copa 1, base por fase: 0,75, 0,75, 0,35, 0,3 e 0,3;
  - em toda Copa, +0,12 por derrota seguida (até 4).
- **Níveis:** Gota T0, Pingo **T0+** (novo), Geleia **T1**, Mingau **T1+** e Rei T2.
  - Saiu o `erro ×1,4` da Geleia, que estava invertido: só valia para quem venceu o Pingo de primeira (`partida ≤ 3`).
  - `FORCA_NIVEL` substitui a ordem dos níveis; o `BOT` virou literal.
- **Anjo** (§2.8, nunca feito): nas oitavas da Copa 1, no match point da CPU com o jogador 2 ou mais atrás, a CPU "fura". Ela lê errado a queda e não encosta na bola pelo resto do rali.
- **Elástico das partidas a 5:** age desde 1 ponto de vantagem da CPU (erro, reação, cortada, pulo e saque). As partidas a 7 ficam com o elástico de antes, número a número.
- **Alívio por derrota seguida** (save: `copa.derrotas`; `registrarDerrota`; `partidaDaFase`, a mesma do `main.js` e do `calibrar`): erro +12%, reação +0,03 s, pulo −15%, cortada −25% e saque +15% por derrota, até 4. Nos chefes vale ×0,75. A vitória zera.
- **Cortada do jogador:** começa na mira guiada, a ponta da faixa mais longe do rival. As BOMBAs foram de 0,00 para cerca de 0,3 por partida. A cortada direta, que a CPU lê pela retícula, dava 0,01.
- **Resultado** (400 vidas, `calibrar --copa --conferir`; antes → depois):

| Rival | 1ª tentativa | Em até 3 tentativas |
|---|---|---|
| Pingo | 32% → **81%** | 75% → **100%** |
| Geleia | 30% → **60%** | 66% → **98%** |
| Mingau | 37% → **59%** | 74% → **99%** |
| Rei | 31% → **45%** | 69% → **93%** |

  - O título sai em 7 partidas, contra 12 antes.
  - Com uma população mais fraca (h0 0,23), o Pingo fica em 72%, e todas as fases passam de 92% em até 3 tentativas.
  - Na Copa 2, o Quiabo (T2) contra quem acabou a Copa 1: 67% na 1ª tentativa e 82% depois de 2 derrotas.

**3. A 1ª partida realmente imperdível:** o erro do próprio jogador (rede, 4 toques) no match point da Gota fechava a partida; era o 1,7% de `level/m1/fail`. Agora o ponto não vale e ele saca de novo (evento `repete`). No novato: 1000 de 1000.

**4. Cortada guiada à prova de falha** (`partida.js` guia, `cortada.js` `CORTADA.guia`)
- **A oferta:** no 2º rali, a qualquer um. O medidor enche, e a Gota, no toque ou no saque, manda a bola alta para o ponto de batida do jogador no ápice do pulo. Com a guia pendente, o saque de um toque vai no corpo da Gota.
- **O congelamento:** a bola congela sobre o jogador (mundo a 3%) e espera sem limite qualquer toque ("toque para cortar!"). Em 30 s sem toque, o gameplay para.
- **O corte:** o toque pula sozinho e a cortada sai perto do ápice, direta. A Gota assiste e não encosta: BOMBA, 2,5 s depois do toque. Se o rali acabar antes, a guia volta a ser oferecida.
- **Medida:** `cortada/gesto/guiada`, separada da série do toque e do segurou.
- **No novato:** a m1 tem 1 BOMBA por partida (era 0,02). Num teste com o jogador passivo, a guia é oferecida em 20 de 20 sementes antes de 20 s; antes eram 13 de 20, de 15 a 28 s.

**5. Transição direta da 1ª para a 2ª partida (sem cartão)**
- **A sequência:**
  1. VITÓRIA!;
  2. a câmera fecha no jogador, as orelhas de gato descem na cabeça e aparecem "NOVO! Orelhas de gato" e, se subiu, "NÍVEL 2!";
  3. o Pingo cai do céu com o letreiro "Oitavas!" e a faixa "Vença Pingo · Óculos redondos";
  4. o saque espera o toque.
- Um toque pula o presente. Tudo fica em canvas, então aparece nas gravações do playtest.
- **O que sai do 1º cartão:** o Prêmio ×2 (3,2% de toque), o presente que abria o vestiário (23 gameplays) e o XP visível. A chave e o caminho aparecem a partir do 2º cartão.
- **Medida e depuração:** `transicao/m2/direta`; `?direta=0` volta ao cartão.

**6. Cartão de derrota com dica** (`src/jogo/dicas.js`)
- **A dica:** sai da causa principal dos pontos perdidos (ace, colocada, rede, erro, 4 toques, cortada, bola forte, bloqueio), por exemplo "No saque do rival, corra para a marca na areia". Vai em PT, EN e ES.
- **Avanço automático:** 4 s nas 3 primeiras derrotas da vida (`avancoDoCartao`; 3 s depois da 1ª partida; 8 s no resto).
- **Espaço:** cabe sem rolar em 360×740, 390×844, 844×390, 1280×800, 1366×768 e 1920×1080.

**7. Medição nova** (desenho §3.8):
- `rival/<id>/start|complete|fail`: o painel por adversário;
- `placar/<id>/<h>-<c>`;
- `derrota/<id>/<causa>`;
- `perda/<id>/<causa>` nas 3 primeiras partidas;
- `m1|m2/ponto/<n>`: o funil dentro da partida;
- `tela/<retrato|paisagem|desktop>/<toque|mouse>`;
- `alivio/d<k>/<venceu|perdeu>`;
- `anjo/<id>/usou`;
- `transicao/m2/direta`;
- `cortada/gesto/guiada`.

**8. Versão:** 0.3.0.

**Testes:** 120 (eram 91).
- Arquivos novos: `novato`, `guiada` e `dicas`.
- Acréscimos em `regras` (anjo, repetição, ajuda, avanço e mira guiada), `rivais` (o elástico a 7 igual ao antigo, número a número; o elástico a 5; o alívio) e `torneio` (derrotas, save e `partidaDaFase`).

## Conferido

- **Testes e calibragem:**
  - `npm test`: 120 de 120;
  - `npm run calibrar` igual ao do CLAUDE.md, byte a byte no `--json`;
  - `calibrar --copa 400 --conferir` com todas as metas ok;
  - `--m1 1000`: 100%.
- **`tools/fluxo.mjs`**, com perfil novo, entrada real e PokiSDK falso, em 390×844 com toque, 844×390 com toque e 1280×800 com mouse. Tudo ok:
  - `tela/*` e nenhum `gameplayStart` antes do toque;
  - `level/m1/start` e `rival/gota/start`;
  - a guiada congela, e um toque na metade esquerda dá `cortada/gesto/guiada` com o ponto 2,5 s depois;
  - o fim sem cartão e sem anúncio, com `transicao/m2/direta`, o Pingo e o saque esperando;
  - `level/m2/start` e `rival/pingo/start`;
  - na derrota: a dica, a chave, `derrota/pingo/ace` e `cartao/revanche/auto` sem anúncio;
  - console sem erros.
- **Prints:** a guiada em retrato e paisagem, a transição em 3 instantes e o cartão de derrota em 6 tamanhos. GIF da transição em `.tmp/m2d-transicao.gif`.

## Fica para depois

- **Novo Player Fit Test com a 0.3.0.** As metas:
  - vitória no m2 ≥ 65%;
  - 2ª vitória da vida ≥ 40% dos loads;
  - faixa de 1–2 min ≤ 20%;
  - média ≥ 4m30s;
  - engajados ≥ 35%.

  O painel por rival e o `perda/*` conferem o novato. Se o real ficar longe, reajustar o novato a ele e recalibrar.
- **Saque:** 87% dos saques reais saem fracos (o anel e o 2º toque). Um saque mais fácil nas primeiras partidas é a próxima alavanca.
- **Retrato:** a quadra fica pequena (vista nas gravações). O `tela/*` diz quantos jogam assim.
- **Cortada livre:** a guiada ensina o toque, não o gesto de pular e tocar de novo no ar. Falta uma dica na 1ª bola alta com o medidor cheio.
- **Copa 2:** a ajuda por fase é só da Copa 1. Medir o degrau no painel por rival.
