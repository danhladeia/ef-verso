import bpy, math
from pathlib import Path
root=Path(__file__).resolve().parents[1]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def material(name,c):
 m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*c,1)
 node=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED');node.inputs['Base Color'].default_value=(*c,1);node.inputs['Roughness'].default_value=.85
 return m
concrete=material('Warm concrete',(.61,.68,.71));coping=material('Steel coping',(.19,.27,.31));blue=material('Turquoise bowl floor',(.13,.47,.55))
n=48;rings=[(.58,.04),(.67,.15),(.78,.55),(.9,1.3),(1,2.3),(1.13,2.3)]
verts=[(9*r*math.cos(i*math.tau/n),6*r*math.sin(i*math.tau/n),z) for r,z in rings for i in range(n)]
faces=[tuple(range(n))]
for j in range(len(rings)-1):
 for i in range(n):faces.append((j*n+i,(j+1)*n+i,(j+1)*n+(i+1)%n,j*n+(i+1)%n))
mesh=bpy.data.meshes.new('Continuous bowl');mesh.from_pydata(verts,[],faces);mesh.update();obj=bpy.data.objects.new('Bowl',mesh);bpy.context.collection.objects.link(obj);obj.data.materials.append(concrete);obj.data.materials.append(blue);obj.data.polygons[0].material_index=1
# Outside retaining wall supports the deck; bowl cavity remains open.
for i in range(n):
 a=i*math.tau/n;b=(i+1)*math.tau/n
 v=[(10.17*math.cos(a),6.78*math.sin(a),0),(10.17*math.cos(b),6.78*math.sin(b),0),(10.17*math.cos(b),6.78*math.sin(b),2.3),(10.17*math.cos(a),6.78*math.sin(a),2.3)]
 m=bpy.data.meshes.new('Retaining');m.from_pydata(v,[],[(0,1,2,3)]);o=bpy.data.objects.new('Retaining',m);bpy.context.collection.objects.link(o);o.data.materials.append(concrete)
bpy.ops.mesh.primitive_torus_add(major_radius=1,minor_radius=.008,major_segments=48,minor_segments=6,location=(0,0,2.33));o=bpy.context.object;o.scale=(9,6,7);o.data.materials.append(coping)
bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str(root/'art-source/skate-bowl.blend'))
bpy.ops.object.select_all(action='SELECT');bpy.context.view_layer.objects.active=obj;bpy.ops.object.join()
bpy.ops.export_scene.gltf(filepath=str(root/'public/models/skate/custom-bowl.glb'),export_format='GLB')
print('BOWL_COMPLETE')
