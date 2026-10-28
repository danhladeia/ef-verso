"""Prepare itHappy Creative Characters FREE for this game's player and residents."""
import bpy,json,colorsys,collections,bmesh
from pathlib import Path
from mathutils import Vector,Matrix
ROOT=Path(__file__).resolve().parents[1];PACK=ROOT.parent/'assets/ithappy/creative-characters-free';OUT=ROOT/'public/models/creative';OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(PACK/'Creative_Characters_Free.blend'),use_scripts=False)
rig=bpy.data.objects['Skeleton'];rig.animation_data_clear()
for p in rig.pose.bones:p.matrix_basis=Matrix.Identity(4)
parts=[o for o in bpy.data.objects if o.type=='MESH' and o.parent==rig]
image=bpy.data.images['Textures_4.png'];pixels=list(image.pixels);w,h=image.size
def pixel(uv):
 x=min(w-1,max(0,int(uv.x*w)));y=min(h-1,max(0,int(uv.y*h)));i=(y*w+x)*4;return tuple(pixels[i+j] for j in range(3))
def material(name,color):
 m=bpy.data.materials.new('Creative_'+name);m.diffuse_color=(*color,1);m.use_nodes=True;s=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED');s.inputs['Base Color'].default_value=(*color,1);s.inputs['Roughness'].default_value=.85;return m
tints={k:material(k,c) for k,c in {'skin':(.66,.36,.2),'hairColor':(.12,.055,.028),'shirt':(.06,.24,.48),'pants':(.035,.065,.11),'shoes':(.58,.63,.67),'accessoryColor':(.23,.055,.4),'glassesColor':(.02,.025,.035),'gloveColor':(.04,.18,.15)}.items()}
categories={'face':['Male_emotion_usual_001','Male_emotion_happy_002','Male_emotion_angry_003'],'hair':['Hairstyle_male_010','Hairstyle_male_012'],'top':['T_Shirt_009','Outerwear_029','Outerwear_036'],'bottom':['Shorts_003','Pants_010','Pants_014'],'footwear':['Shoe_Sneakers_009','Shoe_Slippers_002','Shoe_Slippers_005'],'hat':['Hat_010','Hat_049','Hat_057'],'glasses':['Glasses_004','Glasses_006'],'gloves':['Gloves_006','Gloves_014'],'moustache':['Moustache_001','Moustache_002'],'accessory':['Headphones_002','Clown_nose_001','Pacifier_001'],'costume':['Costume_10_001','Costume_6_001'],'socks':['Socks_008']}
keys={'hair':'hairColor','top':'shirt','bottom':'pants','footwear':'shoes','hat':'accessoryColor','glasses':'glassesColor','gloves':'gloveColor','moustache':'hairColor'}
for o in parts:
 # Display offsets lay the wardrobe out on a board. Local geometry is already in bind space.
 o.location=(0,0,0);o.hide_set(False);o.hide_viewport=False;o.hide_render=False
 for m in list(o.modifiers):
  if m.type not in ['ARMATURE']:o.modifiers.remove(m)
 for p in o.data.polygons:p.use_smooth=True
 category=next((c for c,ids in categories.items() if o.name in ids),None);key='skin' if o.name=='Body_010' else keys.get(category)
 if not key:continue
 uv=o.data.uv_layers.active;hues=collections.Counter();samples={}
 for p in o.data.polygons:
  rgb=pixel(sum((uv.data[i].uv for i in p.loop_indices),Vector((0,0)))/len(p.loop_indices));hsv=colorsys.rgb_to_hsv(*rgb);samples[p.index]=(rgb,hsv)
  if hsv[1]>.18:hues[round(hsv[0]*24)%24]+=p.area
 dominant=(hues.most_common(1)[0][0]/24) if hues else None;slot=len(o.data.materials);o.data.materials.append(tints[key])
 for p in o.data.polygons:
  rgb,(hu,sa,va)=samples[p.index]
  # Preserve other hues, white edging, glass lenses, and facial detail in the packed atlas.
  if (key in ['skin','hairColor']) or (dominant is not None and sa>.18 and min(abs(hu-dominant),1-abs(hu-dominant))<.065) or (dominant is None and .1<va<.85):
   if o.data.materials[p.material_index].name!='Glass':p.material_index=slot

# Split covered skin into visibility regions, keeping original weights and silhouette.
body=bpy.data.objects['Body_010'];regionIds={}
for p in body.data.polygons:
 weights=collections.Counter()
 for i in p.vertices:
  for g in body.data.vertices[i].groups:weights[body.vertex_groups[g.group].name]+=g.weight
 bone=weights.most_common(1)[0][0];center=sum((body.data.vertices[i].co for i in p.vertices),Vector())/len(p.vertices)
 if bone in ['Head','Neck']:region='Head'
 elif any(s in bone for s in ['Hand','Prop']):region='Hands'
 elif 'ForeArm' in bone:region='Forearms'
 elif 'Arm' in bone or 'Shoulder' in bone:region='Arms'
 elif 'Foot' in bone or 'Toe' in bone:region='Feet'
 elif 'UpLeg' in bone and center.z>.66:region='Thighs'
 elif 'Leg' in bone:region='Legs'
 else:region='Torso'
 regionIds[p.index]=region
parts.remove(body)
for region in sorted(set(regionIds.values())):
 o=body.copy();o.data=body.data.copy();o.name='Body_'+region;rig.users_collection[0].objects.link(o)
 bm=bmesh.new();bm.from_mesh(o.data);bm.faces.ensure_lookup_table();bmesh.ops.delete(bm,geom=[f for f in bm.faces if regionIds[f.index]!=region],context='FACES');bm.to_mesh(o.data);bm.free();parts.append(o)
bpy.data.objects.remove(body,do_unlink=True)

clips={'Idle_Breathing':'idle','Idle_Relaxed':'relaxed','Idle_Look_Around':'look','Walk_Forward':'walk','Run_Forward':'run','Jump_Start':'jump-start','Jump_Loop':'jump','Jump_End':'jump-end','Walk_Backward':'walk-back','run(back)':'run-back','Run_Left':'run-left','Run_Right':'run-right','Strafe_Left':'strafe-left','Strafe_Right':'strafe-right','Block_With_Hands':'holding'}
rig.animation_data_create()
for original,name in clips.items():
 action=bpy.data.actions.get(original)
 if not action:raise RuntimeError('Missing original clip '+original)
 action.name=name;track=rig.animation_data.nla_tracks.new();track.name=name;strip=track.strips.new(name,0,action);track.mute=True
rig.animation_data.action=None
bpy.context.scene.frame_set(0);bpy.context.view_layer.update();bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
for o in parts:o.select_set(True)
bpy.context.view_layer.objects.active=rig;bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'art-source/creative-game.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'character.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True,export_nla_strips=True)
(OUT/'catalog.json').write_text(json.dumps(categories,indent=2))
print('CREATIVE_COMPLETE',len(parts),len(rig.data.bones),(OUT/'character.glb').stat().st_size,flush=True)
