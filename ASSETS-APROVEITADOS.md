# Revisão visual e aproveitamento de assets

## Diagnóstico

A inspeção no navegador mostrou espaços grandes sem função entre destinos, árvores repetidas em anéis, fachadas isoladas, rampas provisórias e sobreposição dos discos da fonte. O terreno já tinha 304 × 304 unidades; aumentar apenas o chão não resolveria a sensação de vazio.

## Pacotes revisados e selecionados

| Pacote local | Aplicação na cidade |
| --- | --- |
| KayKit City Builder Bits, empacotado no jogo de referência | Fachadas comerciais, bancos, postes, lixeiras e carros |
| KayKit Forest, empacotado no jogo de referência | Copas variadas, arbustos e pedras em jardins e bordas florestais |
| Kenney City Kit Suburban | Quatro tipos de casas e cercas baixas em lotes residenciais |
| Kenney Mini Market | Expositores de frutas e pães na feira |
| Kenney Mini Skate | Half-pipe, rampa, corrimão e skate; substituem os volumes provisórios |
| Paderunt Camping | Barracas, bancos e pinheiros já integrados |
| Dleom Sports Balls | Bolas esportivas já integradas |
| VNBP Academia | Identificado com modelos FBX; não integrado nesta revisão |

Os originais permanecem em `../assets`. Apenas a seleção necessária e suas texturas foram copiados para `public/models`. Os créditos/licenças dos pacotes permanecem nas pastas originais e no CREDITOS.md da raiz.

## Mudanças

- Avenida perimetral com calçadas, faixas de pedestres, sinalização horizontal e postes.
- Casas com jardins, cercas e carros, fachadas comerciais e estacionamentos.
- Feira com quatro bancas cobertas e um novo ponto de descoberta (17 locais).
- Jardins de bairro, canteiros floridos e bordas florestais mais densas.
- 639 colocações de modelos na nova camada urbana, com geometria e materiais compartilhados.
- Repetições agrupadas por setores de 36 unidades para permitir descarte fora da câmera.
- Sombras locais no desktop; desligadas em dispositivos com apontador de toque.
- Correção da fonte sobreposta e remoção de anéis de árvores que cruzavam a avenida.

## Verificação

Build passou. Navegador Edge headless sem erros JavaScript ou HTTP. Capturas da câmera isométrica, terceira pessoa, modo admin e viewport de toque 390 × 844 em `art-source/cidade-*.png`. Nenhum transbordamento horizontal na tela mobile simulada.

Na vista inicial medida: desktop 42.727 triângulos / 217 draw calls; mobile simulado 14.178 triângulos / 96 draw calls. Estes números são de um enquadramento específico, não um teste de FPS nem garantia para aparelhos reais. A visão aérea desenha uma área maior. Mini-jogos, lojas e rampas continuam cenográficos; não foram implementados interiores ou tráfego.
