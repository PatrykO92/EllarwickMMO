import { clientState } from "../state/store.js";
import { escapeHtml } from "../utils/text.js";
import { getPlayersForRoster } from "../world/players.js";

/** Sidebar roster renderer that highlights the local player and coordinates. */

/** Renders the sidebar roster showing every connected player. */
export function renderPlayerRoster() {
  const roster = document.querySelector("#player-roster");
  const counter = document.querySelector("#player-count");

  if (!roster) {
    return;
  }

  const players = getPlayersForRoster();

  if (counter) {
    counter.textContent = String(players.length);
  }

  if (players.length === 0) {
    roster.innerHTML = '<li class="player-roster-empty">No adventurers connected</li>';
    return;
  }

  roster.innerHTML = players
    .map((player) => {
      const isSelf = player.userId === clientState.localPlayerId;
      const x = Number.isFinite(player.position?.x) ? player.position.x : 0;
      const y = Number.isFinite(player.position?.y) ? player.position.y : 0;
      const coords = `${x.toFixed(1)}, ${y.toFixed(1)}`;
      const name = escapeHtml(player.username ?? "Player");
      const tag = isSelf ? '<span class="player-tag">You</span>' : "";
      return `<li class="player-roster-entry${isSelf ? " self" : ""}"><span class="player-name">${name}${tag}</span><span class="player-coords">${coords}</span></li>`;
    })
    .join("");
}
