"""Convert the licensed local itHappy source to modular game assets."""
import bpy,json,collections
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1];PACK=ROOT.parent/'assets/ithappy/creative-characters-free';OUT=ROOT/'public/models/creative';OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(PACK/'Creative_Characters_Free.blend'),use_scripts=False)
rig=bpy.data.objects['Skeleton'];rig.animation_data_clear()
for p in rig.pose.bones:p.matrix_basis.identity()
bpy.context.scene.frame_set(0);bpy.context.view_layer.update()
image=bpy.data.images['Textures_4.png'];pixels=list(image.pixels);w,h=image.size
def pixel(uv):
 x=min(w-1,max(0,int(uv.x*w)));y=min(h-1,max(0,int(uv.y*h)));i=(y*w+x)*4;return tuple(round(pixels[i+j],3) for j in range(3))
report=[]
for o in bpy.data.objects:
 if o.type!='MESH' or o.parent!=rig:continue
 bounds=[(min(v.co[i] for v in o.data.vertices),max(v.co[i] for v in o.data.vertices)) for i in range(3)]
 uv=o.data.uv_layers.active;colors=collections.Counter()
 if uv:
  for p in o.data.polygons:
   colors[pixel(sum((uv.data[i].uv for i in p.loop_indices),Vector((0,0)))/len(p.loop_indices))]+=p.area
 report.append({'name':o.name,'bounds':bounds,'parentInverse':[list(row) for row in o.matrix_parent_inverse],'rotation':list(o.rotation_euler),'scale':list(o.scale),'colors':colors.most_common(6),'groups':len(o.vertex_groups)})
(ROOT/'art-source/creative-geometry.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report))
