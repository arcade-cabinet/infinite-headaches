import { world } from "../world";

export function WobbleSystem(deltaTime: number) {
  const entities = world.with("wobble", "position");

  for (const entity of entities) {
    const { wobble } = entity;
    
    // Spring physics
    wobble.velocity += -wobble.offset * wobble.springiness;
    wobble.velocity *= wobble.damping;
    wobble.offset += wobble.velocity;

    // Apply wobble to rotation (visual only for now, or could affect position)
    // For 3D, we might rotate around Z axis
    if (!entity.modelRotation) {
      entity.modelRotation = new (require("@babylonjs/core").Vector3)(0, 0, 0);
    }
    
    // Rotate based on wobble offset
    entity.modelRotation.z = wobble.offset * 0.1;
  }
}
