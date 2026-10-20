# Referência: comemoração de gol no Blumgi Soccer (medida em 2026-10-20)

Pedido do usuário: "Quando a bola toca no chão eu quero comemoração parecida com esse jogo aqui".
Este arquivo guarda **só números**, sem quadros de terceiros.

## Fonte e método
- **Vídeo:** YouTube `DS4mSolMfUE`, 1280×720 a 60 fps. O gol fica no quadro 1056 (17,60 s).
- **Método:** varredura de 0 a 90 s a 10 Hz pelo brilho médio e pela fração de pixels brancos, para achar o gol.
  Depois, a cada 2 quadros de 1040 a 1272, foram medidos:
  - brilho médio;
  - pixels brancos (de 9.216, em 128×72);
  - diferença média para o quadro anterior.
- **Margem:** ±2 quadros (33 ms).
- A observação anterior (screenshots) descreve o visual: zoom forte no gol, explosão branca, confete de quadradinhos
  pastel, "GOAL!" em blocos com extrusão 3D e "READY?" sobre o nível seguinte.

## Linha do tempo medida (t = 0 no quadro do gol)

| t | O que acontece | Evidência |
|---|---|---|
| 0 → +33 ms | **Clarão branco** chega ao pico em 2 quadros | Brilho de 167 → 230; brancos de 604 → 1.445 |
| +33 → +500 ms | O clarão decai de forma suave | Brilho de 230 → 152 |
| +170 → +430 ms | Movimento forte na tela (zoom ou soco de câmera e confete) | Diferença de 8–9 por quadro |
| **+570 ms** | **A palavra "GOAL!" entra** | Brancos saltam para cerca de 770 |
| +570 → +1.070 ms | A palavra entra quicando e assenta | Diferença de 15–26, depois cai a 6 |
| +1.070 → +1.770 ms | Palavra parada (o confete termina) | Diferença de 0–3 |
| **+1.770 → +2.370 ms** | **Saída:** transição que cobre a tela | A diferença sobe a 22; o brilho sobe a 197; a palavra some |
| +2.370 → cerca de +3.400 ms | Tela de transição lisa (pastel) | Brilho de 197, sem brancos |
| cerca de +3.400 ms | O nível seguinte aparece (com "READY?") | Varredura de 10 Hz: brancos voltam em 21,0 s |

## Como isto entra no jogo (`src/render/celebracao.js`)
- **Ritmo:** clarão e impacto imediatos → palavra aos ~0,15–0,57 s → saída. A **festa completa** (1,8 s) segue o
  ritmo até a saída. A nossa palavra entra **antes** (150 ms), porque o vôlei continua na mesma quadra e não troca
  de nível.
  - O tempo morto entre pontos fica abaixo de 1,4 s em média, já que a maioria dos pontos usa a festa curta.
- **Clarão:** o Blumgi usa branco de tela cheia. Nós usamos a **coroa de respingo na cor do time, com núcleo claro**,
  sem disco branco, para não ser clone. O pico de 33 ms e o decaimento de cerca de 500 ms ficam.
- **Confete:** 60% gotinhas e 40% quadradinhos nas cores do time (o Blumgi usa quadradinhos pastel).
- **Palavra:** extrusão na cor escura do time, com gotas que escorrem (o Blumgi usa blocos brancos com extrusão 3D).
- **"READY?":** nunca na tela. Usamos placar gigante + "VAI!/GO!/¡YA!".
