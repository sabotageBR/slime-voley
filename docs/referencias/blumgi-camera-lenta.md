# Referência: câmera lenta da mira no Blumgi Soccer (medida em 2026-10-20)

Pedido do usuário: "Captura a câmera lenta também para colocarmos no power-up de corte".
Este arquivo guarda **só números**. Nenhum quadro de terceiros está no repositório.

## Fonte e método
- **Vídeo:** YouTube `DS4mSolMfUE` ("Blumgi Soccer - Gameplay Part 1"), 1280×720 a **60 fps reais**.
  Os `mediaTime` do `requestVideoFrameCallback` vêm em múltiplos de 1/60 s.
- **Trecho medido:** quadros 400–490 (6,67 s a 8,17 s), uma mira completa. Um segundo trecho de mira está em
  519–549.
- **Por que não com screenshots:** no Chrome do usuário as capturas de tela expiravam nessa página. A medição foi
  feita com o canvas da própria página (`drawImage` do vídeo, que não ficou "tainted"), por análise numérica:
  - diferença média entre quadros;
  - casamento de blocos 8×8 em 320×180;
  - componentes conexos de pixels brancos em resolução cheia.
- **Margem:** ±1 quadro (17 ms). O vídeo duplica alguns quadros (diferença 0), e eles foram descartados.

## Números medidos

| Grandeza | Valor | Como |
|---|---|---|
| **Escala de tempo do mundo na mira** | **≈ 0,06** (faixa 0,04–0,10) | Deslocamento p90 dos blocos móveis: cerca de 7 px/quadro no jogo normal contra cerca de 0,4 px/quadro na mira (medido em pares com 10 quadros de distância) |
| Rampa de entrada | **≤ 1 quadro** (17 ms) | A energia cai de 0,85 para 0,26 entre os quadros 428 e 429 |
| Rampa de saída | **≤ 1 quadro** | A energia sobe de 0,21 para 1,01 entre 458 e 459 |
| Duração da mira observada | 0,50 s (30 quadros), nas duas miras do trecho | É o tempo que o jogador segurou, não um limite do jogo |
| Chutador e bola na mira | Congelados (deslocamento de cerca de 0 px em 12 quadros) | Componentes 446–458 |
| Linha de mira | Reta (direção), pontos brancos de cerca de **10 px** de diâmetro, espaçados **cerca de 17 px**, e uma **ponta de flecha de 17×23 px** | Com 1280 px de largura, isso dá pontos de 0,8% da largura |
| A linha cresce com o arrasto | 2 pontos (q440) → 4 (q446) → 6 (q452) → 7 (q458), cerca de 1 ponto a cada 3 quadros | O comprimento indica a força |
| Os pontos crescem? | Os primeiros, perto do chutador, são menores (3–4 px); os seguintes ficam em 9–10 px | A impressão de "pontos crescendo" vem disso |
| A linha some | No mesmo quadro do chute (459) | — |
| Hitstop na soltura | **≤ 2 quadros** (nenhum congelamento visível) | Pose de chute em 460; bola em voo em 462 |
| **Anel/clarão de impacto** | Branco, centrado no ponto do chute | Componentes 462–478 |
| Diâmetro do anel | 60 → 68 → 91 px em cerca de 7 quadros (1,7× → 2,5× o diâmetro da bola, que é de 37 px) | — |
| Preenchimento do anel | 28% → 72% (começa como anel e vira disco quase cheio); em 474 se parte em arcos e some em 478 | **Duração total ≈ 13–15 quadros (≈ 230 ms)** |
| Velocidade da bola depois do chute | ≈ 12 px/quadro ≈ 0,56 largura de tela por segundo | — |
| Rastro de círculos-fantasma | Visto na observação anterior (círculos esmaecidos atrás da bola) | Não passou o limiar de branco (são semitransparentes): **não resolvido** numericamente |
| Vinheta e HUD | Nenhuma vinheta; o HUD não muda | Observação anterior |

## Como isto entra no jogo (`src/jogo/cortada.js`, `CORTADA`)
- **Escala do mundo:** `escalaMil = 60` (0,06). O laboratório do M1 ajusta de 0,03 a 0,15.
- **Entrada e saída:** quase instantâneas no Blumgi. Usamos **entrada de 60 ms** (easeOut) e **saída de 40 ms**: 3–4
  quadros, só para tirar o "tranco" em 120 Hz. O laboratório pode ir até 0.
- **Linha de gotas:** mesma densidade (pontos de cerca de 0,8% da largura, espaçamento de 1,7× o diâmetro, ponta
  cerca de 2× maior), mas **em gotas na cor do time** que seguem a trajetória (não uma reta), terminando numa gota
  maior que aponta.
- **Coroa de respingo:** mesmo tempo e escala do anel (de 1,7× a 2,5× o diâmetro da bola, 230 ms, abre em arcos no
  fim), na forma de **anel de gotas na cor do time**, não um disco branco.
- **Rastro:** "não resolvido" na medição. Fica o padrão do desenho (1 gota a cada 30 ms, no máximo 8, vida de
  240 ms).
- **Hitstop:** o Blumgi quase não tem. Usamos 50 ms de hitstop (é a assinatura do vôlei: o tapa), ajustável no
  laboratório.
