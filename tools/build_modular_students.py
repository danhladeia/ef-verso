"""Prepare a school/casual selection of the two CC0 Quaternius modular packs.
Run from repository root using Blender --background --python cidade/tools/build_modular_students.py.
Original geometry and authored animations are retained; materials and school accessories are prepared here.
"""
import bpy,json,math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'cidade/public/models/students';OUT.mkdir(parents=True,exist_ok=True)
SELECTION={
'masculine':('men','Humans_Master.blend',{'head':['Casual2_Head','Casual_Head','Suit_Head'],'top':['Casual2_Body','Casual_Body'],'bottom':['Casual2_Legs','Beach_Legs'],'footwear':['Casual2_Feet','Casual_Feet']}),
'feminine':('women','All together.blend',{'head':['Casual_Head','Formad_Head','Soldier_Head'],'top':['Casual_Body','Suit_Body'],'bottom':['Casual_Legs','Worker_Legs'],'footwear':['Casual_Feet','Worker_Feet']})}
catalog={}
def mat(name,color):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 p=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=.85
 return m
for gender,(pack,filename,groups) in SELECTION.items():
 bpy.ops.wm.open_mainfile(filepath=str(ROOT/'assets/quaternius'/('ultimate-modular-'+pack)/'All together/Blends'/filename),use_scripts=False)
 rig=bpy.data.objects['CharacterArmature'];rig.animation_data_clear()
 for b in rig.pose.bones:b.matrix_basis.identity()
 bpy.context.view_layer.update();parts=[];catalog[gender]={}
 materials={k:mat('Student_'+k,c) for k,c in {'skin':(.48,.25,.12),'skinShade':(.35,.16,.07),'hairColor':(.025,.014,.009),'shirt':(.03,.2,.5),'pants':(.018,.035,.07),'shoes':(.6,.65,.7),'accent':(.85,.88,.9),'detail':(.012,.009,.006),'accessoryColor':(.22,.055,.4)}.items()}
 for category,names in groups.items():
  catalog[gender][category]=[]
  for i,name in enumerate(names):
   o=bpy.data.objects[name];o.hide_set(False);o.hide_viewport=False;o.hide_render=False;bpy.context.view_layer.objects.active=o;o.select_set(True)
   for mod in list(o.modifiers):
    if mod.type=='MIRROR':bpy.ops.object.modifier_apply(modifier=mod.name)
    elif mod.type!='ARMATURE':o.modifiers.remove(mod)
   o.data.validate(clean_customdata=False)
   for slot in o.material_slots:
    original=slot.material.name
    if original.startswith('Skin'):key='skinShade' if original=='Skin_Darker' else 'skin'
    elif category=='head':
     key='detail' if original in ['Eye','Brown','Eyebrows'] else 'hairColor'
    elif category=='top':key='accent' if original=='White' and name in ['Suit_Body'] else 'shirt'
    elif category=='bottom':key='pants'
    else:key='accent' if original=='White' else 'shoes'
    slot.material=materials[key]
   o.name=f'{gender}_{category}_{i}';o.data.name=o.name;parts.append(o);catalog[gender][category].append(o.name)
 # Small school backpack and glasses, weighted to the existing rig; no external assets.
 def box(name,location,scale,material,bone,bevel=0):
  bpy.ops.mesh.primitive_cube_add(size=1,location=location);o=bpy.context.object;o.name=name;o.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
  if bevel:
   m=o.modifiers.new('Rounded edges','BEVEL');m.width=bevel;m.segments=2;bpy.ops.object.modifier_apply(modifier=m.name)
  o.data.materials.append(material);group=o.vertex_groups.new(name=bone);group.add(list(range(len(o.data.vertices))),1,'REPLACE')
  return o
 def assemble(name,objects):
  bpy.ops.object.select_all(action='DESELECT')
  for o in objects:o.select_set(True)
  bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();o=objects[0];o.name=name
  bpy.ops.object.transform_apply(location=True,rotation=True,scale=True);o.parent=rig;mod=o.modifiers.new('Armature','ARMATURE');mod.object=rig;parts.append(o);return name
 # Both source rigs face -Y and share the same stature.
 head=rig.data.bones['Head'];eyeZ=head.head_local.z+(.11 if gender=='masculine' else .104)
 specs=[]
 for x in [-.055,.055]:
  for z in [eyeZ-.025,eyeZ+.025]:specs.append(box('frame',(x,-.185,z),(.095,.014,.009),materials['detail'],'Head',.002))
  for edge in [-.046,.046]:specs.append(box('frame',(x+edge,-.185,eyeZ),(.009,.014,.05),materials['detail'],'Head',.002))
 specs.append(box('bridge',(0,-.185,eyeZ),(.023,.014,.008),materials['detail'],'Head',.002))
 for x in [-.103,.103]:specs.append(box('temple',(x,-.1,eyeZ),(.009,.17,.009),materials['detail'],'Head',.002))
 glasses=assemble(gender+'_glasses_0',specs);catalog[gender]['glasses']=[glasses]
 specs=[box('bag',(0,.15,1.25),(.3,.15,.36),materials['accessoryColor'],'Chest',.035),box('pocket',(0,.24,1.18),(.23,.06,.14),materials['accent'],'Chest',.02)]
 for x in [-.105,.105]:specs.append(box('strap',(x,.045,1.37),(.033,.05,.29),materials['accessoryColor'],'Chest',.012))
 backpack=assemble(gender+'_accessory_0',specs);catalog[gender]['accessory']=[backpack]
 clips={'Idle_Neutral':'idle','Walk':'walk','Run':'run','Wave':'wave','Interact':'interact'}
 rig.animation_data_create()
 for original,name in clips.items():
  action=bpy.data.actions[original];action.name=name;track=rig.animation_data.nla_tracks.new();track.name=name;track.strips.new(name,0,action);track.mute=True
 rig.animation_data.action=None;bpy.context.scene.frame_set(0);bpy.context.view_layer.update()
 for o in list(bpy.data.objects):
  if o!=rig and o not in parts:bpy.data.objects.remove(o,do_unlink=True)
 bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
 for o in parts:o.select_set(True)
 bpy.context.view_layer.objects.active=rig;bpy.context.preferences.filepaths.save_version=0
 bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/f'cidade/art-source/students-{gender}.blend'))
 bpy.ops.export_scene.gltf(filepath=str(OUT/(gender+'.glb')),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True,export_nla_strips=True)
 print('STUDENT_EXPORTED',gender,len(parts),(OUT/(gender+'.glb')).stat().st_size,flush=True)
(OUT/'catalog.json').write_text(json.dumps(catalog,indent=2))
