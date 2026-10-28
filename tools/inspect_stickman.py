import bpy,json
from pathlib import Path
root=Path(__file__).resolve().parents[2]/'assets/Stickman Customizable Blender'
for file in [root/'Blender File/Customizable Stickman.blend',root/'Animations/Animations.blend']:
 bpy.ops.wm.open_mainfile(filepath=str(file))
 report={'file':str(file),'objects':[],'actions':[]}
 for o in bpy.data.objects:
  record={'name':o.name,'type':o.type,'location':list(o.location),'scale':list(o.scale),'hidden':o.hide_render}
  if o.type=='MESH':record.update(vertices=len(o.data.vertices),materials=[m.name for m in o.data.materials if m],shapes=[k.name for k in o.data.shape_keys.key_blocks] if o.data.shape_keys else [],modifiers=[(m.type,getattr(getattr(m,'object',None),'name',None)) for m in o.modifiers],groups=[v.name for v in o.vertex_groups][:90])
  if o.type=='ARMATURE':record.update(bones=[b.name for b in o.data.bones])
  report['objects'].append(record)
 for a in bpy.data.actions:report['actions'].append({'name':a.name,'range':list(a.frame_range)})
 (Path(__file__).resolve().parents[1]/'art-source'/('stickman-'+file.stem+'.json')).write_text(json.dumps(report))
 print('STICKMAN_REPORT',json.dumps({'file':str(file),'meshes':[{k:r[k] for k in ['name','vertices','materials','hidden','modifiers']} for r in report['objects'] if r['type']=='MESH' and any(m[0]=='ARMATURE' for m in r['modifiers'])],'actions':report['actions']}))
