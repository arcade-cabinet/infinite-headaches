# Blender Scripts

Scripts for exporting 3D models used in Homestead Headaches.

## Requirements

- Blender 4.x or 5.x (tested with 5.0.1)

## Scripts

### convert_fbx_to_glb.py

Converts farm animal FBX files to GLB format.

**Source:** FarmAnimals_v1.1 (Quaternius)
**Output:** `public/assets/models/{animal}.glb`

```bash
blender --background --python scripts/bpy/convert_fbx_to_glb.py
```

### export_farmer_models.py

Creates farmer character models from Farmers_Family pack with Mixamo animations.

**Source Assets:** `Farmers_Family/`
- `George_Meshes/Farmer_George.fbx` → Farmer John (male)
- `Martha_Meshes/Farmer_Martha.fbx` → Farmer Mary (female)
- `Textures/Fabric.png, PlaidMaterial.png`
- `*/DemoAnimationsFromMixamo/` - Mixamo animation FBX files

**Output:**
```
public/assets/models/players/
├── john.glb    # All animations embedded
└── mary.glb    # All animations embedded
```

**Animations:**
| Animation | John Frames | Mary Frames |
|-----------|-------------|-------------|
| idle | 1-431 | 1-500 |
| walk | 1-36 | 1-34 |
| run | 1-25 | 1-22 |
| jump_up | 1-26 | 1-8 |
| jump_loop | 1-22 | 1-22 |
| jump_down | 1-12 | 1-12 |

```bash
blender --background --python scripts/bpy/export_farmer_models.py
```

### render-animal-portraits.py

Renders 2D portrait images of the animals for UI.

## Asset Sources

### Farmers_Family Pack
- Path: `Farmers_Family/` (project directory)
- Contains: George (male) and Martha (female) farmer models
- Animations: Mixamo animation pack (idle, walk, run, jump)
- Textures: Fabric and plaid materials

### Quaternius Assets
- Path: `/Users/jbogaty/assets/Quaternius/`
- License: CC0 (Public Domain)
- Website: https://quaternius.com
- Packs used:
  - **FarmAnimals_v1.1** - cow, pig, chicken, duck, sheep models
