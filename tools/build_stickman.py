"""Prepare the user's Stickman pack for the web, with original geometry and baked clips."""
import bpy,json
from pathlib import Path
from mathutils import Matrix
ROOT=Path(__file__).resolve().parents[1];PACK=ROOT.parent/'assets/Stickman Customizable Blender';OUT=ROOT/'public/models/stickman';OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(PACK/'Blender File/Customizable Stickman.blend'))
source=bpy.data.objects['character_rig'];source.animation_data_clear()
categories={'face':[f'Face_{i:02}' for i in range(1,12)],'top':[f'Top_{i:02}' for i in range(1,10)],'bottom':[f'Pants_{i:02}' for i in range(1,10)],'footwear':['Shoes_01','Shoes_04','Shoes_07','Shoes_12','Shoes_16','Shoes_20','Shoes_23','Shoes_27'],'hat':[f'Hat_{i:02}' for i in range(1,48)],'glasses':['Glasses_01','Glasses_03','Glasses_07','Glasses_09','Glasses_14','Glasses_18','Glasses_21']}
selected=['Body']+[n for values in categories.values() for n in values];parts=[bpy.data.objects[n] for n in selected]
weighted={g.name for o in parts for g in o.vertex_groups if any(vg.group==g.index and vg.weight>0 for v in o.data.vertices for vg in v.groups)}
bone_names=[b.name for b in source.data.bones if b.name in weighted];safe={n:n.replace('.','_') for n in bone_names}
parents={n:next((p.name for p in source.data.bones[n].parent_recursive if p.name in bone_names),None) for n in bone_names}
rest={n:source.data.bones[n].matrix_local.copy() for n in bone_names}
data=bpy.data.armatures.new('StickmanSkeleton');rig=bpy.data.objects.new('StickmanRig',data);bpy.context.scene.collection.objects.link(rig)
bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
for n in bone_names:
 b=data.edit_bones.new(safe[n]);src=source.data.bones[n];b.head=src.head_local;b.tail=src.tail_local;b.matrix=src.matrix_local;b.use_deform=True
for n in bone_names:
 if parents[n]:data.edit_bones[safe[n]].parent=data.edit_bones[safe[parents[n]]]
bpy.ops.object.mode_set(mode='OBJECT');rig.animation_data_create()
# The animation file stores FK/IK switches on the rig, not in its actions.
# Sample that rig so the authored poses are preserved when baking the clean skeleton.
with bpy.data.libraries.load(str(PACK/'Animations/Animations.blend'),link=False) as (src,dst):dst.objects=['Armature_rig']
source=dst.objects[0];bpy.context.scene.collection.objects.link(source);source.animation_data_clear()
with bpy.data.libraries.load(str(PACK/'Animations/Animations.blend'),link=False) as (src,dst):dst.actions=[n for n in src.actions if n in ['Stickman@Idle','Stickman@Walk','Stickman@Run','Stickman@Jump','Stickman@Wave','Stickman@Push']]
source.animation_data_create();baked=[]
for action in dst.actions:
 source.animation_data.action=action
 if action.slots:source.animation_data.action_slot=action.slots[0]
 new=bpy.data.actions.new(action.name.split('@')[-1].split('.')[0].lower());rig.animation_data.action=new
 start,end=map(int,action.frame_range)
 for f in range(start,end+1):
  bpy.context.scene.frame_set(f);bpy.context.view_layer.update();pose={n:source.pose.bones[n].matrix.copy() for n in bone_names}
  for n in bone_names:
   parent=parents[n];basis=(rest[parent].inverted()@rest[n]).inverted()@(pose[parent].inverted()@pose[n]) if parent else rest[n].inverted()@pose[n]
   p=rig.pose.bones[safe[n]];p.rotation_mode='QUATERNION';p.location,p.rotation_quaternion,p.scale=basis.decompose()
   for prop in ['location','rotation_quaternion','scale']:p.keyframe_insert(data_path=prop,frame=f-start,group=p.name)
 baked.append(new);print('BAKED',new.name,end-start+1,flush=True)
source.animation_data_clear();rig.animation_data.action=None
for p in rig.pose.bones:p.matrix_basis=Matrix.Identity(4)
def mat(name,color):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;s=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED');s.inputs['Base Color'].default_value=(*color,1);s.inputs['Roughness'].default_value=.85;return m
colors={'body':(.95,.65,.08),'top':(.12,.35,.72),'bottom':(.08,.12,.2),'footwear':(.85,.88,.9),'hat':(.8,.12,.18),'glasses':(.05,.08,.12)}
mats={k:mat('Stickman_'+k,c) for k,c in colors.items()};greys=[mat('Fixed_'+str(i),(v,v,v)) for i,v in enumerate([.015,.075,.35,.85])]
for o in parts:
 o.animation_data_clear();o.hide_set(False);o.hide_viewport=False;o.hide_render=False;world=o.matrix_world.copy();o.parent=rig;o.matrix_world=world
 for m in list(o.modifiers):
  if m.type=='ARMATURE':m.object=rig
  else:o.modifiers.remove(m)
 for g in o.vertex_groups:
  if g.name in safe:g.name=safe[g.name]
 category=next((k for k,v in categories.items() if o.name in v),'body');key='body' if category=='face' else category
 o.data.materials.clear();o.data.materials.append(mats[key])
 for m in greys:o.data.materials.append(m)
 uv=o.data.uv_layers.active
 for p in o.data.polygons:
  p.use_smooth=True;p.material_index=0
  if uv:
   u=sum(uv.data[i].uv.x for i in p.loop_indices)/len(p.loop_indices);v=sum(uv.data[i].uv.y for i in p.loop_indices)/len(p.loop_indices)
   if u<.25:p.material_index=1+min(3,max(0,int(v*4)))
# Keep export selection isolated from the editor's controller shapes and alternative rig.
bpy.ops.object.select_all(action='DESELECT');rig.hide_set(False);rig.hide_viewport=False;rig.hide_render=False;rig.select_set(True)
for o in parts:o.select_set(True)
bpy.context.view_layer.objects.active=rig
for action in baked:
 track=rig.animation_data.nla_tracks.new();track.name=action.name;track.strips.new(action.name,0,action);track.mute=True
bpy.context.scene.frame_set(0);bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'art-source/stickman-game.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'character.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True,export_nla_strips=True)
(OUT/'catalog.json').write_text(json.dumps(categories))
print('STICKMAN_COMPLETE',len(parts),len(bone_names),(OUT/'character.glb').stat().st_size)
