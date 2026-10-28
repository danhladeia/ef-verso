"""Renderiza as roupas dos alunos (kaykit-alunos.glb) lado a lado, para conferir a malha.
Uso: blender -b --factory-startup --python cidade/tools/render_outfits.py -- <saida.png>
"""
import bpy, sys, math, os

GLB = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'public', 'models', 'students', 'kaykit-alunos.glb'))
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, sys.argv[sys.argv.index('--') + 1]) if '--' in sys.argv else os.path.join(ROOT, 'outfits.png')
OUTFITS = ['body_camiseta', 'body_camisa_bandana', 'body_casaco', 'head_castanho']

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
bpy.ops.import_scene.gltf(filepath=GLB)
for o in list(bpy.data.objects):
    if o.type == 'MESH' and o.name not in OUTFITS:
        bpy.data.objects.remove(o, do_unlink=True)
    elif o.type not in ('MESH',):
        pass

cols = len(OUTFITS)
for i, name in enumerate(OUTFITS):
    o = bpy.data.objects.get(name)
    if not o:
        continue
    o.location.x += i * 1.6

world = bpy.data.worlds.new('W'); scene.world = world; world.use_nodes = True
bg = world.node_tree.nodes['Background']; bg.inputs[0].default_value = (0.86, 0.82, 0.95, 1); bg.inputs[1].default_value = 1.1
light = bpy.data.objects.new('L', bpy.data.lights.new('L', 'SUN')); light.data.energy = 3.2
light.rotation_euler = (math.radians(55), 0, math.radians(35)); scene.collection.objects.link(light)
fill = bpy.data.objects.new('F', bpy.data.lights.new('F', 'SUN')); fill.data.energy = 1.1
fill.rotation_euler = (math.radians(70), 0, math.radians(-120)); scene.collection.objects.link(fill)

cam_data = bpy.data.cameras.new('C'); cam = bpy.data.objects.new('C', cam_data); scene.collection.objects.link(cam)
cam.location = (cols * 0.8, -4.2, 1.1); cam.rotation_euler = (math.radians(92), 0, 0)
cam_data.lens = 38
scene.camera = cam

scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = 1400; scene.render.resolution_y = 700
scene.render.filepath = OUT
scene.render.image_settings.file_format = 'PNG'
bpy.ops.render.render(write_still=True)
print('RENDERED', OUT)
