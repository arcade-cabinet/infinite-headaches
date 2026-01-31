import { world } from "../world";
import { Vector3 } from "@babylonjs/core";

export function MovementSystem(deltaTime: number) {
  const entities = world.with("position", "velocity");

  for (const entity of entities) {
    if (entity.physics?.isStatic) continue;

    entity.position.addInPlace(entity.velocity.scale(deltaTime));
  }
}
