import bpy, math, sys
from pathlib import Path
root=Path(__file__).resolve().parents[1]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
sport='--sports' in sys.argv
names=['goal','basket-hoop','volley-net','bleachers','cone','soccer-ball','basketball','volleyball'] if sport else ['escola','ginasio','museu','cultural','ginastica','dojo','saude','visitantes']
for i,key in enumerate(names):
    bpy.ops.import_scene.gltf(filepath=str(root/'public/models'/('sports' if sport else 'landmarks')/f'{key}.glb'))
    for obj in bpy.context.selected_objects:
        if obj.parent is None:obj.location.x+=(i%4)*22-33;obj.location.y+=(i//4)*22-11
bpy.ops.object.camera_add(location=(55,-85,80));cam=bpy.context.object
from mathutils import Vector
cam.rotation_euler=(Vector((0,0,0))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=103
scene=bpy.context.scene;scene.camera=cam;scene.render.engine='BLENDER_WORKBENCH'
for m in bpy.data.materials:
    if m.use_nodes:
        shader=next((n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
        if shader:m.diffuse_color=shader.inputs['Base Color'].default_value
scene.display.shading.light='STUDIO';scene.display.shading.color_type='MATERIAL';scene.display.shading.show_shadows=True;scene.display.shading.show_cavity=True;scene.display.shading.background_type='WORLD';scene.world.color=(.72,.69,.8)
scene.render.resolution_x=1600;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
scene.render.filepath=str(root/'art-source'/('esportes-preview.png' if sport else 'edificios-preview.png'));bpy.ops.render.render(write_still=True)
