"""Adds the skirt/expression pieces to the existing, already-good wardrobe-collection.blend —
deliberately NOT by re-running build_wardrobe_collection.py's full pipeline (that re-generates
every head/outfit from the raw KayKit source and, for reasons not fully understood, has produced
visibly different geometry for existing pieces like head_castanho on a re-run — a real regression
caught by screenshot, not a style choice). This script only touches what it adds.

Build: blender -b --factory-startup --python tools/build_wardrobe_additions.py
Saídas: public/models/students/wardrobe-collection.glb e art-source/wardrobe-collection.blend (sobrescritos)
"""
import bpy, bmesh, math, json
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOT = Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(ROOT / 'art-source/wardrobe-collection.blend'))
scene = bpy.context.scene
rig = next(o for o in scene.objects if o.type == 'ARMATURE')


def material(name, color, rough=.8, metal=0):
    existing = bpy.data.materials.get(name)
    if existing:
        return existing
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    shader = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    linear = [x / 12.92 if x <= .04045 else ((x + .055) / 1.055) ** 2.4 for x in color]
    shader.inputs['Base Color'].default_value = (*linear, 1)
    shader.inputs['Roughness'].default_value = rough
    shader.inputs['Metallic'].default_value = metal
    return mat


accent = material('Wear_accent', (.94, .73, .24))
dark = material('Wear_detail', (.10, .12, .17), .7)
smile = material('Wear_expr_smile', (.95, .42, .46))


def mesh(name, bm, mats, bone='head'):
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    data = bpy.data.meshes.new(name)
    bm.to_mesh(data)
    bm.free()
    for mat in mats:
        data.materials.append(mat)
    ob = bpy.data.objects.new(name, data)
    scene.collection.objects.link(ob)
    ob.parent = rig
    group = ob.vertex_groups.new(name=bone)
    group.add(list(range(len(data.vertices))), 1, 'REPLACE')
    modifier = ob.modifiers.new('Shared student skeleton', 'ARMATURE')
    modifier.object = rig
    return ob


def duplicate(name, src):
    ob = bpy.data.objects[src].copy()
    ob.data = ob.data.copy()
    scene.collection.objects.link(ob)
    ob.name = ob.data.name = name
    return ob


def join(ob, details):
    bpy.ops.object.select_all(action='DESELECT')
    for o in [ob, *details]:
        o.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.join()


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


def cone_between(bm, base, tip, r0, r1, mi=0, seg=8):
    a, b = Vector(base), Vector(tip)
    d = b - a
    g = bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r0, radius2=r1, depth=d.length)
    q = Vector((0, 0, 1)).rotation_difference(d.normalized())
    bmesh.ops.rotate(bm, verts=g['verts'], cent=Vector(), matrix=q.to_matrix())
    bmesh.ops.translate(bm, vec=(a + b) / 2, verts=g['verts'])
    for f in {f for v in g['verts'] for f in v.link_faces}:
        f.material_index = mi


# Saia esportiva (skort), por cima do calção já existente — presa ao quadril como peça rígida, já
# que uma saia de verdade também não acompanha cada perna, só o quadril por baixo dela. Construída
# direto em cima de cada proporção (masc/fem) já existente, em vez de passar pelo script genérico de
# variantes de novo — evitar aplicar o ajuste de largura duas vezes.
for suffix in ('masc', 'fem'):
    name = 'body_saia_' + suffix
    if name in bpy.data.objects:
        continue
    ob = duplicate(name, 'body_camiseta_' + suffix)
    bm = bmesh.new()
    WAIST_Z, HEM_Z, R0, R1 = .58, .30, .32, .54
    cone_between(bm, (0, -.02, WAIST_Z), (0, 0, HEM_Z), R0, R1, 0, 24)
    for i in range(8):
        a = i * math.tau / 8
        add_tube(bm, [(R0 * math.cos(a), -.02 + R0 * math.sin(a), WAIST_Z), (R1 * math.cos(a), R1 * math.sin(a), HEM_Z)], .008, 1, 6)
    detail = mesh(name + '_skirt', bm, [accent, dark], 'hips')
    join(ob, [detail])

# Expressões faciais: uma peça pequena presa à cabeça, por cima do rosto original — do mesmo jeito que
# óculos/aparelho auditivo já são peças extras soltas, não uma cabeça nova.
for name, style in [('expr_sorriso', 'smile'), ('expr_firme', 'determined')]:
    if name in bpy.data.objects:
        continue
    bm = bmesh.new()
    if style == 'smile':
        pts = [(-.095, -.515, 1.45), (-.05, -.525, 1.435), (0, -.528, 1.43), (.05, -.525, 1.435), (.095, -.515, 1.45)]
        add_tube(bm, pts, .017, 0, 8)
    else:
        for side in (-1, 1):
            add_tube(bm, [(side * .06, -.52, 1.715), (side * .21, -.50, 1.695)], .015, 0, 6)
    mesh(name, bm, [smile if style == 'smile' else dark])

bpy.context.preferences.filepaths.save_version = 0
bpy.ops.file.pack_all()
blend = ROOT / 'art-source/wardrobe-collection.blend'
bpy.ops.wm.save_as_mainfile(filepath=str(blend))
out = ROOT / 'public/models/students/wardrobe-collection.glb'
bpy.ops.export_scene.gltf(filepath=str(out), export_format='GLB', export_yup=True,
    export_animations=False, export_skins=True, export_morph=False, export_def_bones=False)
manifest = {o.name: len(o.data.polygons) for o in scene.objects if o.type == 'MESH'}
(ROOT / 'art-source/wardrobe-collection.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
print('WARDROBE_ADDITIONS_EXPORTED', out.stat().st_size, json.dumps(manifest))
