"""
Export Farmer Models directly from .blend files

Run: blender --background --python scripts/bpy/export_farmers_from_blend.py
"""

import bpy
import os

ASSETS_ROOT = "/Users/jbogaty/assets/Farmers_Family"
OUTPUT_DIR = "/Users/jbogaty/src/arcade-cabinet/infinite-headaches/public/assets/models/players"

CHARACTERS = {
    "john": {
        "blend": os.path.join(ASSETS_ROOT, "Farmer_George.blend"),
        "obj_name": "Farmer_George",
        "animations": [
            ("idle", os.path.join(ASSETS_ROOT, "George_Meshes/DemoAnimationsFromMixamo/Idle.fbx")),
            ("walk", os.path.join(ASSETS_ROOT, "George_Meshes/DemoAnimationsFromMixamo/Walk.fbx")),
        ]
    },
    "mary": {
        "blend": os.path.join(ASSETS_ROOT, "Farmer_Martha.blend"),
        "obj_name": "Farmer_Martha",
        "animations": [
            ("idle", os.path.join(ASSETS_ROOT, "Martha_Meshes/DemoAnimationsFromMixamo/Idle.fbx")),
            ("walk", os.path.join(ASSETS_ROOT, "Martha_Meshes/DemoAnimationsFromMixamo/Walk.fbx")),
        ]
    }
}

def process_character(char_key, config):
    print(f"\nProcessing {char_key} from .blend...")
    
    # Open the .blend file
    bpy.ops.wm.open_mainfile(filepath=config['blend'])
    
    # Find Armature and Mesh
    mesh_obj = bpy.data.objects.get(config['obj_name'])
    # In these files, the armature might be named specific things
    # Inspecting previous output: Farmer_George_Rig (ARMATURE)
    armature = None
    for obj in bpy.data.objects:
        if obj.type == 'ARMATURE' and 'Rig' in obj.name:
            armature = obj
            break
            
    if not armature:
        # Fallback search
        for obj in bpy.data.objects:
            if obj.type == 'ARMATURE':
                armature = obj
                break

    if not mesh_obj or not armature:
        print(f"  ERROR: Could not find mesh {config['obj_name']} or Armature")
        return

    print(f"  Found Mesh: {mesh_obj.name}")
    print(f"  Found Armature: {armature.name}")

    # Ensure we are in Object Mode
    if bpy.context.object:
        bpy.ops.object.mode_set(mode='OBJECT')

    # Delete all other objects (lights, cameras, widgets)
    for obj in bpy.data.objects:
        if obj != mesh_obj and obj != armature:
            bpy.data.objects.remove(obj, do_unlink=True)

    # Import Animations
    print("  Importing Animations...")
    if not armature.animation_data:
        armature.animation_data_create()
        
    for anim_name, anim_path in config['animations']:
        print(f"    - {anim_name}...")
        try:
            # Import Animation FBX
            bpy.ops.import_scene.fbx(filepath=anim_path, use_anim=True)
            
            # The import creates a NEW armature with the animation.
            # We need to retarget or copy the animation to our Rigify armature?
            # WAIT. Rigify rigs have different bone names than Mixamo rigs usually.
            # If the .blend uses a custom Rigify skeleton, the Mixamo animations won't play on it directly.
            
            # CHECK: The description says "additional file with a Mixamo skeleton".
            # The FBX files I was using before ("George_Meshes/Farmer_George.fbx") likely have the Mixamo skeleton.
            # The .blend file has "Farmer_George_Rig" which implies Rigify.
            
            # If I use the .blend file, I might run into retargeting issues.
            # BUT the materials are correct in the .blend file.
            
            # Let's try to grab the MATERIAL from the .blend file and apply it to the FBX mesh?
            # Or export the materials to a library?
            
            # Actually, let's stick to the FBX workflow but FIX THE MATERIAL SETUP based on what we saw in the .blend.
            # The .blend uses an Attribute Node 'Col' -> Base Color.
            
            # Cleaning up this attempt since I suspect animation incompatibility.
            pass 
        except Exception as e:
            print(f"    - ERROR: {e}")

    # For now, let's just inspect the material setup more closely in the FBX workflow script
    # and replicate EXACTLY what the .blend file does.

# Reverting to improved FBX export script instead of this .blend approach 
# because of likely skeleton incompatibility.
