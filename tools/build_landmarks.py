"""Rebuild original EF Verso low-poly civic buildings using Blender in background."""
import bpy, math, os
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public'/'models'/'landmarks'
OUT.mkdir(parents=True,exist_ok=True)
SOURCE=ROOT/'art-source'
SOURCE.mkdir(exist_ok=True)
def material(name,color):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1);m.use_nodes=True
    shader=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED');shader.inputs['Base Color'].default_value=(*color,1);shader.inputs['Roughness'].default_value=.9
    return m
cream=material('Warm plaster',(.88,.79,.61)); white=material('Ivory trim',(.96,.93,.81)); glass=material('Blue windows',(.15,.38,.45)); roof=material('Slate roof',(.19,.24,.30)); wood=material('Timber',(.43,.25,.13))
def cube(name,loc,scale,mat):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc)
    o=bpy.context.object;o.name=name;o.dimensions=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat);return o
def pitched(w,d,z,mat):
    verts=[(-w/2,-d/2,z),(w/2,-d/2,z),(w/2,d/2,z),(-w/2,d/2,z),(0,-d/2,z+2),(0,d/2,z+2)]
    mesh=bpy.data.meshes.new('Roof');mesh.from_pydata(verts,[],[(0,1,4),(3,5,2),(0,4,5,3),(1,2,5,4),(0,3,2,1)]);mesh.update();o=bpy.data.objects.new('Gabled roof',mesh);bpy.context.collection.objects.link(o);o.data.materials.append(mat)
specs=[('escola','ESCOLA',(.78,.37,.22),12,8,5),('ginasio','GINASIO',(.19,.48,.58),16,12,6),('museu','MUSEU',(.66,.48,.25),12,9,6),('cultural','CULTURA',(.45,.24,.65),13,9,5),('ginastica','GINASTICA',(.26,.59,.49),12,9,5),('dojo','DOJO',(.66,.26,.25),11,9,4),('saude','SAUDE',(.23,.58,.49),12,8,4.5),('visitantes','TRILHAS',(.46,.55,.25),10,7,4),('ciencia','CIENCIA',(.18,.48,.58),14,10,5),('galeria','GALERIA',(.45,.24,.65),16,9,5)]
for key,title,color,w,d,h in specs:
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    accent=material(key+' accent',color)
    cube('Foundation',(0,0,.15),(w+.6,d+.6,.3),white)
    cube('Main building',(0,0,h/2+.3),(w,d,h),cream)
    cube('Base trim',(0,0,.55),(w+.12,d+.12,.35),accent)
    # Front is negative Y, exported to positive Z in glTF.
    for x in [-w/2+.6,w/2-.6]:cube('Corner pier',(x,-d/2-.06,h/2),( .35,.25,h),white)
    for x in [-w*.34,-w*.18,w*.18,w*.34]:
        cube('Window frame',(x,-d/2-.12,2.8),(1.35,.16,1.6),white)
        cube('Window',(x,-d/2-.22,2.8),(1.1,.08,1.35),glass)
    for side in [-1,1]:
        for y in [-d*.28,0,d*.28]:cube('Side window',(side*(w/2+.05),y,2.8),(.12,1.3,1.4),glass)
    cube('Entrance',(0,-d/2-.15,1.5),(1.5,.2,2.4),glass)
    cube('Accessible entry path',(0,-d/2-1,.1),(2.6,2,.2),white)
    cube('Canopy',(0,-d/2-.8,3),(3.6,1.8,.25),accent)
    cube('Name plaque',(0,-d/2-.22,h-.45),(min(w-1,8),.18,.8),accent)
    bpy.ops.object.text_add(location=(0,-d/2-.33,h-.65),rotation=(math.pi/2,0,0))
    t=bpy.context.object;t.name='Building name';t.data.body=title;t.data.align_x='CENTER';t.data.size=.48;t.data.extrude=.008;t.data.materials.append(white);bpy.ops.object.convert(target='MESH')
    if key in ['escola','dojo','visitantes']:pitched(w+1,d+1,h+.3,accent if key=='escola' else roof)
    else:
        cube('Roof rim',(0,0,h+.35),(w+.5,d+.5,.5),accent)
        cube('Roof inset',(0,0,h+.65),(w-.6,d-.6,.2),roof)
    if key=='museu':
        for x in [-4,-2,2,4]:cube('Museum column',(x,-d/2-.7,2.6),(.45,.45,4.8),white)
    if key=='ginasio':
        for x in [-5,0,5]:cube('Roof skylight',(x,0,h+.9),(2,d-2,.4),glass)
    if key=='saude':
        cube('Health symbol vertical',(0,0,h+1.2),(.5,.4,1.8),accent);cube('Health symbol horizontal',(0,0,h+1.2),(1.8,.4,.5),accent)
    if key=='visitantes':
        for x in [-3.5,3.5]:cube('Porch post',(x,-d/2-1,1.6),(.3,.3,3),wood)
    # Shared architectural language: deep frames, cornices, banners and planters.
    gold=material(key+' brass',(.95,.63,.12));leaf=material(key+' greenery',(.24,.48,.13))
    for side in [-1,1]:
        x=side*(w/2-1)
        cube('Raised planter',(x,-d/2-.8,.4),(1.4,1.4,.7),white)
        cube('Clipped hedge',(x,-d/2-.8,1),(1.2,1.2,.7),leaf)
        cube('Facade banner',(side*(w/2-.8),-d/2-.24,h-1.3),(.55,.13,1.6),accent)
        cube('Banner emblem',(side*(w/2-.8),-d/2-.33,h-1.2),(.25,.08,.4),gold)
    cube('Upper cornice',(0,-d/2-.2,h-.05),(w+.5,.5,.2),white)
    for x in [-w*.34,-w*.18,w*.18,w*.34]:
        cube('Window mullion',(x,-d/2-.29,2.8),(.07,.07,1.4),white)
        cube('Window sill',(x,-d/2-.3,2.05),(1.5,.4,.13),white)
    for x in [-1,1]:cube('Entrance frame',(x,-d/2-.3,1.5),(.2,.35,2.7),white)
    if key=='escola':
        cube('Clock tower',(0,.5,h+1.5),(2.8,2.8,3.5),accent)
        cube('Clock face',(0,-.94,h+2.1),(1.8,.08,1.8),white)
        cube('Clock hour',(0,-1.02,h+2.35),(.1,.06,.55),roof)
        cube('Clock minute',(.3,-1.02,h+2.1),(.65,.06,.1),roof)
        cube('Tower crown',(0,.5,h+3.35),(3.3,3.3,.3),gold)
    elif key=='ginasio':
        for x in [-w/2-.15,w/2+.15]:
            for y in [-4,0,4]:cube('Arena buttress',(x,y,3),(.4,.65,6),accent)
        cube('Grand entrance',(0,-d/2-1.1,2),(5,1.8,4),glass)
        cube('Arena entrance roof',(0,-d/2-1.1,4.2),(6,2.5,.35),gold)
        for x in [-2,0,2]:cube('Entrance glazing bars',(x,-d/2-2.04,2),(.14,.12,3.8),white)
    elif key=='museu':
        cube('Pediment lintel',(0,-d/2-.8,5.2),(10,1.2,.4),white)
        cube('Trophy plinth',(0,0,h+1.1),(2,2,.8),white)
        bpy.ops.mesh.primitive_cone_add(vertices=12,radius1=.55,radius2=1,depth=1.3,location=(0,0,h+2.1));bpy.context.object.data.materials.append(gold)
    elif key=='cultural':
        for i in range(6):cube('Colour facade fin',(-4+i*1.6,-d/2-.4,3),(.3,.6,3.2),gold if i%2 else accent)
        cube('Stage roof',(0,0,h+1.2),(8,5,.25),accent).rotation_euler.y=.14
    elif key=='ginastica':
        cube('Clerestory',(0,0,h+1.2),(7,4,1.2),glass)
        cube('Clerestory roof',(0,0,h+1.9),(8,5,.25),white)
    elif key=='dojo':
        cube('Wide layered eaves',(0,0,h+.45),(w+1.6,d+1.6,.2),accent)
        cube('Ridge cap',(0,0,h+2.5),(.5,d+1.5,.3),gold)
        for x in [-2,2]:cube('Entry timber',(x,-d/2-1.2,1.6),(.35,.35,3.2),wood)
        cube('Entry lintel',(0,-d/2-1.2,3.2),(5,.5,.4),wood)
    elif key=='saude':
        cube('Clinic upper volume',(-2,0,h+1.5),(5,5,2),white)
        cube('Clinic upper glazing',(-2,-2.55,h+1.5),(4,.1,1.2),glass)
        cube('Clinic crown',(-2,0,h+2.6),(5.5,5.5,.25),accent)
    elif key=='visitantes':
        for x in [-4,-2,2,4]:cube('Timber facade ribs',(x,-d/2-.15,2),(.16,.3,3.8),wood)
        cube('Trail information board',(3,-d/2-1.2,1.8),(1.6,.2,1.5),accent)
    bpy.context.preferences.filepaths.save_version=0
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/(key+'.blend')))
    bpy.ops.object.select_all(action='SELECT');bpy.context.view_layer.objects.active=bpy.context.selected_objects[0];bpy.ops.object.join()
    bpy.ops.export_scene.gltf(filepath=str(OUT/(key+'.glb')),export_format='GLB',export_yup=True)
print('LANDMARKS_COMPLETE',len(specs))
