"""Adapt local Quaternius bases into recolorable sports avatars; preserve rigs."""
import bpy, bmesh, json, struct
from pathlib import Path
from mathutils import Vector, Matrix, Quaternion
ROOT=Path(__file__).resolve().parents[1]
ASSETS=ROOT.parent/'assets/quaternius'
OUT=ROOT/'public/models/avatars';OUT.mkdir(parents=True,exist_ok=True)
def material(name,color):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 s=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED');s.inputs['Base Color'].default_value=(*color,1);s.inputs['Roughness'].default_value=.85
 return m
def rigged_box(name,center,size,mat,rig,bone,bevel=.02):
 if name.startswith('Training'):
  bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=10,radius=1,location=center);o=bpy.context.object;o.name=name;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
  for v in o.data.vertices:v.co.z=max(v.co.z,-size[2]*.32)
  for p in o.data.polygons:p.use_smooth=True
 else:
  bpy.ops.mesh.primitive_cube_add(size=1,location=center);o=bpy.context.object;o.name=name;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
  m=o.modifiers.new('Rounded edges','BEVEL');m.width=bevel;m.segments=3;bpy.ops.object.modifier_apply(modifier=m.name)
 o.data.materials.append(mat);g=o.vertex_groups.new(name=bone);g.add(list(range(len(o.data.vertices))),1,'REPLACE');a=o.modifiers.new('Rig','ARMATURE');a.object=rig
 world=o.matrix_world.copy();o.parent=rig;o.matrix_world=world
 return o
head_matrix=None
for sex in ['Male','Female']:
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 bpy.ops.import_scene.gltf(filepath=str(ASSETS/f'universal-base-characters/Base Characters/Godot - UE/Superhero_{sex}_FullBody.gltf'))
 rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
 if sex=='Male':head_matrix=rig.matrix_world @ rig.data.bones['Head'].matrix_local
 skin=material('Avatar_Skin',(.65,.38,.23));shirt=material('Avatar_Shirt',(.12,.32,.65));pants=material('Avatar_Pants',(.06,.09,.16));shoes=material('Avatar_Shoes',(.87,.89,.91));hair=material('Avatar_Hair',(.07,.035,.02))
 for o in list(bpy.context.scene.objects):
  if o.type!='MESH':continue
  if 'eyebrow' in o.name.lower():o.data.materials.clear();o.data.materials.append(hair);continue
  if 'eye' in o.name.lower():
   for m in o.data.materials:
    if m and m.use_nodes:
     s=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
     for link in list(s.inputs['Normal'].links):m.node_tree.links.remove(link)
   continue
  # An explicit waist cut avoids a jagged boundary between shirt and trousers.
  bm=bmesh.new();bm.from_mesh(o.data);inverse=o.matrix_world.inverted()
  bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=.00001,plane_co=inverse@Vector((0,0,.98)),plane_no=o.matrix_world.to_3x3().transposed()@Vector((0,0,1)),clear_inner=False,clear_outer=False)
  bm.to_mesh(o.data);bm.free();o.data.update()
  o.data.materials.clear()
  for m in [skin,shirt,pants,shoes]:o.data.materials.append(m)
  groups={g.index:g.name.lower() for g in o.vertex_groups}
  for f in o.data.polygons:
   weights={}
   for vi in f.vertices:
    for g in o.data.vertices[vi].groups:
     n=groups[g.group];kind=0 if any(t in n for t in ['head','neck','hand','finger','thumb','index','middle','ring','pinky','lowerarm']) else 3 if any(t in n for t in ['foot','ball_']) else 2 if any(t in n for t in ['pelvis','thigh','calf']) else 1
     weights[kind]=weights.get(kind,0)+g.weight
   kind=max(weights,key=weights.get) if weights else 0
   center=o.matrix_world@f.center
   if abs(center.x)<.38 and .78<center.z<1.20:kind=1 if center.z>.98 else 2
   f.material_index=kind
  # Preserve shared seam positions and skin weights; colors define the athletic kit.
  sole=material('Avatar_Sole',(.9,.92,.94))
  for side in ['l','r']:
   points=[o.matrix_world@v.co for v in o.data.vertices if sum(g.weight for g in v.groups if groups.get(g.group) in ['foot_'+side,'ball_'+side])>.6]
   if not points:continue
   low=Vector([min(p[i] for p in points) for i in range(3)]);high=Vector([max(p[i] for p in points) for i in range(3)])
   center=(low+high)/2;size=high-low;size.x+=.035;size.y+=.035;size.z=.14;center.z=low.z+.06
   rigged_box('Training shoe '+side,center,size,shoes,rig,'foot_'+side)
   rigged_box('Sole '+side,(center.x,center.y,low.z+.006),(size.x+.006,size.y+.006,.035),sole,rig,'foot_'+side,.012)
 bpy.context.preferences.filepaths.save_version=0
 bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/f'art-source/avatar-{sex.lower()}.blend'))
 bpy.ops.export_scene.gltf(filepath=str(OUT/f'{sex.lower()}.glb'),export_format='GLB',export_animations=False)

# Export hair in rest-world space. The runtime converts using the exported head bind.
for name in ['SimpleParted','Buzzed','Long','Buns']:
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 bpy.ops.import_scene.gltf(filepath=str(ASSETS/f'universal-base-characters/Hairstyles/Origin at 0/glTF (Godot)/Hair_{name}.gltf'))
 objects=[o for o in bpy.context.scene.objects if o.type=='MESH']
 for o in objects:
  transform=o.matrix_world.copy()
  o.data.transform(transform);o.matrix_world.identity();o.data.materials.clear();o.data.materials.append(material('Avatar_Hair',(.07,.035,.02)))
 bpy.ops.export_scene.gltf(filepath=str(OUT/f'hair-{name.lower()}.glb'),export_format='GLB',export_animations=False)

def head_bind(path):
 data=path.read_bytes();n=struct.unpack_from('<I',data,12)[0];doc=json.loads(data[20:20+n]);nodes=doc['nodes'];parents={c:i for i,node in enumerate(nodes) for c in node.get('children',[])}
 def world(i):
  node=nodes[i]
  if 'matrix' in node:m=Matrix([node['matrix'][r::4] for r in range(4)])
  else:
   q=node.get('rotation',[0,0,0,1]);m=Matrix.LocRotScale(Vector(node.get('translation',[0,0,0])),Quaternion((q[3],q[0],q[1],q[2])),Vector(node.get('scale',[1,1,1])))
  return world(parents[i]) @ m if i in parents else m
 m=world(next(i for i,n in enumerate(nodes) if n.get('name')=='Head'))
 return [m[r][c] for c in range(4) for r in range(4)]
(OUT/'hair-bind.json').write_text(json.dumps({sex:head_bind(OUT/f'{sex}.glb') for sex in ['male','female']}))

# Keep only four locomotion clips and compact their buffers; no mannequin is shipped.
p=ASSETS/'universal-animations/Unreal-Godot/UAL1_Standard.glb';data=p.read_bytes();length=struct.unpack_from('<I',data,12)[0];doc=json.loads(data[20:20+length]);binary=data[28+length:]
doc['animations']=[a for a in doc['animations'] if a['name'] in ['Idle_Loop','Walk_Loop','Sprint_Loop','Jump_Loop']]
used=sorted({s[k] for a in doc['animations'] for s in a['samplers'] for k in ['input','output']});amap={a:i for i,a in enumerate(used)}
accessors=[doc['accessors'][a] for a in used];views=sorted({a['bufferView'] for a in accessors});vmap={v:i for i,v in enumerate(views)};newbin=bytearray();newviews=[]
for vi in views:
 v=doc['bufferViews'][vi];start=len(newbin);newbin.extend(binary[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']]);newbin.extend(b'\0'*((-len(newbin))%4));newviews.append({**v,'buffer':0,'byteOffset':start})
for a in accessors:a['bufferView']=vmap[a['bufferView']]
for a in doc['animations']:
 for s in a['samplers']:
  for k in ['input','output']:s[k]=amap[s[k]]
for n in doc['nodes']:n.pop('mesh',None);n.pop('skin',None)
for k in ['meshes','skins','materials','images','textures','samplers']:doc.pop(k,None)
doc['accessors']=accessors;doc['bufferViews']=newviews;doc['buffers']=[{'byteLength':len(newbin)}]
j=json.dumps(doc,separators=(',',':')).encode();j+=b' '*((-len(j))%4)
(OUT/'movement.glb').write_bytes(struct.pack('<III',0x46546c67,2,28+len(j)+len(newbin))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(newbin),0x004e4942)+newbin)
print('CUSTOM_AVATARS_COMPLETE',[(p.name,p.stat().st_size) for p in OUT.glob('*.glb')])
