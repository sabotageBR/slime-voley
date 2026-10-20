# Plano de implementação: Vôlei de Gosma (#58), "Goo Spike!" (VERSÃO FINAL, revisada)

Este plano junta as 3 propostas (jogabilidade, arquitetura, conteúdo/Poki), os 5 relatórios de exploração e as correções dos 3 revisores adversariais. Foi feito só com leitura: nenhum arquivo foi criado. Quando as propostas ou os revisores divergiam, escolhi uma opção, marquei como **Decisão** e dei o motivo. O que foi aceito ou rejeitado está na seção "Decisões da revisão", no fim.

**Conferido no disco** (agora incluindo o que os revisores apontaram):
- **Pacote e clone**
  - `$PAC` é o motor 2.1.0 mais os protótipos.
  - O clone local do slime-merge está em `1735289` (2.0.3).
  - O protótipo do vôlei usa `criarMundo` (PBD de `fisica/mundo.js`, 79.699 B).
- **Arquivos do pacote**
  - `core/depuracao.js:47-48,56`: só lê a URL em `file:`, localhost, 127.x, 192.168.x e 10.x. Não cobre 172.16/12. Fora disso, aceita o gancho global `__slimeTeste`.
  - `core/poki.js`
    - `idioma` é uma propriedade com valor `''` (linhas 79 e 411), não uma função.
    - `gameplayStart` é descartado durante anúncio (linha 261).
    - Não há `shareableURL` nem `getURLParam`.
  - `core/audio.js:228-230`: o áudio destrava em `pointerup`, `keydown` e `touchend`, não em `pointerdown`.
  - `ui/editor.js`
    - Linhas 551-553: `keydown` em fase de captura, com `stopPropagation`.
    - Importa `jogo/niveis.js` e `render/palco.js`.
  - Imports cruzados
    - `jogo/skins.js:17-18` importa `niveis.js` e `cor/km.js`.
    - `render/composicao.js:12` importa `PALETA` de `jogo/skins.js`.
    - `render/campo.js:20` importa `N_PIG` de `fisica/mundo.js`.
    - `som/sons.js:15` importa `catalogo.js`, cujo `LOCUTOR` lista as 28 falas.
  - `core/laco.js:30-52`: os passos rodam dentro do quadro do rAF.
- **Falas**
  - Pelo `docs/autoria.md` do remoto: `vozFogo` = "Fire in the hole!", `vozPronto` = "Ready?", `vozVai` = "Go!", `vozCuidado` = "Look out!".
  - As 19 falas `*Slime` usadas somam 88.860 B. Com `fichas` (2.742 B) e `clique` (914 B), o total é 92.516 B.
- **Grok** (`~/.grok/docs/user-guide`)
  - Em headless, uma chamada que precisa de aprovação é recusada. O stderr mostra `permission required`, mas o código de saída continua 0.
  - `CLAUDE.md` é carregado como regra de projeto.
  - `--effort` existe.
- **Ferramentas**
  - O `artifact-jogo.mjs` da stringcut publica só arquivos `.js`.
  - O `artifact-modelos.mjs` do slime-merge publica um hub, páginas `jogo-N.html` com `window.__slimeModelo`, GIFs e fontes. Ou seja, o Artifact aceita binários.
  - `carimbador-maluco/tools/medir.mjs` usa `Emulation.setCPUThrottlingRate`.
  - O `adb` está em `~/Android/Sdk/platform-tools/adb`.
  - Há `ffmpeg`, `ffprobe` e Node 22.23. Não há `yt-dlp`.
- **Transcrição de hoje:** o endereço direto do jogo na Poki ficou bloqueado, e a ferramenta de mouse não manteve o clique. O vídeo do YouTube `DS4mSolMfUE` aceitou busca por `currentTime`.
- **Matemática do σ:** com toque em x = 0,5a, a fórmula `atan(0,577·b/a)` dá o ângulo da NORMAL (30°/21°/41°), e não o ângulo de saída da bola.

**Abreviações:** `$PAC` = `~/Downloads/Cinco Jogos de Gosma (2)/src`; `$SV` = `~/git/em_tech/slime_voley`; `$EM` = `~/git/em_tech`.

---

## 1. Visão, pilares e nome

**Nome:** **"Goo Spike!"** é provisório (EN e ES); em PT, **"Vôlei de Gosma"**. Antes do M1 conferimos o catálogo da Poki por semelhança de estrutura, não só pelo nome exato. "Slime Dunk!" já existe e segue o padrão "slime/goo + verbo de esporte + !". No M1 o usuário escolhe entre 3 opções. O nome do zip e as chaves de i18n só ficam definitivos depois dessa escolha.

**Visão:** um vôlei 1x1 de slimes, original, com cara de jogo comercial. Cada toque amassa a gosma e muda o ângulo da bola. Cada ponto vira uma festa curta, sem tela no meio. A jogada de assinatura é a **Cortada em Câmera Lenta**: o ritmo e a sensação da câmera lenta do Blumgi (medidos na captura do passo 0), com a forma e a cor da gosma.

**Pilares:**
1. **Um polegar faz tudo.** Tocar pula. Tocar de novo no ar e segurar ativa a cortada lenta. Arrastar mira.
2. **A gosma reage.** O amassado (σ) muda o ângulo. Os rostos olham a bola. A plateia também é de slimes.
3. **Ponto é festa curta, em 2 níveis.** Os pontos comuns têm uma festa curta (1,0 s). Os pontos marcantes têm a festa completa: close, confete, palavra de gosma e placar gigante (1,8 s).
4. **Progresso visível em toda partida.** A skin evolui, os supers sobem de nível e o ginásio vai lotando.
5. **Celular primeiro, em retrato e em paisagem.** O dedo nunca cobre a bola. Leve o bastante para Android de entrada, e medido nele.

### 1.1 Conflitos resolvidos (decisão e motivo)

| Tema | Decisão | Motivo |
|---|---|---|
| Escala da câmera lenta | Começa em **0,07** (`escalaMil=70`). **O valor medido na captura do passo 0 substitui este.** O laboratório do M1 ajusta de 0,03 a 0,15 | É o pedido literal: capturar a câmera lenta do Blumgi |
| Gatilho da cortada lenta | **Uma pressão nova que começa no ar** (2º toque, tecla ou clique depois da decolagem), segurada com a bola na janela e o medidor em 100 ou mais. No M1, A/B contra "segurar contínuo" (`?gatilho=novo\|segura`) | Evita a câmera lenta sem querer de quem deixa o dedo apoiado |
| Quando vale a cortada | Em qualquer toque de rali do próprio lado. **Nunca** na recepção de saque nem contra bola de super ou de cortada | Não anula o saque nem os supers. Não exige o combo levantada → cortada no tutorial |
| Defensor durante a mira | Fica com **escala própria de 0,30** (laboratório: 0,07 a 0,5) | Com o defensor a 7%, a cortada viraria ponto garantido e a telegrafia não serviria para nada |
| Bola durante a mira | É puxada até o "ponto de batida" e anda no máximo **60 ms de mundo** durante a mira inteira | Sem isso, a bola bate na cúpula congelada ou sai do alcance |
| Como mirar | Alvo no piso adversário (retícula). A linha de **gotas** segue a trajetória real, e o comprimento mostra a força | Fica legível e nunca sai da quadra |
| Tempo máximo da mira | **1,2 s fixo**; 0,7 s no 2P; 3,0 s na 1ª vez do tutorial | Os níveis da habilidade passam a dar alcance, não tempo |
| Câmera lenta em pontos | **Não.** Ponto usa hitstop e zoom | A câmera lenta continua exclusiva |
| Defesa perfeita | Vale **só contra bola de super ou de cortada**, com janela própria para cada um (§2.6) | Uma regra única pela normal dava medidor de graça na Jornada e deixava o Fogo sem contra-jogo |
| Física | **Corpo analítico (cúpula elíptica + σ) a 120 Hz.** A pele é própria, em arrays, só visual, **sem `fisica/mundo.js`** | É determinística e leve, e tira 87 KB de código |
| Meia quadra | **LARG = 12** (11 e 13 no M1, via `?larg`) | 15,3 px/u em 390 px de largura |
| Bola fora | **Só ataque estourado**: a bola passa por cima da placa do lado oposto ao do último toque. No fundo do próprio lado há uma **rede de proteção** que funciona como parede (e = 0,7) | Correr para trás atrás de um lob não pode dar ponto ao rival |
| Quem saca | Quem ganhou o ponto. Na partida nova contra a CPU, o humano saca. **Exceção:** na 1ª partida da vida, a Gota saca 0,6 s depois do 1º toque | Onboarding sem precisar ensinar o saque antes |
| Saque automático | **Não existe.** Aos 4 s a bola pulsa e a mão fantasma aparece, e o jogo espera sem limite. **Portão de interação:** se passaram 30 s sem `pointerdown`/`keydown`, qualquer saque, do humano ou da CPU, espera um toque | Garante o relógio de 60 s do PFT e a regra dos 5 s do Inspector |
| Entre pontos | **Festa curta (1,0 s)** nos pontos comuns; **festa completa (1,8 s, placar gigante)** nos marcantes. Na tela aparece "VAI!/GO!/¡YA!", nunca "READY?" | Menos tempo morto e identidade própria |
| Visual da cortada e do ponto | **A mecânica e o tempo vêm do Blumgi; a forma é de gosma.** Trajetória em gotas na cor do time, coroa de respingo no lugar do anel branco, rastro de gotas no lugar dos círculos-fantasma | Regra de clone da Poki (6 dimensões) |
| Confete | 60% gotinhas e 40% quadradinhos, nas cores do time | Diferencia do Blumgi |
| Fonte | **Só Fredoka 700.** A 600 não é copiada | Poupa bytes |
| Moeda | **"Gotas"**, moeda única | Coerente com o tema |
| Níveis das habilidades | 5 níveis de +3% cada (no máximo +12%), custos 150/300/600/1000 | Sem pay-to-win |
| Ginásios na v1 | 4 (Praia, Escola, Rua, Arena); Chuva e Neve no M8 | Escopo |
| Partidas por Copa | Copa 1 = 3 partidas (Gota, Geleia, chefe Rei Gosma); Copas 2–4 = 4 | Arco de 7 min |
| Supers dentro dos 7 min | **Prova grátis**: Jornada na partida 2 e Raio na partida 3. O Fogo o jogador vê com o chefe e libera ao vencê-lo | O usuário pediu os três de forma explícita |
| Áudio de voz | **19 falas *Slime**: sem as militares, sem `Tempo`, `Depressa`, `Fim` e **sem `Fogo` ("Fire in the hole!")**. Total de 87 KB | Público infantil |
| Replay | Só no ponto final da partida, **re-simulado** a partir de um snapshot. Pode ser pulado | A pele e os rostos aparecem corretos |
| Laço | `PASSO_REAL=1/120`, `MAX_PASSOS=6` | Meio-termo |
| Relógios | **3:** mundo, jogo-real e parede (§2.2) | Buffers, pausa e anúncio sem ambiguidade |
| Primeira PFT | **M3b**, logo depois do M3 (Copas 1–2), com o M4 seguindo em paralelo | O tempo de jogo é o único KPI que reprova |

---

## 2. Mecânica

### 2.1 Modelo físico: cúpula analítica com pele própria

**Corpo:**
- É uma cúpula elíptica com `a = R·(1 + 0,18σ)` e `b = R·(1 − 0,22σ)`.
- Na física, **σ fica entre −0,6 e +0,6**. O visual da pele pode ir de −1 a +1.
- σ segue uma mola de 6 Hz com ζ = 0,35.

**Fontes de σ:**

| Evento | σ |
|---|---|
| Pouso | +0,8 |
| Impulso do pulo | −0,6 |
| Carga do saque (no chão) | +0,5 |
| **Pose da mira** | **−0,6** (esticado, igual à pose y×1,15 e x×0,9; durante a mira não há colisão com a bola) |
| Toque | soma `imp·0,02` |

**Efeito no ângulo.** Toque em x = 0,5a, slime parado, bola caindo na vertical, E = 0,80. Os números exatos ficam fixados pela fórmula no `fisica.test`:

| Forma | Normal (a partir da vertical) | Saída da bola (a partir da vertical) | Jogada |
|---|---|---|---|
| Redonda (σ = 0) | 30° | cerca de 66° | — |
| Achatada (σ = +0,6) | cerca de 24° | cerca de 54° | levanta mais |
| Esticada (σ = −0,6) | cerca de 36° | cerca de 79° | sai rasante |

O slime subindo soma vy (×1,0) e verticaliza a saída. O teste mede a normal e a saída separadamente, com a bola vertical e com a bola a 45°.

**Pele** (`jogo/pele.js`, em arrays próprios):
- Usa o reticulado `meiaLua()` do protótipo, com cerca de 75 partículas (cerca de 55 na qualidade mínima).
- A cada passo:
  1. translação rígida;
  2. mola de forma para a elipse σ;
  3. covinha no contato;
  4. restrições de distância com 2 subpassos de 1/240.
- A pele não tem gravidade nem paredes próprias: ela só segue a cúpula.
- **Reserva:** se no M0 o GIF lado a lado mostrar que perdeu a "gelatina" do protótipo, entra o `mundo.js` com g = 0 e sem paredes.

**Contato bola-slime:**
- Reflexão relativa com `E_SLIME`, somando a velocidade do slime: 1,0 em y e 0,75 em x.
- `V_MIN` só vale com ny > 0,3.
- Debounce de 0,15 s.

**Constantes** (`src/fisica/volei.js`, todas exportadas):

| Constante | Protótipo | Nova |
|---|---|---|
| `LARG` | 16 | **12** |
| `RAIO` | 2,2 | **2,0** (Gosmão 2,5) |
| `RB` | 0,68 | **0,75** |
| `REDE_H` / `REDE_R` | 3,0 / 0,17 | **2,5 / 0,15** |
| Placa | parede até o céu | **x = ±12,4, altura 1,8**. Rede de proteção de fundo em x = ±12,6 (parede só para a bola tocada pelo próprio lado) |
| Teto | 16,4 | aberto (Escola: y = 11, e = 0,6) |
| `G_SLIME` / `PULO` | 50 / 15,5 | **68 / 23**: ápice de 3,89 u, 0,68 s no ar |
| `G_BOLA` | 23 | **32** |
| `VEL` | 10,5 | **11**; aceleração de 85 no chão, freio de 130, 45 no ar |
| `E_SLIME` / `V_MIN` | 0,78 / 10 | **0,80 / 6** |
| `E_REDE` / `E_PLACA` | 0,5 / 0,85 | **0,45 / 0,70** |
| Passo | 60 Hz | lógica a 120 Hz; bola com 2 subpassos |
| Cooldown do pulo | 0,25 s, segurar repete | **0,10 s, exige nova pressão** |

**`VMAX` por estado da bola** (tabela única em `fisica/volei.js`):

| Estado | VMAX |
|---|---|
| Normal | 25 |
| **Cortada** | sem limite até o 1º contato (teto de segurança de 34) |
| Fogo | 31 |
| Meteoro | 32 |
| **Jornada** | 40 na subida, 30 na descida |

**Números derivados:**
- O topo do slime fica 3,4 u acima da rede.
- A janela de cortada dura 0,49 s.
- **Cruzar a faixa livre (cerca de 8,05 u) com aceleração de 85 leva cerca de 0,80 s**, contra cerca de 1,0 s de um lob. Esse valor é recalculado dentro do `fisica.test`.

**Assistências** (ligadas no toque, desligáveis):
- **Ímã:** +0,25 u só contra bola descendente (+0,10 no teclado).
- **Devolução assistida** (substitui o "levantamento assistido"):
  - Vale com o slime no chão, o stick abaixo de 0,2 e no 1º ou 2º toque.
  - A saída fica 45% entre a física e um arco resolvido por `prever` que cruza a rede e cai no meio do lado adversário.
  - O jogador parado devolve. A levantada vem da física: um toque no topo de uma cúpula achatada sai alto.
- **3º toque:** é sempre puxado para cruzar a rede (mistura de 60%).
- **Bola presa:** depois de 0,8 s parada, recebe um peteleco.

**Portar as constantes por quadro** (`MOLA/60`, as misturas 0,32 e 0,2, `GIRO`, `MEM`, `angV`) para dt fixo, com `1-(1-k)^(dt·60)` pré-calculado em `jogo/`.

### 2.2 Laço, relógios e entrada (fundação da câmera lenta, M0)

**`core/laco.js`:**
- `PASSO_REAL=1/120`, `MAX_PASSOS=6`.
- Chama `desenhar(dtReal, alfaLaco)`.
- Mantém o que já existe: rAF antes de desenhar, um relógio só, reserva de 200 ms e erro relançado uma vez.

**`jogo/tempo.js`: três relógios**

| Relógio | O que roda nele | Para quando |
|---|---|---|
| **Mundo** (`escalaMil` inteiro, acumulador por canal) | física, IA, buffer de pulo, coyote, cooldown, bolhas, plateia, vfx de mundo | com a escala |
| **Jogo-real** | curvas de `lento`/`hitstop`, tempo da mira, comemoração, palavra, mira, coroa, transições | pausa e anúncio |
| **Parede** | só a UI de pausa e o carregamento | nunca |

**Canais de escala:**
- `mundo`, `defensor` e `bola`, cada um com seu acumulador inteiro. A cada passo real, cada canal soma a sua escala e roda os passos de mundo correspondentes.
- Na mira, a bola e o defensor não interagem com ninguém (§2.5). Por isso, separar os canais não quebra o determinismo.
- Com tudo em 1000, o `hash()` é idêntico ao de rodar sem relógio.

**Pausa no meio da mira:** congela o relógio de jogo-real e, ao voltar, reentra em `mirando` com o tempo que restava (coberto em `tempo.test`).

**`render/vista.js`**
- Guarda os snapshots anterior e atual por passo de mundo e monta o **proxy** que `campo.acumular`, `rostos` e `slime2d` leem.
- Contrato:
  - mundo: `m.{n, x, y, pig, membros, iniSl, slimes}`;
  - cada slime: `s.{ativo, idx, a11, a12, a21, a22, raio0, cx, cy, esq, dir, base, topo, dados:{ap, apModo}}`;
  - `a11 = 1 + 0,18σ`, `a22 = 1 − 0,22σ`.
- `N_PIG` passa para `fisica/constantes.js`, e o `campo.js` só troca esse import.
- `vista.test.js` roda `campo.acumular` e `rostos` sobre o proxy.

**Entrada:**
- Cada evento guarda `e.timeStamp` e é aplicado no passo real, dentro do lote do quadro, cujo instante simulado corresponde ao evento (padrão da pipa-corta).
- A meta é **entrada → pixel ≤ 1 quadro**, medida no `?debug`. A promessa anterior de 8,3 ms foi retirada.

### 2.3 Controles

**Esquema A, "Metades" (padrão no celular)**
- Cada `pointerId` fica com a zona onde encostou.
- **Esquerda: stick horizontal flutuante.**
  - Zona morta de 8 px; velocidade máxima a 36 px, na curva `((|dx|−8)/28)^0,8`.
  - A origem acompanha o dedo além de 56 px.
  - Anel fantasma de 112 px com alça de 48 px, alfa 0,30 parado e 0,6 em uso.
- **Direita: ações.**
  - `pointerdown` pula na hora.
  - **Um novo `pointerdown` no ar, segurado, com a bola na janela, ativa a cortada lenta.** Fora da janela, esse toque vira buffer de pulo de 120 ms.
  - Na variante "segura" do M1, vale a continuação do dedo do pulo, mas só se ela durar 180 ms ou mais depois de a bola entrar na janela, com um anel enchendo em volta da bola.
  - No próprio saque, segurar carrega a profundidade.
- **SUPER:** círculo de 72 px no alto da zona direita. Aparece só no seu saque, com 2 ou mais segmentos ou com prova grátis.

**Esquema B, "Botões"**
- ◀ ▶ de 76 px (64 px em paisagem) com vão de 10 px (8 em paisagem).
- PULO de 96 px e SUPER de 64 px.
- Tudo dentro de `env(safe-area-inset-*)` e a pelo menos 24 px das bordas.
- No esquema B, o 2º toque em PULO no ar ativa a cortada.

**Comum aos dois esquemas:**
- Buffer de 120 ms e coyote de 70 ms, os dois no relógio de mundo.
- Vibração só no Android: 18 ms, 40 ms e [30, 40, 60].
- Os controles na tela aparecem quando o último `pointerType` foi toque.

**Mira durante a câmera lenta**

| Entrada | Como move a mira |
|---|---|
| Arrasto do dedo de ação | Zona morta de 10 px; segue o eixo dominante; **"mais fundo" = para cima OU rumo ao adversário**; ganho de 0,075 u/px no retrato e 0,1 u/px em paisagem. Uma mini-quadra no anel do polegar mostra o alvo |
| Stick, ◀▶ ou setas | **O eixo herdado fica travado:** só move depois de voltar à zona morta ou de a tecla ser solta. Velocidade de 8 u/s com rampa de 150 ms. No 2P, o J1 mira com A/D e o J2 com ←/→ |
| Mouse | O cursor projetado no piso adversário é a retícula. Depois da soltura, o cursor é ignorado para o movimento por 400 ms ou até voltar ao próprio lado |

**Teclado e mouse:**

| Situação | Mover | Pular / pressionar de novo no ar e segurar = cortada | Super |
|---|---|---|---|
| 1P | A/D ou ←/→ | W, ↑ ou Espaço | S, ↓ ou Shift |
| 2P, jogador 1 | A/D | W | S |
| 2P, jogador 2 | ←/→ | ↑ | ↓ |

- No desktop, o padrão é o teclado, com dicas de tecla na tela.
- **Mouse:**
  - O slime segue o x do cursor, e o clique pula. Um novo clique segurado no ar ativa a cortada.
  - Depois de 20 s sem clique, aparece a dica "clique para pular" e sai `measure('entrada','mouse','sem-clique')`.
  - O portão de interação (§2.4) garante o relógio do PFT.
- **Pausa:** Esc ou P. Na pausa, Esc, Espaço ou Enter retomam.
- **Pausa automática por blur ou `visibilitychange`:**
  - só no meio de um rali ativo;
  - **nunca durante um anúncio**, nem nos 300 ms depois do `onAdEnd`;
  - durante o anúncio, toda intenção de jogo é ignorada.

**Teclado nos menus** (`ui/foco.js`):
- Setas e WASD movem o foco; Enter e Espaço acionam o botão principal; Esc volta ou retoma.
- O foco inicial cai sempre no botão normal, nunca no premiado. O anel de foco é visível.
- Um teste confere que cada cartão tem um botão principal alcançável só pelo teclado.

**Regras Poki de entrada** (vigiadas pelo `estilo.test`):
- `pointerdown` e `keydown` em fase de bolha. **Zero `stopPropagation`.**
- `preventDefault` só em `touchmove`, `wheel`, `contextmenu`, setas e Espaço.
- `pointercancel` vale como `pointerup`.
- `pointermove` nunca dispara `gameplayStart`.
- **CSS** em html, body e controles: `touch-action:none; overscroll-behavior:none; user-select:none; -webkit-user-select:none; -webkit-touch-callout:none; -webkit-tap-highlight-color:transparent`.

**Layout** (`render/layout.js`, função pura)

**Retrato.** As faixas são proporcionais e a prioridade é **quadra > controles > plateia**. `H_util` é a altura menos as safe areas.
- px/u = W / 25,5 (a câmera não segue em x; segue só em y e fica limitada à quadra).
- Placar: 56 px (48 se `H_util` < 700).
- Painel de controles: clamp(0,30·`H_util`, 200, 280) px. É desenhado como a frente da quadra, escurecida em 35%.
- Janela vertical do mundo: 21 u, com mínimo de 17 u. Se faltar espaço, o painel cede até 180 px.
- Plateia: o que sobrar (pode ser 0), acima da quadra.

| Tela | px/u | Placar | Plateia | Quadra (21 u) | Painel |
|---|---|---|---|---|---|
| 390×844 (safe 47/34) | 15,3 | 56 | 157 | 321 | 229 |
| 390×664 (Safari com barras) | 15,3 | 56 | 87 | 321 | 200 |
| 375×667 | 14,7 | 48 | 110 | 309 | 200 |
| 360×640 | 14,1 | 48 | 95 | 297 | 200 |
| 360×560 (Android com barra) | 14,1 | 48 | 15 | 297 | 200 |
| 412×915 | 16,2 | 56 | 245 | 339 | 275 |

**Pílula da Poki:** a zona de 46×62 px a partir de y = 24 px, no canto superior esquerdo, fica livre de qualquer coisa interativa. O placar fica no centro e a pausa à direita. O `layout.test` confere isso.

**Paisagem**
- Esquema A: a câmera ajusta 21 u na altura, com o piso a 20% da base. Em 844×390 isso dá 18,6 px/u e margens de 185 px.
- Esquema B: px/u = min(H/21, (W − 2·(safeLat + 24 + 136 + 8)) / 25,5). Em 844×390 dá cerca de 16,2 px/u; em 667×375, cerca de 13,0.
- O `layout.test` confere que nenhum controle fica sobre o retângulo da quadra, já descontada a safe area, e que px/u ≥ 13.
- Desktop 16:9: sem controles na tela.
- Tablet: `s = min(H/(janela_y+avental), W/(quadra+2·margemPolegar))`.

**2P num aparelho só**

| Aparelho | Controles |
|---|---|
| Tablet (≥ 1000 px) | Quartos espelhados |
| Celular em paisagem | Cada jogador usa a **própria margem**: mini-stick embaixo e PULO em cima |
| Celular em retrato | O 2P pede para girar o aparelho |

### 2.4 Regras e fluxo

**Pontuação:** rally point; quem ganha o ponto saca; o ponto perdido rende mais medidor.

| Partida | Alvo | Vai-a-2 | Teto |
|---|---|---|---|
| 1ª da vida (Gota) | 5, **imperdível** | não | — |
| Rivais | 7 | sim | 9 |
| Chefe da Copa 1 | 7 | sim | 9 |
| Chefes das Copas 2–4 | 9 | sim | 11 |
| Rápida e 2P | 5, 7 ou 9 | — | — |

**Saque ativo** (sem saque automático):
- O sacador anda entre |x| 6,5 e 10. A trajetória é determinística, e o receptor vê a sombra.

| Ação | Resultado |
|---|---|
| Toque (até 0,15 s) | Bola em ±6,5, ápice de 9,5 u, cerca de 1,3 s de voo |
| Segurar de 0,15 a 0,9 s | Profundidade de ±3,0 a ±11,5; anel de carga e mini-arco |
| Zona "VIAGEM" (0,55–0,70 s) | ±10,5, chapado, +25% de velocidade |
| **Chegar a 0,9 s** | **Na Copa 1, o saque sai sozinho em ±11,5 com uma tremida (nunca fora).** Da Copa 2 em diante, a faixa vermelha de 0,9–1,2 s alcança ±12,0–13,2 (arriscado) e o saque sai sozinho aos 1,2 s |

- Esperando o saque humano: aos 4 s a bola pulsa e a mão fantasma aparece. **O jogo espera sem limite.**
- **Saque da CPU:** de 0,5 a 0,8 s depois do "saque valendo". Nunca antes da 1ª interação do humano. Se o portão de interação estiver ativo (30 s sem `pointerdown`/`keydown`), a CPU espera um toque ("toque para receber").
- A tabela única de tempos é exportada de `jogo/regras.js`.

**Três toques:** pontinhos (●●○); o 4º toque é falta ("4 TOQUES!"). A cortada conta como toque.

**Bola fora**
- É fora quando o centro da bola passa de |x| > 12,4, por cima da placa, **do lado oposto ao do último toque**. O FORA é marcado no cruzamento, antes de a bola chegar à rede de fundo.
- Saque por cima da placa do receptor = ponto do receptor.
- A bola que o próprio lado manda para trás bate na rede de proteção e segue em jogo.
- Telemetria (só de humanos): meta de 6% a 12% dos pontos.

**Modos:** Circuito Gosma (4 Copas), Amistoso, 2P local e Vestiário.

**Entre partidas, um cartão só** sobre a quadra:
- resultado + próximo rival;
- chip de equipamento (mantém o último);
- **"Próxima"**, que é o "Jogar" e recebe o foco inicial;
- no máximo 1 botão premiado, menor.

Evolução, Gotas contando e replay podem ser pulados com um toque. **Meta medida pelo bot:** no máximo 2 toques e 4 s, sem anúncio, entre o fim de uma partida e o saque da próxima.

**Fluxo do SDK**

| Momento | O que acontece |
|---|---|
| Carregamento | `gameLoadingFinished` no 1º quadro com a fonte (reserva de 1,5 s) |
| 1º jogo | `gameplayStart` no 1º `pointerdown`/`keydown` real |
| Entre pontos | nenhum evento |
| Ponto final | `gameplayStop` quando a bola toca o chão → festa e replay → cartão único → toque em "Próxima" ou "Revanche" → `commercialBreak` (a partir da 3ª partida e **só se não houve premiado nessa pausa**) → o rival entra (1 s) → espera o toque de saque → `gameplayStart` |
| Pausa | `gameplayStop` → "Continuar" → `commercialBreak` → toque → `gameplayStart` |
| Durante anúncio | entrada desligada, blur ignorado. O toque de saque só vale depois que a promessa resolver |
| Editor e vestiário | só entre partidas, sem `commercialBreak` ao sair |

**Regra do Inspector:** todo `gameplayStart` precisa de `pointerdown`/`keydown` real nos 5 s anteriores. O 1º saque da partida, o saque depois de pausa ou anúncio e o 1º da sessão esperam um toque, sem relógio.

### 2.5 CORTADA EM CÂMERA LENTA (o pedido do usuário: a câmera lenta do Blumgi no power-up de corte)

**Captura da referência: PASSO 0 do M0, antes de qualquer código.** É o pedido literal ("Captura a câmera lenta também").

1. **No Chrome do usuário (claude-in-chrome):**
   - Abrir o vídeo do YouTube `DS4mSolMfUE` e mais 1 ou 2 gameplays do Blumgi Soccer, de preferência em 60 fps.
   - Pausar e medir o fps real pelas diferenças de `mediaTime` no `requestVideoFrameCallback` e pelo `getVideoPlaybackQuality()`.
   - Avançar quadro a quadro com `video.currentTime += 1/fps`.
   - Capturar os quadros por zoom/screenshot, ou pelo `drawImage` do vídeo num canvas da própria página com download. Gravar GIFs dos trechos (mira e chute; gol) com o `gif_creator`.
   - Opcional: tentar `poki.com/br/g/blumgi-soccer` só se a ferramenta tiver mouse down/up separados. Hoje o endereço direto estava bloqueado e o clique não se mantinha.
2. **Onde guardar:** `~/.cache/slime-voley-ref/`, fora do repositório e da build, porque são quadros de terceiros.
3. **O que medir:**
   - Câmera lenta: escala (deslocamento de destroços e inimigos por quadro, com e sem mira), rampas de entrada e saída, tempo que o chutador fica congelado, número de bolinhas e quanto crescem, ponta da flecha em função da força, raio, espessura e duração do anel, cadência, vida e escala dos fantasmas.
   - Gol: zoom, disco, confete (quantidade, cores, vida), tempo da palavra e do "READY?".
4. **Margem:** ±1 quadro (33 ms a 30 fps, 17 ms a 60 fps). Um evento mais curto que 2 quadros fica marcado como "não resolvido".
5. **Registro:** `docs/referencias/blumgi-camera-lenta.md` e `blumgi-soccer-gol.md`, com a observação de hoje, o ID dos vídeos, os timestamps, o fps real, a tabela medida, a margem e os caminhos do cache. **Sem imagens no repositório.**
6. **Uso dos números:** os valores medidos viram o `CORTADA` de `src/jogo/cortada.js` e os padrões do laboratório do M1.
   - A gravação do usuário fica opcional. Se vier, é medida pelos PTS nativos (`ffprobe -show_frames` / `showinfo`), **sem reamostrar para 60 fps**.

**Princípio de originalidade:** a captura calibra o **tempo e a sensação** (escala, rampas, durações, densidade). **A forma e a cor são nossas:** gotas na cor do time, coroa de respingo, rastro que escorre, áudio próprio.

**Nomes:** PT "Cortada Câmera Lenta", EN "Slow-Mo Spike", ES "Remate en Cámara Lenta". O Meteoro e a Folha Seca usam a mesma mira.

**Máquina de estados** (`jogo/cortada.js`, pura)

| Estado | Duração (jogo-real) | O que acontece |
|---|---|---|
| `elegivel` | — | Todas as condições juntas: (1) **uma pressão nova começada no ar** (ou, na variante "segura", 180 ms ou mais depois da janela); (2) no ar há 60 ms ou mais; (3) bola a até **1,6 u** da cúpula (+0,1 u por nível; +0,4 u se o toque anterior foi do próprio lado; 2,4 u no onboarding); (4) bola com y ≥ 4,0; (5) **centro da bola no próprio lado**; (6) não é o 4º toque; (7) **não é recepção de saque nem bola marcada como super ou cortada**; (8) medidor ≥ 100 ou "Cortada grátis". Com o medidor vazio, os pips tremem |
| `entrando` | 100 ms, easeOutCubic | O mundo vai de 1000 a 70; o **defensor** vai de 1000 a **300**. **A bola é puxada por mola até o "ponto de batida"** (0,9 u acima da cúpula e 0,4 u à frente, rumo à rede). **A colisão bola-cortador fica desligada.** Push-in de 1,00 a 1,04 (desligado em "reduzir movimento"). Evento `camera-lenta{entra}` |
| `mirando` | até 1,2 s (0,7 no 2P; 3,0 na 1ª vez do tutorial) | O cortador fica congelado (pose esticada, rosto `focado`). **A bola anda no máximo 60 ms de mundo no total** (escala da bola = 60 ms / tMax) e respira. O rival anda a 0,30 e **a IA lê a retícula desde a entrada**, com o tempo de reação dela; a bola nunca está ao alcance dela. A plateia e o confete ficam a 7%. Sem vinheta. Nos últimos 0,3 s as gotas pulsam. Ao esgotar o tempo, solta com a mira atual |
| `soltando` | 50 ms de hitstop + 80 ms | Contato resolvido no ponto de batida. **Bote de até 2,0 u, limitado ao próprio lado** (\|x\| ≥ REDE_R + a). **Coroa de respingo** na cor do time: anel de gotas de 0,5 a 2,8 u em 220 ms, mais um anel de tinta fino 40 ms depois (valores substituídos pela captura). A bola sai na velocidade resolvida, sem `VMAX` até o 1º contato. Escalas voltam a 1000. Vibração [30, 40, 60]. **Variante "segura":** soltura em menos de 200 ms sem a mira andar mais de 1 u devolve os 100 e cancela |
| `turbinada` | até o contato | **Rastro de gotas que escorrem**: 1 a cada 30 ms, no máximo 8, vida de 240 ms (substituídos pela captura), na cor do rastro equipado |

**Mira** (`render/mira.js`)
- O alvo fica no piso adversário, de rede + 1,0 até LARG − 0,6. A cortada lenta nunca sai.
- **Mira padrão:** um ponto no fundo da quadra a pelo menos 3 u da posição prevista do rival (posição + 0,3 s de velocidade). Se não houver, o ponto válido mais longe dele.
- **Resolvedor (por tiro):**
  - para cada ângulo de −75° a +30°, em passos de 2°, faz bissecção na velocidade com `fisica/volei.prever`, o mesmo integrador, **com vento e sem `VMAX`**, até o ponto de queda bater no alvo;
  - descarta o que passa de `V_CORTADA` = 29 ou cruza a rede abaixo de `REDE_H + RB + 0,25`;
  - fica com o mais íngreme. Se nenhum servir, levanta o arco.
- **Desenho:**
  - **9 gotas** na cor do time, com contorno de tinta de 1,2 px e brilho branco, crescendo de 0,07 a 0,24 u;
  - **a última é uma gota maior que aponta** (no lugar da flecha);
  - `L = 2,5 + 4,5·(|v|/V_CORTADA)`;
  - as gotas respiram ±6% a 2 Hz.
- **Retícula** no ponto de queda: anel de 0,6 u com 4 marcas.

**Áudio (nosso):**
- Entrada: swell reverso, passa-baixa de 18 kHz a 700 Hz em 100 ms, plateia a 0,6, "tum" a cada 450 ms.
- Soltura: estalo + grave de 70 a 40 Hz + `comboSwoosh` + rugido.
- `vozPowerUpSlime` na 1ª ativação de cada partida.

**CPU e justiça:**
- A CPU (T2 em diante) segura de 0,4 a 0,6 s, com a linha e a retícula na cor dela. O humano, a 0,30, consegue se mexer: a telegrafia funciona.
- A retícula-fantasma fica 300 ms depois da soltura.
- No máximo 1 cortada lenta por lado por rali.
- No 2P, uma mira por vez; o outro jogador anda a 0,30.
- **Meta:** ponto direto de 55% a 70% contra o humano simulado.

**Testes** (`test/cortada.test.js`):
- não arma no 1º toque de recepção de saque nem com bola de super;
- só arma com pressão nova (variante padrão);
- com escala 70, o mundo anda 0,07× e o defensor 0,30×;
- **com tMira de 3,0 s e a bola a 2,4 u descendo a 12 u/s, a cortada sempre acontece e o slime nunca cruza a rede**;
- disparo automático em 1,2 s;
- alvo sempre dentro, com vento máximo e em cada nível;
- eventos na ordem certa;
- `hash` com escala 1000.

**Telemetria:**
- `measure('powerup','cortada-lenta','visible')` **uma vez por partida** (na 1ª vez que fica elegível), mais `interact`.
- `cortada/mira/auto|manual`, `cortada/lenta/ponto`.
- `cortada/lenta/sem-querer`: soltura em menos de 150 ms com a mira parada, **ou** disparo automático com a mira intocada.
- Na variante "segura", também `cortada/lenta/segurou-do-chao`. Se passar de cerca de 30% sem mira, fica a pressão nova.

### 2.6 Medidor de Gosma e super saques

**Medidor:** 3 segmentos de 100.

| Ganho | Pontos |
|---|---|
| Toque | +6 |
| Bola passada | +4 |
| Ponto ganho | +12 |
| Ponto perdido | +18 |
| **Manchete perfeita (só contra super ou cortada)** | +35 |
| Rali com 6 ou mais travessias | +3 por travessia |
| 1ª partida | ganho ×2 |

- Custos: cortada lenta 100; super saque 200.
- Equipamento: 1 saque e 1 cortada, num chip do cartão.

**Super saques:** todos anunciam o golpe 350 ms antes (o sacador acende, há som e a plateia reage).

| Saque | Efeito | Manchete perfeita (janela própria) | Recepção comum |
|---|---|---|---|
| **Fogo** | Chapado a 31 u/s rumo a ±10,5 (o stick desloca ±2), cerca de 0,75 s; rastro de chama. Som: **`vozPowerUpSlime` + crepitar + whoosh** | Estar a até 0,8 u da linha prevista, com o stick neutro | Receptor empurrado (vx 7, σ +0,6); a bola sai fraca (e = 0,4) |
| **Raio** | Sobe a 11 u; 2 saltos de 4 u com marcador 200 ms antes; desce a 60° e 26 u/s | Estar sobre o último marcador (±0,5 u) | "Eletrizado" por 0,45 s (até 0,6 s) |
| **Jornada** (PT "Saque Jornada", EN "Sky Serve", ES "Saque al Cielo"; nunca "Star Trek") | vy 40, ápice de cerca de 27 u, cerca de 2,4 s de voo. Câmera +25%, altímetro, seta, canto "JOR-NA-DA". A sombra vai de raio 2,2 a 0,9 u e fica sempre **acima** do ofuscamento. **Desvio de ±2 u revelado 0,6 s antes da queda** (a sombra desliza em 300 ms). Ofuscamento nos últimos 0,9 s. Na Escola: "Jornada furada" | Estar sobre a sombra (±0,35 u) | Bola pesada (e = 0,35), rosto zonzo por 0,5 s |
| Contra cortada | — | Contato a até 0,35a do topo da cúpula | — |

- A manchete perfeita dá "MANCHETE!", saída suave de 9 u/s para o centro do próprio lado, +35 de medidor e cancela o efeito.
- **Meta em `poderes.test`/calibrar:** o humano simulado consegue a perfeita em 25% a 40% das vezes contra cada super.

### 2.7 Power-ups na quadra (a partir da 2ª partida)

**Aparição e captura:**
- 1 por vez. O 1º aos 20 s, depois a cada 22 ± 4 s de rali.
- Aviso de 0,8 s; vive 8 s.
- Bolha sem texto, em x entre 2,5 e LARG − 2 e y entre 6 e 10.
- **Quem pega é a bola.** O bônus vai para quem tocou por último. No saque a bolha não pode ser pega.

| Power-up | Peso | Efeito |
|---|---|---|
| Cortada grátis | 35% | Próxima cortada lenta sem gastar medidor |
| Pulo Mola | 25% | Pulo ×1,3 por 2 pontos |
| Gosmão | 20% | R ×1,25 por 2 pontos |
| +1 segmento | 20% | Enche um segmento |

**Distribuição:** contra a CPU, com diferença de 2 ou mais pontos, 60% vão para o lado de quem perde. No 2P, os lados alternam.

**Prova grátis de super (roteirizada, sem anúncio):**
- Partida 2: no 3º saque do humano, o SUPER acende com **"Jornada grátis"**.
- Partida 3: o mesmo com o **Raio**.
- Cada uma vale uma vez. O desbloqueio permanente continua nos chefes.

**Proibido:** invisibilidade, atordoamento acima de 0,6 s, qualquer efeito sem aviso.

### 2.8 IA (`jogo/ia.js`, `jogo/rivais.js`)

**Base:**
- `preverQueda` com a elipse exata.
- Consciência de fora, só para ataques estourados.
- Leitura da retícula desde a entrada em `mirando`.
- Leitura da sombra (erro ×1,3 sob ofuscamento).
- A IA nunca disputa a bola durante a mira do outro.

| Nível | vel | reação (s) | erro (u) | pulo | corta | super | perfeita |
|---|---|---|---|---|---|---|---|
| T0 | 7,0 | 0,45 | 1,8 | 0 | 0 | 0 | 0 |
| T1 | 7,5 | 0,40 | 1,6 | 0,10 | 0 | 0 | 0,05 |
| **T1+** | 8,0 | 0,32 | 1,4 | 0,20 | 0,05 | 0 | 0,10 |
| T2 | 9,0 | 0,24 | 1,1 | 0,35 | 0,15 | 0,3 | 0,15 |
| T3 | 10,0 | 0,16 | 0,8 | 0,50 | 0,35 | 0,6 | 0,25 |
| T4 | 10,5 | 0,12 | 0,65 | 0,55 | 0,45 | 0,75 | 0,35 |
| T5 | 11 | 0,08 | 0,45 | 0,6 | 0,55 | 0,9 | 0,5 |

**Personalidades:** `distraida`, `lob`, `rede`, `mira`, `super` (guarda ou afobado), `caca-powerup`.

**Rivais da v1:**

| Copa | Rivais | Chefe |
|---|---|---|
| 1 Praia | Gota (T0→T1, distraída; partida 1 imperdível), Geleia (**T1+ fixo** na 1ª vez, erro ×1,4, no máximo 1 cortada lenta telegrafada depois do 4º ponto e nunca no match point) | **Rei Gosma (T2**, mira, **1 Fogo roteirizado**, anunciado e defensável, sem cortada lenta no 1º encontro) |
| 2 Escola | Bolinha (T2, lob), Muralha (T2, rede), Professora Pudim (T3) | Faísca (T3, Raio) |
| 3 Rua | Dona Calma (T3), Chiclete (T3, Fogo), Bolota (T3, caça-powerup) | Vovó Nuvem (T4, Jornada) |
| 4 Arena | Trovão (T4, Raio), Cometa (T4), Geleião (T4) | Pimenta (T5, Fogo + Meteoro) |

**Elástico** (só contra a CPU): é uma função contínua do placar, limitada, e **nunca troca de nível no meio da partida**.
- CPU 3 ou mais pontos à frente: erro ×1,3, reação +0,06 s, corta ×0,5.
- CPU 4 ou mais pontos atrás: erro ×0,85.
- Chefes: fatores reduzidos a ×1,15.

**Proteção por partida (não por relógio):**
- **Partida 1 imperdível:** a CPU nunca marca o ponto que fecharia a partida. Quando iria marcar, erra de forma visível, com um ataque estourado.
- **Partida 2:** nível fixo do começo ao fim, com o "anjo" no match point quando o humano está 2 ou mais pontos atrás.
- **Partida 3:** como na tabela.

**Humano simulado** (`test/apoio/humano-simulado.js`):
- reação de 0,28 s, erro de 1,2 u, latência de 1 quadro;
- 30% de pulos fora de hora;
- usa a cortada em 50% das chances; nunca segura sem querer;
- variante de **entrada nula**.

**Testes em dois níveis:**
- **`npm test`** (sementes fixas, rápido):
  - `hash` e placares exatos;
  - a entrada nula ganha o 1º ponto em até 15 s em 8 sementes;
  - nunca 4 toques.
- **`npm run calibrar`** (estatístico, rodado ao mexer na IA ou na física):
  - o humano simulado nunca perde a partida 1 em 1.000 sementes;
  - vence a Copa 1 na 1ª tentativa em 65% ou mais das sementes;
  - o arco fecha entre 6:00 e 7:30;
  - ralis de 5 a 9 s;
  - ACE abaixo de 8%;
  - fora contra si mesmo abaixo de 5%;
  - cortada de 55% a 70%;
  - perfeita de 25% a 40%.

### 2.9 Comemoração de ponto (ritmo do Blumgi, identidade nossa)

`render/celebracao.js` é uma função pura de `tJogo`, com semente (porte do `transicoes.js` da stringcut). **Há dois níveis:**

**COMPLETA** (1,8 s até o saque valer). Vale para:
- 1º ponto de cada partida e os 3 primeiros pontos da 1ª partida;
- ACE, BOMBA, ponto de super, BLOQUEIO, VIRADA e QUE RALI;
- o ponto que dá match point;
- "x3 PEGANDO FOGO".

| t (ms) | O quê |
|---|---|
| 0 | Hitstop de 90 ms. **Coroa de respingo** na cor de quem pontuou, com núcleo claro (cor do time clareada 60%; **sem disco branco**), mais 10 gotas e marca no piso. Som do piso, apito, vibração de 40 ms |
| 40 | Close de 1,0 a 1,40 (paisagem) ou 1,25 (retrato), com foco a 65% do caminho até o impacto, em 160 ms. Tremor com trauma 0,35 (ACE/BOMBA 0,55; super 0,7) |
| 90 | Confete num cone de ±60°: **60% gotinhas, 40% quadradinhos**, 4 tons do time. Quantidade conforme a qualidade (§4.5). Velocidade de 8 a 17 u/s, g = 14, vida de 1,6 a 2,2 s |
| 120 | Plateia em onda do lado de quem marcou; rugido, fanfarra nossa, `estouroPop` |
| 150 | **Palavra de gosma:** escala de 0 a 1,2 e depois 1,0; rotação de −6° a 0°, balanço de ±2°; até 70% da quadra (`cabe()`); Fredoka 700, face branca, contorno e extrusão de 6 camadas **na cor escura do time**; 3 a 5 gotas escorrem |
| 200–1000 | O zoom deriva até 1,44. O vencedor pula; o perdedor amassa |
| 1000 | O zoom volta a 1,0 em 380 ms. **O sacador desliza até a zona de saque, de 1000 a 1300 ms** (o receptor fica onde está) |
| 1100 | A palavra amassa e é lançada para cima |
| 1250 | Placar gigante "4 · 2" |
| 1400 | O controle volta (sem deslize automático depois disso) |
| 1600 | Sai o placar gigante; a bola aparece com "plop" |
| 1800 | Saque valendo. A CPU saca de 0,5 a 0,8 s depois |

**CURTA** (1,0 s), para os pontos comuns:
- hitstop de 60 ms;
- coroa de respingo menor;
- confete a 40%;
- zoom suave de 1,12;
- palavra média ("PONTO!", escala 0,6) perto do impacto;
- o placar do HUD rola;
- o sacador desliza de 300 a 500 ms e o controle volta aos 500 ms;
- saque valendo aos 1,0 s.

**Ponto da CPU:** festa curta assimétrica, sem palavra, com o rival comemorando e a plateia fazendo "ohh". No 2P, os dois lados têm o mesmo tratamento.

**Palavras** (chaves `grito.*`):

| Contexto | PT | EN | ES |
|---|---|---|---|
| Ponto comum | PONTO! | POINT! | ¡PUNTO! |
| Ace | ACE! | ACE! | ¡ACE! |
| Cortada lenta, ou **velocidade de saída do último toque ≥ 24 u/s com vy < 0** (não a velocidade no chão) | BOMBA! | SPIKE! | ¡REMATE! |
| Bloqueio | BLOQUEIO! | BLOCK! | ¡BLOQUEO! |
| Bola fora (do rival) | FORA! | OUT! | ¡FUERA! |
| Erro na rede | NA REDE! | NET! | ¡RED! |
| Falta de toques | 4 TOQUES! | 4 TOUCHES! | ¡4 TOQUES! |
| Virada | VIRADA! | COMEBACK! | ¡REMONTADA! |
| Rali de 10 ou mais | QUE RALI! | WHAT A RALLY! | ¡QUÉ RALLY! |
| Ponto de super saque | FOGO! / RAIO! / JORNADA! | FIRE! / BOLT! / SKY SERVE! | ¡FUEGO! / ¡RAYO! / ¡AL CIELO! |

**Ponto final da partida:**
- `gameplayStop` em t = 0. Palavra VITÓRIA! ou DERROTA (sem confete na derrota).
- **Replay re-simulado:** um snapshot completo do mundo a cada 0,5 s, guardado num anel de 3 s, mais as intenções por passo. Re-simula a janela de 1,4 s a 0,5×, com tarja, etiqueta REPLAY e câmera seguindo a bola. Pode ser pulado depois de 0,3 s.
- **Teste:** o último quadro do replay é igual ao quadro real.

**Início da partida e volta da pausa:**
- O áudio "Ready?… Go!" (`vozPronto`/`vozVai`) só toca **depois do destrave real do áudio** (`pointerup`/`keydown`).
- Na tela aparece o placar gigante "0 · 0" e depois "VAI!/GO!/¡YA!". **Nunca o texto "READY?".**

**Outros:**
- Faixa "PONTO DA PARTIDA" antes do saque de match point.
- **`regras.test`:** tempo morto médio entre pontos ≤ 1,4 s em 100 pontos de bot, sem contar a espera do saque humano.

---

## 3. Conteúdo

### 3.1 Direção de arte (pilares e as 3 direções do M1)

**Pilares fixos:**
1. **Hierarquia:** bola > slime do jogador > rival > rede > plateia. O contraste local da bola é de 3:1 ou mais em 12 quadros de bot por ginásio.
2. **Uma luz por ginásio:** principal do alto à esquerda, rim de trás, sombra de contato.
3. **Contorno fino:** `uTraco` de 1,4 a 2,2 px.
4. **Três camadas:** fundo distante (assado, desfoque intencional), quadra (em código, nítida) e primeiro plano.
5. **Texto só em código.**
6. **Paleta curta.** Nada perto de `#83FFE7`.

**Direções do checkpoint M1.** Todas usam o mesmo motor, **a Praia jogável**, a mesma semente e o mesmo rali gravado. A Arena aparece só como prancha estática, para a thumb.

| | A. Gel Premium | B. Brinquedo de Vinil | C. Transmissão Esportiva |
|---|---|---|---|
| Ideia | Gelatina brilhante | Diorama de brinquedo | Grafismo de TV |
| Grok | Fundo distante | Fundo distante, repintura forte | Quase nenhum |
| Peso por ginásio | 120–200 KB | 150–250 KB | 0–60 KB |
| **Custo** | medido no M1 | medido no M1 (tilt-shift sempre assado, nunca `filter` por quadro) | medido no M1 |

### 3.2 Ginásios (dinâmicos)

**Contrato:**
- `render/ginasios/<id>.js`: `{id, paleta, arte, caixa, fileiras, assar(), vivo(), telao?, luz, ofusca?}`.
- Os modificadores de jogo ficam em `jogo/ginasios.js`, puro.

**Fundo distante (decisão sobre a resolução do Grok):**
- `arte` é um **fundo distante em paralaxe de 0,25**, na resolução nativa do Grok.
- O `image_edit` reduz a referência a cerca de 768 px e devolve até cerca de 1280×720 ou 1248×832. Com 2 ladrilhos 16:9 sobrepostos costurados, chega a cerca de 2000×900.
- Assumimos um **desfoque de profundidade intencional**. O zoom do close no fundo é `1 + (z−1)·0,3`.
- Tudo que precisa de nitidez é feito em código: piso, linhas, rede, placas, LED, telão, arquibancada próxima e plateia de perto.
- Teto de 250 KB por fundo. O aviso "Image Optimization" do Inspector é conferido no M2.

| # | Ginásio | Dinâmica | Efeito leve | Plateia | Desbloqueio |
|---|---|---|---|---|---|
| 1 | Praia do Saque | Mar, pipas, biruta, caranguejo | Vento de ±0,6 a 1,5 u/s² avisado pela biruta; desligado nas 2 primeiras partidas | 6 → 40 | inicial |
| 2 | Quadra da Escola | Luminárias, bandeirolas | Teto em y = 11; Jornada furada | 10 → 60 | Copa 1 |
| 3 | Quadra da Rua | Tarde que vira noite, postes | Placas e fundo de alambrado (e = 0,95); ofuscamento dos postes | 5 → 35 | Copa 2 |
| 4 | Arena Gelatão | LED, telão, holofotes, ola | Holofotes ofuscam a Jornada | 25% → 100% | Copa 3 |
| 5–6 (M8) | Chuva, Neve | — | Piso molhado, gelo | — | 1.0 |

Lotação: base + 15% por vitória + 25% no título.

### 3.3 Plateia de slimes

**Atlas gerado em código, em fatias:**
- No P0, só os 6 slimes da Praia.
- No P1/P2, o atlas completo: 8 corpos × 3 tamanhos × 2 poses, acessórios e tintas.
- Até 4 ms por quadro, **sem `requestIdleCallback`**.

**Movimento:** repouso, excitação E, onda, ola e flashes, como antes.

**Som:** murmúrio sintetizado, `plateia`, `fiufiu`, canto JOR-NA-DA. Tudo cala nos anúncios.

### 3.4 Skins do mundo do futebol, sem IP real

**Proibidos** (teste de grep): FIFA, World Cup, Copa do Mundo, Mundial, Copa América, Libertadores, Champions, Brasileirão, CBF, UEFA, Maracanã(zinho), Star Trek, Jornada nas Estrelas; clubes, jogadores, Nike, Adidas, Mikasa, Molten; escudos reais; combinações "bandeira + número".

**Catálogo v1** (16 skins, cada uma com kit casa e kit fora; a troca acontece se o ΔE OKLab for menor que 15):

| Skin | Origem |
|---|---|
| **Laranjinha** (padrão, aparece na thumb) | inicial |
| Listrado, Faixa, Metades, Xadrez | 1ª escolha e loja |
| Camisa 10 | título da Copa 1 |
| Técnico | título da Copa 2 |
| Dono da Bola | título da Copa 3 |
| Goleiro Paredão | título da Copa 4 |
| Árbitro, Gandula, Torcedor, Mascote, Bola de Futebol | loja |
| Gramado Vivo | loja (especial) |
| **Taça Dourada** | campeão do Circuito |

**Como são feitas:** padrões procedurais no shader (`uAp`, 3 vec4 por aparência); acessórios em Canvas2D ancorados no `quadro(s)` de `rostos.js`.

**Evoluções:**

| Nível | XP | O que muda |
|---|---|---|
| Base | 0 | Cores do kit |
| Pro | 80 | Gola, punhos, número com contorno, mais brilho |
| Craque | 300 | Rastro, olhos exclusivos, chuteira dourada |
| Lenda | 700 | Aura, contorno dourado, comemoração própria, bandeiras na plateia |

- **Skin liberada é equipada na hora, com festa.** O XP é por skin e fica guardado.
- "EVOLUIU!" pode ser pulado.

**Comemorações (6):** Aviãozinho, Deslize de Barriga, Cambalhota, Dancinha, Coração, Embaixadinha.

**Bolas (8):** só visuais, com contraste testado.

### 3.5 Habilidades, desbloqueio e níveis

| Habilidade | Desbloqueio | Atributo por nível (5 níveis, 150/300/600/1000) |
|---|---|---|
| Cortada Câmera Lenta | tutorial | **alcance de elegibilidade +0,1 u** (1,6 → 2,0 u); a mira fica em 1,2 s |
| Saque de Fogo | Rei Gosma | velocidade +3% (31 → 34,7) |
| Saque Raio | Faísca (prova grátis na partida 3) | descida +3% |
| Saque Jornada | Vovó Nuvem (prova grátis na partida 2) | desvio +0,2 u |
| Cortada Meteoro | Pimenta | velocidade +3%, rachadura no piso |
| Folha Seca | M8 | curva lateral |

Os chefes usam o nível igual ao índice da Copa. No 2P, tudo fica no nível 1. Nenhum anúncio dá nível.

### 3.6 Editor de skins ("Vestiário > Minha Skin", M5)

**Modelo por índices** (padrão da pipa-corta). Camadas: cor base (16), padrão (12), cor do padrão (corrigida se o ΔE for menor que 12), número, olhos, cabelo, acessório, chuteira, rastro, comemoração e **escudo 16×16 opcional**.

**Porte do editor de pixel** (não é cópia):
- sem `keydown` em captura e sem `stopPropagation`: os atalhos ficam em fase de bolha, só com o editor aberto;
- `render/vitrine.js` no lugar de `palco.js`;
- o codec 16×16 sai para `jogo/estampa.js`, sem depender de `niveis.js`;
- carregado com `import()` sob demanda.

**Código de compartilhamento:**
- **Só o código curto** (`GS1-`, cerca de 14 caracteres, índices de catálogo). **O escudo fica só no aparelho:** nada de conteúdo desenhado pelo jogador compartilhado com outras pessoas (público de 9 a 14 anos).
- **Copiar:** campo selecionável + `navigator.clipboard.writeText`, com `execCommand('copy')` de reserva.
- **Colar:** num campo de entrada, sem `clipboard.readText`.
- Conferir no Inspector, em modo celular, dentro do iframe.
- Na Poki: `shareableURL({skin})` e `getURLParam('skin')`, via os novos repasses do `poki.js`.

**Resto:** Aleatório harmônico, 3 slots, itens de 30 a 80 Gotas. O SDK só entre partidas.

### 3.7 Economia (uma moeda: Gotas)

**Ganhos** (cerca de 30 por partida):

| Fonte | Gotas |
|---|---|
| Ponto | +1 |
| Vitória | +20 + 5 × índice da Copa |
| Derrota | +8 |
| Ace | +2 |
| Cortada lenta que pontua | +2 |
| Rali de 10 ou mais | +3 |
| Virada | +5 |
| Partida perfeita | +10 |
| 1º título de cada Copa | +50 |

**Preços:**

| Item | Gotas |
|---|---|
| Skins comuns | 120–200 |
| Skins especiais | 250–400 |
| Bolas | 60–150 |
| Comemorações | 90–180 |
| Níveis | 150 / 300 / 600 / 1000 |
| Itens do editor | 30–80 |

- 3 desafios sempre ativos.
- Proibido: segunda moeda, caixa aleatória, recompensa diária.

### 3.8 Anúncio premiado, intervalos e `measure()`

**Regras gerais:**
- o botão normal é igual ou maior e fica à esquerda ou acima;
- o botão com vídeo nunca é verde e sempre tem claquete;
- some sem SDK;
- nunca no 2P nem na área de jogo;
- o prêmio só vale com `success === true`;
- **no máximo 1 botão premiado por cartão.**

| Cartão | Normal | Premiado | `measure` |
|---|---|---|---|
| Fim (vitória) | Próxima ▶ | Gotas ×2 (ou "Testar [super bloqueado]", alternando, quando há super não provado) | `rewarded/dobrar`, `rewarded/testar-super` |
| Fim (derrota) | Revanche | Revanche com 1 segmento | `rewarded/super-inicio` |
| Vestiário | Comprar | Liberar agora | `rewarded/liberar-skin` |

**`commercialBreak`:**
- no toque em "Próxima" ou "Revanche" a partir da 3ª partida, e ao despausar;
- **pulado se houve premiado nessa pausa**, com ou sem sucesso;
- nunca entre pontos nem no editor;
- sem temporizador próprio.

**`measure()`:** os nomes são os mesmos de antes. **Ajustes:**
- `powerup/<super>/visible` sai uma vez por partida;
- novos: `entrada/mouse/sem-clique`, `cortada/lenta/segurou-do-chao`, `fora/<lado>/ponto`.

### 3.9 Onboarding (sem texto) e arco de 7 minutos

| Tempo | O que acontece |
|---|---|
| 0:00 | Praia, 6 slimes na plateia. A Gota segura a bola. Polegar fantasma (no desktop, teclas desenhadas) |
| 1º `pointerdown`/`keydown` | `gameplayStart`. O áudio destrava no `pointerup`/`keydown` ("Ready?… Go!" só se já destravou; se não, só o texto "VAI!"). **Exceção registrada:** a Gota saca 0,6 s depois, com um lob roteirizado para o quarto da cúpula voltado para a rede |
| ~0:06 | Parado, a **devolução assistida** cruza a rede e a Gota erra. **1º ponto com a festa completa** |
| Ponto 2 | O humano saca; o fantasma mostra o toque |
| ~0:25 | Dica de pulo, se ainda não pulou |
| 0:40–1:00 | O medidor (×2) acende. A Gota devolve uma bola alta roteirizada. O fantasma mostra "pula → toca de novo e segura". **1ª Cortada guiada:** alcance de 2,4 u, mira de 3,0 s, bola presa ao ponto de batida. **BOMBA!** |
| ~1:10 | Vitória por 5 (imperdível). A skin escolhida (1 de 2) é equipada na hora. Cartão único com a Geleia. Um toque |
| 1:25–3:25 | Partida 2 contra a Geleia (T1+ fixo). Entram os power-ups. **Jornada grátis** no 3º saque |
| 3:30–6:20 | Partida 3 contra o Rei Gosma (T2), com 1 Fogo roteirizado. **Raio grátis** |
| ~6:30 | Título da Copa 1, Camisa 10, Fogo liberado, skin no Pro, Escola revelada |
| ~7:00 | Partida 4 num ginásio novo |

O arco é validado no `calibrar` com o humano simulado (fecha entre 6:00 e 7:30).

### 3.10 Idiomas

- v1: EN (base), PT e ES.
- **Detecção:** o wrapper preenche a propriedade `idioma` com `PokiSDK.getLanguage()` depois do init (hoje fica `''`); depois `navigator.languages`; depois `'en'`. Há seletor manual e `?lang=` só em loopback.
- Preparar FR, IT, DE e TR: folga de 35%, `cabe()`, `i18n.test`, subset latin-ext.
- Strings como chaves. Nenhum não-ASCII em `src/jogo` fora de comentários.

### 3.11 Thumbnail

**Estática (628 e 1256):**
- a Laranjinha no ar, na pose da cortada;
- **linha de gotas, retícula no piso e respingos na cor do time (sem anel branco nem círculos-fantasma)**;
- Arena da direção escolhida, plateia desfocada;
- sem texto; legível em 128 px;
- renderizada pelo motor.

**Animada (M8):** 1080×1080, 5 s: arte → mira lenta → soltura → impacto e confete.

---

## 4. Arquitetura

### 4.1 Árvore

```
slime_voley/
  index.html  package.json  CLAUDE.md  LICENCAS.txt  .gitignore (dist/, dist-poki/*.zip, .tmp/, assets/brutos/)
  src/
    main.js     UNICO dono de SDK, audio, haptico, save, DOM; TRATADORES; __volei (loopback)
    core/   poki armazenamento save audio haptico rng laco entrada aparelho depuracao carregador
    fisica/ volei.js (bola, cupulas+sigma, rede, placas, rede de fundo, prever)  constantes.js (N_PIG)
    cor/    km pigmentos
    jogo/   partida tempo pele cortada poderes medidor powerups ia rivais regras torneio perfil skins
            estampa ginasios humor demos eventos
    render/ cena camera diretor layout vista campo composicao slime2d rostos acessorios bola quadra
            plateia mira vfx gosma celebracao qualidade fundo vitrine ginasios/{index,praia,escola,rua,arena}.js
    som/    sons receitas falas catalogo(podado) arquivos(gerado) torcida  arquivos/*.mp3
    ui/     hud menu foco controles vestiario editor icones estilo.css editor.css fontes/(so 700)
    i18n/   textos.js
    arte/   ginasios/<id>.webp
  test/  test/apoio/{sdk-falso,relogio-falso,audio-falso,humano-simulado}.js
  tools/  modelos/ (M1, nunca na build)  assets/{prompts,brutos}
  docs/{autoria.md, referencias/, marcos/, prints/, gifs/}  marketing/thumb/
```

### 4.2 Copiar quase como está (origem `$PAC` = 2.1.0)

| Origem | Mudança |
|---|---|
| `core/poki.js` | Preencher `idioma` com `getLanguage()`; **novos repasses `shareableURL` (assíncrono) e `getURLParam`**; tirar o que é só da CrazyGames |
| `core/armazenamento.js` | `PREFIXO_PADRAO='volei.'`; sem `migrarDoLocal` |
| `core/audio.js` | Barramento `ambiente` e passa-baixa em sfx e ambiente |
| `core/haptico.js`, `core/rng.js` | nenhuma |
| `core/laco.js` | §2.2 |
| `core/entrada.js` | Multi-ponteiro, `pointerId`, `pointerType`, **`timeStamp`**; `pointercancel` vira `'cima'` |
| `core/depuracao.js` | Parâmetros novos; regex de LAN **+ 172.16–31**; gancho global `__voleiModelo` (padrão `__slimeTeste`), aceito fora de loopback e removido pelo `empacotar` |
| `cor/{km,pigmentos}.js` | nenhuma |
| `render/campo.js` | Só o import de `N_PIG`, que passa a vir de `fisica/constantes.js` |
| `render/composicao.js` | `desenhar(campos[])`, `uAp` com 3 vec4, `PALETA` do novo `jogo/skins.js`, direção A/B/C |
| `render/camera.js` | `zoomada`, `limitada` |
| `render/rostos.js` + `jogo/humor.js` | Poda; expressão `focado` |
| `render/vfx.js`, `render/gosma.js` | `passo(dtMundo)`; coroa, rastro de gotas, fogo, raio |
| `render/qualidade.js` | nenhuma |
| `render/fundo.js` | Só `TINTA` e `PAPEL` |
| `som/{sons,receitas,falas}.js` + **`som/catalogo.js` podado** (`LOCUTOR` com as 19 falas, reserva explícita) | Teste: todo id do catálogo existe em `ARQUIVOS`, e o contrário também |
| `som/arquivos/*Slime.mp3` (19) + `fichas.mp3` + `clique.mp3` | — |
| `ui/fontes/fredoka-latin-700-normal.woff2` | **só a 700** |

**Não trazer:**
- `fisica/{mundo,materiais,forma,paredes}.js` (a pele é própria; reserva no §2.1);
- `jogo/{soltar,pote,niveis,cestos,cinza,cores,goo,fases-molde,pressao,missoes}.js` e `jogo/modos/*`;
- `render/{cena,cenarios,cestos,guias,missil,palco,fallback2d}.js` e `render/prototipos/*`;
- `cor/difusao.js`, `som/{musica,pecas}.js`, `ui/loja/*`, `ui/prototipos.css`, a Fredoka 600.

**Reescritos a partir do pacote:** `jogo/skins.js` (catálogo novo, ainda exportando `PALETA`) e `ui/editor.js` (porte, §3.6).

**Testes e ferramentas da 2.1.0:** `gh api repos/sabotageBR/slime-merge/contents/<caminho>?ref=535e81d`, lendo o remoto **sem `git fetch` e sem tocar no `.git`**.
- Itens: `test/apoio/{sdk-falso,relogio-falso,audio-falso}.js`, `test/{poki,audio,sons,qualidade,estilo}.test.js`, `tools/{sons,cdp}.mjs`.
- **`tools/bancada.mjs` é reescrita** para `fisica/volei` e a pele, porque a original importa módulos excluídos.
- Reserva: os equivalentes da stringcut.

### 4.3 Portar de projetos irmãos (com cabeçalho "porte de …")

| Origem | Destino e uso |
|---|---|
| `$EM/stringcut/src/render/transicoes.js` | `render/celebracao.js` |
| `$EM/hexadrop/src/render/transicoes.js` | `cabe()`, gritos, `reduzido` |
| `$EM/2048-cards/src/render/transicoes.js` | `festa()` |
| `$EM/pipa-corta/src/core/{aparelho,save}.js` | `core/` |
| `$EM/pipa-corta/src/ui/editor.js` + `src/conteudo/pipas.js` | padrão do editor |
| `$EM/thelastguy/src/input/touch.js` | referência para `ui/controles.js` |
| `$EM/stringcut/tools/{servir,shot,prints-build,telas,sdkcheck,thumb,empacotar,gif-jogo}.mjs` | `tools/` |
| **`$EM/slime-merge/tools/artifact-modelos.mjs`** | `tools/artifact.mjs`: hub + `jogo-<visual><controle>.html` com `window.__voleiModelo`, mais `src`, WebP, MP3 e fontes |
| `$EM/pipa-corta/tools/{gravar,roteiros}.mjs` | relógio virtual (WebSocket global do Node 22) |
| `$EM/hexadrop/tools/verify-build.mjs` | verificações do empacotar |
| **`$EM/carimbador-maluco/tools/medir.mjs`** | `tools/medir.mjs`: `setCPUThrottlingRate` de 4 a 6, dpr 1,5, 844×390, quadro inteiro com o rali gravado |

### 4.4 Módulos novos e contratos

**API** (`jogo/partida.js`): `criarPartida({...})` → `passo()`, `intencao(j, {eixo, pulo, segura, novaPressao, super, mira, t})`, `eventos[]`, `estadoVisual()`, `snapshot()`/`restaurar()` (para o replay), `hash()`, `resumo()`.

**Eventos:** os de antes, mais `prova-gratis`. Um teste confere que cada tipo tem tratador no `TRATADORES`.

**Fronteiras** (`estilo.test`):
- as 9 regras do slime-merge;
- `src/jogo` e `src/fisica` só importam de fora `core/rng.js` e **`cor/*.js` (puros)**;
- `src/render` não importa `ui/`, `som/` nem `core/poki`;
- **zero `stopPropagation` e nenhum listener em captura em `src/`**;
- nenhum `Math.random`;
- nenhum não-ASCII em `src/jogo`;
- grep de proibidos;
- `pointermove` não dispara Start.

**Módulos de jogo:**

| Módulo | Responsabilidade |
|---|---|
| `pele.js` | §2.1 |
| `regras.js` | inclui a tabela única de tempos |
| `medidor.js` | ganhos e custos |
| `poderes.js` | supers e janelas de perfeita |
| `powerups.js` | bolhas + prova grátis |
| `cortada.js` | §2.5 |
| `torneio.js` | Copas, desbloqueios |
| `perfil.js` | Gotas, XP, níveis, desafios |
| `skins.js` | catálogo e kits |
| `estampa.js` | codec 16×16 |
| `ginasios.js` | modificadores |
| `demos.js` | roteiros |

**Render e UI:**

| Módulo | Responsabilidade |
|---|---|
| `render/diretor.js` | base × soco × close × tremor × seguir bola (paisagem: ±0,6 u em x e ±0,3 em y; **retrato: só y**) × Jornada; `limitada()` à quadra |
| `render/vista.js` | §2.2 |
| `render/layout.js` | §2.3 |
| `render/slime2d.js` | reserva sem WebGL2 |
| `ui/controles.js` | zonas A e B |
| `ui/foco.js` | teclado nos menus |
| `ui/vestiario.js` | loja e equipamento |

### 4.5 Render em camadas e qualidade

**Ordem por quadro:**
1. **`cFundo`:**
   - cache assado (1,25× na alta) com o fundo distante em paralaxe, piso e fileiras;
   - a cada quadro: `drawImage` com a câmera, `vivo()`, onda, plateia de perto, sombras, rede, placas e rede de fundo;
   - **no M1 comparar:** redesenho a cada quadro contra canvas do cache com transform CSS e camada viva separada. Fica a mais barata;
   - nos degraus baixa e mínima, o vivo roda a 30 Hz.
2. **`cSlime`** (WebGL2): 2 campos com janela móvel, um `clear` e 2 quads.
3. **`cTopo`:** rostos, acessórios, bola e rastro, VFX, mira.
4. **`cTela`:** palavra, placar gigante, confete, ofuscamento, REPLAY. **Só limpa e desenha quando há efeito ativo.**
5. **HUD DOM.**

Desfoques sempre assados, nunca `ctx.filter` por quadro.

| Nível | dpr | célula | plateia perto | confete (completa / curta) | extras |
|---|---|---|---|---|---|
| alta | 2 | 0,085 | 150 | 160 / 64 | ofuscamento |
| média | 1,5 | 0,11 | 90 | 100 / 40 | — |
| baixa | 1 | 0,14 | 50 (30 Hz) | 60 / 24 | — |
| mínima | 1 (slime 0,75) | 0,17 | 24 | 40 / 16 | pele com cerca de 55 partículas |

Começa em "baixa" se `hardwareConcurrency<=4 && deviceMemory<=2`. Desce de degrau depois de 3 janelas abaixo de 48 fps.

### 4.6 Layout responsivo

`layout.js(W, H, safe, toque, tablet, pilula, esquema)` devolve `{orient, quadra, janelaMundo, controles, hud, escalaUi}`.

**`layout.test`** em 360×560, 360×640, 375×667, 390×664, 390×844, 412×915, 640×360, 667×375, 844×390, 1024×768 e 1920×1080, mais as safe areas da pipa-corta:
- a soma das faixas é igual a H;
- quadra inteira visível, **com o diretor nos 2 extremos da bola**;
- nenhum controle sobre a quadra;
- zona da pílula livre;
- px/u ≥ 14 no retrato e ≥ 13 em paisagem B.

### 4.7 Áudio

**Barramentos:**
- sfx 0,85, voz 0,75, ambiente 0,35; sem música.
- `onAdStart` → `mudoParaAnuncio`.
- `INTERVALO_FALA` de 1,2 s.

| Evento | Som |
|---|---|
| Toque | `gelatina` + `squish` |
| Manchete perfeita | toque macio + `comboSininhos` |
| Câmera lenta | §2.5 |
| Rede / placa / alambrado / rede de fundo | `metal` / batida oca / grade / "fump" macio |
| Chão | por ginásio |
| Apito | sintetizado |
| Ponto humano / da CPU | rugido + fanfarra + `estouroPop` / "ohh" |
| **Saque de Fogo** | **`vozPowerUpSlime`** + `missilZuum` + crepitar |
| Saque Raio | crepitar + trovão |
| Saque Jornada | assobio + JOR-NA-DA + `vozCuidadoSlime` |
| Medidor cheio, bolha | `vozPowerUpSlime` (no máximo 1 a cada 20 s) |
| Combo de travessias | `vozCombo3…10Slime` |
| Início | `vozProntoSlime` → `vozVaiSlime` (só com o áudio destravado) |
| Vitória / derrota / título / recorde / nível / desafio / ginásio | `vozVenceu`, `vozPerdeu`, `vozParabens`, `vozRecorde`, `vozNivel`, `vozMissao`, `vozObjetivo` (*Slime) |
| UI | `fichas.mp3`, `moedinha`, `clique.mp3`, `botaoPop` |

**Descartados:** `vozAbaixa`, `vozAcertou`, `vozAlvo`, `vozSocorro`, `vozRecarga`, `vozTempo`, `vozDepressa`, `vozFim`, **`vozFogo`** e as versões sem "Slime".

**Total em arquivo:** 92.516 B (cerca de 90 KB).

**Sintetizado:**
- Torcida de 6 s (P1).
- JOR-NA-DA via `OfflineAudioContext` (P2), com reserva em tempo real.
- `tools/sons.mjs` gera só o subconjunto usado.

### 4.8 Assets do Grok (só fundos distantes) e pipeline

**Onde entra:** só nos fundos distantes dos ginásios e nas pranchas do M1. **Nunca** em slimes, bola, VFX, letras, HUD, plateia, ícones nem thumb final (só o fundo dela).

**Pré-requisitos (1º passo do M0, depois da captura):**
1. **Pasta própria fora do repositório:** `~/.cache/slime-voley-grok/`, com `git init` vazio e **sem CLAUDE.md**. Assim o Grok não carrega as nossas regras e o `non_git_warning` não bloqueia. Os PNGs do blockout são copiados para ela.
2. **Smoke test de 1 imagem.** Se a autenticação falhar, o usuário roda `grok login` cedo.
3. **Termos:** conferir e registrar em `LICENCAS.txt` e `docs/autoria.md` a cláusula de uso comercial do Grok Imagine (item 27 do checklist).

**Comando** (`tools/grok.mjs`, até 5 em paralelo, 1 nova tentativa depois de 20 s se der 429):
```
grok -p "Call image_edit exactly once with image ['<ABS_PNG>'] and this prompt verbatim: '<PROMPT>'. Reply with only the returned path." \
  --cwd ~/.cache/slime-voley-grok --tools image_gen,image_edit --effort low --output-format json --max-turns 4
```
- **Falha** = stderr com `permission required`, ou nenhum `N.jpg` novo em `~/.grok/sessions/%2Fhome%2Fevandro%2F.cache%2Fslime-voley-grok/<sessionId>/images/`. Não confiar no código de saída nem no texto do modelo.
- Se houver recusa por permissão, propor ao usuário `--allow` restrito a image_gen e image_edit, que cabe na decisão 4 dele.
- **Nunca usar `--yolo`, `--always-approve`, modo bypass nem `--trust`.** Plano B: o usuário roda pela TUI, ou o fundo é feito em código.

**Pipeline:**
1. **Blockout** em Canvas2D (`tools/blockout.html`), com a nossa perspectiva e formas chapadas. As áreas de LED e telão saem **da geometria do blockout** (JSON de retângulos), não de chave de cor.
2. PNG pelo Chrome headless (porta 4380).
3. `image_edit`: "Repaint keeping this exact layout and perspective… empty seats, no people, no text, no logos".
4. Copiar para `assets/brutos/<lote>/<id>.jpg` + `manifest.json`.
5. **`tools/recortar.mjs` (Node 22 + Chrome headless, sem Python):**
   - recorte e costura dos ladrilhos;
   - **curvas de cor por canal** (não LUT de paleta);
   - desfoque e dessaturação de profundidade;
   - WebP q 0,78 via `canvas.toBlob` (o reencode tira o C2PA);
   - `--contato` gera a folha de revisão.
6. **Passe manual:** remover letras alucinadas, unificar a luz, conferir em 3 tamanhos. Molduras em código largas o bastante para cobrir o desvio do Grok.
7. **`docs/autoria.md`:** id, prompt, sessionId, número da imagem, data, passe manual.

### 4.9 Orçamento e carregamento

| Item | Bytes |
|---|---|
| Código | cerca de 140 + 150 KB (sem `mundo.js`) |
| Fonte (só a 700) | cerca de 25 KB |
| Fundo da Praia | ≤ 250 KB |
| Áudio | cerca de 90 KB |
| **Inicial (P0 + P1)** | **cerca de 0,6 MB** (teto de 1,5 MB) |
| **Total v1** | **cerca de 1,5 MB** (teto de 4,5 MB) |

**Tetos no `empacotar`:** fundo ≤ 250 KB; áudio ≤ 200 KB; inicial ≤ 1,5 MB; total ≤ 4,5 MB.

**Carregamento** (`core/carregador.js`):

| Prioridade | Quando | O quê |
|---|---|---|
| P0 | antes de `gameLoadingFinished` | código, Fredoka 700, fundo da Praia (reserva: gradiente aos 3 s), **só os 6 slimes da plateia**, cache do fundo em qualidade média |
| P1 | depois do 1º gesto | falas, torcida, atlas completo da plateia, em fatias de até 4 ms por quadro |
| P2 | em seguida | JOR-NA-DA, próximo ginásio, editor |
| P3 | por último | o resto |

**Medição no `npm run poki`** (`tools/medir.mjs`, CPU 6×): 1º quadro e `gameLoadingFinished` ≤ 3 s.

**Orçamento por quadro** (Android de entrada, média, 60 fps):

| Camada | Meta |
|---|---|
| Lógica | ≤ 2,5 ms |
| `vista` + campos | ≤ 1,5 ms |
| GPU | ≤ 1,5 ms |
| Fundo | ≤ 1,0 ms |
| Plateia | ≤ 1,2 ms |
| Topo | ≤ 1,5 ms |
| Tela | ≤ 1,0 ms |
| **Total, com composição** | **≤ 10 ms** |

**`tools/bancada.mjs`** (Node) falha se o passo (física + pele, 2 slimes) passar de **0,15 ms** ou o campo passar de 0,3 ms por quadro.

**Medição real:**
- `tools/medir.mjs` com throttling, no M1 (as 3 direções) e no M6;
- **Android real via `adb` + `chrome://inspect`**, quando houver aparelho conectado;
- telemetria `custo/*`.

---

## 5. Ferramentas, testes e build

### 5.1 Portas (um Chrome por vez; quadros em `~/.cache/slime-voley-*`)

| Ferramenta | HTTP | CDP |
|---|---|---|
| `servir.mjs` (`--lan`) | 5380 | — |
| `shot.mjs`, `blockout`, `recortar.mjs` | 4380 | — |
| `prints-build.mjs` | 4381 | 9380 |
| `telas.mjs` | 4382 | 9381 |
| `sdkcheck.mjs` | 4383 | — |
| `thumb.mjs` | 4384 | — |
| `gif.mjs`, `gravar.mjs`, `quadros.mjs`, **`medir.mjs`** | 4385 | 9382 |

- Sem porta: `bancada`, `calibrar`, `sons`, `empacotar`, `artifact`, `grok`.
- WebGL headless com swiftshader: serve para imagens, nunca para medir desempenho (para isso, `medir.mjs` com GPU real ou `adb`).
- O SDK é bloqueado por `--host-resolver-rules`.
- Evitar as portas 9222, 9503 e 9666.

### 5.2 Testes

O `npm test` usa só `node:test`, com sementes fixas e meta de até 60 s. O `npm run calibrar` cobre as faixas estatísticas.

| Arquivo | O que cobre |
|---|---|
| `fisica.test.js` | Balística; espelho; sem atravessar placa ou rede; **normal e saída separadas** (30/24/36° e 66/54/79°, ±2°); rede de fundo só para o próprio lado; números derivados; `hash` |
| `tempo.test.js` | Ticks inteiros, canais, hitstop, os 3 relógios, pausa no meio da mira |
| `vista.test.js` | `campo.acumular` e `rostos` rodam sobre o proxy |
| `cortada.test.js` | §2.5 |
| `poderes.test.js` | Jornada de 2,2 a 2,8 s; telegrafia ≥ 250 ms; janelas de perfeita; perfeita só contra super ou cortada |
| `regras.test.js` | Rali, 3 toques, quem saca (com a exceção do onboarding), fora só no ataque estourado, vai-a-2; **segurar o saque 3 s nunca dá fora na Copa 1**; festa curta/completa; tempo morto ≤ 1,4 s |
| `ia.test.js` | Determinístico: placar exato por semente; nunca 4 toques; entrada nula ganha o 1º ponto em até 15 s |
| `pele.test.js` | Segue a cúpula e volta à forma em até 0,4 s |
| `layout.test.js` | §4.6 |
| `celebracao.test.js` | Pura; semente; `cabe()` |
| `replay.test.js` | Último quadro igual ao real |
| `save.test.js` | Migrações, save corrompido, código curto ida e volta |
| `skins.test.js` | Catálogo, codec, proibidos, contraste |
| `perfil.test.js` | Gotas, XP, desbloqueios, skin equipada ao liberar |
| `i18n.test.js` | Mesmas chaves, limites de comprimento |
| `carregador.test.js` | Prioridade, reserva, P0 mínimo |
| `fluxo.test.js` | Sequência do SDK com `sdk-falso` (casos abaixo) |
| `ui.test.js` | Todo cartão tem botão principal alcançável por teclado; foco inicial nunca no premiado |
| `poki`, `audio`, `sons` (+ catálogo ↔ arquivos), `qualidade`, `estilo` | 2.1.0 |

**Casos do `fluxo.test.js`:**
- nunca 2 Start ou 2 Stop seguidos;
- Start só com interação recente;
- nada durante anúncio;
- **partida nova + 10 s sem toque → zero Start e bola parada**;
- **tecla e blur durante o anúncio → nenhum evento extra e nenhuma pausa no retorno**;
- **premiado → Próxima → exatamente 1 anúncio**;
- **120 s de "stick apoiado + cúpula devolvendo" ou "só `pointermove`" → nenhum intervalo acima de 60 s sem `pointerdown`/`keydown` exigido**;
- **atrito entre partidas ≤ 2 toques e ≤ 4 s**.

**`tools/calibrar.mjs`:** as faixas do §2.8, com 1.000 sementes.

### 5.3 Quadros determinísticos e parâmetros

**Só em loopback ou LAN (incluindo 172.16/12), ou pelo `__voleiModelo` na build de modelos:**
- `?semente=&roteiro=<id>`. Obrigatórios: `cortada`, `ponto`, `ponto-curto`, `jornada`, `fogo`, `raio`, `rali8`, `fora`, `onboarding`.
- `?quadro=ms`, `?filme=N&cada=K`.
- Escolhas e cenário: `?ginasio= ?skin= ?rival= ?nivel=`.
- Controle e direção: `?controle=a|b ?visual=a|b|c`.
- Ajustes do M1: **`?gatilho=novo|segura ?defensor=0.07..0.5`**, `?lenta= ?larg= ?fora= ?assist=`.
- Render e idioma: `?qualidade= ?render=2d ?lang=`.
- Depuração: `?semhud ?semanuncio ?debug ?auto`.

### 5.4 Build e scripts

**`tools/empacotar.mjs`:**
- Corta as linhas `// modelo` e o gancho `__voleiModelo`.
- Mantém só os MP3 do catálogo.
- Falha nos mesmos casos de antes. Um teste confere que o gancho sumiu do `dist/`.
- Gera `dist-poki/<nome>-<versão>.zip` + `.sha256` + thumb.

**Scripts:**
- `npm run poki` = testes → thumb → empacotar → sdkcheck da `dist/` → telas → prints → **medir (carga ≤ 3 s com CPU 6×)**.
- `npm run artifact`: hub + uma página `jogo-<v><c>.html` por combinação, com `window.__voleiModelo`, mais `src/`, WebP, MP3 e fonte (binários aceitos, como no `artifact-modelos.mjs`). Também há **seletor dentro do hub** (A/B/C, Metades/Botões, gatilho), guardado no localStorage, e um selo da combinação ativa.

**Git:**
- `git init -b main` no M0; commit no fim de cada marco.
- `gh repo create sabotageBR/slime-voley --private` e push **só com o OK do usuário**.

---

## 6. Marcos

**Ritual de fim de todo marco:**
1. `npm test` verde (e `calibrar`, se a IA ou a física mudaram).
2. Prints nos tamanhos do §4.6, normais e `--seguro`.
3. GIF do destaque.
4. **Folha de 12 quadros aleatórios de bot.**
5. Autoavaliação contra o checklist de 10 itens, dizendo o que ainda está abaixo da barra.
6. `docs/marcos/Mx.md` + commit.

| Marco | Entregáveis | Pronto quando |
|---|---|---|
| **M0. Fundação** | **Passo 0: captura do Blumgi** (§2.5): `docs/referencias/*.md` medidos e o `CORTADA` padrão. Passo 1: `git init`; smoke test do Grok na pasta própria (`grok login` cedo, se preciso); termos do Grok. Depois: cópias da §4.2 via `gh api`; `estilo.test`; laço + 3 relógios + `vista` (contrato); `layout` + `aparelho`; `fisica/volei` + pele própria; entrada com `timeStamp`; IA com elipse; regras mínimas; `servir`, `shot`, `prints-build`, `bancada` nova, `medir`, `calibrar` | Captura medida e registrada; bot contra bot roda 1.000 pontos no `calibrar` com `hash` estável; quadra nos 11 tamanhos; passo ≤ 0,15 ms; `npm test` ≤ 60 s |
| **M1. CHECKPOINT** | Bloco abaixo | Links abrem e jogam no celular (Artifact e LAN, retrato e paisagem); cortada nos 2 esquemas; **o usuário escolheu** |
| **M2. Núcleo** | Física e controles finais; saque ativo; medidor; Cortada Lenta final (gotas, coroa, rastro); Fogo; power-ups + provas grátis; IA T0–T3 com proteção por partida; festa curta e completa + replay; Praia final; onboarding; fluxo do SDK completo (anúncio, blur, premiado, portão); teclado nos menus; `save`; i18n do núcleo; `sdkcheck`, `telas`; P0 mínimo | Copa 1 do início ao fim; `fluxo.test` verde; `sdkcheck` 5/5; 1º ponto até 15 s e 1ª cortada até 60 s; Inspector local sem aviso (inclusive "Image Optimization") |
| **M3. Meta 1** | Circuito, Gotas, vestiário, 8 skins Base/Pro, 4 bolas, 3 comemorações, evolução, premiados, `measure()`, cartão único, Escola + Raio + rivais da Copa 2 | Copa 2 sem tela entre partidas; arco de 7 min no `calibrar` (6:00 a 7:30); atrito ≤ 2 toques e 4 s |
| **M3b. Build Poki + PFT 1** | Thumb estática (direção escolhida, prancha da Arena); nome escolhido; `npm run poki` verde; Inspector sem aviso; **o usuário faz o upload inativo e pede o PFT**; o M4 começa em paralelo | Zip dentro dos tetos; PFT pedido; telemetria `tempo/min-*` e `level/m*/fail` reordena o M4 a M6 |
| **M4. Conteúdo** | Rua e Arena (só na direção escolhida); plateia completa; Jornada + Meteoro; 15 rivais; Craque e Lenda; níveis; 16 skins; 8 bolas; 6 comemorações | 4 Copas jogáveis; sombra da Jornada com contraste ≥ 3:1 em todos os ginásios; perfeita de 25% a 40% por super |
| **M5. Editor e 2P** | Editor (porte) + escudo local + aleatório + código curto + Amistoso; 2P (margens no celular, quartos no tablet, teclado) | Código ida e volta; copiar e colar no iframe do Inspector; 2P no teclado e no tablet |
| **M6. Polimento** | Desempenho em Android de entrada (`medir` + `adb`); juice e áudio; reduzir movimento; remapeamento; i18n com folga | 60 fps em "média" com CPU 4× no `medir` e no Android real; telemetria `custo/*` |
| **M7. Build final + PFT 2** | Correções do PFT 1; `npm run poki` verde; 10 gravações de playtest assistidas; PFT 2 | Média acima de 3 min e 25% ou mais acima de 3 min; **meta de 7 min**; uma mudança por rodada |
| **M8. Iteração e lançamento** | Thumb animada; Chuva e Neve; Folha Seca; Shhh e Cartão; descrição P4D; WFT | Checklist de 32 itens fechado; WFT enviado |

**Linha de corte, se atrasar** (nesta ordem):
1. polimento do 2P;
2. escudo 16×16;
3. Lenda para todas as 16 skins (fica só nas 8 primeiras);
4. replay;
5. rivais de 15 para 11.

### Bloco M1, o CHECKPOINT

1. **3 direções visuais** (A, B, C) na **Praia jogável**, contra Gota e Geleia, em retrato e paisagem.
   - Pranchas estáticas da Arena (thumb) e do Vestiário.
   - Fundos de A e B via Grok. Se o Grok não estiver disponível, fundo em código com a nota "fidelidade reduzida".
   - **fps de cada direção** pelo `medir.mjs` (CPU 4×) e no Android real, se houver. O número aparece no hub.
2. **2 esquemas de controle**, A e B. As 6 combinações estão no **seletor do hub** e nas páginas `jogo-<v><c>.html`, sem depender da URL.
3. **Laboratório da cortada** (`modelos/camera-lenta.html`), **já com os valores medidos na captura**:
   - escalas do mundo (0,03 a 0,15), do defensor (0,07 a 0,5) e orçamento da bola;
   - gatilho novo ou segura;
   - entrada, saída e hitstop;
   - gotas (número, raios, comprimento);
   - coroa (raio, duração);
   - rastro (intervalo, máximo, vida);
   - push-in e som;
   - "Copiar ajuste" gera JSON.
4. **Festa curta e completa** em cada direção.
5. **Ajustes:** `?larg`, `?fora`, `?assist`.
6. **Acesso:** Artifact (`npm run artifact`) e LAN (5380).
7. **Comparação justa:** mesma semente, os mesmos 3 quadros em 836×470, 390×844@3 e 844×390@3, e um GIF de 6 s por direção.
8. **Tabela "por que não é clone"** nas 6 dimensões, contra Blumgi Soccer, Animals Volleyball, Pixel Volley e Slime Dunk!.

**Perguntas ao usuário:**
1. Direção A, B ou C.
2. Esquema padrão A ou B.
3. Gatilho ("pressão nova" ou "segurar contínuo") e ajuste da câmera lenta.
4. LARG e fora.
5. **Nome entre 3 opções.**
6. OK para o `gh repo create`.
7. (Opcional) uma gravação do Blumgi, se a captura deixou algo "não resolvido".

---

## 7. Verificação ponta a ponta

1. **Unitário e determinístico:** `npm test` e `npm run calibrar`; `bancada`.
2. **Referência:** os números do `CORTADA` e da festa batem com `docs/referencias/*.md`. A gravação quadro a quadro (`gravar.mjs`, 60 fps) da nossa câmera lenta é comparada com as métricas medidas do Blumgi (escala, rampas, durações), não com a forma.
3. **Visual:**
   - prints nos tamanhos do §4.6;
   - `quadros.mjs` com os roteiros;
   - folha de 12 quadros;
   - cada imagem é lida com Read e conferida: hierarquia, dedo fora da quadra, pílula livre, controles fora da quadra em paisagem B.
4. **Desempenho:** `medir.mjs` com CPU 4× e 6× (quadro inteiro e carga ≤ 3 s); Android real via `adb`; `?debug` com fps, `custo/*` e entrada → pixel.
5. **SDK:**
   - `sdkcheck` nos 5 cenários, em `src` e em `dist/`;
   - `fluxo.test`;
   - **Poki Inspector:** Event Log de todos os fluxos (1º toque, pontos, fim, revanche com anúncio, premiado → Próxima, pausa, blur durante anúncio, editor), modo celular por QR com copiar e colar do código, Scaling Tests, Game Details;
   - zero aviso de External Resources, Image Optimization e Unexpected Behavior;
   - todo Start com toque nos 5 s anteriores.
6. **Iframe e robustez:** `telas.mjs`, adblock, `localStorage` que lança erro, perda de contexto WebGL.
7. **Celular de verdade:**
   - Artifact e LAN, retrato e paisagem;
   - multitoque; toque duplo; gestos de borda;
   - **segurar 3 s sobre o placar e o SUPER no iPhone (sem lupa nem callout)**;
   - vibração.
8. **Build:** `npm run poki` verde.
9. **Playtest:** PFT 1 (M3b) e PFT 2 (M7). Telemetria:
   - `tempo/min-*`;
   - `cortada/lenta/*` (sem-querer e segurou-do-chão);
   - `entrada/mouse/sem-clique`;
   - `fora/*`;
   - `level/m*/fail`.

---

## 8. Riscos e mitigações

| # | Risco | Mitigação |
|---|---|---|
| 1 | Câmera lenta parecer travamento ou cópia | Tempo calibrado pela captura; forma de gosma (gotas, coroa, rastro); retícula; respiração; disparo automático; tabela das 6 dimensões no M1 |
| 2 | Cortada sem querer | Pressão nova no ar; A/B no M1; métricas `sem-querer` e `segurou-do-chao`; devolução na variante "segura" |
| 3 | Cortada desequilibrada (ponto garantido) | Defensor a 0,30; IA lê a retícula; mira padrão a ≥ 3 u do rival; meta de 55% a 70% no `calibrar` |
| 4 | Supers sem contra-jogo ou com perfeita grátis | Perfeita só contra super ou cortada, com janela própria; meta de 25% a 40% |
| 5 | Fora frustrar o iniciante | Fora só no ataque estourado; rede de fundo; saque nunca sai na Copa 1; cortada nunca sai; `?fora=0` |
| 6 | Slime pequeno no retrato | LARG 12; faixas com prioridade; px/u ≥ 14 |
| 7 | iOS | CSS `-webkit-*`; 24 px das bordas; iPhone real |
| 8 | Desempenho em Android de entrada | Bancada de 0,15 ms; `medir.mjs` com throttling; `adb`; degraus; cTela sob demanda; desfoques assados |
| 9 | Tranco na escala de tempo | Ticks inteiros por canal; `?filme&roteiro=cortada` |
| 10 | Clone (6 dimensões) | §1.1; sem "READY?" na tela; thumb sem anel branco; tabela no M1 |
| 11 | IP de futebol ou Star Trek | Lista de proibidos + grep |
| 12 | Arte de IA borrada ou "cara de modelo" | Grok só no fundo distante, com desfoque intencional; nitidez em código; passe manual |
| 13 | Grok headless (permissão silenciosa, regras do projeto, 429) | Pasta própria; falha pelo stderr ou pela falta de `N.jpg`; `--effort low`; nunca bypass; plano B pela TUI ou em código |
| 14 | Inspector e relógio do PFT | Sem saque automático; portão de 30 s; anúncio sem blur nem entrada; `fluxo.test` |
| 15 | Playtime abaixo de 7 min | PFT 1 no M3b; cartão único; provas grátis; proteção por partida; chefe da Copa 1 em T2 |
| 16 | Conteúdo gerado pelo jogador | Escudo só local; só o código curto é compartilhado |
| 17 | Escopo grande | Linha de corte declarada |
| 18 | Memória e contexto WebGL | No máximo 2 fundos decodificados; `close()`; `contextrestored` |

**Pendências que dependem do usuário:**
1. `grok login`, se o smoke test falhar.
2. OK para o `gh repo create` e o push.
3. As escolhas do M1, incluindo o nome.
4. Upload inativo e PFT 1 (M3b) e PFT 2 (M7).
5. (Opcional) uma gravação do Blumgi, se faltar alguma métrica.

O OK para o `git fetch` saiu das pendências.

---

## Decisões da revisão

- **P1 + E1 (capturar a câmera lenta): aceito, com ajustes.**
  - A captura vira o passo 0 do M0, pelo YouTube no Chrome do usuário. A transcrição confirma que a busca por `currentTime` funcionou.
  - **Rejeitado** jogar na Poki como caminho principal: o endereço direto ficou bloqueado e o mouse não manteve o clique.
  - **Rejeitado** `ffmpeg fps=60`: só duplica quadros de uma fonte a 30 fps. Mede-se pelo PTS nativo.
  - **Rejeitado** guardar quadros em `docs/`: são de terceiros e ficam em `~/.cache`.
- **P2 (originalidade): aceito em parte.** A mecânica e o tempo do Blumgi ficam, porque são o pedido literal. A forma muda para gotas, coroa de respingo e rastro de gosma. O texto "READY?" sai da tela. **Mantido** o áudio "Ready?… Go!": é genérico de arcade e foi escolha do usuário no slime-merge (autoria, l.305).
- **P3 + M9 + E11 (saque automático contra Inspector e PFT): aceito como remoção total.** Rejeitado o meio-termo do P3 (saque automático a partir do 2º saque): remover é mais simples e garante uma entrada a cada ponto ganho.
- **P4 (mouse no PFT): aceito em parte.** O objetivo fica coberto pelo portão de 30 s e pela dica. **Rejeitado** o mouse "arrastar com botão segurado", que conflita com o pulo no `pointerdown`.
- **P5 (blur e entrada durante anúncio): aceito.** Confirmado que o wrapper descarta o Start durante anúncio (`poki.js:261`).
- **P6 (teclado nos menus): aceito**, com `ui/foco.js` e `ui.test`.
- **P7 (premiado e intervalo na mesma pausa): aceito.**
- **P8 + M8 (proteção por partida, 1ª partida imperdível): aceito.**
- **P9 (nome): aceito.** 3 opções no M1, conferência por semelhança antes do M1. A afirmação sobre "Slime Dunk!" vem do relatório buy5pjriv; não conferi.
- **P10 + E3 (resolução do Grok): aceito.** O fundo vira distante, com paralaxe, na resolução nativa (com ladrilhos opcionais) e desfoque intencional; a nitidez vem do código. A ligação "imagem ampliada → aviso Image Optimization" não foi confirmada; fica como verificação no M2.
- **P11 + E2 (parâmetros no Artifact): aceito, combinando os dois.** Seletor no hub e páginas `jogo-<v><c>.html` com `__voleiModelo`. Confirmado que o `artifact-modelos.mjs` já publica binários, então não precisa de data URL.
- **P12 + M10 + E17.1 (faixas do retrato somam 887 px): aceito.** Fórmula com prioridade e números recalculados. O total do M10 usava 280 px, que não sai da própria clamp dele.
- **P13 (C2P em Android): aceito.** P0 mínimo, atlas e áudio em fatias, carga ≤ 3 s com CPU 6×.
- **P14 (atrito entre partidas): aceito.** Cartão único, telas puláveis, meta de ≤ 2 toques e 4 s.
- **P15 (Jornada e Raio dentro dos 7 min): aceito** como prova grátis no SUPER do saque, não como bolha, porque a bolha vai para quem tocou por último.
- **P16 (`vozFogo` = "Fire in the hole!"): aceito.** Confirmado na autoria; trocado por `vozPowerUpSlime`.
- **P17 (escudo compartilhado e clipboard): aceito.** O escudo fica local, só o código curto é compartilhado, e a área de transferência tem reserva.
- **P18 + M7.saque + E17.4 (contradições): aceito.** Exceção do onboarding registrada; áudio destrava em `pointerup`/`keydown` (confirmado em `audio.js:228-230`); só a Fredoka 700.
- **P19 (fluxo e permissões): aceito.** `gh api` no lugar do fetch; `recortar` em Node; termos do Grok registrados.
  - O harness marcou como padrão "bypass-permissions" a frase do plano anterior sobre `--yolo`. Era uma proibição nossa, sem instrução escondida. Ficou absoluta ("nunca"), e não há nada a pedir ao usuário.
- **P20 (`measure` e skin liberada): aceito.**
- **M1 + E10 (gatilho sem querer): aceito.** "Pressão nova no ar" é o padrão; A/B no M1; métricas separadas. A devolução dos 100 vale só na variante "segura", porque na pressão nova a intenção é explícita.
- **M2 + E9 (bola durante a mira e transições): aceito.** Ponto de batida, orçamento de 60 ms, colisão desligada, bote no próprio lado e pausa que retoma.
- **M3 (defensor a 7%): aceito**, com escala do defensor 0,30 ajustável no laboratório e mira padrão a ≥ 3 u do rival.
- **M4 (cortada no 1º toque): aceito em parte.** Bloqueada na recepção de saque e de super, e fora do próprio lado. **Rejeitada** a exigência de 2º ou 3º toque: complica o onboarding e o gênero corta no 1º toque. Quem levanta antes ganha +0,4 u de alcance.
- **M5 (manchete perfeita): aceito em parte.** Vale só contra super ou cortada, com janela por super. **Rejeitado** revelar o desvio só nos 0,45 s finais e esconder a sombra: mover 2 u com reação leva cerca de 0,5 s, e o pilar de legibilidade pede sombra visível. Ficou em 0,6 s.
- **M6 (fora contra si mesmo): aceito.** Fora só no ataque estourado, com rede de proteção no próprio fundo. Rejeitada a alternativa de reduzir o x do slime para 0,25.
- **M7 (jogador parado): aceito.** Parado = devolução assistida. **Rejeitada** a levantada por "segurar no chão": no esquema A o `pointerdown` pula na hora.
- **M11 (controles em paisagem e 2P): aceito em parte.** A câmera recua no esquema B e os botões ficam em 64 px. **Rejeitado** o "um polegar: `pointerdown` pula e arrasto move", porque todo movimento começaria com um pulo. No lugar, mini-stick + PULO na margem de cada jogador.
- **M12 (eixo herdado na mira) e M13 (arrasto em paisagem e mouse): aceitos.**
- **M14 (excesso de carga do saque): aceito.** Na Copa 1 o saque sai sozinho em ±11,5; o risco de fora só existe a partir da Copa 2.
- **M15 (ritmo da comemoração): aceito.** Dois níveis; BOMBA! pela velocidade de saída; deslize antes de o controle voltar. Todo ponto continua com festa, como o usuário pediu.
- **M16 (chefe da Copa 1): aceito.** Rei Gosma em T2 com 1 Fogo roteirizado; humano simulado especificado.
- **M17 (latência de 8,3 ms): aceito.** Uso do `e.timeStamp` e meta de ≤ 1 quadro. Confirmado que os passos rodam dentro do rAF (`laco.js:30-52`).
- **M18 (relógios), M19 (câmera no retrato), M20 (nível da cortada) e M22 (CSS do iOS): aceitos.**
- **M21 + E17.3 (números inconsistentes): aceito.** Tabela única de tempos em `regras.js`; travessia de 0,80 s recalculada (8,05 u com aceleração de 85).
- **E4 (M1 na Arena): aceito.** Comparação na Praia; a Arena aparece só como prancha.
- **E5 (PFT só no M7): aceito**, com o M3b e a linha de corte.
- **E6 (Android não medido): aceito.** Bancada de 0,15 ms, `medir.mjs` com throttling, `adb` (existe), cTela sob demanda, fundo comparado no M1.
- **E7 (σ e ângulo): aceito.** Conta conferida: a tabela trazia a normal (30/21/41°); a saída real é cerca de 66/47/88°. σ limitado a ±0,6 na física e o σ da mira unificado em −0,6.
- **E8 (resolvedor e VMAX): aceito.** Tiro com `prever` e vento, cortada sem VMAX até o contato, VMAX por estado da bola (com a Jornada em 40/30).
- **E12 (porte do editor): aceito.** Confirmados a captura e o `stopPropagation` (`editor.js:551-553`) e os imports de `niveis`, `palco` e `km`. A fronteira passa a liberar `cor/` para `jogo/`.
- **E13 (Grok headless): aceito.** Confirmado na doc: a recusa é silenciosa com exit 0 e o CLAUDE.md é carregado. Pasta própria, `--effort low`, máscaras pela geometria e curvas no lugar de LUT de paleta.
- **E14 (pele e proxy): aceito.** Escolhida a opção (a), pele própria sem `mundo.js`, com o contrato do proxy e o `vista.test`; a (b) fica como reserva. Confirmados os campos lidos (`campo.js:66-94`, `rostos.js:25-30`) e o import de `N_PIG`.
- **E15 (lista de cópia): aceito.** `catalogo.js` podado (confirmado `sons.js:15`), bancada reescrita, `gh api`.
- **E16 (replay com 12 floats): aceito.** Re-simulação por snapshot e intenções.
- **E17 (consistência: confete, peso da direção B, `poki.idioma`): aceito.** Tabela única de confete; teto de 250 KB com o fundo distante; `idioma` confirmado como propriedade (`poki.js:79,411`), com repasses novos.
- **E18 (testes estatísticos no `npm test`): aceito.** `npm test` determinístico e `npm run calibrar` separado; a meta de fora sai do bot e fica só na telemetria.

---

### Critical Files for Implementation
- ~/Downloads/Cinco Jogos de Gosma (2)/src/jogo/modos/volei.js (`meiaLua`, `preverQueda`, `planejar`, `RIVAIS`, constantes por quadro a converter; o protótipo usa `criarMundo`, que sai)
- ~/Downloads/Cinco Jogos de Gosma (2)/src/core/laco.js (base do laço de 1/120 com alfa, dos 3 relógios e dos canais de escala da câmera lenta)
- ~/Downloads/Cinco Jogos de Gosma (2)/src/render/campo.js (contrato do proxy que `render/vista.js` precisa sintetizar; import de `N_PIG` a trocar)
- ~/Downloads/Cinco Jogos de Gosma (2)/src/core/poki.js (fluxo do SDK: `emAnuncio`, `jogando`, `idioma`, novos repasses `shareableURL`/`getURLParam`)
- ~/git/em_tech/stringcut/src/render/transicoes.js (base de `render/celebracao.js`: soco, palavra com extrusão, confete com semente)