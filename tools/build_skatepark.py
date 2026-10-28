"""Pista de skate completa da Praça de Aventura Urbana.

Executar da raiz do projeto:
  blender -b --factory-startup --python cidade/tools/build_skatepark.py

Saídas: cidade/public/models/skate/skatepark.glb e cidade/art-source/skatepark.blend.

Coordenadas: o desenho usa as coordenadas do jogo relativas ao centro da pista
(x para leste, z para o sul, altura em metros). No Blender, y = -z do jogo.
Elementos: bowl elevado com deck, rampa de acesso e escada; mini-rampa; dois quarter
pipes; área de rua com escadaria, corrimão, hubbas, funbox, manual pad, ledge,
flat bar e kicker; muro grafitado; arquibancada; posto de EPI.
"""
import bpy, bmesh, math, os
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
OUT_GLB = os.path.join(ROOT, 'public', 'models', 'skate', 'skatepark.glb')
OUT_BLEND = os.path.join(ROOT, 'art-source', 'skatepark.blend')
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
MATS = {}


def mat(name, hexcolor, rough=0.85, metal=0.0):
    if name in MATS:
        return MATS[name]
    c = [int(hexcolor[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    lin = [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*lin, 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    MATS[name] = m
    return m


CONCRETE = mat('sk_concreto', '#d3d5cf')
CONCRETE_MID = mat('sk_concreto_medio', '#b6bbb6')
CONCRETE_DARK = mat('sk_concreto_escuro', '#8d958f')
JOINT = mat('sk_junta', '#9aa19c')
COPING = mat('sk_coping', '#3a4651', 0.4, 0.6)
TILE = mat('sk_azulejo', '#2f8fa3', 0.5)
TILE_LIGHT = mat('sk_azulejo_claro', '#e7eef0', 0.5)
YELLOW = mat('sk_amarelo', '#f2c14e', 0.6)
BLUE = mat('sk_azul', '#3c7fd6', 0.6)
WOOD = mat('sk_madeira', '#a87a4f')
GRASS = mat('sk_grama', '#86b26a', 1.0)
MURAL = {k: mat('sk_mural_' + k, v, 0.9) for k, v in {
    'roxo': '#7b45c2', 'amarelo': '#ffc94a', 'verde': '#2fb5a3', 'coral': '#ef6b5b',
    'laranja': '#ff9a3d', 'azul': '#3b9bdc', 'branco': '#fff7ea', 'escuro': '#2b2f3a', 'rosa': '#f07fb6'}.items()}
objects = []


def B(gx, gz, h):
    """Ponto do jogo (x, z, altura) para o Blender."""
    return Vector((gx, -gz, h))


def new_object(name, bm, materials):
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for m in materials:
        me.materials.append(m)
    o = bpy.data.objects.new(name, me)
    scene.collection.objects.link(o)
    objects.append(o)
    return o


def box(name, gx, gz, y0, sx, sz, h, m, rot=0.0, bevel=0.02):
    """Caixa com base em y0, centrada em (gx, gz); sx no eixo x do jogo, sz no eixo z."""
    bm = bmesh.new()
    g = bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector((sx, sz, h)), verts=g['verts'])
    bmesh.ops.rotate(bm, verts=g['verts'], cent=Vector(), matrix=__import__('mathutils').Matrix.Rotation(-rot, 3, 'Z'))
    bmesh.ops.translate(bm, vec=B(gx, gz, y0 + h / 2), verts=g['verts'])
    if bevel:
        bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bevel, segments=1, affect='EDGES')
    return new_object(name, bm, [m])


def prism(name, profile, origin, direction, width, materials, top_mat=0, side_mat=None, offset_w=0.0):
    """Extruda um perfil (u, altura) ao longo da largura.

    origin: (gx, gz) do início do perfil; direction: vetor unitário (dx, dz) do eixo u;
    a largura fica centrada na linha do perfil (deslocável por offset_w).
    """
    dx, dz = direction
    px, pz = -dz, dx
    bm = bmesh.new()
    rows = []
    for w in (-width / 2 + offset_w, width / 2 + offset_w):
        rows.append([bm.verts.new(B(origin[0] + u * dx + w * px, origin[1] + u * dz + w * pz, h)) for u, h in profile])
    n = len(profile)
    for i in range(n):
        j = (i + 1) % n
        f = bm.faces.new((rows[0][i], rows[0][j], rows[1][j], rows[1][i]))
        f.material_index = top_mat
    for k, row in enumerate(rows):
        f = bm.faces.new(row if k else list(reversed(row)))
        f.material_index = side_mat if side_mat is not None else top_mat
    bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 4])
    return new_object(name, bm, materials)


def tube(name, pts, radius, m, segments=8):
    """Tubo ao longo de pontos do jogo (gx, gz, altura)."""
    cu = bpy.data.curves.new(name, 'CURVE')
    cu.dimensions = '3D'
    cu.bevel_depth = radius
    cu.bevel_resolution = max(1, segments // 4)
    sp = cu.splines.new('POLY')
    sp.points.add(len(pts) - 1)
    for p, (gx, gz, h) in zip(sp.points, pts):
        p.co = (*B(gx, gz, h), 1)
    o = bpy.data.objects.new(name, cu)
    scene.collection.objects.link(o)
    o.data.materials.append(m)
    bpy.context.view_layer.objects.active = o
    o.select_set(True)
    bpy.ops.object.convert(target='MESH')
    o.select_set(False)
    objects.append(o)
    return o


def arc(cu, cz, r, a0, a1, n):
    """Pontos (u, altura) de um arco de centro (cu, cz)."""
    return [(cu + r * math.cos(a0 + (a1 - a0) * i / n), cz + r * math.sin(a0 + (a1 - a0) * i / n)) for i in range(n + 1)]


def transition(r, h, n=8):
    """Curva de transição tangente ao chão (u crescente sobe até a altura h)."""
    w = math.sqrt(r * r - (r - h) ** 2)
    return w, [(w - r * math.sin(t), r - r * math.cos(t)) for t in [math.asin(w / r) * (1 - i / n) for i in range(n + 1)]][::-1]


# ---------------------------------------------------------------- base da pista
box('piso', 0, 0, 0.0, 50, 54, 0.12, CONCRETE, bevel=0.04)
for x in range(-24, 25, 6):
    box(f'junta_x{x}', x, 0, 0.12, 0.06, 54, 0.008, JOINT, bevel=0)
for z in range(-24, 25, 6):
    box(f'junta_z{z}', 0, z, 0.12, 50, 0.06, 0.008, JOINT, bevel=0)
TOP = 0.128  # superfície do piso

# ---------------------------------------------------------------- bowl afundado no chão (noroeste)
# Pista "fechada": em vez de uma plataforma elevada com rampa e escada, o bowl é um buraco cavado no
# chão, com o coping (a borda) no nível do piso — como uma piscina de skate de verdade. Dá para andar
# até a borda sem subir nada; entra-se "mergulhando" pela borda, como nos bowls reais.
BX, BZ, PIT = -11.0, -13.0, 1.7
A, Bh, R = 5.2, 3.0, 1.35   # meio-comprimento, meia-largura do fundo, raio da transição
FLOOR_H = TOP - PIT
SEG = 56


def superellipse(a, b, n=4.0):
    pts = []
    for i in range(SEG):
        t = i * math.tau / SEG
        c, s = math.cos(t), math.sin(t)
        pts.append((a * math.copysign(abs(c) ** (2 / n), c), b * math.copysign(abs(s) ** (2 / n), s)))
    return pts


profile = [(0.0, FLOOR_H)]
for i in range(1, 9):
    t = i / 8 * math.pi / 2
    profile.append((R * math.sin(t), FLOOR_H + R * (1 - math.cos(t))))
profile.append((R, TOP))
bm = bmesh.new()
rings = []
for off, h in profile:
    rings.append([bm.verts.new(B(BX + x, BZ + z, h)) for x, z in superellipse(A + off, Bh + off)])
floor = bm.faces.new(rings[0]); floor.material_index = 2
for j in range(len(rings) - 1):
    for i in range(SEG):
        k = (i + 1) % SEG
        f = bm.faces.new((rings[j][i], rings[j][k], rings[j + 1][k], rings[j + 1][i]))
        f.material_index = 1 if j == len(rings) - 2 else 0
bmesh.ops.triangulate(bm, faces=[floor])
new_object('bowl', bm, [CONCRETE, TILE, mat('sk_fundo_bowl', '#4ea6b5', 0.6)])
ring = superellipse(A + R + 0.04, Bh + R + 0.04)
tube('bowl_coping', [(BX + x, BZ + z, TOP + 0.04) for x, z in ring + ring[:1]], 0.06, COPING)
# grade de proteção na borda, no nível do chão (sem precisar de rampa nem escada para chegar)
outer = superellipse(A + R + 0.25, Bh + R + 0.25)
for gap_start in range(0, SEG, 14):
    segment = [p for i, p in enumerate(outer + outer[:1]) if gap_start <= i <= gap_start + 10]
    tube(f'bowl_grade_{gap_start}', [(BX + x, BZ + z, TOP + 0.95) for x, z in segment], 0.035, YELLOW)
    for x, z in segment[::3]:
        tube(f'bowl_poste_{gap_start}_{x:.1f}', [(BX + x, BZ + z, TOP), (BX + x, BZ + z, TOP + 0.95)], 0.03, YELLOW)

# ---------------------------------------------------------------- mini-rampa (nordeste)
H, RM, PLAT, FLAT = 1.5, 2.2, 1.8, 3.2
w, tr = transition(RM, H)
curve = [(PLAT + u, max(TOP, z)) for u, z in tr[::-1]]          # do lábio (PLAT, H) até o fundo
left = [(0, TOP), (0, H)] + curve
length = 2 * (PLAT + w) + FLAT
mini = left + [(length - u, z) for u, z in reversed(left)]
prism('mini_rampa', mini, (6.0, -18.0), (1, 0), 7.0, [CONCRETE, CONCRETE_DARK], side_mat=1)
for u in (PLAT, length - PLAT):
    tube(f'mini_coping_{u:.1f}', [(6.0 + u, -21.5, H + 0.03), (6.0 + u, -14.5, H + 0.03)], 0.06, COPING)
for u in (0.08, length - 0.08):
    tube(f'mini_grade_{u:.1f}', [(6.0 + u, -21.4, H + 0.95), (6.0 + u, -14.6, H + 0.95)], 0.035, YELLOW)
    for z in (-21.4, -18.0, -14.6):
        tube(f'mini_poste_{u:.1f}_{z}', [(6.0 + u, z, H), (6.0 + u, z, H + 0.95)], 0.03, YELLOW)
for s in range(4):
    box(f'mini_degrau_{s}', 6.0 + length + 0.35 + 0.35 * s, -18.0, TOP, 0.35, 1.6, H - TOP - s * 0.36, CONCRETE_MID, bevel=0.01)

# ---------------------------------------------------------------- quarter pipes (oeste, em frente ao muro)
for zc in (5.0, 12.0):
    w, tr = transition(1.6, 1.2)
    qp = [(0, TOP)] + [(w - u, z + TOP) for u, z in tr[::-1]][::-1][1:] + [(w + 0.9, 1.2 + TOP), (w + 0.9, TOP)]
    prism(f'quarter_{zc}', [(u, h) for u, h in qp], (-17.5, zc), (-1, 0), 4.0, [CONCRETE, CONCRETE_DARK], side_mat=1)
    tube(f'quarter_coping_{zc}', [(-17.5 - w, zc - 2, 1.2 + TOP + 0.03), (-17.5 - w, zc + 2, 1.2 + TOP + 0.03)], 0.06, COPING)

# ---------------------------------------------------------------- área de rua (centro e sul)
# plataforma com escadaria de 3 degraus, corrimão central e hubbas laterais
box('plataforma_rua', -4, 8.5, TOP, 9, 4, 0.9, CONCRETE_MID)
for s in range(3):
    box(f'degrau_rua_{s}', -4, 10.5 + 0.4 * s + 0.2, TOP, 6.6, 0.4, 0.9 - 0.3 * (s + 1), CONCRETE_MID, bevel=0.01)
tube('corrimao_rua', [(-4, 9.6, 0.9 + TOP + 0.75), (-4, 10.5, 0.9 + TOP + 0.75), (-4, 11.7, TOP + 0.75), (-4, 12.6, TOP + 0.75)], 0.04, YELLOW)
for z in (9.8, 12.4):
    tube(f'corrimao_poste_{z}', [(-4, z, TOP + (0.9 if z < 10 else 0)), (-4, z, TOP + (0.9 if z < 10 else 0) + 0.75)], 0.035, YELLOW)
for x in (-7.7, -0.3):
    prism(f'hubba_{x}', [(0, TOP), (0, 0.9 + TOP + 0.35), (0.6, 0.9 + TOP + 0.35), (1.8, TOP + 0.45), (1.8, TOP)], (x, 10.5), (0, 1), 0.6, [CONCRETE_DARK])
    tube(f'hubba_borda_{x}', [(x, 10.5, 0.9 + TOP + 0.37), (x, 11.1, 0.9 + TOP + 0.37), (x, 12.3, TOP + 0.47)], 0.03, COPING)
# funbox com rampas e rail no topo
box('funbox', 8, 4, TOP, 3.2, 2.6, 0.55, CONCRETE_MID)
for d in (-1, 1):
    prism(f'funbox_rampa_{d}', [(0, TOP), (2.0, TOP), (0, TOP + 0.55)], (8 + d * 1.6, 4), (d, 0), 2.6, [CONCRETE])
tube('funbox_rail', [(6.6, 4, TOP + 0.95), (9.4, 4, TOP + 0.95)], 0.04, BLUE)
for x in (6.9, 9.1):
    tube(f'funbox_rail_poste_{x}', [(x, 4, TOP + 0.55), (x, 4, TOP + 0.95)], 0.03, BLUE)
# manual pad, ledge com cantoneira, flat bar e kicker
box('manual_pad', 8, 13, TOP, 4.5, 2.0, 0.3, CONCRETE_DARK)
box('ledge', 16, 10, TOP, 0.7, 6.0, 0.45, CONCRETE_DARK)
tube('ledge_cantoneira', [(15.65, 7.0, TOP + 0.46), (15.65, 13.0, TOP + 0.46)], 0.03, COPING)
tube('flat_bar', [(-16.5, 0.0, TOP + 0.38), (-11.5, 0.0, TOP + 0.38)], 0.04, YELLOW)
for x in (-16.2, -14.0, -11.8):
    tube(f'flat_bar_poste_{x}', [(x, 0.0, TOP), (x, 0.0, TOP + 0.38)], 0.035, YELLOW)
prism('kicker', [(0, TOP), (1.7, TOP), (1.7, TOP + 0.5)], (19.5, -6.0), (-1, 0), 1.8, [CONCRETE])
# spine: duas transições costas-com-costas, para transferir de um lado a outro no ar
SPX, SPZ, SPR, SPH = 19.5, 16.5, 1.4, 1.0
_, sp_tr = transition(SPR, SPH)
for side in (-1, 1):
    prism(f'spine_{side}', [(0, TOP)] + [(side * u, TOP + h) for u, h in sp_tr], (SPX, SPZ), (0, 1), 3.4, [CONCRETE, CONCRETE_DARK], side_mat=1)
tube('spine_coping', [(SPX, SPZ - 1.7, TOP + SPH + 0.03), (SPX, SPZ + 1.7, TOP + SPH + 0.03)], 0.055, COPING)
# pirâmide de quatro faces com rail na diagonal
PX, PZ, PH = 9.0, -6.0, 0.6


def frustum(name, cx, cz, top, base, h, materials):
    """Tronco de pirâmide: topo quadrado plano (material 1) e faces inclinadas (material 0)."""
    bm = bmesh.new()
    lo = [bm.verts.new(B(cx + sx * base / 2, cz + sz * base / 2, TOP)) for sx, sz in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    hi = [bm.verts.new(B(cx + sx * top / 2, cz + sz * top / 2, TOP + h)) for sx, sz in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    bm.faces.new(hi).material_index = 1
    for i in range(4):
        j = (i + 1) % 4
        bm.faces.new((lo[i], lo[j], hi[j], hi[i]))
    return new_object(name, bm, materials)


frustum('piramide', PX, PZ, 2.2, 6.2, PH, [CONCRETE, CONCRETE_MID])
# banco inclinado com ledge no alto (centro) e rail curvo (leste)
prism('bank_ledge', [(0, TOP), (2.6, TOP + 0.7), (3.4, TOP + 0.7), (3.4, TOP)], (-1.5, -1.0), (1, 0), 3.0, [CONCRETE])
box('bank_ledge_topo', 2.3, -1.0, TOP + 0.7, 0.5, 3.0, 0.35, CONCRETE_DARK)
tube('bank_ledge_cantoneira', [(2.05, -2.5, TOP + 1.06), (2.05, 0.5, TOP + 1.06)], 0.03, COPING)
curve_pts = [(20.0 + 2.2 * math.cos(t), 1.0 + 3.0 * math.sin(t), TOP + 0.4) for t in [i * math.pi / 10 - math.pi / 2 for i in range(11)]]
tube('rail_curvo', curve_pts, 0.04, YELLOW)
for p in curve_pts[::5]:
    tube(f'rail_curvo_poste_{p[1]:.1f}', [(p[0], p[1], TOP), (p[0], p[1], TOP + 0.4)], 0.035, YELLOW)
# toldos tensionados sobre a área de descanso (sudoeste)
for i, (cx, cz, m) in enumerate([(-19.5, 18.5, MURAL['amarelo']), (-15.0, 21.5, MURAL['verde']), (-19.5, 23.5, MURAL['coral'])]):
    corners = [(cx - 2.6, cz - 2.0, 3.3), (cx + 2.6, cz - 1.2, 2.6), (cx - 0.4, cz + 2.4, 3.0)]
    for j, (x, z, h) in enumerate(corners):
        tube(f'toldo_mastro_{i}_{j}', [(x, z, TOP), (x, z, TOP + h + 0.15)], 0.05, COPING)
    bm = bmesh.new()
    vs = [bm.verts.new(B(x, z, TOP + h)) for x, z, h in corners]
    bm.faces.new(vs)
    bmesh.ops.solidify(bm, geom=list(bm.faces), thickness=0.03)
    new_object(f'toldo_{i}', bm, [m])
tube('piramide_rail', [(PX - 2.6, PZ + 2.6, TOP + 0.3), (PX - 1.1, PZ + 1.1, TOP + PH + 0.3), (PX + 1.1, PZ - 1.1, TOP + PH + 0.3), (PX + 2.6, PZ - 2.6, TOP + 0.3)], 0.04, BLUE)
# piso colorido na área de rua e no entorno do bowl
box('piso_rua', 4, 9, 0.121, 30, 15, 0.006, mat('sk_piso_terracota', '#d9b49b'), bevel=0)
box('piso_bowl', -11, -13, 0.121, 23, 18, 0.006, mat('sk_piso_cinza', '#c2c7c4'), bevel=0)
# área de iniciantes: chão plano demarcado, com duas rampinhas baixas (aprender primeiro no plano)
IX, IZ = -2.0, 21.0
box('iniciantes_piso', IX, IZ, 0.122, 13, 6.5, 0.006, mat('sk_piso_iniciantes', '#b9dcd2'), bevel=0)
for gx, gz, sx, sz in [(IX, IZ - 3.2, 13, 0.14), (IX, IZ + 3.2, 13, 0.14), (IX - 6.45, IZ, 0.14, 6.5), (IX + 6.45, IZ, 0.14, 6.5)]:
    box(f'iniciantes_faixa_{gx}_{gz}', gx, gz, 0.123, sx, sz, 0.008, YELLOW, bevel=0)
for gx in (IX - 3.5, IX + 3.5):
    prism(f'iniciantes_rampa_{gx}', [(0, TOP), (1.2, TOP), (1.2, TOP + 0.2)], (gx, IZ + 1.2), (0, -1), 1.4, [CONCRETE])
cu = bpy.data.curves.new('ini', 'FONT'); cu.body = 'INICIANTES'; cu.size = 0.9; cu.extrude = 0.004; cu.align_x = 'CENTER'; cu.resolution_u = 2
o = bpy.data.objects.new('texto_iniciantes', cu); scene.collection.objects.link(o)
o.location = B(IX, IZ - 1.6, 0.13); o.rotation_euler = (0, 0, 0); o.data.materials.append(YELLOW)
bpy.context.view_layer.objects.active = o; o.select_set(True); bpy.ops.object.convert(target='MESH'); o.select_set(False); objects.append(o)
# círculo de encontro pintado no chão, perto da entrada
bpy.ops.mesh.primitive_cylinder_add(vertices=40, radius=2.4, depth=0.01, location=B(16.0, 19.0, 0.125))
o = bpy.context.object; o.name = 'circulo_encontro'; o.data.materials.append(MURAL['roxo']); objects.append(o)
bpy.ops.mesh.primitive_cylinder_add(vertices=40, radius=2.0, depth=0.012, location=B(16.0, 19.0, 0.126))
o = bpy.context.object; o.name = 'circulo_encontro_miolo'; o.data.materials.append(CONCRETE); objects.append(o)

# ---------------------------------------------------------------- muro grafitado (oeste)
WX = -24.3
box('muro', WX, 8, TOP, 0.45, 20, 3.0, CONCRETE_MID)
box('muro_topo', WX, 8, TOP + 3.0, 0.6, 20.2, 0.12, CONCRETE_DARK, bevel=0.01)
face = WX + 0.24
# faixas e formas coloridas (cada uma alguns milímetros à frente da anterior para não piscar)
layers = [
    ('faixa_roxa', MURAL['roxo'], 0.6, 0.15, 5.0, 2.7),
    ('faixa_amarela', MURAL['amarelo'], 5.6, 0.15, 5.0, 1.7),
    ('faixa_verde', MURAL['verde'], 10.6, 0.8, 5.0, 2.05),
    ('faixa_coral', MURAL['coral'], 15.4, 0.15, 4.6, 2.7),
    ('faixa_azul', MURAL['azul'], 3.6, 2.1, 3.0, 0.75),
]
for i, (n, m, zc, y0, length_z, height) in enumerate(layers):
    box('mural_' + n, face + 0.005 * (i + 1), zc, TOP + y0, 0.02, length_z, height, m, bevel=0)
for i, (zc, y, r, m) in enumerate([(1.0, 1.6, 0.9, MURAL['laranja']), (7.5, 2.2, 0.6, MURAL['rosa']), (13.0, 1.0, 0.75, MURAL['azul'])]):
    bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=r, depth=0.02, location=B(face + 0.03 + 0.004 * i, zc, TOP + y), rotation=(0, math.pi / 2, 0))
    o = bpy.context.object; o.name = f'mural_circulo_{i}'; o.data.materials.append(m); objects.append(o)


def text(body, gx, gz, h, size, m, depth=0.03):
    cu = bpy.data.curves.new('txt', 'FONT')
    cu.body = body; cu.size = size; cu.extrude = depth; cu.align_x = 'CENTER'; cu.resolution_u = 2
    o = bpy.data.objects.new('texto_' + body, cu)
    scene.collection.objects.link(o)
    o.location = B(gx, gz, h)
    o.rotation_euler = (math.pi / 2, 0, math.pi / 2)
    o.data.materials.append(m)
    bpy.context.view_layer.objects.active = o
    o.select_set(True)
    bpy.ops.object.convert(target='MESH')
    o.select_set(False)
    objects.append(o)


text('EF VERSO', face + 0.06, 6.5, TOP + 1.05, 1.15, MURAL['escuro'])
text('EF VERSO', face + 0.09, 6.42, TOP + 1.11, 1.15, MURAL['branco'])
text('RESPEITE A VEZ', face + 0.06, 14.5, TOP + 2.25, 0.5, MURAL['branco'])
text('USE CAPACETE', face + 0.06, 0.5, TOP + 0.55, 0.42, MURAL['escuro'])

# ---------------------------------------------------------------- arquibancada (norte, voltada para o sul)
for t in range(3):
    box(f'arquibancada_{t}', 2, -24.0 - 0.9 * t, TOP, 12, 0.9, 0.45 * (t + 1), CONCRETE_MID, bevel=0.02)
    box(f'arquibancada_assento_{t}', 2, -23.85 - 0.9 * t, TOP + 0.45 * (t + 1), 11.6, 0.45, 0.06, WOOD, bevel=0.01)

# ---------------------------------------------------------------- posto de EPI junto ao portão
EX, EZ = 22.5, 11.0
box('epi_painel', EX, EZ, TOP, 2.2, 0.12, 1.9, BLUE)
box('epi_prateleira', EX, EZ + 0.25, TOP + 0.95, 2.0, 0.45, 0.06, WOOD, bevel=0.01)
box('epi_prateleira_baixa', EX, EZ + 0.25, TOP + 0.35, 2.0, 0.45, 0.06, WOOD, bevel=0.01)
for i, color in enumerate([MURAL['amarelo'], MURAL['coral'], MURAL['verde'], MURAL['roxo']]):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=6, radius=0.19, location=B(EX - 0.72 + i * 0.48, EZ + 0.25, TOP + 1.02))
    o = bpy.context.object; o.name = f'epi_capacete_{i}'; o.scale = (1, 1.15, 0.85); o.data.materials.append(color); objects.append(o)
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < -0.01], context='VERTS'); bm.to_mesh(o.data); bm.free()
    for k in (-1, 1):
        bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=0.09, depth=0.16, location=B(EX - 0.72 + i * 0.48 + k * 0.1, EZ + 0.25, TOP + 0.5))
        o = bpy.context.object; o.name = f'epi_joelheira_{i}_{k}'; o.data.materials.append(MURAL['escuro']); objects.append(o)
box('epi_titulo', EX, EZ + 0.065, TOP + 1.45, 1.9, 0.02, 0.36, MURAL['branco'], bevel=0)
cu = bpy.data.curves.new('epi', 'FONT'); cu.body = 'EPI'; cu.size = 0.3; cu.extrude = 0.01; cu.align_x = 'CENTER'; cu.resolution_u = 2
o = bpy.data.objects.new('texto_epi', cu); scene.collection.objects.link(o)
o.location = B(EX, EZ + 0.09, TOP + 1.53); o.rotation_euler = (math.pi / 2, 0, 0); o.data.materials.append(BLUE)
bpy.context.view_layer.objects.active = o; o.select_set(True); bpy.ops.object.convert(target='MESH'); o.select_set(False); objects.append(o)

# ---------------------------------------------------------------- canteiros nas bordas internas
for gx, gz, sx, sz in [(-24.0, -20.0, 1.6, 12.0), (24.0, -4.0, 1.6, 20.0), (-12.0, 25.6, 22.0, 1.2)]:
    box(f'canteiro_{gx}_{gz}', gx, gz, TOP, sx, sz, 0.35, CONCRETE_DARK, bevel=0.03)
    box(f'canteiro_terra_{gx}_{gz}', gx, gz, TOP + 0.35, sx - 0.2, sz - 0.2, 0.02, GRASS, bevel=0)

# ---------------------------------------------------------------- junta tudo e exporta
bpy.ops.object.select_all(action='DESELECT')
for o in objects:
    o.select_set(True)
bpy.context.view_layer.objects.active = objects[0]
bpy.ops.object.join()
park = bpy.context.object
park.name = 'skatepark'
bpy.ops.object.shade_flat()
os.makedirs(os.path.dirname(OUT_GLB), exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=OUT_BLEND)
bpy.ops.export_scene.gltf(filepath=OUT_GLB, export_format='GLB', export_yup=True, export_apply=True)
deps = bpy.context.evaluated_depsgraph_get()
me = park.evaluated_get(deps).to_mesh(); me.calc_loop_triangles()
print('SKATEPARK', os.path.getsize(OUT_GLB), 'triangles', len(me.loop_triangles), 'materials', len(park.data.materials))
