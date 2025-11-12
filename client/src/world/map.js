import { WORLD_SCALE } from "../constants.js";

const MAP_URL = "/assets/maps/map.json";
const MAP_ASSET_BASE = "/assets/maps/";

let loadPromise = null;
let mapData = null;
let prerenderCanvas = null;
let loadFailed = false;

/** Ensures the map JSON and tileset texture are loaded and prerendered. */
export function loadWorldMap() {
  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = fetch(MAP_URL)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to fetch map JSON: ${response.status} ${response.statusText}`);
      }
      return response.json();
    })
    .then(async (json) => {
      const normalized = normalizeMapDefinition(json);
      const tilesetImage = await loadImage(resolveTilesetPath(normalized.tileset.image));
      prerenderCanvas = buildMapCanvas(normalized, tilesetImage);
      mapData = normalized;
      loadFailed = false;
      return mapData;
    })
    .catch((error) => {
      console.error("[client] Failed to load world map", error);
      loadFailed = true;
      loadPromise = null;
      throw error;
    });

  return loadPromise;
}

/** Returns whether the map has been successfully prepared for rendering. */
export function isWorldMapReady() {
  return Boolean(mapData && prerenderCanvas);
}

/** Draws the prerendered map centred on the local player position. */
export function drawWorldMap(ctx, viewportWidth, viewportHeight, offsetX, offsetY) {
  if (!prerenderCanvas) {
    if (!loadFailed) {
      loadWorldMap().catch(() => {
        /* error already logged */
      });
    }
    return;
  }

  const scale = WORLD_SCALE;
  const mapPixelWidth = mapData.width * scale;
  const mapPixelHeight = mapData.height * scale;

  const screenX = viewportWidth / 2 - offsetX * scale - mapPixelWidth / 2;
  const screenY = viewportHeight / 2 - offsetY * scale - mapPixelHeight / 2;

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(prerenderCanvas, screenX, screenY);
  ctx.restore();
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

  if (typeof tileset.columns !== "number" || tileset.columns <= 0) {
    throw new Error("Invalid tileset configuration: missing column count");
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
      image: String(tileset.image ?? ""),
    },
  };
}

function resolveTilesetPath(image) {
  if (!image) {
    throw new Error("Tileset image path is missing");
  }

  if (image.startsWith("/")) {
    return image;
  }

  return `${MAP_ASSET_BASE}${image}`;
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image '${url}'`));
    image.src = url;
  });
}

function buildMapCanvas(map, tilesetImage) {
  const scale = WORLD_SCALE;
  const canvas = document.createElement("canvas");
  canvas.width = map.width * scale;
  canvas.height = map.height * scale;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Failed to create map canvas context");
  }

  context.imageSmoothingEnabled = false;

  for (const layer of map.layers) {
    if (!Array.isArray(layer.data)) {
      continue;
    }

    const layerWidth = Number(layer.width ?? map.width);
    for (let tileIndex = 0; tileIndex < layer.data.length; tileIndex += 1) {
      const rawGid = layer.data[tileIndex];
      const gid = rawGid & 0x1fffffff; // mask out flip bits

      if (!gid || gid < map.tileset.firstgid) {
        continue;
      }

      const localId = gid - map.tileset.firstgid;
      const tileX = tileIndex % layerWidth;
      const tileY = Math.floor(tileIndex / layerWidth);

      const sourceX = (localId % map.tileset.columns) * map.tileset.tilewidth;
      const sourceY = Math.floor(localId / map.tileset.columns) * map.tileset.tileheight;
      const destX = tileX * scale;
      const destY = tileY * scale;

      context.drawImage(
        tilesetImage,
        sourceX,
        sourceY,
        map.tileset.tilewidth,
        map.tileset.tileheight,
        destX,
        destY,
        scale,
        scale
      );
    }
  }

  return canvas;
}
