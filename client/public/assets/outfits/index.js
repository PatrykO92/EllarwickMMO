const srcToOutfits = "/assets/outfits/";

export const outfits = {
  1: {
    name: "Adventurer",
    spriteUrl: `${srcToOutfits}outfit1.png`,
    frameWidth: 16,
    frameHeight: 32,
    scale: 2,
    moveFrames: [0, 1, 2, 3, 4, 5, 6, 7],
    idleFrames: [0, 1, 2, 3],
  },
  2: {
    name: "Knight",
    spriteUrl: `${srcToOutfits}outfit2.png`,
    frameWidth: 16,
    frameHeight: 32,
    scale: 2,
    moveFrames: [0, 1, 2, 3, 4, 5, 6, 7],
    idleFrames: [0, 1, 2, 3],
  },
  3: {
    name: "Ranger",
    spriteUrl: `${srcToOutfits}outfit3.png`,
    frameWidth: 16,
    frameHeight: 32,
    scale: 2,
    moveFrames: [0, 1, 2, 3, 4, 5, 6, 7],
    idleFrames: [0, 1, 2, 3],
  },
};
