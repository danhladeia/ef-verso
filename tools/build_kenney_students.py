"""Monta o pacote de alunos do EF Verso a partir do Kenney Mini Characters (CC0).

Executar da raiz do projeto:
  blender -b --factory-startup --python cidade/tools/build_kenney_students.py

Saídas:
  cidade/public/models/students/kenney-alunos.glb  (modelo do jogo)
  cidade/art-source/kenney-alunos.blend            (fonte editável)

O que o script faz no Blender:
  - junta as 12 cabeças e os 12 corpos num único esqueleto de 7 ossos, para que
    cabeça e roupa possam ser combinadas no guarda-roupa;
  - remove a esfera auxiliar que vem em cada arquivo;
  - posiciona os acessórios Kenney (óculos, óculos escuros, aparelho auditivo,
    cadeira de rodas) presos ao osso certo;
  - modela uma mochila escolar e um apito com cordão (professora);
  - cria pontos de referência das mãos para segurar a bola.
"""
import bpy, bmesh, os, sys
from mathutils import Vector, Matrix

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'assets', 'kenney', 'mini-characters', 'Models', 'GLB format')
OUT_GLB = os.path.join(ROOT, 'cidade', 'public', 'models', 'students', 'kenney-alunos.glb')
OUT_BLEND = os.path.join(ROOT, 'cidade', 'art-source', 'kenney-alunos.blend')
LETTERS = ['female-a', 'female-b', 'female-c', 'female-d', 'female-e', 'female-f',
           'male-a', 'male-b', 'male-c', 'male-d', 'male-e', 'male-f']

bpy.ops.wm.read_factory_settings(use_empty=True)


def imported(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    return [o for o in bpy.data.objects if o not in before]


# 1. Esqueleto e animações de referência (todos os arquivos trazem as mesmas 32 animações).
base_objs = imported(os.path.join(SRC, 'character-female-a.glb'))
rig = next(o for o in base_objs if o.type == 'ARMATURE')
rig.name = rig.data.name = 'Rig'
base_actions = set(bpy.data.actions)
colormap = None
for o in base_objs:
    if o.type == 'MESH' and o.data.materials:
        colormap = o.data.materials[0]
colormap.name = 'colormap'
for node in colormap.node_tree.nodes:
    if node.type == 'TEX_IMAGE':
        node.interpolation = 'Closest'
rest_ref = {b.name: b.head_local.copy() for b in rig.data.bones}
for o in base_objs:
    if o.type == 'MESH':
        bpy.data.objects.remove(o, do_unlink=True)

# 2. Cabeças e corpos de cada personagem, religados ao esqueleto único.
worst = 0.0
for letter in LETTERS:
    objs = imported(os.path.join(SRC, f'character-{letter}.glb'))
    arm = next(o for o in objs if o.type == 'ARMATURE')
    for b in arm.data.bones:
        worst = max(worst, (b.head_local - rest_ref[b.name]).length)
    for o in objs:
        if o.type != 'MESH':
            continue
        if o.name.startswith('Icosphere'):
            bpy.data.objects.remove(o, do_unlink=True)
            continue
        kind = 'head' if o.name.startswith('head') else 'body'
        o.name = o.data.name = f'{kind}_{letter}'
        mw = o.matrix_world.copy()
        o.parent = rig
        o.matrix_world = mw
        for m in o.modifiers:
            if m.type == 'ARMATURE':
                m.object = rig
        o.data.materials.clear()
        o.data.materials.append(colormap)
    bpy.data.objects.remove(arm, do_unlink=True)
for a in list(bpy.data.actions):
    if a not in base_actions:
        bpy.data.actions.remove(a)
for m in list(bpy.data.materials):
    if m != colormap and m.users == 0:
        bpy.data.materials.remove(m)
print('MAX_REST_DIFF', round(worst, 5))

# 2b. Pele com material próprio. O atlas Kenney tem uma coluna de degradê (32 px) para
# cada tom; o jogo troca o tom deslocando a textura desse material. Coordenadas em
# pixels do PNG (origem no canto superior esquerdo). Regras conferidas face a face:
# nas roupas, só mãos, pernas descobertas e o decote usam a coluna de pele.
SKIN_HEAD = {'female-a': 416, 'female-b': 480, 'female-c': 352, 'female-d': 480, 'female-e': 480,
             'female-f': 480, 'male-a': 416, 'male-b': 480, 'male-c': 480, 'male-d': 480,
             'male-e': 480, 'male-f': 352}
SKIN_BODY = {'female-a': (416, ('arm',)), 'female-b': (480, ('arm', 'torso')), 'female-c': (352, ('arm', 'leg')),
             'female-d': (480, ('arm',)), 'female-f': (480, ('arm',)), 'male-a': (416, ('arm', 'leg')),
             'male-b': (480, ('arm', 'leg')), 'male-c': (480, ('arm',)), 'male-d': (480, ('arm',)),
             'male-f': (352, ('arm', 'leg'))}
skin_materials = {}


def skin_material(col):
    if col not in skin_materials:
        m = colormap.copy()
        m.name = f'skin_{col}_384'
        skin_materials[col] = m
    return skin_materials[col]


for o in bpy.data.objects:
    if o.type != 'MESH' or o.name[:5] not in ('head_', 'body_'):
        continue
    letter = o.name[5:]
    if o.name.startswith('head_'):
        col, allowed = SKIN_HEAD[letter], ('head',)
    elif letter in SKIN_BODY:
        col, allowed = SKIN_BODY[letter]
    else:
        continue
    me = o.data
    me.materials.append(skin_material(col))
    uv = me.uv_layers.active.data
    names = {g.index: g.name for g in o.vertex_groups}
    count = 0
    for p in me.polygons:
        x = min(511, int(uv[p.loop_indices[0]].uv[0] * 512)) // 32 * 32
        y = min(511, int((1 - uv[p.loop_indices[0]].uv[1]) * 512)) // 128 * 128
        vg = me.vertices[p.vertices[0]].groups
        group = names.get(max(vg, key=lambda g: g.weight).group, '') if vg else ''
        if x == col and y == 384 and group.split('-')[0] in allowed:
            p.material_index = 1
            count += 1
    print('SKIN', o.name, col, count)

# 2c. Quatro tons novos no atlas, na área preta sem uso (linha superior), feitos a
# partir dos degradês originais para manter o sombreado.
img = bpy.data.images['colormap']
W, H = img.size
pixels = list(img.pixels)


def block(x0, y0):
    """Lê um bloco 32×128 em coordenadas do PNG; devolve linhas de cima para baixo."""
    rows = []
    for py in range(y0, y0 + 128):
        by = H - 1 - py
        rows.append([pixels[(by * W + px) * 4:(by * W + px) * 4 + 4] for px in range(x0, x0 + 32)])
    return rows


def write(x0, y0, rows):
    for i, row in enumerate(rows):
        by = H - 1 - (y0 + i)
        for j, rgba in enumerate(row):
            k = (by * W + x0 + j) * 4
            pixels[k:k + 4] = rgba


light, tan, dark = block(480, 384), block(352, 384), block(416, 384)
mix = lambda a, b, t: [[[ca * (1 - t) + cb * t for ca, cb in zip(pa, pb)] for pa, pb in zip(ra, rb)] for ra, rb in zip(a, b)]
shade = lambda a, f: [[[c * f for c in p[:3]] + [1.0] for p in r] for r in a]
write(0, 0, mix(light, tan, 0.5))     # claro-médio
write(32, 0, mix(tan, dark, 0.5))     # moreno
write(64, 0, shade(dark, 0.74))       # escuro
write(96, 0, shade(dark, 0.55))       # retinto
img.pixels = pixels
img.pack()


def bone_parent(obj, bone):
    """Prende o objeto a um osso mantendo a posição no espaço."""
    mw = obj.matrix_world.copy()
    obj.parent = rig
    obj.parent_type = 'BONE'
    obj.parent_bone = bone
    obj.matrix_world = mw


# 3. Acessórios Kenney, posicionados no rosto e no corpo.
def accessory(file, name, location, bone):
    objs = imported(os.path.join(SRC, file + '.glb'))
    meshes = [o for o in objs if o.type == 'MESH']
    for o in meshes:
        o.data.materials.clear()
        o.data.materials.append(colormap)
    if len(meshes) > 1:
        bpy.ops.object.select_all(action='DESELECT')
        for o in meshes:
            o.select_set(True)
        bpy.context.view_layer.objects.active = meshes[0]
        bpy.ops.object.join()
    obj = meshes[0]
    for o in [o for o in objs if o.type != 'MESH']:
        bpy.data.objects.remove(o, do_unlink=True)
    obj.name = obj.data.name = name
    obj.location = location
    bpy.context.view_layer.update()
    if bone:
        bone_parent(obj, bone)
    else:
        mw = obj.matrix_world.copy(); obj.parent = rig; obj.matrix_world = mw
    return obj


# O rosto fica no plano y = -0.168; os olhos, por volta de z = 0.47.
accessory('aid-glasses', 'acc_glasses', (0, -0.086, 0.44), 'head')
accessory('aid-sunglasses', 'acc_sunglasses', (0, -0.086, 0.44), 'head')
accessory('aid_hearing', 'acc_hearing', (0.232, 0.01, 0.43), 'head')
accessory('wheelchair', 'acc_wheelchair', (0, 0, 0), None)


# 4. Modelos próprios: mochila escolar e apito com cordão.
def material(name, color):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = 0.85
    return m


def cube_mesh(name, parts, mats):
    """parts: lista de (centro, tamanho, índice do material)."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    for center, size, mi in parts:
        geom = bmesh.ops.create_cube(bm, size=1.0)
        verts = geom['verts']
        bmesh.ops.scale(bm, vec=Vector(size), verts=verts)
        bmesh.ops.translate(bm, vec=Vector(center), verts=verts)
        for f in {f for v in verts for f in v.link_faces}:
            f.material_index = mi
    bevel_edges = [e for e in bm.edges]
    bmesh.ops.bevel(bm, geom=bevel_edges, offset=0.006, segments=1, affect='EDGES')
    bm.to_mesh(me)
    bm.free()
    for m in mats:
        me.materials.append(m)
    obj = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(obj)
    return obj


bag = material('acc_backpack', (0.44, 0.25, 0.61))
bag_dark = material('acc_backpack_detail', (0.16, 0.17, 0.22))
backpack = cube_mesh('acc_backpack', [
    ((0, 0.205, 0.262), (0.21, 0.075, 0.17), 0),        # corpo da mochila
    ((0, 0.248, 0.235), (0.15, 0.025, 0.085), 0),        # bolso frontal
    ((0, 0.262, 0.236), (0.15, 0.006, 0.012), 1),        # zíper
    ((0, 0.205, 0.352), (0.06, 0.03, 0.022), 1),         # alça de mão
    ((0.065, 0.03, 0.352), (0.035, 0.32, 0.018), 1),     # alça esquerda sobre o ombro
    ((-0.065, 0.03, 0.352), (0.035, 0.32, 0.018), 1),    # alça direita sobre o ombro
    ((0.065, -0.118, 0.3), (0.035, 0.018, 0.11), 1),     # alça esquerda na frente
    ((-0.065, -0.118, 0.3), (0.035, 0.018, 0.11), 1),    # alça direita na frente
], [bag, bag_dark])
bone_parent(backpack, 'torso')

cord = material('acc_whistle_cord', (0.83, 0.2, 0.25))
metal = material('acc_whistle_metal', (0.82, 0.84, 0.88))
whistle = cube_mesh('acc_whistle', [
    ((0.07, -0.02, 0.352), (0.018, 0.2, 0.012), 0),      # cordão sobre o ombro
    ((-0.07, -0.02, 0.352), (0.018, 0.2, 0.012), 0),
    ((0.045, -0.118, 0.31), (0.012, 0.012, 0.075), 0),   # cordão descendo pelo peito
    ((-0.045, -0.118, 0.31), (0.012, 0.012, 0.075), 0),
    ((0, -0.118, 0.272), (0.1, 0.012, 0.012), 0),
    ((0, -0.128, 0.255), (0.045, 0.03, 0.03), 1),         # apito
    ((0.03, -0.128, 0.262), (0.02, 0.02, 0.016), 1),
], [cord, metal])
bone_parent(whistle, 'torso')

# 5. Pontos das mãos: vértice do corpo mais distante do ombro em cada braço.
probe = bpy.data.objects['body_male-a']
groups = {g.name: g.index for g in probe.vertex_groups}
for side in ('left', 'right'):
    gi = groups[f'arm-{side}']
    shoulder = rig.data.bones[f'arm-{side}'].head_local
    far, dist = None, -1
    for v in probe.data.vertices:
        if any(g.group == gi and g.weight > 0.5 for g in v.groups):
            p = probe.matrix_world @ v.co
            d = (p - shoulder).length
            if d > dist:
                far, dist = p, d
    empty = bpy.data.objects.new(f'hand_{side}', None)
    bpy.context.scene.collection.objects.link(empty)
    empty.empty_display_size = 0.03
    empty.location = far
    bpy.context.view_layer.update()
    bone_parent(empty, f'arm-{side}')
    print('HAND', side, tuple(round(c, 3) for c in far))

# 6. Exportação.
rig.animation_data_create()
rig.animation_data.action = bpy.data.actions.get('idle')
os.makedirs(os.path.dirname(OUT_GLB), exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=OUT_BLEND)
bpy.ops.export_scene.gltf(
    filepath=OUT_GLB, export_format='GLB', export_yup=True, export_apply=False,
    export_animations=True, export_animation_mode='ACTIONS', export_skins=True,
    export_morph=False, export_def_bones=False, export_extras=False,
    export_image_format='AUTO')
print('EXPORTED', OUT_GLB, os.path.getsize(OUT_GLB), 'actions', len(bpy.data.actions),
      'objects', sorted(o.name for o in bpy.data.objects))
