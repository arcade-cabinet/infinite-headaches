"""
Export Farmer Models for Homestead Headaches

Method: Import FBX, Setup Materials to use Vertex Colors ('Col') via Attribute Node, Export GLB.
"""

import bpy
import os

# --- CONFIGURATION ---
ASSETS_ROOT = "/Users/jbogaty/assets/Farmers_Family"
OUTPUT_DIR = "/Users/jbogaty/src/arcade-cabinet/infinite-headaches/public/assets/models/players"

CHARACTERS = {
    "john": {
        "fbx": os.path.join(ASSETS_ROOT, "George_Meshes/Farmer_George.fbx"),
        "mesh_name": "Farmer_George",
        "animations": [
            ("idle", os.path.join(ASSETS_ROOT, "George_Meshes/DemoAnimationsFromMixamo/Idle.fbx")),
            ("walk", os.path.join(ASSETS_ROOT, "George_Meshes/DemoAnimationsFromMixamo/Walk.fbx")),
        ]
    },
    "mary": {
        "fbx": os.path.join(ASSETS_ROOT, "Martha_Meshes/Farmer_Martha.fbx"),
        "mesh_name": "Farmer_Martha",
        "animations": [
            ("idle", os.path.join(ASSETS_ROOT, "Martha_Meshes/DemoAnimationsFromMixamo/Idle.fbx")),
            ("walk", os.path.join(ASSETS_ROOT, "Martha_Meshes/DemoAnimationsFromMixamo/Walk.fbx")),
        ]
    }
}

def setup_material_vertex_color(mat, mesh_obj):
    print(f"  Setting up VColor material: {mat.name}")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()
    
    # Principled BSDF
    bsdf = nodes.new(type='ShaderNodeBsdfPrincipled')
    bsdf.location = (0,0)
    bsdf.inputs['Metallic'].default_value = 0.0
    bsdf.inputs['Roughness'].default_value = 0.8
    
    # Output
    output = nodes.new(type='ShaderNodeOutputMaterial')
    output.location = (300,0)
    links.new(bsdf.outputs['BSDF'], output.inputs['Surface'])
    
    # Attribute Node
    attr_node = nodes.new(type='ShaderNodeAttribute')
    attr_node.location = (-300, 0)
    attr_node.attribute_name = "Col" 
    
    links.new(attr_node.outputs['Color'], bsdf.inputs['Base Color'])

def process_character(char_key, config):
    print(f"\nProcessing {char_key}...")
    
    bpy.ops.wm.read_factory_settings(use_empty=True)
    
    print(f"  Importing FBX: {config['fbx']}")
    bpy.ops.import_scene.fbx(filepath=config['fbx'], use_anim=False)
    
    armature = None
    mesh_obj = None
    for obj in bpy.data.objects:
        if obj.type == 'ARMATURE': armature = obj
        elif obj.type == 'MESH' and config['mesh_name'] in obj.name: mesh_obj = obj
            
    if not armature or not mesh_obj:
        print("  ERROR: Missing Armature or Mesh")
        return

    armature.location = (0,0,0)
    bpy.context.view_layer.objects.active = armature
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    if not mesh_obj.data.vertex_colors or "Col" not in mesh_obj.data.vertex_colors:
        if mesh_obj.data.vertex_colors:
            mesh_obj.data.vertex_colors[0].name = "Col"

    print("  Processing Materials...")
    for mat in mesh_obj.data.materials:
        setup_material_vertex_color(mat, mesh_obj)

    print("  Importing Animations...")
    if not armature.animation_data:
        armature.animation_data_create()
        
    for anim_name, anim_path in config['animations']:
        print(f"    - {anim_name}...")
        try:
            bpy.ops.import_scene.fbx(filepath=anim_path, use_anim=True)
            imported_armature = bpy.context.selected_objects[0]
            if imported_armature.animation_data and imported_armature.animation_data.action:
                action = imported_armature.animation_data.action
                action.name = anim_name
                track = armature.animation_data.nla_tracks.new()
                track.name = anim_name
                track.strips.new(anim_name, int(action.frame_range[0]), action)
            bpy.data.objects.remove(imported_armature)
        except Exception as e:
            print(f"    - ERROR: {e}")

    output_path = os.path.join(OUTPUT_DIR, f"{char_key}.glb")
    print(f"  Exporting to {output_path}")
    
    bpy.ops.object.select_all(action='DESELECT')
    armature.select_set(True)
    mesh_obj.select_set(True)
    
    # Note: export_colors was removed in recent Blender glTF exporter versions
    # or it is enabled by default if materials use them.
    # We remove the explicit kwarg to avoid error.
    
    bpy.ops.export_scene.gltf(
        filepath=output_path,
        check_existing=False,
        export_format='GLB',
        use_selection=True,
        export_materials='EXPORT',
        export_animations=True,
        export_nla_strips=True,
        export_def_bones=True,
    )
    print("  Done.")

os.makedirs(OUTPUT_DIR, exist_ok=True)

for key, conf in CHARACTERS.items():
    process_character(key, conf)