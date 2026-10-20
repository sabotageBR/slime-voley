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
- as referências medidas do Blumgi, em `docs/referencias/`.

## Estrutura
- `src/fisica/volei.js` é pura e determinística:
  - cúpula elíptica com o amassado σ (`a = R(1+0,18σ)`, `b = R(1−0,22σ)`);
  - bola, rede, placas, rede de proteção e `prever()`.
- `src/jogo/` também é pura (sem DOM, relógio ou `Math.random`; sorteio só pelo `core/rng.js`):
  - `partida.js`: estados, rali, saque ativo, pontos, cortada lenta e assistências;
  - `tempo.js`: os 3 relógios e os canais de escala da câmera lenta;
  - `pele.js`: as partículas só de desenho;
  - `ia.js`: plano exato do contato, simulando a trajetória;
  - `cortada.js`: a máquina de estados, a mira e o resolvedor do tiro;
  - `regras.js`: a tabela única de tempos;
  - `medidor.js`, `rivais.js` e `skins.js`.
- `src/render/`:
  - `cena.js`: os 4 canvases;
  - `vista.js`: o proxy que o campo e os rostos leem;
  - `campo.js` e `composicao.js`: a gosma do slime-merge, com um campo móvel por slime;
  - `diretor.js` (câmera), `layout.js` (retrato, paisagem e desktop), `quadra.js`, `celebracao.js` e `plateia.js`;
  - `ginasios/praia.js`.
- `src/ui/`: `controles.js` (Metades e Botões, teclado e mouse), `hud.js` e `lab.js` (o laboratório da cortada).
- `src/som/mesa.js`: os eventos tocam receitas e as 19 falas `*Slime`. Não há música.
- `src/main.js` liga tudo e é o **único** dono do SDK (`core/poki.js`), do áudio, do save e do DOM.

## Regras que os testes vigiam (`test/estilo.test.js`)
- **Eventos:**
  - zero `stopPropagation`;
  - nenhum ouvinte em captura (exceto o destrave do áudio);
  - `preventDefault` só em touchmove, wheel, contextmenu, setas e Espaço;
  - `pointermove` nunca dispara `gameplayStart`.
- **Pureza:** `jogo/` e `fisica/` são puros. `render/` não importa `ui/`, `som/` nem o SDK.
- **Externo:** nenhuma URL externa além do SDK da Poki.
- **Conteúdo:**
  - nenhum IP de futebol nem de Star Trek (FIFA, clubes, marcas, "Jornada nas Estrelas"...);
  - o super se chama "Saque Jornada" / "Sky Serve".

## Fluxo do SDK
- `gameplayStart` só com `pointerdown`/`keydown` real. O primeiro saque de cada partida, e o de depois de uma pausa ou anúncio, espera um toque.
- Não existe saque automático.
- Portão de 30 s sem interação: até o saque da CPU espera um toque.
- `commercialBreak` só no toque em Próxima/Revanche (a partir da 3ª partida) e ao despausar; nunca no rali.

## Ferramentas
Portas: 5380 (servir), 4380–4385, CDP 9380–9382.

| Comando | O que faz |
|---|---|
| `npm test` | testes com `node:test` |
| `node tools/shot.mjs "<query>" 390x844 saida.png [ms] --toque` | print pelo CDP, com os erros do console |
| `node tools/gif.mjs saida.gif 844x390 480 "<query>@ms" ...` | GIF da partida |
| `node tools/medir.mjs 4` | custo por quadro com a CPU limitada (relativo: GPU por software) |
| `node tools/midia-m1.mjs` | quadros e GIFs das 3 direções |
| `node tools/artifact.mjs` | monta o checkpoint em `.tmp/artifact` |
| `node tools/grok.mjs gerar <id> 16:9 "<prompt>"` | arte do Grok (headless, só `image_gen`/`image_edit`, pasta própria) |
| `python3 -I tools/recortar.py <id>` | trata a arte para `src/arte/ginasios/` |

Parâmetros de teste: `?semente ?roteiro=cortada|ponto|ponto-curto|saque ?visual=a|b|c ?controle=a|b ?gatilho=novo|segura ?lab ?auto ?primeira ?semblur ?semanuncio`.

O headless perde o foco sozinho: as ferramentas passam `?semblur`.

## Calibragem atual (bot contra bot, 2026-10-20)
- **Constantes:** `E_SLIME` 0,9, `G_BOLA` 28, `V_MIN` 8, `SOMA_Y` 0,7.
- **Resultado:** ralis com mediana de cerca de 6 s.
- A câmera lenta usa mundo a 0,06 (medido no Blumgi) e defensor a 0,30.
