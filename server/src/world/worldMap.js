import defaultMapDefinition from "../assets/maps/map.json" assert { type: "json" };

const FLIPPED_GID_MASK = 0x1fffffff;

export function createWorldMap(mapDefinition = defaultMapDefinition) {
  const map = normalizeMapDefinition(mapDefinition);
  const collisionGrid = buildCollisionGrid(map);

  function isBlocked(worldX, worldY) {
    const tileX = Math.floor(worldX + map.width / 2);
    const tileY = Math.floor(worldY + map.height / 2);

    if (tileX < 0 || tileX >= map.width || tileY < 0 || tileY >= map.height) {
      return true;
    }

    return collisionGrid[tileY][tileX];
  }

  function resolveMovementWithCollisions(position, deltaX, deltaY) {
    const startX = Number(position?.x ?? 0);
    const startY = Number(position?.y ?? 0);

    let nextX = startX;
    let nextY = startY;
    let velocityX = 0;
    let velocityY = 0;

    if (deltaX === 0 && deltaY === 0) {
      return {
        position: { x: nextX, y: nextY },
        velocity: { x: velocityX, y: velocityY },
      };
    }

    const targetX = startX + deltaX;
    const targetY = startY + deltaY;

    if (!isBlocked(targetX, targetY)) {
      nextX = targetX;
      nextY = targetY;
      velocityX = deltaX;
      velocityY = deltaY;
      return {
        position: { x: nextX, y: nextY },
        velocity: { x: velocityX, y: velocityY },
      };
    }

    if (!isBlocked(targetX, startY)) {
      nextX = targetX;
      velocityX = deltaX;
    }

    if (!isBlocked(nextX, targetY)) {
      nextY = targetY;
      velocityY = deltaY;
    }

    if (nextX !== startX || nextY !== startY) {
      return {
        position: { x: nextX, y: nextY },
        velocity: { x: nextX - startX, y: nextY - startY },
      };
    }

    return {
      position: { x: startX, y: startY },
      velocity: { x: 0, y: 0 },
    };
  }

  return {
    map,
    isBlocked,
    resolveMovementWithCollisions,
  };
}

function normalizeMapDefinition(json) {
  const width = Number(json.width ?? 0);
  const height = Number(json.height ?? 0);
  const tileWidth = Number(json.tilewidth ?? json.tileWidth ?? 0);
  const tileHeight = Number(json.tileheight ?? json.tileHeight ?? 0);
  const layers = Array.isArray(json.layers) ? json.layers.filter((layer) => layer?.type === "tilelayer") : [];
  const tileset = Array.isArray(json.tilesets) ? json.tilesets[0] : null;

  if (!width || !height || !tileWidth || !tileHeight || !tileset) {
    throw new Error("Invalid map definition: missing dimensions or tileset");
  }

  if (typeof tileset.firstgid !== "number") {
    throw new Error("Invalid tileset configuration: missing firstgid");
  }

  return {
    width,
    height,
    tileWidth,
    tileHeight,
    layers,
    tileset: {
      firstgid: Number(tileset.firstgid ?? 1),
      columns: Number(tileset.columns ?? 0),
      tilewidth: Number(tileset.tilewidth ?? tileWidth),
      tileheight: Number(tileset.tileheight ?? tileHeight),
      tiles: Array.isArray(tileset.tiles) ? tileset.tiles : [],
    },
  };
}

function buildCollisionGrid(map) {
  const grid = Array.from({ length: map.height }, () => Array.from({ length: map.width }, () => false));

  const collidableLocalIds = new Set();

  for (const tile of map.tileset.tiles) {
    const hasCollisionObjects = Array.isArray(tile?.objectgroup?.objects)
      ? tile.objectgroup.objects.some((object) =>
          Number(object?.width ?? 0) > 0 && Number(object?.height ?? 0) > 0
        )
      : false;

    if (hasCollisionObjects && typeof tile.id === "number") {
      collidableLocalIds.add(tile.id);
    }
  }

  if (collidableLocalIds.size === 0) {
    return grid;
  }

  for (const layer of map.layers) {
    if (!Array.isArray(layer?.data)) {
      continue;
    }

    const layerWidth = Number(layer.width ?? map.width);

    for (let tileIndex = 0; tileIndex < layer.data.length; tileIndex += 1) {
      const rawGid = layer.data[tileIndex];
      const gid = rawGid & FLIPPED_GID_MASK;

      if (!gid || gid < map.tileset.firstgid) {
        continue;
      }

      const localId = gid - map.tileset.firstgid;

      if (!collidableLocalIds.has(localId)) {
        continue;
      }

      const tileX = tileIndex % layerWidth;
      const tileY = Math.floor(tileIndex / layerWidth);

      if (tileX >= 0 && tileX < map.width && tileY >= 0 && tileY < map.height) {
        grid[tileY][tileX] = true;
      }
    }
  }

  return grid;
}
