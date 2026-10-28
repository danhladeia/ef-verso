import bpy, math, os
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
GLB = os.path.join(ROOT, 'cidade', 'public', 'models', 'students', 'kaykit-alunos.glb')
OUT = os.path.join(ROOT, 'cidade', 'art-source', 'heads-compare.png')
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
bpy.ops.import_scene.gltf(filepath=GLB)
HEADS = ['head_ruiva', 'head_cabelo_preto', 'head_loiro', 'head_castanho']
for o in list(bpy.data.objects):
    if o.type == 'MESH' and o.name not in HEADS:
        bpy.data.objects.remove(o, do_unlink=True)
for i, name in enumerate(HEADS):
    o = bpy.data.objects.get(name)
    if o:
        o.location.x += i * 0.75
world = bpy.data.worlds.new('W'); scene.world = world; world.use_nodes = True
bg = world.node_tree.nodes['Background']; bg.inputs[0].default_value = (0.86, 0.82, 0.95, 1); bg.inputs[1].default_value = 1.1
light = bpy.data.objects.new('L', bpy.data.lights.new('L', 'SUN')); light.data.energy = 3.2
light.rotation_euler = (math.radians(55), 0, math.radians(35)); scene.collection.objects.link(light)
cam_data = bpy.data.cameras.new('C'); cam = bpy.data.objects.new('C', cam_data); scene.collection.objects.link(cam)
cam.location = (1.1, -2.6, 1.6); cam.rotation_euler = (math.radians(90), 0, 0); cam_data.lens = 45
scene.camera = cam
scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = 1400; scene.render.resolution_y = 500
scene.render.filepath = OUT
scene.render.image_settings.file_format = 'PNG'
bpy.ops.render.render(write_still=True)
print('RENDERED', OUT)
