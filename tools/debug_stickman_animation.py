import bpy,json
from pathlib import Path
r=Path(__file__).resolve().parents[2]/'assets/Stickman Customizable Blender'
for path,rig_name in [(r/'Animations/Animations.blend','Armature_rig'),(r/'Blender File/Customizable Stickman.blend','character_rig')]:
 bpy.ops.wm.open_mainfile(filepath=str(path));rig=bpy.data.objects[rig_name]
 if rig_name=='character_rig':
  with bpy.data.libraries.load(str(r/'Animations/Animations.blend')) as (src,dst):dst.actions=['Stickman@Idle','Stickman@Walk']
 rig.animation_data_create();action=bpy.data.actions['Stickman@Idle'];rig.animation_data.action=action
 if action.slots:rig.animation_data.action_slot=action.slots[0]
 print('ACTION',rig_name,[(s.identifier,s.target_id_type) for s in action.slots], 'hidden',rig.hide_viewport,rig.hide_get())
 for layer in action.layers:
  for strip in layer.strips:
   for bag in strip.channelbags:
    print('CURVES',[(f.data_path,f.array_index,len(f.keyframe_points)) for f in bag.fcurves][:15])
 for f in [1,15,30]:
  bpy.context.scene.frame_set(f);bpy.context.view_layer.update()
  print('POSE',f,[(n,list(rig.pose.bones[n].rotation_euler),list(rig.pose.bones[n].matrix.translation)) for n in ['c_arm_fk.l','arm_stretch.l','hand.l','c_root.x']])
