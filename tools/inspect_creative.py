import bpy,json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(root.parent/'assets/ithappy/creative-characters-free/Creative_Characters_Free.blend'),use_scripts=False)
report={'objects':[],'actions':[],'images':[],'materials':[]}
for o in bpy.data.objects:
 if o.type not in ['ARMATURE','MESH']:continue
 report['objects'].append({'name':o.name,'type':o.type,'parent':o.parent.name if o.parent else None,'dimensions':list(o.dimensions),'location':list(o.location),'hidden':o.hide_get(),'modifiers':[(m.name,m.type) for m in o.modifiers],'materials':[m.name for m in o.data.materials] if o.type=='MESH' else [],'bones':[b.name for b in o.data.bones] if o.type=='ARMATURE' else []})
for a in bpy.data.actions:report['actions'].append({'name':a.name,'range':list(a.frame_range),'slots':[s.identifier for s in a.slots]})
for i in bpy.data.images:report['images'].append({'name':i.name,'path':i.filepath,'packed':bool(i.packed_file),'size':list(i.size)})
for m in bpy.data.materials:report['materials'].append({'name':m.name,'nodes':[(n.name,n.type) for n in m.node_tree.nodes] if m.use_nodes else []})
(root/'art-source/creative-inspect.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report))
