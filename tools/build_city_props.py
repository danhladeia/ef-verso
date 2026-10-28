"""Mobiliário e equipamentos das praças do EF Verso, modelados no Blender.

Executar da raiz do projeto:
  blender -b --factory-startup --python cidade/tools/build_city_props.py

Gera em cidade/public/models/props/ (e a fonte em cidade/art-source/props.blend):
  praca-central.glb     piso de calçada portuguesa em ondas, chafariz, canteiros com bancos
  academia.glb          academia ao ar livre (aparelhos típicos das praças brasileiras)
  coreto.glb            coreto octogonal para a Praça das Danças
  ponto-onibus.glb      abrigo de ônibus com banco e cartaz
  banca.glb             banca de revistas
  sorvete.glb           carrinho de sorvete
  coleta.glb            lixeiras de coleta seletiva (4 cores)
  bicicleta.glb         bicicleta estacionada
  bicicletario.glb      suporte para bicicletas
  pombo.glb             pombo (animado no jogo)
  bebedouro.glb         bebedouro
Unidades em metros; o jogo usa x para leste e z para o sul (no Blender, y = -z).
"""
import bpy, bmesh, math, os
from mathutils import Vector, Matrix

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
OUT = os.path.join(ROOT, 'public', 'models', 'props')
os.makedirs(OUT, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
MATS = {}


def mat(name, hexcolor, rough=0.85, metal=0.0, alpha=1.0, emit=0.0):
    key = name
    if key in MATS:
        return MATS[key]
    c = [int(hexcolor[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    lin = [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*lin, 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if alpha < 1:
        b.inputs['Alpha'].default_value = alpha
        m.blend_method = 'BLEND' if hasattr(m, 'blend_method') else None
        m.surface_render_method = 'BLENDED' if hasattr(m, 'surface_render_method') else None
    if emit:
        b.inputs['Emission Color'].default_value = (*lin, 1)
        b.inputs['Emission Strength'].default_value = emit
    MATS[key] = m
    return m


P = {
    'pedra': mat('pr_pedra', '#e9e1cf'), 'pedra_escura': mat('pr_pedra_escura', '#b9ad95'),
    'concreto': mat('pr_concreto', '#cfd2cc'), 'agua': mat('pr_agua', '#6fc4d6', 0.15, 0, 0.88, 0.15),
    'agua_clara': mat('pr_agua_clara', '#bfe8f0', 0.1, 0, 0.7, 0.3), 'azulejo': mat('pr_azulejo', '#2f7fa8', 0.4),
    'madeira': mat('pr_madeira', '#a8754a'), 'madeira_escura': mat('pr_madeira_escura', '#6e4a30'),
    'metal': mat('pr_metal', '#3a4651', 0.45, 0.5), 'branco': mat('pr_branco', '#f6f1e7'),
    'terra': mat('pr_terra', '#7a5a3c', 1.0), 'grama': mat('pr_grama', '#6fa65a', 1.0),
    'amarelo': mat('pr_amarelo', '#f2c14e', 0.6), 'azul': mat('pr_azul', '#3c7fd6', 0.6),
    'verde': mat('pr_verde', '#2fa36b', 0.6), 'vermelho': mat('pr_vermelho', '#d94b45', 0.6),
    'roxo': mat('pr_roxo', '#7b45c2', 0.6), 'laranja': mat('pr_laranja', '#ff9a3d', 0.6),
    'borracha': mat('pr_piso_borracha', '#3f8f7f', 1.0), 'vidro': mat('pr_vidro', '#cfe8f2', 0.1, 0, 0.45),
    'cinza': mat('pr_cinza', '#8e969b'), 'rosa': mat('pr_rosa', '#f07fb6', 0.6), 'creme': mat('pr_creme', '#fff1d6'),
    'telhado': mat('pr_telhado', '#c4643e'), 'preto': mat('pr_preto', '#2b2f3a', 0.7),
}
current = []


def B(gx, gz, h):
    return Vector((gx, -gz, h))


def finish(name, bm, materials):
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for m in materials:
        me.materials.append(m)
    o = bpy.data.objects.new(name, me)
    scene.collection.objects.link(o)
    current.append(o)
    return o


def box(gx, gz, y0, sx, sz, h, m, rot=0.0, bevel=0.015, name='caixa'):
    bm = bmesh.new()
    g = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector((sx, sz, h)), verts=g['verts'])
    bmesh.ops.rotate(bm, verts=g['verts'], cent=Vector(), matrix=Matrix.Rotation(-rot, 3, 'Z'))
    bmesh.ops.translate(bm, vec=B(gx, gz, y0 + h / 2), verts=g['verts'])
    if bevel:
        bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bevel, segments=1, affect='EDGES')
    return finish(name, bm, [m])


def cyl(gx, gz, y0, r, h, m, verts=12, r2=None, name='cilindro', rot=None):
    """Cilindro (ou cone) com base em y0; rot gira a peça no próprio centro antes de posicionar."""
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=verts, radius1=r, radius2=r if r2 is None else r2, depth=h)
    if rot:
        bmesh.ops.rotate(bm, verts=bm.verts, cent=Vector(), matrix=Matrix.Rotation(rot[1], 3, rot[0]))
    bmesh.ops.translate(bm, vec=B(gx, gz, y0 + h / 2), verts=bm.verts)
    return finish(name, bm, [m])


def sphere(gx, gz, y, r, m, seg=10, scale=(1, 1, 1), name='esfera'):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=max(4, seg // 2), radius=r)
    bmesh.ops.scale(bm, vec=Vector(scale), verts=bm.verts)
    bmesh.ops.translate(bm, vec=B(gx, gz, y), verts=bm.verts)
    return finish(name, bm, [m])


def tube(pts, radius, m, name='tubo', closed=False):
    cu = bpy.data.curves.new(name, 'CURVE')
    cu.dimensions = '3D'
    cu.bevel_depth = radius
    cu.bevel_resolution = 1
    sp = cu.splines.new('POLY')
    sp.points.add(len(pts) - 1)
    for p, (gx, gz, h) in zip(sp.points, pts):
        p.co = (*B(gx, gz, h), 1)
    sp.use_cyclic_u = closed
    o = bpy.data.objects.new(name, cu)
    scene.collection.objects.link(o)
    o.data.materials.append(m)
    bpy.context.view_layer.objects.active = o
    o.select_set(True)
    bpy.ops.object.convert(target='MESH')
    o.select_set(False)
    current.append(o)
    return o


def ring(gx, gz, y0, r_in, r_out, h, m, seg=32, a0=0.0, a1=math.tau, name='anel'):
    """Anel (ou setor de anel) sólido."""
    bm = bmesh.new()
    full = abs(a1 - a0 - math.tau) < 1e-6
    n = seg if full else seg + 1
    layers = []
    for y in (y0, y0 + h):
        layers.append([[bm.verts.new(B(gx + r * math.cos(a0 + (a1 - a0) * i / seg), gz + r * math.sin(a0 + (a1 - a0) * i / seg), y)) for i in range(n)] for r in (r_in, r_out)])
    (bi, bo), (ti, to) = layers
    m_ = n if full else n - 1
    for i in range(m_):
        j = (i + 1) % n
        bm.faces.new((ti[i], ti[j], to[j], to[i]))
        bm.faces.new((bi[i], bo[i], bo[j], bi[j]))
        bm.faces.new((to[i], to[j], bo[j], bo[i]))
        bm.faces.new((ti[i], bi[i], bi[j], ti[j]))
    if not full:
        for k in (0, n - 1):
            bm.faces.new((ti[k], to[k], bo[k], bi[k]))
    return finish(name, bm, [m])


def text(body, gx, gz, h, size, m, rot=(math.pi / 2, 0, 0), depth=0.01):
    cu = bpy.data.curves.new('txt', 'FONT')
    cu.body = body; cu.size = size; cu.extrude = depth; cu.align_x = 'CENTER'; cu.resolution_u = 2
    o = bpy.data.objects.new('texto', cu)
    scene.collection.objects.link(o)
    o.location = B(gx, gz, h)
    o.rotation_euler = rot
    o.data.materials.append(m)
    bpy.context.view_layer.objects.active = o
    o.select_set(True)
    bpy.ops.object.convert(target='MESH')
    o.select_set(False)
    current.append(o)
    return o


def export(name):
    """Junta as peças do modelo atual, exporta e esconde para o próximo."""
    global current
    bpy.ops.object.select_all(action='DESELECT')
    for o in current:
        o.select_set(True)
    bpy.context.view_layer.objects.active = current[0]
    bpy.ops.object.join()
    obj = bpy.context.object
    obj.name = name
    bpy.ops.object.shade_flat()
    path = os.path.join(OUT, name + '.glb')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_yup=True, export_apply=True)
    deps = bpy.context.evaluated_depsgraph_get()
    me = obj.evaluated_get(deps).to_mesh(); me.calc_loop_triangles()
    print('PROP', name, os.path.getsize(path), 'tris', len(me.loop_triangles))
    obj.hide_set(True); obj.hide_render = True
    obj.location.x += 1000  # fica guardado no .blend, longe dos próximos
    current = []


# ============================================================ praça central
def wave_texture(size=1024, extent=27.0):
    """Calçada portuguesa em ondas (preto e branco), cobrindo extent × extent metros."""
    import numpy as np
    img = bpy.data.images.new('calcada_ondas', size, size, alpha=False)
    ys, xs = np.mgrid[0:size, 0:size]
    x = (xs / size - 0.5) * extent
    z = (ys / size - 0.5) * extent
    f = z + 0.75 * np.sin(x * 2 * math.pi / 5.5)
    dark = (np.floor(f / 0.85) % 2) == 0
    light = np.array([0.93, 0.90, 0.83]); darkc = np.array([0.16, 0.16, 0.18])
    rgb = np.where(dark[..., None], darkc, light)
    rgba = np.concatenate([rgb, np.ones((size, size, 1))], axis=2)
    img.pixels = rgba.astype(np.float32).ravel()
    img.pack()
    m = bpy.data.materials.new('pr_calcada_ondas')
    m.use_nodes = True
    nt = m.node_tree
    tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = img; tex.interpolation = 'Linear'
    nt.links.new(tex.outputs['Color'], nt.nodes['Principled BSDF'].inputs['Base Color'])
    nt.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.9
    return m, extent


calcada, EXT = wave_texture()
R_PLAZA, H_FLOOR = 12.5, 0.14
# piso: disco com UV planar sobre a textura de ondas
bm = bmesh.new()
bmesh.ops.create_circle(bm, cap_ends=True, segments=64, radius=R_PLAZA)
bmesh.ops.translate(bm, vec=Vector((0, 0, H_FLOOR)), verts=bm.verts)
uv = bm.loops.layers.uv.new()
for f in bm.faces:
    for l in f.loops:
        l[uv].uv = (l.vert.co.x / EXT + 0.5, l.vert.co.y / EXT + 0.5)
piso = finish('piso_praca', bm, [calcada])
ring(0, 0, 0, R_PLAZA, R_PLAZA + 0.35, H_FLOOR + 0.04, P['pedra_escura'], seg=64, name='meio_fio_praca')
# chafariz octogonal em dois níveis
ring(0, 0, H_FLOOR, 3.9, 4.6, 0.55, P['pedra'], seg=8, name='borda_chafariz')
ring(0, 0, H_FLOOR + 0.55, 3.85, 4.65, 0.08, P['pedra_escura'], seg=8, name='assento_chafariz')
ring(0, 0, H_FLOOR, 3.75, 3.92, 0.5, P['azulejo'], seg=8, name='azulejo_chafariz')
cyl(0, 0, H_FLOOR, 3.9, 0.42, P['agua'], verts=8, name='agua_chafariz')
cyl(0, 0, H_FLOOR, 0.75, 1.0, P['pedra'], verts=8, name='pedestal')
cyl(0, 0, H_FLOOR + 1.0, 0.45, 0.12, P['pedra'], verts=16, r2=1.8, name='bacia_1')
cyl(0, 0, H_FLOOR + 1.1, 1.72, 0.06, P['agua'], verts=16, name='agua_bacia_1')
cyl(0, 0, H_FLOOR + 1.12, 0.3, 0.9, P['pedra'], verts=8, name='coluna')
cyl(0, 0, H_FLOOR + 2.0, 0.25, 0.1, P['pedra'], verts=16, r2=0.95, name='bacia_2')
cyl(0, 0, H_FLOOR + 2.08, 0.9, 0.05, P['agua'], verts=16, name='agua_bacia_2')
sphere(0, 0, H_FLOOR + 2.5, 0.32, P['amarelo'], seg=12, name='globo')
ring(0, 0, H_FLOOR + 0.43, 1.65, 1.8, 0.67, P['agua_clara'], seg=16, name='cortina_1')     # água caindo da bacia 1
ring(0, 0, H_FLOOR + 1.12, 0.85, 0.92, 0.9, P['agua_clara'], seg=16, name='cortina_2')    # água caindo da bacia 2
for i in range(8):
    a = i * math.tau / 8 + math.pi / 8
    cyl(3.2 * math.cos(a), 3.2 * math.sin(a), H_FLOOR + 0.42, 0.05, 0.55, P['agua_clara'], verts=6, r2=0.02, name='jato')
# canteiros em setor nas diagonais, com bancos de madeira na face interna
for k in range(4):
    a = math.pi / 4 + k * math.pi / 2
    a0, a1 = a - 0.3, a + 0.3
    ring(0, 0, H_FLOOR, 8.8, 11.6, 0.5, P['pedra_escura'], seg=10, a0=a0, a1=a1, name='canteiro')
    ring(0, 0, H_FLOOR + 0.5, 9.0, 11.4, 0.05, P['terra'], seg=10, a0=a0 + 0.02, a1=a1 - 0.02, name='terra')
    ring(0, 0, H_FLOOR + 0.5, 8.55, 8.95, 0.08, P['madeira'], seg=10, a0=a0, a1=a1, name='banco_canteiro')
    for j in range(5):
        b = a0 + 0.08 + j * (a1 - a0 - 0.16) / 4
        sphere(10.3 * math.cos(b) + 0.4 * math.sin(j), 10.3 * math.sin(b), H_FLOOR + 0.75, 0.38, [P['grama'], P['verde']][j % 2], seg=8, scale=(1, 1, 0.7), name='arbusto')
        for f in range(3):
            c = b + (f - 1) * 0.05
            sphere(9.35 * math.cos(c), 9.35 * math.sin(c), H_FLOOR + 0.62, 0.09, [P['rosa'], P['amarelo'], P['vermelho'], P['roxo']][(j + f + k) % 4], seg=6, name='flor')
export('praca-central')

# ============================================================ academia ao ar livre
box(0, 0, 0, 11.5, 8.5, 0.08, P['borracha'], bevel=0.02, name='piso_academia')
COLORS = [P['amarelo'], P['azul'], P['verde'], P['vermelho'], P['laranja'], P['roxo']]


def post(x, z, h, m, r=0.06):
    cyl(x, z, 0.08, r, h, m, verts=8)


# 1. Simulador de caminhada (dois pêndulos)
x, z = -4.2, -2.6
post(x, z - 0.4, 1.7, P['amarelo']); post(x, z + 0.4, 1.7, P['amarelo'])
tube([(x, z - 0.4, 1.78), (x, z + 0.4, 1.78)], 0.06, P['amarelo'])
for s in (-0.18, 0.18):
    tube([(x + 0.1, z + s, 1.7), (x + 0.45, z + s, 0.3)], 0.035, P['azul'])
    box(x + 0.5, z + s, 0.25, 0.4, 0.16, 0.05, P['preto'])
tube([(x - 0.15, z - 0.35, 1.25), (x - 0.15, z + 0.35, 1.25)], 0.03, P['azul'])
# 2. Rotação diagonal (volante duplo)
x, z = -1.4, -2.6
post(x, z, 1.6, P['azul'], 0.08)
for s in (-1, 1):
    tube([(x + 0.25 * s, z, 1.3 + 0.35 * math.sin(t * math.tau / 12)) if False else (x + 0.12 * s, z + 0.32 * math.cos(t * math.tau / 12), 1.35 + 0.32 * math.sin(t * math.tau / 12)) for t in range(13)], 0.03, P['amarelo'])
# 3. Leg press (assento e apoio dos pés)
x, z = 1.6, -2.6
box(x, z, 0.08, 1.4, 0.6, 0.12, P['verde'])
box(x - 0.3, z, 0.2, 0.55, 0.5, 0.35, P['verde'])
box(x - 0.55, z, 0.55, 0.12, 0.5, 0.65, P['verde'])
box(x + 0.55, z, 0.2, 0.1, 0.5, 0.5, P['amarelo'])
# 4. Barras paralelas
x, z = 4.4, -2.4
for s in (-0.3, 0.3):
    post(x - 0.9, z + s, 1.0, P['vermelho']); post(x + 0.9, z + s, 1.0, P['vermelho'])
    tube([(x - 1.0, z + s, 1.08), (x + 1.0, z + s, 1.08)], 0.04, P['vermelho'])
# 5. Barra fixa (três alturas)
x, z = -4.0, 2.4
for i, h in enumerate((1.6, 2.0, 2.3)):
    post(x - 0.7 + i * 0.7, z, h, P['laranja'])
for i in range(2):
    tube([(x - 0.7 + i * 0.7, z, (1.6, 2.0, 2.3)[i] - 0.05), (x + i * 0.7, z, (1.6, 2.0, 2.3)[i + 1] - 0.05)], 0.035, P['metal'])
# 6. Prancha abdominal inclinada
x, z = -1.0, 2.6
box(x, z, 0.35, 1.7, 0.55, 0.08, P['roxo'], rot=0.0)
for s in (-0.7, 0.7):
    post(x + s, z, 0.32 + (0.25 if s < 0 else 0), P['roxo'], 0.05)
tube([(x - 0.85, z - 0.25, 0.75), (x - 0.85, z + 0.25, 0.75)], 0.03, P['amarelo'])
# 7. Giro de cintura (disco giratório)
x, z = 1.8, 2.5
cyl(x, z, 0.08, 0.38, 0.12, P['azul'], verts=16)
post(x, z - 0.6, 1.2, P['azul'])
tube([(x - 0.35, z - 0.6, 1.25), (x + 0.35, z - 0.6, 1.25)], 0.035, P['amarelo'])
# 8. Alongador (barras escalonadas)
x, z = 4.4, 2.6
post(x - 0.6, z, 1.5, P['verde']); post(x + 0.6, z, 1.5, P['verde'])
for h in (0.6, 0.95, 1.3):
    tube([(x - 0.6, z, h), (x + 0.6, z, h)], 0.03, P['amarelo'])
# placa da academia
box(-5.3, 0, 0.08, 0.08, 0.08, 1.4, P['metal'], bevel=0)
box(-5.3, 0, 1.25, 0.06, 1.3, 0.6, P['verde'], bevel=0.01)
text('ACADEMIA', -5.25, 0, 1.58, 0.18, P['branco'], rot=(math.pi / 2, 0, -math.pi / 2))
text('AO AR LIVRE', -5.25, 0, 1.36, 0.14, P['branco'], rot=(math.pi / 2, 0, -math.pi / 2))
export('academia')

# ============================================================ coreto octogonal
R_C = 4.2
cyl(0, 0, 0, R_C + 0.3, 0.75, P['pedra'], verts=8, name='base')
cyl(0, 0, 0.75, R_C + 0.35, 0.08, P['pedra_escura'], verts=8, name='piso_coreto')
for s in range(3):
    box(0, R_C + 0.55 + s * 0.3, 0, 2.2, 0.3, 0.75 - s * 0.25, P['pedra_escura'], name='degrau')
for i in range(8):
    a = i * math.tau / 8
    x, z = R_C * math.cos(a), R_C * math.sin(a)
    cyl(x, z, 0.83, 0.12, 2.9, P['branco'], verts=8, name='coluna')
    b = (i + 1) * math.tau / 8
    x2, z2 = R_C * math.cos(b), R_C * math.sin(b)
    if i != 1:  # abertura voltada para a escada (sul)
        tube([(x, z, 1.75), (x2, z2, 1.75)], 0.045, P['branco'])
        tube([(x, z, 1.25), (x2, z2, 1.25)], 0.03, P['branco'])
        for t in range(1, 6):
            px, pz = x + (x2 - x) * t / 6, z + (z2 - z) * t / 6
            tube([(px, pz, 0.83), (px, pz, 1.75)], 0.022, P['branco'])
cyl(0, 0, 3.73, R_C + 0.55, 0.22, P['branco'], verts=8, name='beiral')
cyl(0, 0, 3.95, R_C + 0.7, 1.9, P['telhado'], verts=8, r2=0.25, name='telhado')
cyl(0, 0, 5.85, 0.22, 0.5, P['branco'], verts=8, name='lanternim')
sphere(0, 0, 6.5, 0.2, P['amarelo'], seg=10, name='pinaculo')
for i in range(8):
    a = i * math.tau / 8 + math.pi / 8
    sphere(R_C * 0.85 * math.cos(a), R_C * 0.85 * math.sin(a), 3.6, 0.12, P['amarelo'], seg=8, name='lampada')
export('coreto')

# ============================================================ ponto de ônibus
box(0, 0, 0, 4.2, 1.8, 0.1, P['concreto'], name='piso')
for x in (-1.9, 1.9):
    box(x, 0.65, 0.1, 0.1, 0.1, 2.5, P['metal'], bevel=0)
box(0, 0.75, 0.1, 4.0, 0.06, 2.3, P['vidro'], bevel=0, name='vidro')
box(0, 0.1, 2.6, 4.4, 1.9, 0.12, P['roxo'], bevel=0.02, name='cobertura')
box(0, 0.4, 0.45, 3.0, 0.45, 0.08, P['madeira'], name='banco')
for x in (-1.2, 1.2):
    box(x, 0.4, 0.1, 0.08, 0.3, 0.35, P['metal'], bevel=0)
box(2.25, 0.2, 0.1, 0.12, 1.2, 2.2, P['metal'], bevel=0, name='painel')
box(2.18, 0.2, 0.5, 0.02, 1.05, 1.6, P['amarelo'], bevel=0, name='cartaz')
text('EF VERSO', 2.165, 0.2, 1.6, 0.2, P['roxo'], rot=(math.pi / 2, 0, math.pi / 2))
text('mexa-se!', 2.165, 0.2, 1.25, 0.17, P['preto'], rot=(math.pi / 2, 0, math.pi / 2))
box(-2.6, 0.2, 0.1, 0.08, 0.08, 2.6, P['metal'], bevel=0)
box(-2.6, 0.2, 2.45, 0.05, 0.6, 0.4, P['azul'], bevel=0)
text('ÔNIBUS', -2.57, 0.2, 2.6, 0.12, P['branco'], rot=(math.pi / 2, 0, math.pi / 2))
export('ponto-onibus')

# ============================================================ ônibus (veículo do trânsito)
# Comprimento no eixo z do jogo (o mesmo "para a frente" dos carros do vila-pack), largura em x.
ONIBUS_AMARELO = mat('pr_onibus_amarelo', '#eac84e', 0.55)
ONIBUS_VIDRO = mat('pr_onibus_vidro', '#263b53', 0.35, 0.1)
ONIBUS_BORRACHA = mat('pr_onibus_borracha', '#20232a', 0.9)
box(0, 0, 0.47, 2.1, 6.4, 2.15, ONIBUS_AMARELO, bevel=0.06, name='corpo')
box(0, 0, 2.43, 1.75, 6.0, 0.14, ONIBUS_VIDRO, bevel=0.01, name='faixa')
box(0, -3.1, 1.85, 1.75, 0.06, 0.9, ONIBUS_VIDRO, bevel=0.01, name='parabrisa')
box(0, 3.1, 1.8, 1.75, 0.06, 0.78, ONIBUS_VIDRO, bevel=0.01, name='vidro_traseiro')
for side in (-1, 1):
    for i in range(5):
        box(side * 1.06, -2.15 + i * 1.08, 1.95, 0.02, 0.84, 0.76, ONIBUS_VIDRO, bevel=0, name=f'janela_{side}_{i}')
for x, z in ((-1.04, -2.9), (1.04, -2.9), (-1.04, 2.9), (1.04, 2.9)):
    cyl(x, z, 0.47, 0.44, 0.22, ONIBUS_BORRACHA, verts=16, name='roda', rot=('Y', math.pi / 2))
    cyl(x, z, 0.5, 0.26, 0.26, P['metal'], verts=10, name='calota', rot=('Y', math.pi / 2))
for side in (-1, 1):
    box(side * 1.12, -3.35, 1.55, 0.08, 0.35, 0.35, P['metal'], bevel=0.01, name='retrovisor_braco')
    box(side * 1.2, -3.4, 1.6, 0.05, 0.3, 0.22, ONIBUS_VIDRO, bevel=0.01, name='retrovisor')
box(0, -3.22, 2.55, 1.6, 0.05, 0.26, P['amarelo'], bevel=0, name='letreiro')
text('EF VERSO', 0, -3.2, 2.58, 0.17, P['roxo'], rot=(math.pi / 2, 0, math.pi))
for z in (-3.22, 3.22):
    box(0, z, 0.22, 2.0, 0.1, 0.3, P['preto'], bevel=0.02, name='parachoque')
box(0, -1.1, 0.02, 1.9, 1.0, 0.1, P['preto'], bevel=0, name='porta')
export('onibus')

# ============================================================ banca de revistas
box(0, 0, 0, 2.6, 2.0, 2.3, P['verde'], name='corpo')
box(0, 0, 2.3, 3.0, 2.4, 0.15, P['branco'], name='teto')
box(0, -1.25, 1.95, 2.9, 0.6, 0.06, P['amarelo'], rot=0, name='toldo')
box(0, -1.02, 0.6, 2.2, 0.1, 1.1, P['creme'], name='balcao')
for i in range(5):
    for j in range(2):
        box(-0.9 + i * 0.45, -1.06, 0.75 + j * 0.42, 0.34, 0.03, 0.36, [P['vermelho'], P['azul'], P['amarelo'], P['roxo'], P['laranja']][(i + j) % 5], bevel=0)
text('BANCA', 0, -1.03, 2.38, 0.28, P['verde'], rot=(math.pi / 2, 0, 0))
export('banca')

# ============================================================ carrinho de sorvete
box(0, 0, 0.35, 1.3, 0.8, 0.75, P['branco'], name='bau')
box(0, 0, 1.1, 1.35, 0.85, 0.06, P['azul'])
for x in (-0.45, 0.45):
    cyl(x, 0.45, 0.16, 0.2, 0.08, P['preto'], verts=12, rot=('X', math.pi / 2))
tube([(-0.65, 0, 0.9), (-1.05, 0, 1.0)], 0.025, P['metal'])
cyl(0, 0, 1.16, 0.03, 1.1, P['metal'], verts=6)
cyl(0, 0, 2.2, 0.95, 0.25, P['rosa'], verts=10, r2=0.05, name='guarda_sol')
for i, c in enumerate(['rosa', 'amarelo', 'verde']):
    sphere(-0.3 + i * 0.3, -0.42, 0.75, 0.11, P[c], seg=8)
text('SORVETE', 0, -0.41, 0.55, 0.13, P['azul'], rot=(math.pi / 2, 0, 0))
export('sorvete')

# ============================================================ coleta seletiva (papel, plástico, metal, vidro)
for i, (c, label) in enumerate([('azul', 'PAPEL'), ('vermelho', 'PLÁSTICO'), ('amarelo', 'METAL'), ('verde', 'VIDRO')]):
    x = -1.05 + i * 0.7
    box(x, 0, 0.0, 0.6, 0.6, 0.9, P[c], bevel=0.03, name='lixeira')
    box(x, 0, 0.9, 0.64, 0.64, 0.06, P['cinza'], bevel=0.01)
    box(x, -0.31, 0.62, 0.36, 0.02, 0.1, P['preto'], bevel=0)
    text(label, x, -0.315, 0.35, 0.075, P['branco'], rot=(math.pi / 2, 0, 0))
box(0, 0.36, 0, 2.9, 0.08, 1.4, P['metal'], bevel=0, name='painel')
text('COLETA SELETIVA', 0, 0.31, 1.15, 0.13, P['branco'], rot=(math.pi / 2, 0, 0))
export('coleta')

# ============================================================ bicicleta
for x in (-0.55, 0.55):
    tube([(x + 0.35 * math.cos(t * math.tau / 16), 0, 0.37 + 0.35 * math.sin(t * math.tau / 16)) for t in range(17)], 0.025, P['preto'], name='roda')
    tube([(x, 0, 0.37), (x, 0, 0.37)], 0.04, P['metal'])
tube([(-0.55, 0, 0.37), (-0.05, 0, 0.37), (0.35, 0, 0.85), (-0.15, 0, 0.85), (-0.05, 0, 0.37)], 0.03, P['vermelho'], name='quadro')
tube([(0.35, 0, 0.85), (0.55, 0, 0.37)], 0.03, P['vermelho'])
tube([(-0.15, 0, 0.85), (-0.55, 0, 0.37)], 0.03, P['vermelho'])
tube([(-0.2, 0, 0.85), (-0.25, 0, 0.98)], 0.025, P['metal'])
box(-0.27, 0, 0.98, 0.26, 0.1, 0.05, P['preto'], bevel=0)
tube([(0.35, 0, 0.85), (0.4, 0, 1.02)], 0.025, P['metal'])
tube([(0.4, -0.25, 1.02), (0.4, 0.25, 1.02)], 0.022, P['metal'])
export('bicicleta')

# ============================================================ bicicletário
for i in range(4):
    x = -1.5 + i
    tube([(x, -0.35, 0.0), (x, -0.35, 0.65), (x, 0.35, 0.65), (x, 0.35, 0.0)], 0.035, P['metal'], name='arco')
box(0, 0, 0, 4.0, 1.0, 0.04, P['concreto'], bevel=0, name='base')
export('bicicletario')

# ============================================================ pombo
sphere(0, 0, 0.12, 0.09, P['cinza'], seg=10, scale=(1.5, 1, 1), name='corpo')
sphere(0.12, 0, 0.2, 0.05, P['cinza'], seg=8, name='cabeca')
cyl(0.18, 0, 0.18, 0.014, 0.04, P['laranja'], verts=4, name='bico', rot=('Y', math.pi / 2))
sphere(-0.02, 0, 0.14, 0.07, P['metal'], seg=8, scale=(1.3, 1.15, 0.6), name='asa')
box(-0.16, 0, 0.11, 0.08, 0.08, 0.02, P['metal'], bevel=0, name='cauda')
for s in (-0.03, 0.03):
    cyl(0.0, s, 0.0, 0.008, 0.06, P['laranja'], verts=4, name='pata')
export('pombo')

# ============================================================ bebedouro
cyl(0, 0, 0, 0.22, 0.9, P['metal'], verts=10, name='coluna')
cyl(0, 0, 0.9, 0.32, 0.12, P['concreto'], verts=12, name='cuba')
cyl(0.12, 0, 1.02, 0.025, 0.08, P['cinza'], verts=6)
box(0, -0.23, 0.45, 0.18, 0.02, 0.18, P['azul'], bevel=0)
export('bebedouro')

# ============================================================ mesa de piquenique
box(0, 0, 0.72, 1.9, 0.8, 0.07, P['madeira'], name='tampo')
for s in (-0.62, 0.62):
    box(0, s, 0.42, 1.9, 0.3, 0.06, P['madeira'], name='assento')
for x in (-0.75, 0.75):
    for s in (-1, 1):
        tube([(x, 0.0, 0.72), (x, s * 0.7, 0.0)], 0.035, P['madeira_escura'], name='pe')
    box(x, 0, 0.36, 0.06, 1.45, 0.05, P['madeira_escura'], bevel=0)
export('mesa-piquenique')

# ============================================================ pódio com troféu (Museu do Esporte)
for x, h, n in ((-1.3, 0.7, '2'), (0, 1.1, '1'), (1.3, 0.45, '3')):
    box(x, 0, 0, 1.25, 1.1, h, P['branco'] if n != '1' else P['creme'], bevel=0.03, name='degrau_podio')
    text(n, x, -0.56, h * 0.35, 0.36, [P['azul'], P['amarelo'], P['laranja']][int(n) - 1 if n != '1' else 1], rot=(math.pi / 2, 0, 0), depth=0.02)
cyl(0, 0, 1.1, 0.18, 0.2, P['amarelo'], verts=10, name='base_trofeu')
cyl(0, 0, 1.3, 0.06, 0.35, P['amarelo'], verts=8)
cyl(0, 0, 1.62, 0.12, 0.42, P['amarelo'], verts=12, r2=0.32, name='taca')
for s in (-1, 1):
    tube([(s * 0.25, 0, 1.95), (s * 0.42, 0, 1.85), (s * 0.3, 0, 1.7)], 0.025, P['amarelo'])
export('podio')

# ============================================================ relógio de sol (Centro de Ciência do Corpo)
cyl(0, 0, 0, 1.6, 0.25, P['pedra_escura'], verts=24, name='base_relogio')
cyl(0, 0, 0.25, 1.45, 0.06, P['pedra'], verts=24, name='mostrador')
for i in range(12):
    a = i * math.tau / 12
    box(1.2 * math.cos(a), 1.2 * math.sin(a), 0.31, 0.22, 0.06, 0.02, P['preto'], rot=-a, bevel=0)
bm = bmesh.new()
vs = [bm.verts.new(B(*p)) for p in ((0, 0.04, 0.31), (0, 0.04 + 1.1, 0.31), (0, 0.04, 1.25))]
bm.faces.new(vs)
bmesh.ops.solidify(bm, geom=list(bm.faces), thickness=0.05)
finish('gnomon', bm, [P['metal']])
export('relogio-sol')

bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, 'art-source', 'props.blend'))
print('PROPS_DONE')
