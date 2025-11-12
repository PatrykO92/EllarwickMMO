import { createPlayerStateStore } from "../../state/playerStateStore.js";
import { registerChatModule } from "./chat.js";
import { registerSystemModule } from "./system.js";
import { registerMovementModule } from "./movement.js";
import { createWorldMap } from "../../../world/worldMap.js";

/** Aggregates all websocket modules and shares cross-cutting state between them. */

export function registerWebSocketModules(dispatcher) {
  const playerState = createPlayerStateStore({ emitter: dispatcher.emitter });
  const worldMap = createWorldMap();

  dispatcher.state = {
    ...(dispatcher.state ?? {}),
    playerState,
    worldMap,
  };

  registerSystemModule(dispatcher, { playerState });
  registerChatModule(dispatcher, { playerState });
  registerMovementModule(dispatcher, { playerState, worldMap });

  return { playerState, worldMap };
}
