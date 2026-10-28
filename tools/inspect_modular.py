import bpy,json
from pathlib import Path
root=Path.cwd();result={}
for gender,file in [('men','Humans_Master.blend'),('women','All together.blend')]:
 p=root/'assets'/'quaternius'/('ultimate-modular-'+gender)/'All together'/'Blends'/file
 bpy.ops.wm.open_mainfile(filepath=str(p),use_scripts=False)
 result[gender]={'objects':[{'name':o.name,'type':o.type,'parent':o.parent.name if o.parent else None,'location':list(o.location),'scale':list(o.scale),'dims':list(o.dimensions),'mats':[m.name for m in o.data.materials] if o.type=='MESH' else [],'modifiers':[(m.name,m.type) for m in o.modifiers]} for o in bpy.data.objects], 'actions':[{'name':a.name,'range':list(a.frame_range)} for a in bpy.data.actions],'rigs':[{'name':o.name,'bones':[b.name for b in o.data.bones],'nla':[(t.name,[(s.name,s.action.name) for s in t.strips]) for t in o.animation_data.nla_tracks] if o.animation_data else []} for o in bpy.data.objects if o.type=='ARMATURE'],'materials':[{'name':m.name,'color':list(m.diffuse_color)} for m in bpy.data.materials]}
(root/'cidade/art-source/modular-inspect.json').write_text(json.dumps(result,indent=2))
