import bpy
import os
import sys

# Paths (relative to this script, not CWD)
_script_dir = os.path.dirname(os.path.abspath(__file__))
_project_root = os.path.abspath(os.path.join(_script_dir, "..", ".."))
source_dir = os.path.join(_project_root, "FarmAnimals_v1.1")
target_dir = os.path.join(_project_root, "public", "assets", "models")

if not os.path.exists(target_dir):
    os.makedirs(target_dir)

# Mapping specific files to generic game names
name_map = {
    "ChickenBrown.fbx": "chicken",
    "CowBlW.fbx": "cow",
    "DuckWhite.fbx": "duck",
    "Pig.fbx": "pig",
    "SheepWhite.fbx": "sheep"
}

def reset_scene():
    # Ensure we're in OBJECT mode before operating on objects
    if bpy.context.object and bpy.context.object.mode != 'OBJECT':
        bpy.ops.object.mode_set(mode='OBJECT')

    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()

    # Delete all collections/materials/etc to be clean
    for block in bpy.data.meshes:
        bpy.data.meshes.remove(block)
    for block in bpy.data.materials:
        bpy.data.materials.remove(block)
    for block in bpy.data.textures:
        bpy.data.textures.remove(block)
    for block in bpy.data.images:
        bpy.data.images.remove(block)

def setup_vertex_colors_material():
    """
    Ensures that if a mesh has vertex colors, they are connected to a material
    so the GLTF exporter includes them.
    """
    for obj in bpy.context.selected_objects:
        if obj.type == 'MESH':
            mesh = obj.data
            if mesh.vertex_colors:
                # Get or create material
                mat = None
                if len(mesh.materials) > 0:
                    mat = mesh.materials[0]
                else:
                    mat = bpy.data.materials.new(name="VertexColorMat")
                    mesh.materials.append(mat)
                
                mat.use_nodes = True
                nodes = mat.node_tree.nodes
                links = mat.node_tree.links
                
                # Clear existing nodes except Material Output
                for n in list(nodes):
                    if n.type != 'OUTPUT_MATERIAL':
                        nodes.remove(n)

                # Reuse existing Output node or create one
                node_output = next((n for n in nodes if n.type == 'OUTPUT_MATERIAL'), None)
                if not node_output:
                    node_output = nodes.new(type='ShaderNodeOutputMaterial')
                node_output.location = (400, 0)
                node_principled = nodes.new(type='ShaderNodeBsdfPrincipled')
                node_principled.location = (0, 0)
                
                # Create Attribute Node for Vertex Color
                node_attribute = nodes.new(type='ShaderNodeVertexColor') # Or ShaderNodeAttribute
                node_attribute.location = (-200, 0)
                # Usually the default vertex color layer is named "Col" or similar.
                # ShaderNodeVertexColor uses active layer by default if name is empty
                # But let's check layer name
                if mesh.vertex_colors.active:
                    vc_layer_name = mesh.vertex_colors.active.name
                    node_attribute.layer_name = vc_layer_name
                
                # Link Color -> Base Color
                links.new(node_attribute.outputs['Color'], node_principled.inputs['Base Color'])
                links.new(node_principled.outputs['BSDF'], node_output.inputs['Surface'])
                
                print(f"Setup material for {obj.name} with vertex color layer")

print("Starting conversion...")

for filename, target_name in name_map.items():
    filepath = os.path.join(source_dir, filename)
    
    if not os.path.exists(filepath):
        print(f"Warning: {filename} not found in source directory.")
        continue
        
    print(f"Processing {filename} -> {target_name}.glb")
    
    reset_scene()
    
    # Import FBX
    bpy.ops.import_scene.fbx(filepath=filepath)
    
    # Ensure we are in object mode
    if bpy.context.object and bpy.context.object.mode != 'OBJECT':
        bpy.ops.object.mode_set(mode='OBJECT')

    # Select all imported objects to process materials
    bpy.ops.object.select_all(action='SELECT')
    setup_vertex_colors_material()

    # Export GLB
    out_path = os.path.join(target_dir, f"{target_name}.glb")
    
    bpy.ops.export_scene.gltf(
        filepath=out_path,
        export_format='GLB',
        export_apply=True, # Apply modifiers
        export_animations=True
    )
    
    print(f"Exported {out_path}")

print("Conversion complete.")
