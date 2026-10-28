"""Protótipo dos dois penteados novos (maria-chiquinha, moicano). Em vez de raspar a cabeça e
reconstruir do zero (deixava buraco/vão — a cabeça nunca teve malha de couro cabeludo, só o cabelo
cobria aquela área), este script edita o cabelo CURTO já existente (head_castanho): o moicano apara
as laterais do próprio cabelo; a maria-chiquinha acrescenta os rabos presos na parte de trás dele."""
import bpy, bmesh, math, os
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'cidade', 'public', 'models', 'students', 'kaykit-alunos.glb')
PNG = os.path.join(ROOT, 'cidade', 'art-source', 'proto-hair.png')

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
bpy.ops.import_scene.gltf(filepath=SRC)
rig = next(o for o in bpy.data.objects if o.type == 'ARMATURE')


def add_cone_at(bm, base, tip, r0, r1, mi=0, seg=8):
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


def add_ring(bm, center, normal, radius, r, mi=0, seg=14):
    normal = Vector(normal).normalized()
    ref = Vector((0, 0, 1)) if abs(normal.z) < 0.9 else Vector((1, 0, 0))
    t1 = normal.cross(ref).normalized(); t2 = normal.cross(t1).normalized()
    pts = [Vector(center) + (t1 * math.cos(i * math.tau / seg) + t2 * math.sin(i * math.tau / seg)) * radius for i in range(seg + 1)]
    for a, b in zip(pts, pts[1:]):
        add_cone_at(bm, a, b, r, r, mi, 6)


UV_HAIR = (0.19, 0.9)  # centro do bloco (coluna 1, linha 0) do atlas: categoria "cabelo"
head_group_index = bpy.data.objects['head_castanho'].vertex_groups['head'].index


def is_hair_face(f, uv):
    u = sum(l[uv].uv.x for l in f.loops) / len(f.loops)
    v = sum(l[uv].uv.y for l in f.loops) / len(f.loops)
    return int(u * 8) == 1 and int((1 - v) * 4) == 0


def start_mesh(name):
    src = bpy.data.objects['head_castanho']
    o = src.copy(); o.data = src.data.copy(); o.name = o.data.name = name
    scene.collection.objects.link(o)
    for m in o.modifiers:
        if m.type == 'ARMATURE':
            m.object = rig
    bm = bmesh.new(); bm.from_mesh(o.data)
    return o, bm


def mark_new(bm, start_f, start_v, uv_layer, dl):
    for f in bm.faces[start_f:]:
        for l in f.loops:
            l[uv_layer].uv = UV_HAIR
    for v in bm.verts[start_v:]:
        v[dl][head_group_index] = 1.0


def finish(o, bm):
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(o.data); bm.free(); o.data.update()
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(42))


# Moicano: achata o cabelo curto nas laterais (em vez de recortar, o que deixava buraco) e acrescenta
# uma crista de picos no centro, apoiada nos próprios vértices do cabelo — visual arrojado.
o2, bm2 = start_mesh('head_moicano')
uv2 = bm2.loops.layers.uv.active
dl2 = bm2.verts.layers.deform.active or bm2.verts.layers.deform.verify()
hair2 = {v for f in bm2.faces if is_hair_face(f, uv2) for v in f.verts}
center2 = sum((v.co for v in hair2), Vector()) / len(hair2)
# A sobrancelha usa o mesmo bloco de cor do cabelo e não pode ser achatada (senão distorce o rosto).
eyebrow = {v for f in bm2.faces for v in f.verts if sum(vt.co.z for vt in f.verts) / len(f.verts) < 1.56}
for v in hair2:
    if abs(v.co.x) > 0.1 and v not in eyebrow:  # achata o cabelo das laterais contra o crânio (lateral raspada)
        v.co.x *= 0.22
        v.co.z -= 0.04
start_f2, start_v2 = len(bm2.faces), len(bm2.verts)
ridge = sorted(({v for v in hair2 if abs(v.co.x) < 0.09}), key=lambda v: v.co.y)
buckets = 6
y_lo, y_hi = ridge[0].co.y, ridge[-1].co.y
heights = [0.03, 0.1, 0.16, 0.17, 0.12, 0.04]
for i in range(buckets):
    y = y_lo + (y_hi - y_lo) * (i + 0.5) / buckets
    top = max(sorted(ridge, key=lambda v: abs(v.co.y - y))[:6], key=lambda v: v.co.z)
    base = top.co.copy() - Vector((0, 0, 0.01))
    add_cone_at(bm2, base, base + Vector((0, 0, heights[i])), 0.07, 0.01, 0, 6)
mark_new(bm2, start_f2, start_v2, uv2, dl2)
finish(o2, bm2)

# Maria-chiquinha: parte do cabelo curto e acrescenta dois rabos de cavalo presos atrás, caindo até os
# ombros — os pontos de encaixe vêm dos próprios vértices do cabelo (sem buraco, sem vão).
o, bm = start_mesh('head_marias')
uv = bm.loops.layers.uv.active
dl = bm.verts.layers.deform.active or bm.verts.layers.deform.verify()
hair_verts = {v for f in bm.faces if is_hair_face(f, uv) for v in f.verts}
start_f, start_v = len(bm.faces), len(bm.verts)
for side in (-1, 1):
    cands = [v for v in hair_verts if v.co.x * side > 0.02]
    pt = max(cands, key=lambda v: v.co.x * side).co.copy()  # ponto mais para o lado do cabelo
    normal = Vector((side, 0.15, 0.25)).normalized()
    base = pt + normal * 0.015
    # Para o estilo chibi clássico, os rabos saem para o lado (não caem retos), como duas "orelhas" de cabelo.
    p1 = base + Vector((side * 0.09, 0.02, 0.03))
    p2 = p1 + Vector((side * 0.07, -0.01, -0.03))
    p3 = p2 + Vector((side * 0.05, -0.02, -0.07))
    p4 = p3 + Vector((side * 0.04, -0.015, -0.05))
    add_ring(bm, base, normal, 0.07, 0.032, 0, 12)
    add_cone_at(bm, base, p1, 0.095, 0.085, 0, 8)
    add_cone_at(bm, p1, p2, 0.085, 0.065, 0, 8)
    add_cone_at(bm, p2, p3, 0.065, 0.04, 0, 8)
    add_cone_at(bm, p3, p4, 0.04, 0.006, 0, 8)
mark_new(bm, start_f, start_v, uv, dl)
finish(o, bm)

keep = {'head_moicano'}
for o3 in list(bpy.data.objects):
    if o3.type == 'MESH' and o3.name not in keep:
        bpy.data.objects.remove(o3, do_unlink=True)


world = bpy.data.worlds.new('W'); scene.world = world; world.use_nodes = True
bg = world.node_tree.nodes['Background']; bg.inputs[0].default_value = (0.86, 0.82, 0.95, 1); bg.inputs[1].default_value = 1.1
light = bpy.data.objects.new('L', bpy.data.lights.new('L', 'SUN')); light.data.energy = 3.2
light.rotation_euler = (math.radians(55), 0, math.radians(35)); scene.collection.objects.link(light)
fill = bpy.data.objects.new('F', bpy.data.lights.new('F', 'SUN')); fill.data.energy = 1.1
fill.rotation_euler = (math.radians(70), 0, math.radians(-150)); scene.collection.objects.link(fill)
target = bpy.data.objects.new('T', None); target.location = (0.8, 0.1, 1.75); scene.collection.objects.link(target)
cam_data = bpy.data.cameras.new('C'); cam = bpy.data.objects.new('C', cam_data); scene.collection.objects.link(cam)
cam.location = (0.8, -3.1, 2.35); cam_data.lens = 32
tc = cam.constraints.new('TRACK_TO'); tc.target = target; tc.track_axis = 'TRACK_NEGATIVE_Z'; tc.up_axis = 'UP_Y'
scene.camera = cam
for m in bpy.data.materials:
    m.use_backface_culling = False
scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = 1200; scene.render.resolution_y = 900
scene.render.filepath = PNG
scene.render.image_settings.file_format = 'PNG'
bpy.ops.render.render(write_still=True)
print('RENDERED', PNG)
