import bpy, math
from pathlib import Path
from mathutils import Vector
root=Path(__file__).resolve().parents[1];out=root/'public/models/sports';out.mkdir(parents=True,exist_ok=True)
def mat(name,c):
 m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*c,1)
 s=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED');s.inputs['Base Color'].default_value=(*c,1);s.inputs['Roughness'].default_value=.85
 return m
white=mat('Ivory',(.95,.94,.86));navy=mat('Steel blue',(.13,.22,.31));orange=mat('Orange',(.95,.32,.06));teal=mat('Teal seats',(.12,.52,.53))
def box(loc,size,m):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m)
def bar(a,b,r,m):
 v=Vector(b)-Vector(a);bpy.ops.mesh.primitive_cylinder_add(vertices=8,radius=r,depth=v.length,location=(Vector(a)+Vector(b))/2);o=bpy.context.object;o.rotation_euler=v.to_track_quat('Z','Y').to_euler();o.data.materials.append(m)
def save(name):
 bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str(root/'art-source'/f'{name}.blend'))
 bpy.ops.object.select_all(action='SELECT');bpy.context.view_layer.objects.active=bpy.context.selected_objects[0];bpy.ops.object.join()
 bpy.ops.export_scene.gltf(filepath=str(out/f'{name}.glb'),export_format='GLB')
def clear():
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
clear()
for x in [-3,3]:
 bar((x,0,0),(x,0,2.2),.07,white);bar((x,0,2.2),(x,1.4,0),.04,navy)
bar((-3,0,2.2),(3,0,2.2),.07,white)
for i in range(21):
 x=-3+i*.3;bar((x,1.4,0),(x,1.4,2.2),.012,white);bar((x,0,2.2),(x,1.4,2.2),.012,white)
for i in range(9):bar((-3,1.4,i*.275),(3,1.4,i*.275),.012,white)
save('goal')
clear()
box((0,.8,.15),(1.4,1.8,.3),navy);bar((0,.8,0),(0,.8,3.7),.09,navy);bar((0,.8,3.7),(0,0,3.7),.07,navy)
box((0,0,3.55),(1.8,.12,1.05),white)
for x in [-.3,.3]:bar((x,-.08,3.35),(x,-.08,3.75),.018,orange)
for z in [3.35,3.75]:bar((-.3,-.08,z),(.3,-.08,z),.018,orange)
bpy.ops.mesh.primitive_torus_add(major_segments=24,minor_segments=6,location=(0,-.5,3.05),major_radius=.3,minor_radius=.035);bpy.context.object.data.materials.append(orange)
for i in range(10):
 a=i*math.tau/10;bar((math.cos(a)*.3,-.5+math.sin(a)*.3,3.05),(math.cos(a)*.2,-.5+math.sin(a)*.2,2.6),.012,white)
save('basket-hoop')
clear()
for x in [-5,5]:bar((x,0,0),(x,0,2.7),.065,navy)
for z in [1.45,2.45]:bar((-5,0,z),(5,0,z),.035,white)
for i in range(41):bar((-5+i*.25,0,1.45),(-5+i*.25,0,2.45),.009,navy)
for i in range(1,4):bar((-5,0,1.45+i*.25),(5,0,1.45+i*.25),.009,navy)
save('volley-net')
clear();box((0,0,.07),(.65,.65,.14),orange)
bpy.ops.mesh.primitive_cone_add(vertices=12,radius1=.25,radius2=.06,depth=.65,location=(0,0,.45));bpy.context.object.data.materials.append(orange)
bpy.ops.mesh.primitive_cone_add(vertices=12,radius1=.16,radius2=.13,depth=.1,location=(0,0,.49));bpy.context.object.data.materials.append(white);save('cone')
clear()
for row in range(3):
 box((0,row*.9,.25+row*.4),(7,.85,.5+row*.8),white)
 for seat in range(8):box((-3+seat*.85,row*.9,.55+row*.8),(.7,.6,.15),teal)
save('bleachers')
print('SPORTS_COMPLETE 5')
