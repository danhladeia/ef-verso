"""Cria duas variantes de proporção ('masc'/'fem') para cada roupa (corpo) dos alunos, a partir
do mesmo rig unissex já existente em wardrobe-collection.blend — sem esculpir malha nova: desloca
os vértices de cada peça (ombros, quadril, pernas, altura) por grupo de vértice (osso), reaproveitando
os mesmos pesos de esqueleto e materiais, então as roupas/cores continuam funcionando exatamente como
antes. O corpo do adulto (professora/moradores adultos) não entra — mantém um único visual.

Build: blender -b --factory-startup --python tools/build_body_gender_variants.py
Saídas: public/models/students/wardrobe-collection.glb e art-source/wardrobe-collection.blend (sobrescritos)
"""
import bpy, json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(ROOT / 'art-source/wardrobe-collection.blend'))

BODY_NAMES = ['body_camiseta', 'body_camisa_bandana', 'body_casaco', 'body_hoodie',
              'body_bomber', 'body_gamer', 'body_football', 'body_basketball']

# Fator de escala no eixo X (largura) por grupo de vértice/osso — sutil, de personagem estilizado
# infantojuvenil, não anatômico: ombros/braços mais largos e quadril/pernas mais estreitos no
# masculino; o inverso, mais discreto, no feminino. Z (altura) ajusta o corpo todo um pouco.
VARIANTS = {
 'masc': {'scale_x': {'chest': 1.07, 'upperarm.l': 1.06, 'upperarm.r': 1.06, 'hips': .95, 'upperleg.l': .97, 'upperleg.r': .97}, 'height': 1.02},
 'fem': {'scale_x': {'chest': .93, 'upperarm.l': .95, 'upperarm.r': .95, 'hips': 1.08, 'upperleg.l': 1.04, 'upperleg.r': 1.04}, 'height': .97},
}


def make_variant(src_name, suffix, cfg):
    src = bpy.data.objects[src_name]
    dup = src.copy()
    dup.data = src.data.copy()
    dup.name = f'{src_name}_{suffix}'
    bpy.context.collection.objects.link(dup)
    group_name_by_index = {vg.index: vg.name for vg in dup.vertex_groups}
    scales = cfg['scale_x']
    for v in dup.data.vertices:
        weights = {}
        for g in v.groups:
            name = group_name_by_index.get(g.group)
            if name is not None:
                weights[name] = g.weight
        # Vértices do colarinho/pescoço ficam presos entre o grupo 'chest' e o grupo 'head' (a costura
        # com a cabeça, que não muda de tamanho entre menino/menina) — sem isso, alargar/estreitar o
        # peito abria um vão entre a roupa e o pescoço (um "buraco"), e a cabeça parecia cortada.
        head_w = weights.get('head', 0.0)
        factor_x = 1.0
        for name, scale in scales.items():
            if name in weights:
                factor_x += (scale - 1.0) * weights[name] * (1.0 - head_w)
        v.co.x *= factor_x
        v.co.z *= 1.0 + (cfg['height'] - 1.0) * (1.0 - head_w)
    dup.data.update()
    return dup


manifest = {}
for name in BODY_NAMES:
    for suffix, cfg in VARIANTS.items():
        variant = make_variant(name, suffix, cfg)
        manifest[variant.name] = len(variant.data.polygons)
    bpy.data.objects.remove(bpy.data.objects[name], do_unlink=True)

bpy.context.preferences.filepaths.save_version = 0
bpy.ops.file.pack_all()
blend = ROOT / 'art-source/wardrobe-collection.blend'
bpy.ops.wm.save_as_mainfile(filepath=str(blend))
out = ROOT / 'public/models/students/wardrobe-collection.glb'
bpy.ops.export_scene.gltf(filepath=str(out), export_format='GLB', export_yup=True,
    export_animations=False, export_skins=True, export_morph=False, export_def_bones=False)
print('BODY_VARIANTS_EXPORTED', out.stat().st_size, json.dumps(manifest))
