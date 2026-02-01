/**
 * AbilitySystem Unit Tests
 *
 * Tests the ability system logic for:
 * - Cooldown decrementing correctly
 * - Ability becoming ready when cooldown reaches 0
 * - Charges decreasing when used
 * - Ability state management
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Vector3 } from "@babylonjs/core";
import { world } from "../world";
import { Entity, AbilityComponent } from "../components";
import {
  AbilitySystem,
  createAbilityComponent,
  isAbilityReady,
  getAbilityCooldownProgress,
  useAbility,
  deactivateAbility,
  restoreCharges,
  triggerAbility,
  getEntitiesWithReadyAbilities,
  getEntitiesByAbility,
  getAbilityStateForUI,
} from "./AbilitySystem";

describe("AbilitySystem", () => {
  // Helper to create a test entity with an ability
  const createTestEntityWithAbility = (
    abilityId: string = "fireball",
    cooldownMs: number = 3000,
    charges?: number
  ): Entity => {
    return {
      id: `entity-${Math.random().toString(36).substr(2, 9)}`,
      position: new Vector3(0, 5, 0),
      ability: createAbilityComponent(abilityId, cooldownMs, charges),
    };
  };

  // Clean up world after each test
  afterEach(() => {
    const entities = Array.from(world.entities);
    for (const entity of entities) {
      world.remove(entity);
    }
  });

  describe("createAbilityComponent", () => {
    it("should create ability with correct abilityId", () => {
      const component = createAbilityComponent("fireball", 3000);

      expect(component.abilityId).toBe("fireball");
    });

    it("should create ability with correct cooldown", () => {
      const component = createAbilityComponent("freeze", 5000);

      expect(component.cooldownMs).toBe(5000);
    });

    it("should initialize lastUsed to 0", () => {
      const component = createAbilityComponent("fireball", 3000);

      expect(component.lastUsed).toBe(0);
    });

    it("should initialize isActive to false", () => {
      const component = createAbilityComponent("fireball", 3000);

      expect(component.isActive).toBe(false);
    });

    it("should set charges when provided", () => {
      const component = createAbilityComponent("fireball", 3000, 3);

      expect(component.charges).toBe(3);
      expect(component.maxCharges).toBe(3);
    });

    it("should leave charges undefined when not provided", () => {
      const component = createAbilityComponent("fireball", 3000);

      expect(component.charges).toBeUndefined();
      expect(component.maxCharges).toBeUndefined();
    });
  });

  describe("isAbilityReady", () => {
    it("should return true for never-used ability", () => {
      const ability: AbilityComponent = {
        abilityId: "fireball",
        cooldownMs: 3000,
        lastUsed: 0,
        isActive: false,
      };

      expect(isAbilityReady(ability)).toBe(true);
    });

    it("should return false when cooldown has not elapsed", () => {
      const ability: AbilityComponent = {
        abilityId: "fireball",
        cooldownMs: 3000,
        lastUsed: Date.now() - 1000, // Used 1 second ago
        isActive: false,
      };

      expect(isAbilityReady(ability)).toBe(false);
    });

    it("should return true when cooldown has elapsed", () => {
      const ability: AbilityComponent = {
        abilityId: "fireball",
        cooldownMs: 3000,
        lastUsed: Date.now() - 4000, // Used 4 seconds ago
        isActive: false,
      };

      expect(isAbilityReady(ability)).toBe(true);
    });

    it("should return false when ability is active", () => {
      const ability: AbilityComponent = {
        abilityId: "fireball",
        cooldownMs: 3000,
        lastUsed: 0,
        isActive: true, // Currently active
      };

      expect(isAbilityReady(ability)).toBe(false);
    });

    it("should return false when no charges remaining", () => {
      const ability: AbilityComponent = {
        abilityId: "fireball",
        cooldownMs: 3000,
        lastUsed: 0,
        isActive: false,
        charges: 0,
        maxCharges: 3,
      };

      expect(isAbilityReady(ability)).toBe(false);
    });

    it("should return true when charges are available", () => {
      const ability: AbilityComponent = {
        abilityId: "fireball",
        cooldownMs: 3000,
        lastUsed: 0,
        isActive: false,
        charges: 2,
        maxCharges: 3,
      };

      expect(isAbilityReady(ability)).toBe(true);
    });
  });

  describe("getAbilityCooldownProgress", () => {
    it("should return 1 for never-used ability", () => {
      const ability: AbilityComponent = {
        abilityId: "fireball",
        cooldownMs: 3000,
        lastUsed: 0,
        isActive: false,
      };

      expect(getAbilityCooldownProgress(ability)).toBe(1);
    });

    it("should return 1 when cooldown complete", () => {
      const ability: AbilityComponent = {
        abilityId: "fireball",
        cooldownMs: 3000,
        lastUsed: Date.now() - 5000, // Cooldown finished
        isActive: false,
      };

      expect(getAbilityCooldownProgress(ability)).toBe(1);
    });

    it("should return 0 when just used", () => {
      const ability: AbilityComponent = {
        abilityId: "fireball",
        cooldownMs: 3000,
        lastUsed: Date.now(),
        isActive: false,
      };

      const progress = getAbilityCooldownProgress(ability);
      expect(progress).toBeCloseTo(0, 1);
    });

    it("should return approximately 0.5 at half cooldown", () => {
      const ability: AbilityComponent = {
        abilityId: "fireball",
        cooldownMs: 2000,
        lastUsed: Date.now() - 1000, // Half of 2000ms
        isActive: false,
      };

      const progress = getAbilityCooldownProgress(ability);
      expect(progress).toBeCloseTo(0.5, 1);
    });
  });

  describe("useAbility", () => {
    it("should return true and use ability when ready", () => {
      const entity = createTestEntityWithAbility("fireball", 3000);
      entity.ability!.lastUsed = 0; // Never used

      const result = useAbility(entity);

      expect(result).toBe(true);
      expect(entity.ability!.isActive).toBe(true);
      expect(entity.ability!.lastUsed).toBeGreaterThan(0);
    });

    it("should return false when ability not ready (on cooldown)", () => {
      const entity = createTestEntityWithAbility("fireball", 3000);
      entity.ability!.lastUsed = Date.now(); // Just used

      const result = useAbility(entity);

      expect(result).toBe(false);
    });

    it("should return false when entity has no ability", () => {
      const entity: Entity = { id: "no-ability" };

      const result = useAbility(entity);

      expect(result).toBe(false);
    });

    it("should decrement charges when used", () => {
      const entity = createTestEntityWithAbility("fireball", 3000, 3);

      useAbility(entity);

      expect(entity.ability!.charges).toBe(2);
    });

    it("should not decrement charges if undefined", () => {
      const entity = createTestEntityWithAbility("fireball", 3000);

      useAbility(entity);

      expect(entity.ability!.charges).toBeUndefined();
    });

    it("should set lastUsed to current time", () => {
      const entity = createTestEntityWithAbility("fireball", 3000);
      const before = Date.now();

      useAbility(entity);

      const after = Date.now();
      expect(entity.ability!.lastUsed).toBeGreaterThanOrEqual(before);
      expect(entity.ability!.lastUsed).toBeLessThanOrEqual(after);
    });
  });

  describe("deactivateAbility", () => {
    it("should set isActive to false", () => {
      const entity = createTestEntityWithAbility("fireball", 3000);
      entity.ability!.isActive = true;

      deactivateAbility(entity);

      expect(entity.ability!.isActive).toBe(false);
    });

    it("should do nothing if entity has no ability", () => {
      const entity: Entity = { id: "no-ability" };

      // Should not throw
      expect(() => deactivateAbility(entity)).not.toThrow();
    });
  });

  describe("restoreCharges", () => {
    it("should restore charges by specified amount", () => {
      const entity = createTestEntityWithAbility("fireball", 3000, 3);
      entity.ability!.charges = 1;

      restoreCharges(entity, 1);

      expect(entity.ability!.charges).toBe(2);
    });

    it("should not exceed maxCharges", () => {
      const entity = createTestEntityWithAbility("fireball", 3000, 3);
      entity.ability!.charges = 2;

      restoreCharges(entity, 5);

      expect(entity.ability!.charges).toBe(3);
    });

    it("should default to restoring 1 charge", () => {
      const entity = createTestEntityWithAbility("fireball", 3000, 3);
      entity.ability!.charges = 1;

      restoreCharges(entity);

      expect(entity.ability!.charges).toBe(2);
    });

    it("should do nothing if ability has no maxCharges", () => {
      const entity = createTestEntityWithAbility("fireball", 3000);

      restoreCharges(entity, 1);

      expect(entity.ability!.charges).toBeUndefined();
    });

    it("should handle undefined current charges", () => {
      const entity = createTestEntityWithAbility("fireball", 3000, 3);
      entity.ability!.charges = undefined;

      restoreCharges(entity, 2);

      expect(entity.ability!.charges).toBe(2);
    });
  });

  describe("triggerAbility", () => {
    it("should return abilityId when successfully triggered", () => {
      const entity = createTestEntityWithAbility("fireball", 3000);

      const result = triggerAbility(entity);

      expect(result).toBe("fireball");
    });

    it("should return null when ability not ready", () => {
      const entity = createTestEntityWithAbility("fireball", 3000);
      entity.ability!.lastUsed = Date.now(); // Just used

      const result = triggerAbility(entity);

      expect(result).toBeNull();
    });

    it("should return null when entity has no ability", () => {
      const entity: Entity = { id: "no-ability" };

      const result = triggerAbility(entity);

      expect(result).toBeNull();
    });

    it("should call onAbilityUsed callback", () => {
      const entity = createTestEntityWithAbility("fireball", 3000);
      const onAbilityUsed = vi.fn();

      triggerAbility(entity, { onAbilityUsed });

      expect(onAbilityUsed).toHaveBeenCalledWith(entity, "fireball");
    });
  });

  describe("AbilitySystem update loop", () => {
    it("should call onAbilityCooldownComplete when ability becomes ready", () => {
      vi.useFakeTimers();
      
      const entity = createTestEntityWithAbility("fireball", 100);
      // Set lastUsed so it's on cooldown but about to complete
      entity.ability!.lastUsed = Date.now() - 99;
      world.add(entity);

      const onAbilityCooldownComplete = vi.fn();

      // Wait a bit so cooldown completes
      vi.advanceTimersByTime(10);

      AbilitySystem(10, { onAbilityCooldownComplete });

      vi.useRealTimers();

      // The callback should be called when transitioning from cooldown to ready
      expect(onAbilityCooldownComplete).toHaveBeenCalled();
    });

    it("should call onAbilityReady for never-used ability", () => {
      const entity = createTestEntityWithAbility("fireball", 3000);
      entity.ability!.lastUsed = 0; // Never used
      world.add(entity);

      const onAbilityReady = vi.fn();

      AbilitySystem(100, { onAbilityReady });

      expect(onAbilityReady).toHaveBeenCalledWith(entity, "fireball");
    });

    it("should not call onAbilityReady if ability was already used", () => {
      const entity = createTestEntityWithAbility("fireball", 3000);
      entity.ability!.lastUsed = Date.now() - 5000; // Used before, now ready
      world.add(entity);

      const onAbilityReady = vi.fn();

      AbilitySystem(100, { onAbilityReady });

      // onAbilityReady is only for never-used abilities (lastUsed === 0)
      expect(onAbilityReady).not.toHaveBeenCalled();
    });

    it("should handle multiple entities with abilities", () => {
      const entity1 = createTestEntityWithAbility("fireball", 3000);
      const entity2 = createTestEntityWithAbility("freeze", 5000);
      entity1.ability!.lastUsed = 0;
      entity2.ability!.lastUsed = 0;
      world.add(entity1);
      world.add(entity2);

      const onAbilityReady = vi.fn();

      AbilitySystem(100, { onAbilityReady });

      expect(onAbilityReady).toHaveBeenCalledTimes(2);
    });
  });

  describe("Query helpers", () => {
    beforeEach(() => {
      const entities = Array.from(world.entities);
      for (const entity of entities) {
        world.remove(entity);
      }
    });

    describe("getEntitiesWithReadyAbilities", () => {
      it("should return empty array when no entities", () => {
        const result = getEntitiesWithReadyAbilities();
        expect(result).toEqual([]);
      });

      it("should return only entities with ready abilities", () => {
        const readyEntity = createTestEntityWithAbility("fireball", 3000);
        readyEntity.ability!.lastUsed = 0;

        const cooldownEntity = createTestEntityWithAbility("freeze", 3000);
        cooldownEntity.ability!.lastUsed = Date.now();

        world.add(readyEntity);
        world.add(cooldownEntity);

        const result = getEntitiesWithReadyAbilities();

        expect(result).toHaveLength(1);
        expect(result[0].ability!.abilityId).toBe("fireball");
      });
    });

    describe("getEntitiesByAbility", () => {
      it("should return entities with specified ability", () => {
        const fireEntity = createTestEntityWithAbility("fireball", 3000);
        const iceEntity = createTestEntityWithAbility("freeze", 3000);
        world.add(fireEntity);
        world.add(iceEntity);

        const result = getEntitiesByAbility("fireball");

        expect(result).toHaveLength(1);
        expect(result[0].ability!.abilityId).toBe("fireball");
      });

      it("should return empty array for non-existent ability", () => {
        const entity = createTestEntityWithAbility("fireball", 3000);
        world.add(entity);

        const result = getEntitiesByAbility("shockwave");

        expect(result).toHaveLength(0);
      });
    });

    describe("getAbilityStateForUI", () => {
      it("should return default state when no entities", () => {
        const state = getAbilityStateForUI();

        expect(state.fireReady).toBe(0);
        expect(state.iceReady).toBe(0);
        expect(state.hasFire).toBe(false);
        expect(state.hasIce).toBe(false);
      });

      it("should detect fire ability", () => {
        const entity = createTestEntityWithAbility("fireball", 3000);
        entity.ability!.lastUsed = 0;
        world.add(entity);

        const state = getAbilityStateForUI();

        expect(state.hasFire).toBe(true);
        expect(state.fireReady).toBe(1);
      });

      it("should detect ice ability", () => {
        const entity = createTestEntityWithAbility("freeze", 3000);
        entity.ability!.lastUsed = 0;
        world.add(entity);

        const state = getAbilityStateForUI();

        expect(state.hasIce).toBe(true);
        expect(state.iceReady).toBe(1);
      });

      it("should return max cooldown progress among multiple entities", () => {
        const entity1 = createTestEntityWithAbility("fireball", 2000);
        entity1.ability!.lastUsed = Date.now() - 1000; // 50% progress

        const entity2 = createTestEntityWithAbility("fireball", 2000);
        entity2.ability!.lastUsed = Date.now() - 1500; // 75% progress

        world.add(entity1);
        world.add(entity2);

        const state = getAbilityStateForUI();

        // Should return the higher progress (75%)
        expect(state.fireReady).toBeCloseTo(0.75, 1);
      });
    });
  });

  describe("Charges system", () => {
    it("should allow use while charges remain", () => {
      const entity = createTestEntityWithAbility("fireball", 0, 3); // 0 cooldown, 3 charges
      entity.ability!.lastUsed = Date.now(); // Just used (but no cooldown)

      // Should be able to use 3 times
      expect(useAbility(entity)).toBe(true);
      entity.ability!.isActive = false;
      expect(entity.ability!.charges).toBe(2);

      expect(useAbility(entity)).toBe(true);
      entity.ability!.isActive = false;
      expect(entity.ability!.charges).toBe(1);

      expect(useAbility(entity)).toBe(true);
      entity.ability!.isActive = false;
      expect(entity.ability!.charges).toBe(0);

      // No more charges
      expect(useAbility(entity)).toBe(false);
    });

    it("should consider both cooldown and charges", () => {
      const entity = createTestEntityWithAbility("fireball", 3000, 3);
      entity.ability!.lastUsed = Date.now(); // On cooldown
      entity.ability!.charges = 3; // Has charges

      // Should be false because on cooldown
      expect(isAbilityReady(entity.ability!)).toBe(false);

      // After cooldown
      entity.ability!.lastUsed = Date.now() - 5000;
      expect(isAbilityReady(entity.ability!)).toBe(true);

      // No charges
      entity.ability!.charges = 0;
      expect(isAbilityReady(entity.ability!)).toBe(false);
    });
  });

  describe("Edge cases", () => {
    it("should handle entity without ability in system update", () => {
      const entity: Entity = {
        id: "no-ability",
        position: new Vector3(0, 0, 0),
      };
      world.add(entity);

      // Should not throw
      expect(() => AbilitySystem(100)).not.toThrow();
    });

    it("should handle very large deltaTime", () => {
      const entity = createTestEntityWithAbility("fireball", 3000);
      world.add(entity);

      // Should not throw with large deltaTime
      expect(() => AbilitySystem(1000000)).not.toThrow();
    });

    it("should handle zero deltaTime", () => {
      const entity = createTestEntityWithAbility("fireball", 3000);
      world.add(entity);

      // Should not throw with zero deltaTime
      expect(() => AbilitySystem(0)).not.toThrow();
    });
  });
});
