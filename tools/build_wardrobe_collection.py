"""Extend the active KayKit rig with clothing and accessories authored in Blender.

Original pack stays untouched. Build: blender -b --python tools/build_wardrobe_collection.py
"""
import bpy, bmesh, math, ast, json
from pathlib import Path
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

ROOT = Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'art-source/kaykit-alunos.blend'))
scene = bpy.context.scene
rig = next(o for o in scene.objects if o.type == 'ARMATURE')
# Reuse the project's original mesh construction helpers without running its build.
source = ast.parse((ROOT/'tools/build_kaykit_students.py').read_text(encoding='utf-8'))
helpers = [n for n in source.body if isinstance(n, ast.FunctionDef) and n.name in
           {'material', 'add_box', 'add_tube', 'add_ring'}]
exec(compile(ast.Module(body=helpers, type_ignores=[]), '<mesh-helpers>', 'exec'))
def material(name, color, rough=.8, metal=0):
    mat=bpy.data.materials.new(name);mat.use_nodes=True
    shader=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    linear=[x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4 for x in color]
    shader.inputs['Base Color'].default_value=(*linear,1)
    shader.inputs['Roughness'].default_value=rough;shader.inputs['Metallic'].default_value=metal
    return mat
fabric = material('Wear_shirt', (.24,.42,.7))
accent = material('Wear_accent', (.94,.73,.24))
dark = material('Wear_detail', (.10,.12,.17), .7)
hair = material('Wear_hairColor', (.17,.10,.065), .85)
bagmat = material('Wear_accessoryColor', (.44,.25,.61))
white = material('Wear_white', (.92,.94,.96))
metal = material('Wear_metal', (.55,.60,.67), .35,.6)

def mesh(name, bm, mats, bone='head'):
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    data=bpy.data.meshes.new(name);bm.to_mesh(data);bm.free()
    for mat in mats:data.materials.append(mat)
    ob=bpy.data.objects.new(name,data);scene.collection.objects.link(ob)
    ob.parent=rig
    group=ob.vertex_groups.new(name=bone)
    group.add(list(range(len(data.vertices))),1,'REPLACE')
    modifier=ob.modifiers.new('Shared student skeleton','ARMATURE');modifier.object=rig
    return ob

def ball(bm, center, size, mi=0):
    verts=bmesh.ops.create_uvsphere(bm,u_segments=12,v_segments=8,radius=1)['verts']
    bmesh.ops.scale(bm,verts=verts,vec=Vector(size)/2)
    bmesh.ops.translate(bm,verts=verts,vec=Vector(center))
    for face in {f for v in verts for f in v.link_faces}:face.material_index=mi;face.smooth=True

def duplicate(name, src):
    ob=bpy.data.objects[src].copy();ob.data=ob.data.copy();scene.collection.objects.link(ob)
    ob.name=ob.data.name=name
    return ob

def join(ob, details):
    bpy.ops.object.select_all(action='DESELECT')
    for o in [ob,*details]:o.select_set(True)
    bpy.context.view_layer.objects.active=ob;bpy.ops.object.join()

def label_geometry(bm, text, x, y, z, size=.06, mi=1):
    # Convert real vector lettering to mesh, preserving readable kit numbers.
    bpy.ops.object.select_all(action='DESELECT')
    cu=bpy.data.curves.new('embroidered lettering','FONT');cu.body=text;cu.size=size;cu.align_x='CENTER';cu.extrude=.001
    ob=bpy.data.objects.new('lettering',cu);scene.collection.objects.link(ob)
    ob.rotation_euler=(math.pi/2,0,0);ob.location=(x,y,z)
    bpy.context.view_layer.objects.active=ob;ob.select_set(True)
    bpy.ops.object.convert(target='MESH');ob=bpy.context.object
    temp=bmesh.new();temp.from_mesh(ob.data)
    for v in temp.verts:v.co=ob.matrix_world@v.co
    # Append via a temporary mesh to preserve polygon assignments.
    data=bpy.data.meshes.new('label temp');temp.to_mesh(data);temp.free()
    start=set(bm.faces);bm.from_mesh(data)
    for f in set(bm.faces)-start:f.material_index=mi
    bpy.data.objects.remove(ob,do_unlink=True);bpy.data.meshes.remove(data)

# Five distinct new outfits, all preserving the weighted limbs of the active character.
outfits=[('body_hoodie','body_camiseta','hoodie'),('body_bomber','body_camisa_bandana','bomber'),
         ('body_gamer','body_camiseta','gamer'),('body_football','body_camiseta','football'),
         ('body_basketball','body_camiseta','basketball')]
for name,src,style in outfits:
    ob=duplicate(name,src);bm=bmesh.new()
    # Use the original curved garment and its skin weights, rather than a box shell.
    fabric_slot=len(ob.data.materials);ob.data.materials.append(fabric)
    torso_groups={g.index for g in ob.vertex_groups if g.name in ('chest','spine')}
    torso=lambda v:sum(g.weight for g in v.groups if g.group in torso_groups)
    for face in ob.data.polygons:
        if sum(torso(ob.data.vertices[i]) for i in face.vertices)/len(face.vertices)>.65:
            face.material_index=fabric_slot;face.use_smooth=True
    if style in ('hoodie','bomber'):
        for vertex in ob.data.vertices:
            amount=torso(vertex)
            vertex.co.x*=1+.035*amount;vertex.co.y*=1+.055*amount
    ob.data.update()
    surface=BVHTree.FromPolygons([ob.matrix_world@v.co for v in ob.data.vertices],[list(p.vertices) for p in ob.data.polygons])
    def front(x,z):
        hit,normal,index,distance=surface.ray_cast(Vector((x,-2,z)),Vector((0,1,0)),4)
        return hit.y if hit is not None else -.30
    def seam(points,r=.008,mi=1):
        # Many samples keep piping snug against the curved original garment.
        samples=[]
        for a,b in zip(points,points[1:]):
            for j in range(8):
                x=a[0]+(b[0]-a[0])*j/8;z=a[1]+(b[1]-a[1])*j/8
                samples.append((x,front(x,z)-.007,z))
        x,z=points[-1];samples.append((x,front(x,z)-.007,z))
        add_tube(bm,samples,r,mi,8)
    def fitted_patch(cx,cz,w,h,mi=0):
        rings=[]
        for level in range(5):
            radius=level/4
            ring=[]
            for k in range(32):
                a=k*math.tau/32
                x=cx+w*.5*radius*math.cos(a);z=cz+h*.5*radius*math.sin(a)
                ring.append(bm.verts.new((x,front(x,z)-.007-.009*(1-radius*radius),z)))
            rings.append(ring)
        for a,b in zip(rings,rings[1:]):
            for k in range(32):
                face=bm.faces.new([a[k],a[(k+1)%32],b[(k+1)%32],b[k]])
                face.material_index=mi;face.smooth=True
    def embroidery(text,z,size,mi=1):
        before=set(bm.verts);label_geometry(bm,text,0,-.4,z,size,mi)
        for vertex in set(bm.verts)-before:
            vertex.co.y=front(vertex.co.x,vertex.co.z)-.009
    if style in ('hoodie','bomber'):
        if style=='hoodie':
            ball(bm,(0,.23,1.16),(.55,.28,.28),0)
            fitted_patch(0,.85,.39,.19)
            for x in (-.12,.12):seam([(x,1.15),(x*.85,1.04)],.008,1)
            for x in (-.14,.14):seam([(x,.80),(x*.85,.91)],.005,1)
        else:
            seam([(0,.72),(0,1.17)],.008,2)
            ball(bm,(.02,front(.02,.91)-.015,.91),(.025,.018,.04),3)
            for x in (-.21,.21):seam([(x,.81),(x*.65,.94)],.009,2)
            fitted_patch(-.16,1.05,.10,.065,1)
    else:
        for x in (-.25,.25):seam([(x,.76),(x*1.04,.96),(x*.88,1.12)],.010,1)
        if style=='gamer':
            fitted_patch(0,1.01,.23,.115,2)
            seam([(-.09,1.01),(-.04,1.01)],.006,1)
            seam([(-.065,.985),(-.065,1.035)],.006,1)
            for x,z in [(.065,1.025),(.084,1.005),(.045,1.005),(.065,.985)]:ball(bm,(x,front(x,z)-.021,z),(.013,.012,.013),1)
            embroidery('PLAY',.83,.055)
        else:
            embroidery('10' if style=='football' else '23',.90,.15,2)
            embroidery('EF VERSO',1.09,.045,2)
            if style=='basketball':
                seam([(-.15,1.17),(0,1.10),(.15,1.17)],.014,1)
            else:
                for x in (-.19,.19):seam([(x,.78),(x,1.12)],.013,1)
    detail=mesh(name+'_details',bm,[fabric,accent,dark,white],'chest');join(ob,[detail])

# Six hairstyles; the face retains its original skin atlas, the hair is newly modelled.
for name,style in [('head_crespo','afro'),('head_cacheado','curls'),('head_bob','bob'),
                   ('head_rabo','pony'),('head_trancas','braids'),('head_degrade','fade')]:
    ob=duplicate(name,'head_castanho');bm=bmesh.new();bm.from_mesh(ob.data)
    uv=bm.loops.layers.uv.active
    remove=[f for f in bm.faces if all(int(l[uv].uv.x*8)==1 and int((1-l[uv].uv.y)*4)==0 for l in f.loops)]
    bmesh.ops.delete(bm,geom=remove,context='FACES');bm.to_mesh(ob.data);bm.free()
    bm=bmesh.new()
    # Closed scalp cap prevents gaps between the newly sculpted locks.
    rings=[]
    for j in range(9):
        theta=.015+j*(math.pi/2+.10)/8
        ring=[]
        for k in range(24):
            phi=k*math.tau/24
            ring.append(bm.verts.new((.53*math.sin(theta)*math.cos(phi),.01+.49*math.sin(theta)*math.sin(phi),1.94+.40*math.cos(theta))))
        rings.append(ring)
    for a,b in zip(rings,rings[1:]):
        for k in range(24):bm.faces.new([a[k],a[(k+1)%24],b[(k+1)%24],b[k]]).smooth=True
    cap_verts=set(bm.verts)
    if style in ('afro','curls'):
        # Overlapping sculpted locks, distributed on a dome with a clear forehead.
        radius=.58 if style=='afro' else .54
        for ring in range(5):
            theta=.18+ring*.30
            for i in range(10+ring*4):
                phi=i*math.tau/(10+ring*4)+ring*.17
                x=radius*math.sin(theta)*math.cos(phi);y=radius*.94*math.sin(theta)*math.sin(phi)+.02
                z=1.69+radius*math.cos(theta)*.78
                ball(bm,(x,y,z),(.22,.22,.23) if style=='afro' else (.17,.18,.16))
    elif style=='bob':
        ball(bm,(0,.11,1.85),(.91,.70,.48))
        for side in (-1,1):
            for i in range(5):ball(bm,(side*(.39+.015*math.sin(i)),.20-i*.115,1.64),(.18,.22,.65))
        for i in range(7):ball(bm,(-.32+i*.105,-.36,1.88),(.15,.18,.27))
    elif style=='pony':
        ball(bm,(0,.08,1.88),(.90,.78,.41))
        ball(bm,(0,.49,1.85),(.25,.24,.25),1)
        for i in range(6):ball(bm,(.025*math.sin(i),.54+i*.055,1.83-i*.065),(.27-i*.02,.25,.27))
    elif style=='braids':
        ball(bm,(0,.09,1.87),(.88,.73,.37))
        for side in (-1,1):
            for i in range(9):
                ball(bm,(side*(.43+.025*math.sin(i*math.pi/2)),.10,1.83-i*.075),(.16,.19,.15))
            ball(bm,(side*.43,.1,1.22),(.17,.19,.055),1)
    else:
        ball(bm,(0,.10,1.84),(.88,.77,.30))
        for i in range(6):ball(bm,(-.30+i*.12,-.05,1.99+i*.009),(.16,.56,.18))
        for side in (-1,1):add_tube(bm,[(side*.43,-.18,1.78),(side*.44,.2,1.78)],.018,1)
    # The original students have a large stylized cranium; align locks to that crown.
    for vertex in bm.verts:
        if vertex not in cap_verts:vertex.co.z+=.25
    for side in (-1,1):
        ball(bm,(side*.47,-.10,1.84),(.12,.24,.24))
    for side in (-1,1):add_tube(bm,[(side*.10,-.49,1.77),(side*.27,-.47,1.79)],.021,0)
    detail=mesh(name+'_locks',bm,[hair,accent],'head');join(ob,[detail])

# Three more frames, in addition to the two existing pairs.
for name,style in [('acc_glasses_square','square'),('acc_glasses_cat','cat'),('acc_glasses_sport','sport')]:
    bm=bmesh.new();y=-.515
    for side in (-1,1):
        x=side*.18
        if style=='sport':pts=[(x-.14,y,1.66),(x+.14,y,1.66),(x+.12,y,1.54),(x-.1,y,1.54),(x-.14,y,1.66)]
        elif style=='cat':pts=[(x-.14,y,1.66),(x+side*.16,y,1.72),(x+.12,y,1.56),(x-.10,y,1.56),(x-.14,y,1.66)]
        else:pts=[(x-.13,y,1.70),(x+.13,y,1.70),(x+.13,y,1.51),(x-.13,y,1.51),(x-.13,y,1.70)]
        add_tube(bm,pts,.018,0)
        add_tube(bm,[(side*.32,y,1.66),(side*.47,-.2,1.66),(side*.48,.06,1.60)],.016,0)
        if style=='sport':add_box(bm,(x,y+.012,1.60),(.23,.015,.08),1,.012)
    add_tube(bm,[(-.05,y,1.64),(.05,y,1.64)],.014,0)
    mesh(name,bm,[dark,metal])

# Four new bags with different silhouettes, hardware, pockets and straps.
for name,style in [('acc_bag_sport','sport'),('acc_bag_gamer','gamer'),('acc_bag_satchel','satchel'),('acc_bag_hiking','hiking')]:
    bm=bmesh.new();w=.70 if style=='satchel' else .58;h=.72 if style=='hiking' else .54
    add_box(bm,(0,.50,.96),(w,.30,h),0,.065)
    add_box(bm,(0,.68,.86),(w*.72,.09,.25),0,.025)
    add_tube(bm,[(-w*.32,.735,.94),(w*.32,.735,.94)],.008,2)
    add_box(bm,(w*.30,.747,.925),(.025,.015,.035),2,.004)
    for x in (-.20,.20):add_tube(bm,[(x,.48,1.18),(x,.0,1.30),(x,-.32,1.15),(x,-.34,.85)],.028,1)
    add_tube(bm,[(-.09,.49,1.25),(-.09,.49,1.33),(.09,.49,1.33),(.09,.49,1.25)],.017,1)
    if style=='sport':
        for x in (-.15,0,.15):add_box(bm,(x,.752,.84),(.028,.012,.16),3,.003)
    elif style=='gamer':
        for i in range(5):add_box(bm,(-.12+i*.06,.75,.85+(.04 if i%2 else 0)),(.045,.014,.045),3)
    elif style=='satchel':add_box(bm,(0,.67,1.11),(.68,.045,.16),1,.025)
    else:
        for x in (-.36,.36):add_box(bm,(x,.49,.87),(.12,.22,.29),0,.025)
        for z in (.83,1.1):add_tube(bm,[(-.28,.69,z),(.28,.69,z)],.018,1)
    mesh(name,bm,[bagmat,dark,metal,accent],'chest')

# Four hearing aid fits: paired, compact, rechargeable and with retaining cord.
for name,style in [('acc_hearing_pair','pair'),('acc_hearing_compact','compact'),('acc_hearing_recharge','recharge'),('acc_hearing_cord','cord')]:
    bm=bmesh.new()
    for side in (-1,1) if style in ('pair','cord') else (1,):
        x=side*.52
        add_box(bm,(x,.02,1.57),(.055,.10,.13 if style=='compact' else .19),0,.019)
        add_tube(bm,[(x,.03,1.64),(x,-.08,1.70),(x,-.15,1.61)],.012,1)
        add_box(bm,(x+side*.03,-.012,1.59),(.009,.035,.025),1,.003)
        if style=='recharge':ball(bm,(x+.03,-.015,1.53),(.013,.018,.014),2)
    if style=='cord':add_tube(bm,[(-.52,.06,1.52),(-.32,.30,1.29),(0,.34,1.20),(.32,.30,1.29),(.52,.06,1.52)],.009,1)
    mesh(name,bm,[bagmat,metal,accent])

# Four wheelchair frame variants, retaining the seated animation and exact seat fit.
for i,name in enumerate(['acc_chair_active','acc_chair_sport','acc_chair_comfort','acc_chair_urban']):
    ob=duplicate(name,'acc_wheelchair')
    ob.data.materials[1]=material('Wear_chair_'+str(i),[(.15,.65,.55),(.93,.40,.17),(.55,.31,.72),(.16,.24,.32)][i],.5,.25)
    bm=bmesh.new()
    # Distinct side guards and spoke guards; comfort gets padded armrests.
    for side in (-1,1):
        x=side*.36
        if i==1:
            for k in range(8):
                a=k*math.tau/8
                add_tube(bm,[(x,.05,.42),(x,.05+math.cos(a)*.34,.42+math.sin(a)*.34)],.008,0)
        if i==2:add_box(bm,(side*.31,-.05,.94),(.11,.48,.08),1,.025)
        else:add_box(bm,(side*.32,.03,.74),(.035,.36,.16),0,.018)
    detail=mesh(name+'_frame',bm,[accent,dark],'root');join(ob,[detail])

bpy.context.preferences.filepaths.save_version=0
# Embed source textures so the editable project is portable.
bpy.ops.file.pack_all()
blend=ROOT/'art-source/wardrobe-collection.blend'
bpy.ops.wm.save_as_mainfile(filepath=str(blend))
out=ROOT/'public/models/students/wardrobe-collection.glb'
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',export_yup=True,
    export_animations=False,export_skins=True,export_morph=False,export_def_bones=False)
manifest={o.name:len(o.data.polygons) for o in scene.objects if o.type=='MESH'}
(ROOT/'art-source/wardrobe-collection.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
print('WARDROBE_EXPORTED',out.stat().st_size,manifest)
