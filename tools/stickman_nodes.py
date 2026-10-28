import bpy,json
from pathlib import Path
r=Path(__file__).resolve().parents[2]/'assets/Stickman Customizable Blender'
bpy.ops.wm.open_mainfile(filepath=str(r/'Blender File/Customizable Stickman.blend'))
for name in ['Body','Stickman','Top_01','Shoes_01','Pants_01','Hat_01','Face_01','Glasses_01']:
 o=bpy.data.objects.get(name);print('PART',name,'bounds',list(o.dimensions),'parent',o.parent.name if o.parent else None,'drivers',[(d.data_path,d.expression if hasattr(d,'expression') else d.driver.expression) for d in o.animation_data.drivers] if o.animation_data else [])
 for m in o.modifiers:
  if m.type=='NODES':print('NODES',m.node_group.name,[(n.name,n.type) for n in m.node_group.nodes])
rig=bpy.data.objects['character_rig'];print('DEFORM',[(b.name,list(b.head_local)) for b in rig.data.bones if b.use_deform][:90]);print('rigworld',[list(row) for row in rig.matrix_world])
