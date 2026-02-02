#!/usr/bin/env python3
"""
Homestead Headaches - Farmer Portrait Renderer

Renders front-facing portraits of the farmer GLB models to PNG with transparent
backgrounds. These portraits are used on the main menu character selector.

The farmer models are Mixamo-rigged GLBs with armatures. This script:
  1. Loads each farmer GLB
  2. Resets the armature to rest pose (T-pose avoided via bone rotation)
  3. Positions a front-facing camera for an upper-body portrait
  4. Renders with studio lighting and transparent background

Run:
  blender --background --python scripts/render-farmer-portraits.py

Requirements:
  - Blender 3.6+ with glTF importer
"""

import bpy
import mathutils
import os
import math

# ── Paths ────────────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
MODELS_DIR = os.path.join(PROJECT_ROOT, "public", "assets", "models", "farmers")
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "public", "assets", "sprites")

# ── Farmer definitions ───────────────────────────────────────
FARMERS = [
    {
        "id": "john",
        "glb": os.path.join(MODELS_DIR, "john.glb"),
        "output": "farmer_john_portrait.png",
        "label": "Farmer John",
    },
    {
        "id": "mary",
        "glb": os.path.join(MODELS_DIR, "mary.glb"),
        "output": "farmer_mary_portrait.png",
        "label": "Farmer Mary",
    },
]

# ── Render config ────────────────────────────────────────────
RENDER_WIDTH = 512
RENDER_HEIGHT = 640   # Taller than wide for portrait crop
SAMPLES = 128         # Cycles samples
CAMERA_ORTHO_SCALE = 1.1  # Tight upper-body portrait crop


def clear_scene():
    """Remove every object and orphan data block."""
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)

    for collection_name in ["meshes", "materials", "armatures", "actions", "images"]:
        collection = getattr(bpy.data, collection_name, None)
        if collection is None:
            continue
        for block in list(collection):
            if block.users == 0:
                collection.remove(block)


def setup_render():
    """Configure Cycles render with transparent background."""
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = SAMPLES
    scene.cycles.use_denoising = True

    scene.render.resolution_x = RENDER_WIDTH
    scene.render.resolution_y = RENDER_HEIGHT
    scene.render.resolution_percentage = 100

    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.compression = 15

    # Use Metal GPU on macOS if available
    prefs = bpy.context.preferences.addons.get("cycles")
    if prefs:
        try:
            prefs.preferences.compute_device_type = "METAL"
            scene.cycles.device = "GPU"
        except Exception:
            pass  # Fall back to CPU


def setup_camera(center_y=0.0, center_z=1.0):
    """
    Create an orthographic camera facing the model from the front.

    The camera looks along -Y toward the model (model faces +Y in Blender
    after GLB import with default glTF axes).
    """
    cam_data = bpy.data.cameras.new("PortraitCam")
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = CAMERA_ORTHO_SCALE

    cam_obj = bpy.data.objects.new("PortraitCam", cam_data)
    bpy.context.scene.collection.objects.link(cam_obj)

    # Front-facing: camera in front of model, looking along +Y
    cam_obj.location = (0, -4, center_z)
    cam_obj.rotation_euler = (math.radians(90), 0, 0)

    bpy.context.scene.camera = cam_obj
    return cam_obj


def setup_lighting():
    """Three-point studio lighting for character portraits."""
    # Key light — warm, from front-right above
    key = bpy.data.lights.new("Key", "AREA")
    key.energy = 600
    key.size = 3
    key.color = (1.0, 0.95, 0.9)
    key_obj = bpy.data.objects.new("Key", key)
    bpy.context.scene.collection.objects.link(key_obj)
    key_obj.location = (1.5, -3, 2.5)
    key_obj.rotation_euler = (math.radians(55), 0, math.radians(25))

    # Fill light — cool, from front-left
    fill = bpy.data.lights.new("Fill", "AREA")
    fill.energy = 250
    fill.size = 4
    fill.color = (0.9, 0.95, 1.0)
    fill_obj = bpy.data.objects.new("Fill", fill)
    bpy.context.scene.collection.objects.link(fill_obj)
    fill_obj.location = (-1.5, -2.5, 1.5)
    fill_obj.rotation_euler = (math.radians(65), 0, math.radians(-20))

    # Rim light — white edge light from behind
    rim = bpy.data.lights.new("Rim", "AREA")
    rim.energy = 350
    rim.size = 2
    rim.color = (1.0, 1.0, 1.0)
    rim_obj = bpy.data.objects.new("Rim", rim)
    bpy.context.scene.collection.objects.link(rim_obj)
    rim_obj.location = (0, 3, 2.5)
    rim_obj.rotation_euler = (math.radians(120), 0, math.radians(180))


def load_farmer_glb(filepath):
    """
    Import a farmer GLB and return (armature, mesh_objects).

    Farmer GLBs contain a Mixamo-rigged armature + one or more mesh children.
    """
    bpy.ops.import_scene.gltf(filepath=filepath)

    armature = None
    meshes = []

    for obj in bpy.context.selected_objects:
        if obj.type == "ARMATURE":
            armature = obj
        elif obj.type == "MESH":
            meshes.append(obj)

    # If meshes are children of the armature, collect them too
    if armature:
        for child in armature.children:
            if child.type == "MESH" and child not in meshes:
                meshes.append(child)

    return armature, meshes


def get_model_bounds(objects):
    """Calculate world-space bounding box across all objects."""
    min_co = [float("inf")] * 3
    max_co = [float("-inf")] * 3

    for obj in objects:
        # Use evaluated mesh to account for armature deformation
        depsgraph = bpy.context.evaluated_depsgraph_get()
        eval_obj = obj.evaluated_get(depsgraph)

        if eval_obj.type == "MESH" and eval_obj.data:
            for vert in eval_obj.data.vertices:
                world_co = eval_obj.matrix_world @ vert.co
                for i in range(3):
                    min_co[i] = min(min_co[i], world_co[i])
                    max_co[i] = max(max_co[i], world_co[i])
        else:
            # Fallback to bounding box corners
            for corner in obj.bound_box:
                world_co = obj.matrix_world @ mathutils.Vector(corner)
                for i in range(3):
                    min_co[i] = min(min_co[i], world_co[i])
                    max_co[i] = max(max_co[i], world_co[i])

    return min_co, max_co


def pose_idle(armature):
    """
    Set the armature to a natural idle pose.

    Rest pose on Mixamo rigs is T-pose. We rotate the shoulder and upper
    arm bones down using quaternion rotations to get relaxed arms at the
    character's sides, suitable for a portrait.
    """
    if not armature or armature.type != "ARMATURE":
        return

    bpy.context.view_layer.objects.active = armature
    bpy.ops.object.mode_set(mode="POSE")

    pose = armature.pose

    # Mixamo T-pose has arms at ~90 degrees out. Rotate them down to
    # rest at the character's sides. Using quaternion rotation for
    # reliable axis behavior across different bone orientations.
    arm_rotations = {
        # Upper arms: rotate down ~70 degrees (strong enough to reach sides)
        "mixamorig:LeftArm": mathutils.Euler((0, 0, math.radians(68)), "XYZ"),
        "mixamorig:RightArm": mathutils.Euler((0, 0, math.radians(-68)), "XYZ"),
        # Shoulders: slight inward rotation
        "mixamorig:LeftShoulder": mathutils.Euler((0, 0, math.radians(8)), "XYZ"),
        "mixamorig:RightShoulder": mathutils.Euler((0, 0, math.radians(-8)), "XYZ"),
        # Forearms: slight bend for natural look
        "mixamorig:LeftForeArm": mathutils.Euler((0, math.radians(-25), 0), "XYZ"),
        "mixamorig:RightForeArm": mathutils.Euler((0, math.radians(25), 0), "XYZ"),
    }

    for bone_name, euler in arm_rotations.items():
        bone = pose.bones.get(bone_name)
        if bone:
            bone.rotation_mode = "QUATERNION"
            bone.rotation_quaternion = euler.to_quaternion()

    bpy.ops.object.mode_set(mode="OBJECT")

    # Force depsgraph update so bounds reflect the posed mesh
    bpy.context.view_layer.update()


def render_farmer(farmer_config):
    """Load, pose, frame, and render one farmer portrait."""
    label = farmer_config["label"]
    glb_path = farmer_config["glb"]
    output_name = farmer_config["output"]

    print(f"\n{'=' * 50}")
    print(f"Rendering: {label}")
    print(f"{'=' * 50}")

    if not os.path.exists(glb_path):
        print(f"  ERROR: GLB not found: {glb_path}")
        return False

    # Clean slate
    clear_scene()
    setup_lighting()

    # Load model
    armature, meshes = load_farmer_glb(glb_path)
    if not meshes:
        print(f"  ERROR: No mesh objects imported from {glb_path}")
        return False

    print(f"  Armature: {armature.name if armature else 'None'}")
    print(f"  Meshes: {[m.name for m in meshes]}")

    # Pose arms down from T-pose
    pose_idle(armature)

    # Calculate bounds of the posed model
    min_co, max_co = get_model_bounds(meshes)

    height = max_co[2] - min_co[2]
    center_x = (min_co[0] + max_co[0]) / 2
    center_z = (min_co[2] + max_co[2]) / 2

    print(f"  Model height: {height:.2f}")
    print(f"  Center: ({center_x:.2f}, {center_z:.2f})")

    # Portrait framing: focus on upper body (chest/face area)
    portrait_center_z = min_co[2] + height * 0.75
    setup_camera(center_y=0, center_z=portrait_center_z)

    # Center model on X axis under camera
    if armature:
        armature.location.x -= center_x
    else:
        for m in meshes:
            m.location.x -= center_x

    # Render
    output_path = os.path.join(OUTPUT_DIR, output_name)
    bpy.context.scene.render.filepath = output_path

    print(f"  Rendering to: {output_path}")
    bpy.ops.render.render(write_still=True)
    print(f"  Done: {output_name}")
    return True


def main():
    print("\n" + "=" * 60)
    print("Homestead Headaches - Farmer Portrait Renderer")
    print("=" * 60)

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    setup_render()

    results = []
    for farmer in FARMERS:
        ok = render_farmer(farmer)
        results.append((farmer["label"], ok))

    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    for label, ok in results:
        print(f"  {label}: {'OK' if ok else 'FAILED'}")

    ok_count = sum(1 for _, ok in results if ok)
    print(f"\n  {ok_count}/{len(results)} portraits rendered")
    print(f"  Output: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
