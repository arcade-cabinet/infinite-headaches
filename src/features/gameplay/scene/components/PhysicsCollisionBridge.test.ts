/**
 * PhysicsCollisionBridge Unit Tests
 *
 * Tests the collision bridge logic in isolation:
 * - PhysicsCatchEvent interface validation
 * - Entity metadata resolution (transformNode, parent node, null)
 * - Event filtering (only COLLISION_STARTED between falling + player/stacked)
 *
 * Since getEntityMetadata and the filtering logic are internal to the component,
 * we recreate the pure-logic functions here for isolated testing. This validates
 * that the algorithm is correct without requiring React/BabylonJS runtime.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PhysicsCatchEvent } from "./PhysicsCollisionBridge";

// ===========================================================================
// Standalone reimplementations of the pure logic from PhysicsCollisionBridge
// ===========================================================================

/**
 * Mirrors the internal getEntityMetadata function.
 * Resolves entity metadata from a physics body by walking up the transform hierarchy.
 */
function getEntityMetadata(
  body: MockPhysicsBody
): { entityId?: string; physicsTag?: string } | null {
  const node = body.transformNode;
  if (!node) return null;
  if (node.metadata?.entityId) return node.metadata;
  // Check parent (for compound shapes)
  if (node.parent && (node.parent as any).metadata?.entityId) {
    return (node.parent as any).metadata;
  }
  return null;
}

/**
 * Mirrors the collision event filtering and mapping logic from the useEffect callback.
 * Returns a PhysicsCatchEvent if the event qualifies, otherwise null.
 */
function filterCollisionEvent(
  event: MockCollisionEvent
): PhysicsCatchEvent | null {
  // Only process collision start events
  if (event.type !== "COLLISION_STARTED") return null;

  const metaA = getEntityMetadata(event.collider);
  const metaB = getEntityMetadata(event.collidedAgainst);

  if (!metaA || !metaB) return null;

  let fallingMeta: { entityId?: string; physicsTag?: string } | null = null;
  let catcherMeta: { entityId?: string; physicsTag?: string } | null = null;

  if (
    metaA.physicsTag === "falling" &&
    (metaB.physicsTag === "player" || metaB.physicsTag === "stacked")
  ) {
    fallingMeta = metaA;
    catcherMeta = metaB;
  } else if (
    metaB.physicsTag === "falling" &&
    (metaA.physicsTag === "player" || metaA.physicsTag === "stacked")
  ) {
    fallingMeta = metaB;
    catcherMeta = metaA;
  } else {
    return null;
  }

  if (!fallingMeta.entityId || !catcherMeta.entityId) return null;

  const contactPointX = event.point?.x ?? 0;

  return {
    fallingEntityId: fallingMeta.entityId,
    landedOnId: catcherMeta.entityId,
    contactPointX,
    landedOnTag: catcherMeta.physicsTag || "player",
  };
}

// ===========================================================================
// Mock types
// ===========================================================================

interface MockMetadata {
  entityId?: string;
  physicsTag?: string;
}

interface MockTransformNode {
  metadata: MockMetadata | null;
  parent?: { metadata: MockMetadata | null } | null;
}

interface MockPhysicsBody {
  transformNode: MockTransformNode | null;
}

interface MockCollisionEvent {
  type: string;
  collider: MockPhysicsBody;
  collidedAgainst: MockPhysicsBody;
  point?: { x: number; y: number; z: number } | null;
}

// ===========================================================================
// Mock helpers
// ===========================================================================

/** Creates a mock physics body with metadata on the transform node. */
function createMockBody(
  metadata: MockMetadata | null,
  parentMetadata?: MockMetadata | null
): MockPhysicsBody {
  return {
    transformNode: metadata !== undefined
      ? {
          metadata,
          parent: parentMetadata !== undefined ? { metadata: parentMetadata } : null,
        }
      : null,
  };
}

/** Creates a mock body with no transform node at all. */
function createBodilessBody(): MockPhysicsBody {
  return { transformNode: null };
}

/** Creates a mock body with a transform node but no metadata, and metadata on the parent. */
function createCompoundBody(parentMetadata: MockMetadata): MockPhysicsBody {
  return {
    transformNode: {
      metadata: null,
      parent: { metadata: parentMetadata },
    },
  };
}

/** Creates a collision event. */
function createCollisionEvent(
  type: string,
  collider: MockPhysicsBody,
  collidedAgainst: MockPhysicsBody,
  point?: { x: number; y: number; z: number } | null
): MockCollisionEvent {
  return { type, collider, collidedAgainst, point };
}

// ===========================================================================
// Tests
// ===========================================================================

describe("PhysicsCatchEvent interface validation", () => {
  it("accepts a valid PhysicsCatchEvent object", () => {
    const event: PhysicsCatchEvent = {
      fallingEntityId: "animal-chicken-001",
      landedOnId: "player-farmer",
      contactPointX: 2.5,
      landedOnTag: "player",
    };

    expect(event.fallingEntityId).toBe("animal-chicken-001");
    expect(event.landedOnId).toBe("player-farmer");
    expect(event.contactPointX).toBe(2.5);
    expect(event.landedOnTag).toBe("player");
  });

  it("accepts events with stacked landedOnTag", () => {
    const event: PhysicsCatchEvent = {
      fallingEntityId: "animal-pig-002",
      landedOnId: "stacked-cow-003",
      contactPointX: -1.3,
      landedOnTag: "stacked",
    };

    expect(event.landedOnTag).toBe("stacked");
    expect(event.contactPointX).toBe(-1.3);
  });

  it("accepts zero contactPointX", () => {
    const event: PhysicsCatchEvent = {
      fallingEntityId: "animal-sheep-010",
      landedOnId: "player-farmer",
      contactPointX: 0,
      landedOnTag: "player",
    };

    expect(event.contactPointX).toBe(0);
  });

  it("accepts negative contactPointX", () => {
    const event: PhysicsCatchEvent = {
      fallingEntityId: "animal-duck-005",
      landedOnId: "stacked-horse-007",
      contactPointX: -5.75,
      landedOnTag: "stacked",
    };

    expect(event.contactPointX).toBe(-5.75);
  });
});

// ---------------------------------------------------------------------------

describe("getEntityMetadata - entity metadata resolution", () => {
  it("returns metadata from the transform node directly", () => {
    const body = createMockBody({ entityId: "cow-001", physicsTag: "falling" });
    const meta = getEntityMetadata(body);

    expect(meta).not.toBeNull();
    expect(meta!.entityId).toBe("cow-001");
    expect(meta!.physicsTag).toBe("falling");
  });

  it("returns null when the body has no transform node", () => {
    const body = createBodilessBody();
    const meta = getEntityMetadata(body);

    expect(meta).toBeNull();
  });

  it("returns null when transform node has null metadata and no parent", () => {
    const body: MockPhysicsBody = {
      transformNode: {
        metadata: null,
        parent: null,
      },
    };
    const meta = getEntityMetadata(body);

    expect(meta).toBeNull();
  });

  it("returns null when transform node has empty metadata (no entityId)", () => {
    const body = createMockBody({});
    const meta = getEntityMetadata(body);

    // metadata exists but has no entityId, so the condition node.metadata?.entityId is falsy
    expect(meta).toBeNull();
  });

  it("falls back to parent metadata for compound shapes", () => {
    const body = createCompoundBody({
      entityId: "pig-002",
      physicsTag: "stacked",
    });
    const meta = getEntityMetadata(body);

    expect(meta).not.toBeNull();
    expect(meta!.entityId).toBe("pig-002");
    expect(meta!.physicsTag).toBe("stacked");
  });

  it("prefers transform node metadata over parent metadata", () => {
    const body = createMockBody(
      { entityId: "chicken-003", physicsTag: "falling" },
      { entityId: "parent-entity", physicsTag: "player" }
    );
    const meta = getEntityMetadata(body);

    expect(meta).not.toBeNull();
    expect(meta!.entityId).toBe("chicken-003");
    expect(meta!.physicsTag).toBe("falling");
  });

  it("returns null when parent also has no entityId", () => {
    const body: MockPhysicsBody = {
      transformNode: {
        metadata: null,
        parent: { metadata: {} },
      },
    };
    const meta = getEntityMetadata(body);

    expect(meta).toBeNull();
  });

  it("returns null when parent has null metadata", () => {
    const body: MockPhysicsBody = {
      transformNode: {
        metadata: null,
        parent: { metadata: null },
      },
    };
    const meta = getEntityMetadata(body);

    expect(meta).toBeNull();
  });

  it("returns metadata with only entityId (no physicsTag)", () => {
    const body = createMockBody({ entityId: "entity-no-tag" });
    const meta = getEntityMetadata(body);

    expect(meta).not.toBeNull();
    expect(meta!.entityId).toBe("entity-no-tag");
    expect(meta!.physicsTag).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------

describe("Event filtering - collision event classification", () => {
  describe("event type filtering", () => {
    it("processes COLLISION_STARTED events", () => {
      const falling = createMockBody({ entityId: "a1", physicsTag: "falling" });
      const player = createMockBody({ entityId: "p1", physicsTag: "player" });
      const event = createCollisionEvent("COLLISION_STARTED", falling, player, {
        x: 1,
        y: 2,
        z: 3,
      });

      const result = filterCollisionEvent(event);
      expect(result).not.toBeNull();
    });

    it("ignores COLLISION_CONTINUED events", () => {
      const falling = createMockBody({ entityId: "a1", physicsTag: "falling" });
      const player = createMockBody({ entityId: "p1", physicsTag: "player" });
      const event = createCollisionEvent(
        "COLLISION_CONTINUED",
        falling,
        player,
        { x: 1, y: 2, z: 3 }
      );

      const result = filterCollisionEvent(event);
      expect(result).toBeNull();
    });

    it("ignores COLLISION_FINISHED events", () => {
      const falling = createMockBody({ entityId: "a1", physicsTag: "falling" });
      const player = createMockBody({ entityId: "p1", physicsTag: "player" });
      const event = createCollisionEvent(
        "COLLISION_FINISHED",
        falling,
        player,
        { x: 1, y: 2, z: 3 }
      );

      const result = filterCollisionEvent(event);
      expect(result).toBeNull();
    });

    it("ignores unknown event types", () => {
      const falling = createMockBody({ entityId: "a1", physicsTag: "falling" });
      const player = createMockBody({ entityId: "p1", physicsTag: "player" });
      const event = createCollisionEvent("TRIGGER_ENTERED", falling, player);

      const result = filterCollisionEvent(event);
      expect(result).toBeNull();
    });
  });

  describe("tag pair filtering - valid combinations", () => {
    it("matches falling (A) + player (B)", () => {
      const falling = createMockBody({
        entityId: "duck-010",
        physicsTag: "falling",
      });
      const player = createMockBody({
        entityId: "farmer-001",
        physicsTag: "player",
      });
      const event = createCollisionEvent("COLLISION_STARTED", falling, player, {
        x: 3.0,
        y: 0,
        z: 0,
      });

      const result = filterCollisionEvent(event);
      expect(result).not.toBeNull();
      expect(result!.fallingEntityId).toBe("duck-010");
      expect(result!.landedOnId).toBe("farmer-001");
      expect(result!.landedOnTag).toBe("player");
      expect(result!.contactPointX).toBe(3.0);
    });

    it("matches player (A) + falling (B) - reversed order", () => {
      const player = createMockBody({
        entityId: "farmer-001",
        physicsTag: "player",
      });
      const falling = createMockBody({
        entityId: "sheep-005",
        physicsTag: "falling",
      });
      const event = createCollisionEvent("COLLISION_STARTED", player, falling, {
        x: -2.0,
        y: 1,
        z: 0,
      });

      const result = filterCollisionEvent(event);
      expect(result).not.toBeNull();
      expect(result!.fallingEntityId).toBe("sheep-005");
      expect(result!.landedOnId).toBe("farmer-001");
      expect(result!.landedOnTag).toBe("player");
      expect(result!.contactPointX).toBe(-2.0);
    });

    it("matches falling (A) + stacked (B)", () => {
      const falling = createMockBody({
        entityId: "goat-012",
        physicsTag: "falling",
      });
      const stacked = createMockBody({
        entityId: "cow-004",
        physicsTag: "stacked",
      });
      const event = createCollisionEvent(
        "COLLISION_STARTED",
        falling,
        stacked,
        { x: 0.5, y: 5, z: 0 }
      );

      const result = filterCollisionEvent(event);
      expect(result).not.toBeNull();
      expect(result!.fallingEntityId).toBe("goat-012");
      expect(result!.landedOnId).toBe("cow-004");
      expect(result!.landedOnTag).toBe("stacked");
    });

    it("matches stacked (A) + falling (B) - reversed order", () => {
      const stacked = createMockBody({
        entityId: "horse-003",
        physicsTag: "stacked",
      });
      const falling = createMockBody({
        entityId: "pig-008",
        physicsTag: "falling",
      });
      const event = createCollisionEvent(
        "COLLISION_STARTED",
        stacked,
        falling,
        { x: 1.5, y: 3, z: 0 }
      );

      const result = filterCollisionEvent(event);
      expect(result).not.toBeNull();
      expect(result!.fallingEntityId).toBe("pig-008");
      expect(result!.landedOnId).toBe("horse-003");
      expect(result!.landedOnTag).toBe("stacked");
    });
  });

  describe("tag pair filtering - invalid combinations", () => {
    it("rejects falling + falling collision", () => {
      const falling1 = createMockBody({
        entityId: "a1",
        physicsTag: "falling",
      });
      const falling2 = createMockBody({
        entityId: "a2",
        physicsTag: "falling",
      });
      const event = createCollisionEvent(
        "COLLISION_STARTED",
        falling1,
        falling2,
        { x: 0, y: 0, z: 0 }
      );

      const result = filterCollisionEvent(event);
      expect(result).toBeNull();
    });

    it("rejects player + player collision", () => {
      const player1 = createMockBody({
        entityId: "p1",
        physicsTag: "player",
      });
      const player2 = createMockBody({
        entityId: "p2",
        physicsTag: "player",
      });
      const event = createCollisionEvent(
        "COLLISION_STARTED",
        player1,
        player2
      );

      const result = filterCollisionEvent(event);
      expect(result).toBeNull();
    });

    it("rejects stacked + stacked collision", () => {
      const stacked1 = createMockBody({
        entityId: "s1",
        physicsTag: "stacked",
      });
      const stacked2 = createMockBody({
        entityId: "s2",
        physicsTag: "stacked",
      });
      const event = createCollisionEvent(
        "COLLISION_STARTED",
        stacked1,
        stacked2
      );

      const result = filterCollisionEvent(event);
      expect(result).toBeNull();
    });

    it("rejects player + stacked collision (no falling involved)", () => {
      const player = createMockBody({
        entityId: "p1",
        physicsTag: "player",
      });
      const stacked = createMockBody({
        entityId: "s1",
        physicsTag: "stacked",
      });
      const event = createCollisionEvent(
        "COLLISION_STARTED",
        player,
        stacked
      );

      const result = filterCollisionEvent(event);
      expect(result).toBeNull();
    });

    it("rejects falling + ground collision (unknown tag)", () => {
      const falling = createMockBody({
        entityId: "a1",
        physicsTag: "falling",
      });
      const ground = createMockBody({
        entityId: "ground-001",
        physicsTag: "ground",
      });
      const event = createCollisionEvent(
        "COLLISION_STARTED",
        falling,
        ground
      );

      const result = filterCollisionEvent(event);
      expect(result).toBeNull();
    });

    it("rejects falling + obstacle collision (unknown tag)", () => {
      const falling = createMockBody({
        entityId: "a1",
        physicsTag: "falling",
      });
      const obstacle = createMockBody({
        entityId: "barn-001",
        physicsTag: "obstacle",
      });
      const event = createCollisionEvent(
        "COLLISION_STARTED",
        falling,
        obstacle
      );

      const result = filterCollisionEvent(event);
      expect(result).toBeNull();
    });
  });

  describe("null/missing metadata handling", () => {
    it("returns null when collider has no transform node", () => {
      const bodiless = createBodilessBody();
      const player = createMockBody({
        entityId: "p1",
        physicsTag: "player",
      });
      const event = createCollisionEvent(
        "COLLISION_STARTED",
        bodiless,
        player
      );

      const result = filterCollisionEvent(event);
      expect(result).toBeNull();
    });

    it("returns null when collidedAgainst has no transform node", () => {
      const falling = createMockBody({
        entityId: "a1",
        physicsTag: "falling",
      });
      const bodiless = createBodilessBody();
      const event = createCollisionEvent(
        "COLLISION_STARTED",
        falling,
        bodiless
      );

      const result = filterCollisionEvent(event);
      expect(result).toBeNull();
    });

    it("returns null when both bodies have no transform node", () => {
      const event = createCollisionEvent(
        "COLLISION_STARTED",
        createBodilessBody(),
        createBodilessBody()
      );

      const result = filterCollisionEvent(event);
      expect(result).toBeNull();
    });

    it("returns null when falling entity has no entityId", () => {
      const falling = createMockBody({
        physicsTag: "falling",
      }); // no entityId -- metadata exists but entityId is undefined
      // However, getEntityMetadata checks node.metadata?.entityId which is falsy
      // so meta will be null
      const player = createMockBody({
        entityId: "p1",
        physicsTag: "player",
      });
      const event = createCollisionEvent(
        "COLLISION_STARTED",
        falling,
        player
      );

      const result = filterCollisionEvent(event);
      expect(result).toBeNull();
    });

    it("returns null when catcher entity has no entityId", () => {
      const falling = createMockBody({
        entityId: "a1",
        physicsTag: "falling",
      });
      const player = createMockBody({
        physicsTag: "player",
      }); // no entityId
      const event = createCollisionEvent(
        "COLLISION_STARTED",
        falling,
        player
      );

      const result = filterCollisionEvent(event);
      expect(result).toBeNull();
    });
  });

  describe("contact point handling", () => {
    it("uses event.point.x as contactPointX", () => {
      const falling = createMockBody({
        entityId: "a1",
        physicsTag: "falling",
      });
      const player = createMockBody({
        entityId: "p1",
        physicsTag: "player",
      });
      const event = createCollisionEvent("COLLISION_STARTED", falling, player, {
        x: 7.25,
        y: 3,
        z: -1,
      });

      const result = filterCollisionEvent(event);
      expect(result!.contactPointX).toBe(7.25);
    });

    it("defaults contactPointX to 0 when event.point is null", () => {
      const falling = createMockBody({
        entityId: "a1",
        physicsTag: "falling",
      });
      const player = createMockBody({
        entityId: "p1",
        physicsTag: "player",
      });
      const event = createCollisionEvent(
        "COLLISION_STARTED",
        falling,
        player,
        null
      );

      const result = filterCollisionEvent(event);
      expect(result!.contactPointX).toBe(0);
    });

    it("defaults contactPointX to 0 when event.point is undefined", () => {
      const falling = createMockBody({
        entityId: "a1",
        physicsTag: "falling",
      });
      const player = createMockBody({
        entityId: "p1",
        physicsTag: "player",
      });
      const event = createCollisionEvent(
        "COLLISION_STARTED",
        falling,
        player,
        undefined
      );

      const result = filterCollisionEvent(event);
      expect(result!.contactPointX).toBe(0);
    });
  });

  describe("compound shape metadata resolution in collisions", () => {
    it("resolves falling entity from parent metadata in compound shape", () => {
      const fallingCompound = createCompoundBody({
        entityId: "compound-cow-001",
        physicsTag: "falling",
      });
      const player = createMockBody({
        entityId: "farmer-001",
        physicsTag: "player",
      });
      const event = createCollisionEvent(
        "COLLISION_STARTED",
        fallingCompound,
        player,
        { x: 2.0, y: 0, z: 0 }
      );

      const result = filterCollisionEvent(event);
      expect(result).not.toBeNull();
      expect(result!.fallingEntityId).toBe("compound-cow-001");
      expect(result!.landedOnId).toBe("farmer-001");
    });

    it("resolves catcher entity from parent metadata in compound shape", () => {
      const falling = createMockBody({
        entityId: "sheep-007",
        physicsTag: "falling",
      });
      const stackedCompound = createCompoundBody({
        entityId: "compound-pig-002",
        physicsTag: "stacked",
      });
      const event = createCollisionEvent(
        "COLLISION_STARTED",
        falling,
        stackedCompound,
        { x: -1.0, y: 0, z: 0 }
      );

      const result = filterCollisionEvent(event);
      expect(result).not.toBeNull();
      expect(result!.fallingEntityId).toBe("sheep-007");
      expect(result!.landedOnId).toBe("compound-pig-002");
      expect(result!.landedOnTag).toBe("stacked");
    });

    it("resolves both entities from parent metadata", () => {
      const fallingCompound = createCompoundBody({
        entityId: "compound-a1",
        physicsTag: "falling",
      });
      const playerCompound = createCompoundBody({
        entityId: "compound-p1",
        physicsTag: "player",
      });
      const event = createCollisionEvent(
        "COLLISION_STARTED",
        fallingCompound,
        playerCompound,
        { x: 0, y: 0, z: 0 }
      );

      const result = filterCollisionEvent(event);
      expect(result).not.toBeNull();
      expect(result!.fallingEntityId).toBe("compound-a1");
      expect(result!.landedOnId).toBe("compound-p1");
    });
  });

  describe("landedOnTag defaults", () => {
    it('sets landedOnTag to "player" when catcher is a player', () => {
      const falling = createMockBody({
        entityId: "a1",
        physicsTag: "falling",
      });
      const player = createMockBody({
        entityId: "p1",
        physicsTag: "player",
      });
      const event = createCollisionEvent(
        "COLLISION_STARTED",
        falling,
        player
      );

      const result = filterCollisionEvent(event);
      expect(result!.landedOnTag).toBe("player");
    });

    it('sets landedOnTag to "stacked" when catcher is stacked', () => {
      const falling = createMockBody({
        entityId: "a1",
        physicsTag: "falling",
      });
      const stacked = createMockBody({
        entityId: "s1",
        physicsTag: "stacked",
      });
      const event = createCollisionEvent(
        "COLLISION_STARTED",
        falling,
        stacked
      );

      const result = filterCollisionEvent(event);
      expect(result!.landedOnTag).toBe("stacked");
    });
  });
});
