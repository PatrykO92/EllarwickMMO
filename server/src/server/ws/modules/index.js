import { createPlayerStateStore } from "../../state/playerStateStore.js";
import { registerChatModule } from "./chat.js";
import { registerSystemModule } from "./system.js";
import { registerMovementModule } from "./movement.js";

/** Aggregates all websocket modules and shares cross-cutting state between them. */

export function registerWebSocketModules(dispatcher) {
  const playerState = createPlayerStateStore({ emitter: dispatcher.emitter });

  dispatcher.state = {
    ...(dispatcher.state ?? {}),
    playerState,
  };

  registerSystemModule(dispatcher, { playerState });
  registerChatModule(dispatcher, { playerState });
  registerMovementModule(dispatcher, { playerState });

  return { playerState };
}
