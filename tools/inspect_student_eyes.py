import bpy,json
from pathlib import Path
root=Path.cwd()
for g in ['masculine','feminine']:
 bpy.ops.wm.open_mainfile(filepath=str(root/f'cidade/art-source/students-{g}.blend'),use_scripts=False)
 rig=bpy.data.objects['CharacterArmature'];rig.animation_data_clear()
 for b in rig.pose.bones:b.matrix_basis.identity()
 bpy.context.view_layer.update();o=bpy.data.objects[g+'_head_0'];eye=[]
 for p in o.data.polygons:
  if o.data.materials[p.material_index].name.startswith('Student_detail'):
   eye.extend([list(o.matrix_world@o.data.vertices[i].co) for i in p.vertices])
 print('EYES',g,'head',list(rig.data.bones['Head'].head_local),'range',[(min(v[i] for v in eye),max(v[i] for v in eye)) for i in range(3)])
