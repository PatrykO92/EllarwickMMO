import fs from "fs";
import path from "path";

const mapsCache = new Map();

export async function getMapData(mapName) {
  if (mapsCache.has(mapName)) {
    return mapsCache.get(mapName);
  }

  try {
    const filePath = path.join(
      process.cwd(),
      "data",
      "maps",
      `${mapName}.json`
    );
    const rawData = fs.readFileSync(filePath, "utf8");
    const mapData = JSON.parse(rawData);

    mapsCache.set(mapName, mapData);
    return mapData;
  } catch (err) {
    console.error(`Failed to load map: ${mapName}`, err);
    return null;
  }
}

export function getAllMapNames() {
  const mapsDir = path.join(process.cwd(), "data", "maps");
  return fs
    .readdirSync(mapsDir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => file.replace(".json", ""));
}
