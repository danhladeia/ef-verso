# Coleção de roupas e acessórios

Pacote ativo: `public/models/students/wardrobe-collection.glb`.
Arquivo editável: `art-source/wardrobe-collection.blend`.
Gerador: `tools/build_wardrobe_collection.py` (Blender 5.2).

O pacote estende os personagens KayKit do jogo e compartilha o mesmo esqueleto e as animações existentes. O arquivo original `kaykit-alunos.blend` foi preservado.

| Categoria | Opções reais, sem contar “sem acessório” |
| --- | ---: |
| Tom de pele | 8 |
| Rosto e cabelo | 10 |
| Conjuntos de roupa | 8 |
| Óculos | 5 |
| Aparelhos auditivos | 5 |
| Mochilas e bolsas | 5 |
| Cadeiras de rodas | 5 |

As roupas continuam sendo conjuntos completos, como no guarda-roupa original. As cores da roupa, detalhes, calça/bermuda, tênis e cabelo podem ser alteradas. As opções novas têm geometria própria: bolsos, zíper, emblemas gamer, números de uniforme, mechas, armações e detalhes de acessórios.

Revisão de acabamento: as roupas novas usam a superfície curva e os pesos da roupa original. Costuras, números e emblemas são ajustados à superfície por projeção; as antigas placas retangulares foram removidas. As miniaturas de roupa mostram o personagem completo, incluindo a cabeça. A validação percorre as 80 combinações de cabeça/roupa em seis estados de animação, além da seleção e persistência no guarda-roupa.

Prévia de todas as opções: `/art-source/wardrobe-collection-review.html` no servidor local.
Validação do catálogo, seleção, persistência e carregamento: `node tools/verify-wardrobe-collection.mjs`.
As capturas e o relatório ficam em `art-source/wardrobe-collection-review/`.

Base: KayKit Adventurers 2.0, CC0, conforme os créditos do projeto. As novas malhas são modeladas pelo gerador no Blender a partir dessa base.
