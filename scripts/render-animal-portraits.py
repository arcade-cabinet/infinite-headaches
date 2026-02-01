#!/usr/bin/env python3
"""
Homestead Headaches - Animal Portrait Renderer

Renders front-facing portraits of 3D animal models to PNG with transparent backgrounds.
Uses Blender's Python API (bpy) to load GLB models and render them.

Run with: blender --background --python scripts/render-animal-portraits.py

Requirements:
- Blender 3.0+ installed and available in PATH
"""

import bpy
import mathutils
import os
import sys
import math

# Configuration
MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "public", "assets", "models")
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "public", "assets", "sprites")

# Animals to render (model filename without extension -> output filename)
ANIMALS = {
    "cow": "cow_portrait.png",
    "pig": "pig_portrait.png",
    "chicken": "chicken_portrait.png",
    "duck": "duck_portrait.png",
    "sheep": "sheep_portrait.png",
}

# Render settings
RENDER_SIZE = 512  # Square output
SAMPLES = 64  # Cycles samples for quality


def clear_scene():
    """Remove all objects from the scene"""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)

    # Clear orphan data
    for block in bpy.data.meshes:
        if block.users == 0:
            bpy.data.meshes.remove(block)
    for block in bpy.data.materials:
        if block.users == 0:
            bpy.data.materials.remove(block)


def setup_render_settings():
    """Configure render settings for portrait output"""
    scene = bpy.context.scene

    # Use Cycles for better quality
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = SAMPLES
    scene.cycles.use_denoising = True

    # Output settings
    scene.render.resolution_x = RENDER_SIZE
    scene.render.resolution_y = RENDER_SIZE
    scene.render.resolution_percentage = 100

    # Transparent background
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.render.image_settings.compression = 15

    # Use GPU if available
    prefs = bpy.context.preferences.addons.get('cycles')
    if prefs:
        prefs.preferences.compute_device_type = 'METAL'  # macOS
        bpy.context.scene.cycles.device = 'GPU'


def setup_camera():
    """Create and position camera for front-facing portrait"""
    # Create camera
    cam_data = bpy.data.cameras.new("PortraitCamera")
    cam_data.type = 'ORTHO'  # Orthographic for consistent sizing
    cam_data.ortho_scale = 2.5  # Adjust based on model size

    cam_obj = bpy.data.objects.new("PortraitCamera", cam_data)
    bpy.context.scene.collection.objects.link(cam_obj)

    # Position camera in front of model, slightly above center
    cam_obj.location = (0, -5, 0.5)
    cam_obj.rotation_euler = (math.radians(90), 0, 0)

    # Set as active camera
    bpy.context.scene.camera = cam_obj

    return cam_obj


def setup_lighting():
    """Create soft studio lighting for portraits"""
    # Key light (main light from front-right)
    key_data = bpy.data.lights.new("KeyLight", 'AREA')
    key_data.energy = 500
    key_data.size = 3
    key_data.color = (1.0, 0.95, 0.9)  # Warm white

    key_obj = bpy.data.objects.new("KeyLight", key_data)
    bpy.context.scene.collection.objects.link(key_obj)
    key_obj.location = (2, -3, 2)
    key_obj.rotation_euler = (math.radians(60), 0, math.radians(30))

    # Fill light (softer from left)
    fill_data = bpy.data.lights.new("FillLight", 'AREA')
    fill_data.energy = 200
    fill_data.size = 4
    fill_data.color = (0.9, 0.95, 1.0)  # Cool white

    fill_obj = bpy.data.objects.new("FillLight", fill_data)
    bpy.context.scene.collection.objects.link(fill_obj)
    fill_obj.location = (-2, -2, 1)
    fill_obj.rotation_euler = (math.radians(70), 0, math.radians(-20))

    # Rim light (from behind for edge definition)
    rim_data = bpy.data.lights.new("RimLight", 'AREA')
    rim_data.energy = 300
    rim_data.size = 2
    rim_data.color = (1.0, 1.0, 1.0)

    rim_obj = bpy.data.objects.new("RimLight", rim_data)
    bpy.context.scene.collection.objects.link(rim_obj)
    rim_obj.location = (0, 3, 2)
    rim_obj.rotation_euler = (math.radians(120), 0, math.radians(180))


def load_glb(filepath):
    """Load a GLB file and return the imported objects"""
    # Import GLB
    bpy.ops.import_scene.gltf(filepath=filepath)

    # Get all mesh objects that were imported
    imported = [obj for obj in bpy.context.selected_objects if obj.type == 'MESH']

    return imported


def center_and_scale_model(objects):
    """Center the model and scale to fit in frame"""
    if not objects:
        return

    # Calculate bounding box of all objects
    min_coords = [float('inf')] * 3
    max_coords = [float('-inf')] * 3

    for obj in objects:
        for vertex in obj.bound_box:
            world_vertex = obj.matrix_world @ mathutils.Vector(vertex)
            for i in range(3):
                min_coords[i] = min(min_coords[i], world_vertex[i])
                max_coords[i] = max(max_coords[i], world_vertex[i])

    # Calculate center and size
    center = [(min_coords[i] + max_coords[i]) / 2 for i in range(3)]
    size = max(max_coords[i] - min_coords[i] for i in range(3))

    # Target size (fit in ortho scale)
    target_size = 1.8
    scale_factor = target_size / size if size > 0 else 1

    # Apply centering and scaling to all objects
    for obj in objects:
        # Move to center
        obj.location.x -= center[0]
        obj.location.y -= center[1]
        obj.location.z -= center[2]

        # Scale uniformly
        obj.scale *= scale_factor


def render_portrait(model_name, output_filename):
    """Render a single animal portrait"""
    print(f"\n{'='*50}")
    print(f"Rendering: {model_name}")
    print(f"{'='*50}")

    # Clear scene
    clear_scene()

    # Setup
    setup_lighting()
    setup_camera()

    # Load model
    model_path = os.path.join(MODELS_DIR, f"{model_name}.glb")
    if not os.path.exists(model_path):
        print(f"ERROR: Model not found: {model_path}")
        return False

    objects = load_glb(model_path)
    if not objects:
        print(f"ERROR: No mesh objects imported from {model_path}")
        return False

    print(f"Loaded {len(objects)} mesh objects")

    # Center and scale
    center_and_scale_model(objects)

    # Set output path
    output_path = os.path.join(OUTPUT_DIR, output_filename)
    bpy.context.scene.render.filepath = output_path

    # Render
    print(f"Rendering to: {output_path}")
    bpy.ops.render.render(write_still=True)

    print(f"SUCCESS: {output_filename}")
    return True


def main():
    print("\n" + "="*60)
    print("Homestead Headaches - Animal Portrait Renderer")
    print("="*60)

    # Ensure output directory exists
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print(f"Output directory: {OUTPUT_DIR}")

    # Setup render settings
    setup_render_settings()

    # Render each animal
    results = []
    for model_name, output_filename in ANIMALS.items():
        success = render_portrait(model_name, output_filename)
        results.append((model_name, success))

    # Summary
    print("\n" + "="*60)
    print("RENDER SUMMARY")
    print("="*60)
    for name, success in results:
        status = "SUCCESS" if success else "FAILED"
        print(f"  {name}: {status}")

    successful = sum(1 for _, s in results if s)
    print(f"\nCompleted: {successful}/{len(results)} portraits")
    print(f"Output: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
