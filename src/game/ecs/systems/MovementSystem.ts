import { world } from "../world";
import { Vector3 } from "@babylonjs/core";
import { GAME_CONFIG } from "../../config";

export function MovementSystem(deltaTime: number) {
  const entities = world.with("position", "velocity");
  const gravity = new Vector3(0, -GAME_CONFIG.physics.gravity, 0);

  for (const entity of entities) {
    if (entity.physics?.isStatic) continue;

    // Apply gravity if falling or has dynamic physics (but not stacked/banking)
    // Player is grounded by controller usually, so exclude unless jumping (not implemented yet)
    if ((entity.falling || (entity.physics && !entity.player)) && !entity.stacked && !entity.banking && !entity.frozen) {
      entity.velocity.addInPlace(gravity.scale(deltaTime));
    }

    // Apply velocity to position
    entity.position.addInPlace(entity.velocity.scale(deltaTime));
    
    // Boundary checks (simple floor collision for non-falling to prevent infinite fall)
    if (entity.position.y < -10 && !entity.falling) {
       // Reset or kill? GameLogic handles kill.
    }
  }
}
