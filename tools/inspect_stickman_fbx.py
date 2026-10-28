import bpy,json
from pathlib import Path
r=Path(__file__).resolve().parents[2]/'assets/Stickman Customizable Blender'
for file in [r/'Fbx/Hypercasual Customizable Stickman.fbx',r/'Animations/Stickman Walking.fbx']:
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.fbx(filepath=str(file))
 print('FBX',file.name,json.dumps({'objects':[(o.name,o.type,list(o.dimensions)) for o in bpy.context.scene.objects],'rigs':[(o.name,[b.name for b in o.data.bones][:100]) for o in bpy.context.scene.objects if o.type=='ARMATURE'],'actions':[(a.name,list(a.frame_range)) for a in bpy.data.actions]}))
