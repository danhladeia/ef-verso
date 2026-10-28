"""Alunos do EF Verso no estilo do Jogo_RPG_EF7: KayKit Adventurers 2.0 (CC0) editados como estudantes.

Executar da raiz do projeto:
  blender -b --factory-startup --python cidade/tools/build_kaykit_students.py

Saídas: cidade/public/models/students/kaykit-alunos.glb e cidade/art-source/kaykit-alunos.blend

Edições feitas aqui:
  - sem chapéus, capacetes, capas, aljava e máscara (nada de fantasia);
  - o Ranger perde bigode e cavanhaque e vira um aluno de cabelo castanho;
  - cabeças e roupas de personagens diferentes ficam no mesmo esqueleto (Rig_Medium),
    para o guarda-roupa combinar rosto e roupa;
  - malhas simplificadas (Decimate) para caber em computadores de escola;
  - mochila, óculos, aparelho auditivo, apito e cadeira de rodas modelados aqui;
  - animações KayKit Character Animations 1.1 escolhidas para o jogo.
As cores (pele, cabelo, camiseta, bermuda, tênis) são trocadas no jogo, por bloco do atlas.
"""
import bpy, bmesh, math, os
from mathutils import Vector, Matrix

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
CHARS = os.path.join(ROOT, 'assets', 'kaykit', 'adventurers-2.0')
ANIMS = os.path.join(ROOT, 'assets', 'kaykit', 'character-animations-1.1')
OUT_GLB = os.path.join(ROOT, 'cidade', 'public', 'models', 'students', 'kaykit-alunos.glb')
OUT_BLEND = os.path.join(ROOT, 'cidade', 'art-source', 'kaykit-alunos.blend')
# Peças usadas: cabeças (rosto + cabelo) e conjuntos de roupa (corpo, braços e pernas).
HEADS = {'Rogue': 'head_ruiva', 'Mage': 'head_cabelo_preto', 'Knight': 'head_loiro', 'Ranger': 'head_castanho', 'Barbarian': 'head_adulto_barba'}
OUTFITS = {'Rogue': 'body_camiseta', 'Ranger': 'body_camisa_bandana', 'Mage': 'body_casaco', 'Knight': 'body_adulto_colete'}
DECIMATE = {'head': 0.72, 'body': 0.85}

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene


def imported(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    return [o for o in bpy.data.objects if o not in before]


# 1. Esqueleto de referência.
base = imported(os.path.join(CHARS, 'Rogue.glb'))
rig = next(o for o in base if o.type == 'ARMATURE')
rig.name = rig.data.name = 'Rig'
rest = {b.name: b.head_local.copy() for b in rig.data.bones}
for o in base:
    if o.type == 'MESH':
        bpy.data.objects.remove(o, do_unlink=True)


def adopt(o, name):
    mw = o.matrix_world.copy()
    o.parent = rig
    o.matrix_world = mw
    for m in o.modifiers:
        if m.type == 'ARMATURE':
            m.object = rig
    o.name = o.data.name = name


def decimate(o, ratio):
    m = o.modifiers.new('decimate', 'DECIMATE')
    m.ratio = ratio
    m.use_collapse_triangulate = True
    # o Decimate precisa vir antes da armadura
    bpy.context.view_layer.objects.active = o
    while o.modifiers[0].name != 'decimate':
        bpy.ops.object.modifier_move_up(modifier='decimate')
    bpy.ops.object.modifier_apply(modifier='decimate')
    # Sombreamento suave por ângulo: devolve o aspecto arredondado dos moldes originais da KayKit sem
    # precisar dos polígonos extras — sem isso, braços e pernas (feitos de poucos lados) ficam com cara
    # de cano poligonal em vez de membro arredondado.
    bpy.context.view_layer.objects.active = o
    o.select_set(True)
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(42))
    o.select_set(False)


worst = 0.0
for char in ['Rogue', 'Mage', 'Knight', 'Ranger', 'Barbarian']:
    objs = imported(os.path.join(CHARS, char + '.glb'))
    arm = next(o for o in objs if o.type == 'ARMATURE')
    for b in arm.data.bones:
        worst = max(worst, (b.head_local - rest[b.name]).length)
    for o in objs:
        if o.type != 'MESH':
            continue
        part = o.name.split('_', 1)[-1]
        if char in HEADS and part == 'Head':
            if char == 'Ranger':
                # bigode e cavanhaque: faces do bloco do cabelo na frente da parte baixa do rosto
                bm = bmesh.new(); bm.from_mesh(o.data)
                uv = bm.loops.layers.uv.active
                doomed = []
                for f in bm.faces:
                    u = sum(l[uv].uv.x for l in f.loops) / len(f.loops)
                    v = sum(l[uv].uv.y for l in f.loops) / len(f.loops)
                    c = o.matrix_world @ f.calc_center_median()
                    if int(u * 8) == 1 and int((1 - v) * 4) == 0 and c.z < 1.62 and c.y < -0.3:
                        doomed.append(f)
                bmesh.ops.delete(bm, geom=doomed, context='FACES')
                bm.to_mesh(o.data); bm.free()
                print('RANGER_FACIAL_HAIR_REMOVED', len(doomed))
            adopt(o, HEADS[char])
            decimate(o, DECIMATE['head'])
        elif char in OUTFITS and part in ('Body', 'ArmLeft', 'ArmRight', 'LegLeft', 'LegRight'):
            adopt(o, OUTFITS[char] + '_' + part.lower())
            decimate(o, DECIMATE['body'])
        else:
            bpy.data.objects.remove(o, do_unlink=True)  # chapéus, capas, aljava, máscara, esfera auxiliar
    bpy.data.objects.remove(arm, do_unlink=True)
print('MAX_REST_DIFF', round(worst, 5))
# Cada conjunto de roupa vira um só objeto (corpo, braços e pernas), mantendo o atlas do personagem.
for outfit in OUTFITS.values():
    parts = [o for o in bpy.data.objects if o.name.startswith(outfit + '_')]
    bpy.ops.object.select_all(action='DESELECT')
    for o in parts:
        o.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    o = bpy.context.object
    o.name = o.data.name = outfit
    o.select_set(True)
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(42))  # suaviza também as costuras entre as partes
    o.select_set(False)

# 2. Animações: os arquivos KayKit trazem cada osso como objeto animado, então ficam fora deste pacote.
#    O jogo carrega cidade/public/models/students/anims/*.glb e liga as faixas aos ossos pelo nome.
#    Daqui só se lê a altura do quadril na pose sentada, para dimensionar a cadeira de rodas.
sim = imported(os.path.join(ANIMS, 'Simulation.glb'))
sit = bpy.data.actions['Sit_Chair_Idle']
for o in sim:
    slot = next((s for s in sit.slots if s.identifier == 'OB' + o.name), None)
    if slot:
        o.animation_data_create(); o.animation_data.action = sit; o.animation_data.action_slot = slot
scene.frame_set(1); bpy.context.view_layer.update()
hips_obj = next(o for o in sim if o.name == 'hips')
hips = hips_obj.matrix_world.translation.copy()
for o in sim:
    bpy.data.objects.remove(o, do_unlink=True)
for a in list(bpy.data.actions):
    bpy.data.actions.remove(a)
print('SIT_HIPS', tuple(round(c, 3) for c in hips))


# 3. Acessórios modelados para o tamanho dos personagens KayKit.
def material(name, color, rough=0.8, metal=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    lin = [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in color]
    b.inputs['Base Color'].default_value = (*lin, 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    return m


def obj_from(name, bm, mats, bone=None):
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for m in mats:
        me.materials.append(m)
    o = bpy.data.objects.new(name, me); scene.collection.objects.link(o)
    if bone:
        o.parent = rig; o.parent_type = 'BONE'; o.parent_bone = bone
        o.matrix_world = Matrix.Identity(4)
        o.matrix_parent_inverse = (rig.matrix_world @ Matrix.Translation(rig.data.bones[bone].tail_local)).inverted()
        bpy.context.view_layer.update()
        o.matrix_world = Matrix.Identity(4)
    else:
        o.parent = rig
    return o


def add_box(bm, center, size, mi=0, bevel=0.0):
    g = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector(size), verts=g['verts'])
    bmesh.ops.translate(bm, vec=Vector(center), verts=g['verts'])
    for f in {f for v in g['verts'] for f in v.link_faces}:
        f.material_index = mi
    if bevel:
        bmesh.ops.bevel(bm, geom=list({e for v in g['verts'] for e in v.link_edges}), offset=bevel, segments=2, affect='EDGES')


def add_tube(bm, pts, r, mi=0, seg=8):
    for a, b in zip(pts, pts[1:]):
        a, b = Vector(a), Vector(b)
        d = b - a
        g = bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=r, depth=d.length)
        q = Vector((0, 0, 1)).rotation_difference(d.normalized())
        bmesh.ops.rotate(bm, verts=g['verts'], cent=Vector(), matrix=q.to_matrix())
        bmesh.ops.translate(bm, vec=(a + b) / 2, verts=g['verts'])
        for f in {f for v in g['verts'] for f in v.link_faces}:
            f.material_index = mi


def add_ring(bm, center, radius, r, axis='Y', mi=0, seg=16):
    pts = []
    for i in range(seg + 1):
        t = i * math.tau / seg
        off = Vector((math.cos(t) * radius, 0, math.sin(t) * radius)) if axis == 'Y' else Vector((0, math.cos(t) * radius, math.sin(t) * radius))
        pts.append(Vector(center) + off)
    add_tube(bm, pts, r, mi, 6)


# Medidas tiradas das próprias malhas (rosto voltado para -Y no Blender).
def bounds(names):
    pts = [o.matrix_world @ Vector(c) for o in bpy.data.objects if o.name in names for c in o.bound_box]
    return Vector([min(p[i] for p in pts) for i in range(3)]), Vector([max(p[i] for p in pts) for i in range(3)])


def cone_between(bm, base, tip, r0, r1, mi=0, seg=8):
    a, b = Vector(base), Vector(tip)
    d = b - a
    if d.length < 1e-6:
        return
    g = bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r0, radius2=r1, depth=d.length)
    q = Vector((0, 0, 1)).rotation_difference(d.normalized())
    bmesh.ops.rotate(bm, verts=g['verts'], cent=Vector(), matrix=q.to_matrix())
    bmesh.ops.translate(bm, vec=(a + b) / 2, verts=g['verts'])
    for f in {f for v in g['verts'] for f in v.link_faces}:
        f.material_index = mi


def ring_around(bm, center, normal, radius, r, mi=0, seg=14):
    normal = Vector(normal).normalized()
    ref = Vector((0, 0, 1)) if abs(normal.z) < 0.9 else Vector((1, 0, 0))
    t1 = normal.cross(ref).normalized(); t2 = normal.cross(t1).normalized()
    pts = [Vector(center) + (t1 * math.cos(i * math.tau / seg) + t2 * math.sin(i * math.tau / seg)) * radius for i in range(seg + 1)]
    for a, b in zip(pts, pts[1:]):
        cone_between(bm, a, b, r, r, mi, 6)


def is_hair_face(f, uv):
    u = sum(l[uv].uv.x for l in f.loops) / len(f.loops)
    v = sum(l[uv].uv.y for l in f.loops) / len(f.loops)
    return int(u * 8) == 1 and int((1 - v) * 4) == 0


# Dois penteados novos, para dar mais variedade além dos 4 neutros existentes — um estilo
# tradicionalmente mais associado ao feminino (maria-chiquinha) e um ao masculino (moicano). Continuam
# sendo só mais duas opções no mesmo guarda-roupa: qualquer aluno escolhe qualquer uma. Partem do
# cabelo curto já pronto (head_castanho) e o editam, em vez de raspar e reconstruir do zero — a cabeça
# nunca teve malha de couro cabeludo embaixo do cabelo, só o cabelo cobria aquela área.
UV_HAIR = (0.19, 0.9)  # centro do bloco (coluna 1, linha 0) do atlas: categoria "cabelo"
head_bone_index = bpy.data.objects['head_castanho'].vertex_groups['head'].index


def hairstyle_mesh(name):
    src = bpy.data.objects['head_castanho']
    o = src.copy(); o.data = src.data.copy(); o.name = o.data.name = name
    scene.collection.objects.link(o)
    for m in o.modifiers:
        if m.type == 'ARMATURE':
            m.object = rig
    bm = bmesh.new(); bm.from_mesh(o.data)
    return o, bm


def mark_new_hair(bm, start_f, start_v, uv_layer):
    dl = bm.verts.layers.deform.active or bm.verts.layers.deform.verify()
    for f in bm.faces[start_f:]:
        for l in f.loops:
            l[uv_layer].uv = UV_HAIR
    for v in bm.verts[start_v:]:
        v[dl][head_bone_index] = 1.0


def finish_hairstyle(o, bm):
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(o.data); bm.free(); o.data.update()
    bpy.context.view_layer.objects.active = o
    o.select_set(True)
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(42))
    o.select_set(False)


# Moicano: achata o cabelo curto nas laterais (acima da sobrancelha, para não distorcer o rosto) e
# acrescenta uma crista de picos no centro, apoiada nos próprios vértices do cabelo — visual arrojado.
o_moicano, bm_moicano = hairstyle_mesh('head_moicano')
uv_m = bm_moicano.loops.layers.uv.active
hair_m = {v for f in bm_moicano.faces if is_hair_face(f, uv_m) for v in f.verts}
eyebrow = {v for f in bm_moicano.faces for v in f.verts if sum(vt.co.z for vt in f.verts) / len(f.verts) < 1.56}
for v in hair_m:
    if abs(v.co.x) > 0.1 and v not in eyebrow:
        v.co.x *= 0.22
        v.co.z -= 0.04
start_f, start_v = len(bm_moicano.faces), len(bm_moicano.verts)
ridge = sorted(({v for v in hair_m if abs(v.co.x) < 0.09}), key=lambda v: v.co.y)
y_lo, y_hi = ridge[0].co.y, ridge[-1].co.y
for i, hh in enumerate([0.03, 0.1, 0.16, 0.17, 0.12, 0.04]):
    y = y_lo + (y_hi - y_lo) * (i + 0.5) / 6
    top = max(sorted(ridge, key=lambda v: abs(v.co.y - y))[:6], key=lambda v: v.co.z)
    base = top.co.copy() - Vector((0, 0, 0.01))
    cone_between(bm_moicano, base, base + Vector((0, 0, hh)), 0.07, 0.01, 0, 6)
mark_new_hair(bm_moicano, start_f, start_v, uv_m)
finish_hairstyle(o_moicano, bm_moicano)

# Maria-chiquinha: parte do cabelo curto e acrescenta dois rabos de cavalo curtos presos atrás das
# orelhas, estilo chibi (saem para o lado) — os pontos de encaixe vêm dos vértices do próprio cabelo.
o_marias, bm_marias = hairstyle_mesh('head_marias')
uv_mm = bm_marias.loops.layers.uv.active
hair_mm = {v for f in bm_marias.faces if is_hair_face(f, uv_mm) for v in f.verts}
start_f, start_v = len(bm_marias.faces), len(bm_marias.verts)
for side in (-1, 1):
    cands = [v for v in hair_mm if v.co.x * side > 0.02]
    pt = max(cands, key=lambda v: v.co.x * side).co.copy()
    normal = Vector((side, 0.15, 0.25)).normalized()
    base = pt + normal * 0.015
    p1 = base + Vector((side * 0.09, 0.02, 0.03))
    p2 = p1 + Vector((side * 0.07, -0.01, -0.03))
    p3 = p2 + Vector((side * 0.05, -0.02, -0.07))
    p4 = p3 + Vector((side * 0.04, -0.015, -0.05))
    ring_around(bm_marias, base, normal, 0.07, 0.032, 0, 12)
    cone_between(bm_marias, base, p1, 0.095, 0.085, 0, 8)
    cone_between(bm_marias, p1, p2, 0.085, 0.065, 0, 8)
    cone_between(bm_marias, p2, p3, 0.065, 0.04, 0, 8)
    cone_between(bm_marias, p3, p4, 0.04, 0.006, 0, 8)
mark_new_hair(bm_marias, start_f, start_v, uv_mm)
finish_hairstyle(o_marias, bm_marias)


body_lo, body_hi = bounds(['body_camiseta'])
head_lo, head_hi = bounds(['head_cabelo_preto'])
print('BODY', tuple(round(c, 2) for c in body_lo), tuple(round(c, 2) for c in body_hi), 'HEAD', tuple(round(c, 2) for c in head_lo), tuple(round(c, 2) for c in head_hi))

bag = material('acc_backpack', (0.44, 0.25, 0.61)); dark = material('acc_backpack_detail', (0.16, 0.17, 0.22))
bm = bmesh.new()
back = 0.36
add_box(bm, (0, back + 0.12, 0.95), (0.62, 0.26, 0.6), 0, 0.06)        # corpo da mochila
add_box(bm, (0, back + 0.27, 0.85), (0.44, 0.08, 0.3), 0, 0.03)        # bolso
add_box(bm, (0, back + 0.315, 0.86), (0.4, 0.01, 0.03), 1)             # zíper
for x in (-0.2, 0.2):
    add_tube(bm, [(x, back, 1.18), (x, -0.05, 1.3), (x, -0.33, 1.2), (x * 1.1, -0.36, 0.85)], 0.035, 1)
obj_from('acc_backpack', bm, [bag, dark], 'chest')

frame = material('acc_glasses', (0.12, 0.13, 0.16), 0.4)
for name, color in (('acc_glasses', None), ('acc_sunglasses', (0.08, 0.09, 0.12))):
    bm = bmesh.new()
    y = head_lo.y - 0.005
    for x in (-0.17, 0.17):
        add_ring(bm, (x, y, 1.6), 0.11, 0.018, 'Y', 0)
    add_tube(bm, [(-0.06, y, 1.62), (0.06, y, 1.62)], 0.015, 0)
    for x in (-0.28, 0.28):
        add_tube(bm, [(x, y, 1.62), (x * 1.55, y + 0.4, 1.66)], 0.015, 0)
    mats = [frame]
    if color:
        lens = material('acc_lens', color, 0.2)
        for x in (-0.17, 0.17):
            g = bmesh.ops.create_cone(bm, cap_ends=True, segments=16, radius1=0.1, radius2=0.1, depth=0.01)
            bmesh.ops.rotate(bm, verts=g['verts'], cent=Vector(), matrix=Matrix.Rotation(math.pi / 2, 3, 'X'))
            bmesh.ops.translate(bm, vec=Vector((x, y + 0.005, 1.6)), verts=g['verts'])
            for f in {f for v in g['verts'] for f in v.link_faces}:
                f.material_index = 1
        mats.append(lens)
    obj_from(name, bm, mats, 'head')

bm = bmesh.new()
add_box(bm, (head_hi.x - 0.02, -0.02, 1.55), (0.06, 0.12, 0.16), 0, 0.02)
add_tube(bm, [(head_hi.x - 0.02, -0.06, 1.63), (head_hi.x - 0.04, -0.12, 1.7)], 0.015, 0)
obj_from('acc_hearing', bm, [material('acc_hearing', (0.85, 0.72, 0.6))], 'head')

cord = material('acc_whistle_cord', (0.83, 0.2, 0.25)); metal = material('acc_whistle_metal', (0.82, 0.84, 0.88), 0.3, 0.6)
bm = bmesh.new()
add_tube(bm, [(-0.16, 0.05, 1.32), (-0.12, -0.3, 1.22), (0, -0.36, 1.02), (0.12, -0.3, 1.22), (0.16, 0.05, 1.32)], 0.018, 0)
add_box(bm, (0, -0.39, 0.98), (0.1, 0.07, 0.07), 1, 0.02)
obj_from('acc_whistle', bm, [cord, metal], 'chest')

# Cadeira de rodas: assento logo abaixo do quadril da pose sentada.
seat = hips.z - 0.12
print('SEAT', round(seat, 3))
wheel = material('acc_wheel', (0.14, 0.15, 0.18), 0.6); chair = material('acc_chair', (0.24, 0.47, 0.82), 0.5, 0.2); cushion = material('acc_chair_seat', (0.18, 0.2, 0.26))
bm = bmesh.new()
hy = hips.y
add_box(bm, (0, hy + 0.02, seat), (0.62, 0.6, 0.08), 2, 0.02)                    # assento
add_box(bm, (0, hy + 0.34, seat + 0.38), (0.62, 0.07, 0.62), 2, 0.02)            # encosto
for x in (-0.36, 0.36):
    add_ring(bm, (x, hy + 0.05, 0.42), 0.42, 0.04, 'X', 0, 24)                  # rodas grandes
    add_ring(bm, (x, hy + 0.05, 0.42), 0.36, 0.015, 'X', 1, 24)                 # aro de empurrar
    add_tube(bm, [(x, hy + 0.3, seat), (x, hy + 0.3, seat + 0.7), (x, hy + 0.48, seat + 0.78)], 0.025, 1)
    add_tube(bm, [(x * 0.85, hy - 0.28, seat), (x * 0.85, hy - 0.42, 0.12)], 0.025, 1)
    add_ring(bm, (x * 0.8, hy - 0.45, 0.08), 0.08, 0.025, 'X', 0, 12)          # rodinhas da frente
add_box(bm, (0, hy - 0.5, 0.18), (0.42, 0.18, 0.04), 1)                          # apoio dos pés
obj_from('acc_wheelchair', bm, [wheel, chair, cushion])

# Pontos das mãos para segurar a bola.
for side in ('l', 'r'):
    e = bpy.data.objects.new('hand_' + {'l': 'left', 'r': 'right'}[side], None)
    scene.collection.objects.link(e)
    e.parent = rig; e.parent_type = 'BONE'; e.parent_bone = 'handslot.' + side
    e.matrix_parent_inverse = Matrix.Identity(4)
    e.location = (0, -rig.data.bones['handslot.' + side].length, 0)

# 4. Exportação.
for o in bpy.data.objects:
    if o.type == 'MESH':
        o.select_set(False)
os.makedirs(os.path.dirname(OUT_GLB), exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=OUT_BLEND)
bpy.ops.export_scene.gltf(filepath=OUT_GLB, export_format='GLB', export_yup=True, export_apply=False,
                          export_animations=False, export_skins=True,
                          export_morph=False, export_def_bones=False, export_image_format='AUTO')
deps = bpy.context.evaluated_depsgraph_get()
tris = {}
for o in bpy.data.objects:
    if o.type == 'MESH':
        me = o.evaluated_get(deps).to_mesh(); me.calc_loop_triangles(); tris[o.name] = len(me.loop_triangles); o.evaluated_get(deps).to_mesh_clear()
print('EXPORTED', os.path.getsize(OUT_GLB), tris)
