# Revisão da cidade — 24/10/2026

## Organização e assets

O conjunto antigo de expansões foi substituído por um traçado único com limites de lotes, vias, passeios e acessos. O terreno mede 352 × 352 unidades. A malha viária tem quatro eixos horizontais e quatro verticais, com dezesseis cruzamentos sinalizados. Cercas são módulos com altura definida: 1,05 nas residências, 1,10 no skate e 2,40 no campo; portões interrompem também as colisões.

Reutilização local: KayKit City/Forest para prédios, mobiliário e vegetação; Kenney Suburban para casas; Kenney Mini Skate para rampas, corrimãos, degraus e skate; Kenney Mini Market para bancas; Paderunt para barracas e elementos de camping; dleom para bolas. Créditos e originais permanecem no acervo do projeto. Novos modelos próprios: bowl contínuo, edifício de ciência e edifício da galeria; dez edifícios civis foram exportados novamente pelo Blender.

## Ambientes revisados

| Ambiente | Alterações |
| --- | --- |
| Praça Central | Fonte em níveis, caminhos em cruz, bancos e canteiros |
| Escola | Pátio livre, jardins, sinalização e acesso separado da via |
| Basquete | Piso contrastante, marcações, tabelas, bancos e refletores |
| Parque | Amarelinha, balanços, circuito de equilíbrio e sombra |
| Ginásio | Praça de entrada, fachada própria e canteiros |
| Ginástica | Colchonetes, barras baixas, jardins e área de descanso |
| Danças | Palco, estrutura de iluminação e piso quadriculado |
| Dojô | Tatame externo, pergolado e jardins laterais |
| Saúde | Ponto de hidratação, pergolado e paisagismo |
| Museu | Esculturas no pátio, bancos e área sombreada |
| Feira | Bancas cobertas, mesas e passeio separado das casas |
| Futebol | Gramado em faixas, traves, arquibancada, refletores e cerca com passagem |
| Vôlei | Quadra marcada, rede, área de areia, bancos e iluminação |
| Ciência | Edifício próprio, cúpula, esculturas e jardins |
| Galeria | Edifício próprio, painéis sob coberturas, bancos e acesso central |
| Skate | Bowl criado no Blender, duas rampas curvas, degraus, corrimãos, obstáculos e cerca com entrada |
| Visitantes | Edifício de recepção, sinalização, pergolado e conexão com a trilha |
| Acampamento | Barracas, bancos de tronco, mesas de piquenique, pinheiros e trilha |
| Residencial | Casas variadas, jardins, cercas baixas e portões voltados aos passeios |

## Validação e limites

As capturas dos 19 ambientes estão em `art-source/review/all-environments.png`; o relatório automatizado fica em `art-source/review/verification.json`. O teste verifica todos os destinos e amostra os segmentos de suas rotas contra as colisões, além de caminhar até a escola, abrir uma interação, correr, pular e alternar câmeras/voo. A interface móvel foi conferida em 390 × 844, com eventos de toque.

A etapa urbana aqui documentada não adicionou esportes jogáveis, interiores ou física sobre rampas. Na etapa seguinte, a missão Primeiras Cestas acrescentou um treino de basquete e personagens animados; consulte o README para o estado vigente. O modo Admin é uma ferramenta local de inspeção, não uma conta autenticada. Medição de desempenho e experiência de toque em aparelhos físicos continuam necessárias antes de chamar o jogo de versão final de publicação.
