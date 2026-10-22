# CLAUDE.md

Guia do projeto para o Claude Code. Respostas e textos em português.

# Vôlei de Gosma (Goo Spike!, nome provisório)

Vôlei 1x1 de slimes para a Poki, ficha #58 dos "Cinco jogos de gosma". É feito só com HTML + JavaScript:
- ES modules nativos, Canvas 2D, WebGL2 (a gosma) e WebAudio;
- nada de bundler, framework ou TypeScript; o jogo publicado não tem dependências.

As ferramentas usam o Node 22 (WebSocket global para o CDP), `google-chrome`, `ffmpeg`, `zip` e o Python com PIL (só no `tools/recortar.py`).

**Leia antes de mexer:**
- o desenho completo, em `docs/desenho.md`;
- o plano aprovado, no início do desenho;
- as referências medidas do Blumgi, em `docs/referencias/`;
- o que cada marco entregou e o que ficou para depois, em `docs/marcos/`.

**O desenho vai além do código.** Ele descreve o jogo inteiro, até o M5. Muitos módulos, testes e ferramentas citados nele ainda não existem (`poderes.js`, `torneio.js`, `layout.test`, `fluxo.test`, o humano simulado, `sdkcheck`, `npm run poki`...). Antes de supor que algo existe, confira em `docs/marcos/`. Os comentários dos arquivos portados de projetos irmãos também citam coisas que não estão aqui, como `tools/pigmentos.mjs` e `test/cor.test.js`.

## Rodar e testar
- `npm run servir` abre o jogo em http://127.0.0.1:5380/. Os módulos ES não carregam por `file://`.
- `npm run lan` faz o mesmo, aberto na rede local, para testar no celular pela Wi-Fi. Os parâmetros de teste também valem na LAN.
- `npm test` roda todos os testes (`node --test test/*.test.js`, cerca de 3,5 s).
- Um arquivo: `node --test test/fisica.test.js`. Um teste: `node --test --test-name-pattern="<regex>" test/*.test.js`.
- `npm run calibrar` roda o bot contra bot (`tools/calibrar.mjs`, cerca de 4 s para 30 partidas). O humano simulado do desenho ainda não existe.

## Como um quadro anda
1. O `core/laco.js` roda passos fixos de 1/120 s (a bola faz 2 subpassos de 1/240 s), no máximo 6 por quadro. Depois chama `desenhar(dtReal, alfa)` uma vez.
2. A cada passo, o `passo()` do `main.js`:
   - lê os controles, chama `P.intencao()` e depois `P.passo()`;
   - esvazia `P.eventos[]`, entregando cada evento ao `TRATADORES[e.tipo]` (som, VFX, vibração e telemetria).
   A lógica nunca toca em som nem em DOM: um tipo de evento novo precisa de tratador no `TRATADORES`, e o `test/eventos.test.js` cobra isso.
3. A câmera lenta vem do `jogo/tempo.js`. Os canais `mundo`, `defensor` e `bola` têm cada um a sua escala em milésimos e um acumulador inteiro. Com tudo em 1000, o `hash()` da partida é igual ao de rodar sem relógio, e isso mantém o determinismo.
4. O `render/vista.js` interpola os snapshots de cada slime pelo canal dele e monta o proxy lido por `campo.js`, `rostos.js` e `slime2d.js`. O contrato está no cabeçalho do arquivo, e o `slime2d.js` é a reserva sem WebGL2 (`?render=2d`).
5. A `cena.js` desenha, nesta ordem: `cFundo`, `cSlime` (WebGL2), `cTopo` e `cTela`. O HUD em DOM fica por cima.

## Estrutura
- `src/fisica/volei.js` é pura e determinística:
  - cúpula elíptica com o amassado σ (`a = R(1+0,18σ)`, `b = R(1−0,22σ)`);
  - bola (com `gMult` da Bola Pesada), rede, placas, paredes de fundo e `prever()`.
- `src/jogo/` também é pura (sem DOM, relógio ou `Math.random`; sorteio só pelo `core/rng.js`):
  - `partida.js`: estados, rali, saque "levantar e bater", pontos, cortada lenta, assistências, os efeitos dos power-ups, as reações, o `resumo()` e os roteiros de teste;
  - `tempo.js`: os 3 relógios e os canais de escala da câmera lenta;
  - `pele.js`: as partículas só de desenho;
  - `ia.js`: plano exato do contato, simulando a trajetória;
  - `cortada.js`: a máquina de estados, a mira e o resolvedor do tiro;
  - `regras.js`: a tabela única de tempos e o saque (`SAQUE`, `temposSaque`, `qualidadeSaque`);
  - `powerups.js`: catálogo, sorteio e relógio das bolhas (rng próprio, separado do das IAs);
  - `reacoes.js`: os emoji (a qualquer hora, com recarga) e a escolha da CPU;
  - `juiz.js`: o juiz da rede (olhar, apontar e a bolada sorteada; nunca muda a bola);
  - `falas.js`: as falas em balão (catálogo fixo por gatilho, recarga e rng próprio);
  - `torneio.js` (a Copa Gosma: chave de 8 e de 16 derivada do save) e `paises.js` (os 195 códigos);
  - `perfil.js`: XP, nível, trilha, Gotas e o save normalizado;
  - `humor.js` (porte sem uso), `medidor.js`, `rivais.js` e `skins.js`.
- `src/core/`: laço, `rng.js`, save, áudio, vibração, o SDK (`poki.js`) e `depuracao.js`.
- `src/cor/km.js`: a mistura de pigmentos Kubelka-Munk, que roda igual no shader da `composicao.js`. O `pigmentos.js` é gerado e não se edita à mão.
- `src/render/`:
  - `cena.js`: os 4 canvases;
  - `vista.js`: o proxy que o campo e os rostos leem;
  - `campo.js` e `composicao.js`: a gosma do slime-merge, com um campo móvel por slime;
  - `diretor.js` (câmera), `layout.js` (retrato, paisagem e desktop), `quadra.js`, `celebracao.js` e `plateia.js`;
  - `icones.js` (power-ups, bolha, gelo e prêmios), `carinhas.js` (as carinhas, o balão das reações e o das falas) e `juiz.js` (a cadeirinha e o juiz), em código;
  - `bandeiras.js` (as 195 bandeiras numa mini-linguagem de primitivas) e `chave.js` (a chave da Copa e a taça);
  - `ginasios/praia.js`.
- `src/ui/`: `controles.js` (Metades e Botões, teclado e mouse), `hud.js` (placar, chips, barra e botão de reações e o cartão com a chave e a progressão), `menu.js` (o menu principal e a tela da chave) e `lab.js` (o laboratório da cortada).
- `src/som/mesa.js`: os eventos tocam receitas, as gravações `*Slime` do catálogo `arquivos.js` e o balbucio sintetizado das falas (`som/falas.js`). Não há música.
- `src/i18n/textos.js`: todo texto visível.
- `src/main.js` liga tudo e é o **único** dono do SDK (`core/poki.js`), do áudio, do save e do DOM.

## Regras que os testes vigiam (`test/estilo.test.js`)
- **Eventos:**
  - zero `stopPropagation`;
  - nenhum ouvinte em captura (exceto o destrave do áudio);
  - `pointermove` nunca dispara `gameplayStart`.
- **Pureza:**
  - `jogo/` e `fisica/` não usam `Math.random`, `Date`, `performance.now`, `document.` nem `window.`;
  - de fora, eles só importam `core/rng.js` e `cor/*`;
  - `render/` não importa `ui/`, `som/` nem o SDK, e só o `main.js` importa `core/poki.js`;
  - nenhum caractere não-ASCII no código de `src/jogo/`, fora dos comentários (texto com acento vai para o `i18n/textos.js`).
- **Externo:** nenhuma URL externa além do SDK da Poki, também no `index.html` e no `estilo.css`.
- **Conteúdo** (o grep vale também nos comentários):
  - nenhum IP de futebol nem de Star Trek: FIFA, Copa do Mundo, Libertadores, clubes, marcas como Nike, Mikasa e Molten, "Jornada nas Estrelas"...;
  - o super se chama "Saque Jornada" / "Sky Serve".

Sem teste, por convenção: no jogo, o `preventDefault` fica no `controles.js` e só pega touchmove, wheel, contextmenu, setas e Espaço. As exceções são a navegação dos menus no `hud.js` (setas, WASD, Enter e Espaço) e o `webglcontextlost` da `composicao.js`.

## Fluxo do SDK
- `gameplayStart` só com `pointerdown`/`keydown` real. O primeiro saque de cada partida, e o de depois de uma pausa ou anúncio, espera um toque.
- Não existe saque automático.
- Portão de 30 s sem interação: até o saque da CPU espera um toque.
- `commercialBreak` só no toque em Próxima/Revanche (a partir da 3ª partida) e ao despausar; nunca no rali.

## Ferramentas
Portas: 5380 (servir), 4380–4385, CDP 9380–9382. É um Chrome por vez: o `shot` usa 4380/9380, a `thumb` usa 4384/9381, e o `gif` e o `medir` usam 4385/9382. Evite as portas 9222, 9503 e 9666.

| Comando | O que faz |
|---|---|
| `node tools/shot.mjs "<query>" 390x844 saida.png [ms] --toque` | print pelo CDP, com os erros do console |
| `node tools/gif.mjs saida.gif 844x390 480 "<query>@ms" ...` | GIF da partida |
| `node tools/medir.mjs 4` | custo por quadro com a CPU limitada (relativo: GPU por software) |
| `node tools/midia-m1.mjs` | quadros e GIFs das 3 direções |
| `npm run empacotar` | build da Poki: `dist/` e `dist-poki/slime-voley-<versão>.zip` + `.sha256` (`-- --thumb` confere a thumb e a copia ao lado do zip) |
| `node tools/thumb.mjs [--final]` | thumb da Poki pelo motor (`tools/thumb.html`): as opções em `marketing/thumb/opcoes/` e `comparar*.png`; o `--final` mede a `ESCOLHIDA` e grava `slime-voley-{1256,628}.{png,jpg}` e o `conferir.png` |
| `node tools/artifact.mjs` | monta o checkpoint em `.tmp/artifact` |
| `node tools/grok.mjs gerar <id> 16:9 "<prompt>"` | arte do Grok (headless, só `image_gen`/`image_edit`, pasta própria) |
| `python3 -I tools/recortar.py <id>` | trata a arte para `src/arte/ginasios/` |

**Parâmetros de teste:**
- Só valem em loopback e na LAN, ou pelo `window.__voleiModelo` da build de modelos.
- O `core/depuracao.js` é o único módulo que lê a URL, e o cabeçalho dele tem a lista completa.
- Os mais usados: `?semente ?roteiro=cortada|ponto|ponto-curto|reacao|saque|bolha|gelo|fogo|gosmao|juiz|juiz-<reação>|fim ?visual=a|b|c ?controle=a|b ?gatilho=novo|segura ?lab ?auto ?primeira ?menu ?chave ?copa=N&fase=F ?semblur ?semanuncio ?debug`.
- Para um print parado num instante, use `?filme=1&cada=N`: N passos e um desenho, sem rAF.
- `?fora=1` liga a regra antiga do fora; por padrão, a bola nunca sai.
- Os roteiros `jornada`, `raio`, `rali8` e `onboarding`, citados no desenho, ainda não existem.

O headless perde o foco sozinho: as ferramentas passam `?semblur`.

**Build da Poki:**
- O `empacotar` corta de todo `.js` as linhas que terminam em `// modelo`. Todo código que lê o `__voleiModelo` precisa dessa marca, senão a build falha.
- Ele também tira a arte que nenhum código cita e os sons que não estão no catálogo `src/som/arquivos.js`. Um som novo precisa entrar no catálogo; se um som do catálogo não tiver arquivo, a build falha.
- Ele falha com URL externa, `console.log`, `.map`, import quebrado ou se passar dos tetos do §4.9: fundo 250 KB, áudio 200 KB, inicial 1,5 MB e total 4,5 MB.
- O `tools/artifact.mjs` acha a tag do SDK no `index.html` pelo comentário `<!-- Unico script externo permitido pela Poki. -->`. Se esse comentário mudar, o checkpoint não monta.

## Git
Faça um commit no fim de cada marco, com as notas em `docs/marcos/M<n>.md`. Push só com o OK do usuário. As mensagens usam o prefixo `M<n>:`, `build:` ou `docs:`, em português sem acento.

## Calibragem atual (bot contra bot, 2026-10-22)
- **Rodar:** `npm run calibrar` (`tools/calibrar.mjs [N=30]`): rali, motivos dos pontos, travessias, saques e, quando houver, boladas no juiz.
- **Constantes** (em `src/fisica/volei.js`): `E_SLIME` 0,9, `G_BOLA` 28, `V_MIN` 8, `SOMA_Y` 0,7; controle firme com `ACEL_CHAO` 150, `FREIO` 200, `ACEL_AR` 90 e `FREIO_AR` 150.
- **Resultado (30 partidas):** ralis com mediana de cerca de 5,8 s (p90 de 15,6 s), 0% de fora e cerca de 33% de pontos na rede.
- **Saque:** o `saqueErro` de cada nível está em `src/jogo/rivais.js`; o bot T2 acerta cerca de 65% de perfeitos (100 partidas; com 30 a amostra oscila de 61% a 70%).
- A câmera lenta usa mundo a 0,06 (medido no Blumgi) e defensor a 0,30: `escalaMundo: 60` e `escalaDefensor: 300` (em milésimos), no `src/jogo/cortada.js`.
