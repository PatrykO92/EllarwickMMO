/**
 * Injects the full application markup into the provided root element. The
 * structure mirrors the server data flow: login panel, world view, and sidebar
 * overlays.
 */
export function renderAppShell(root) {
  root.innerHTML = `
    <div class="app-shell">
      <section class="panel" id="auth-panel">
        <h1>Ellarwick Login</h1>
        <form id="login-form" autocomplete="off">
          <label class="field">
            <span>Username or email</span>
            <input id="identifier" name="identifier" type="text" required minlength="3" maxlength="120" />
          </label>
          <label class="field">
            <span>Password</span>
            <input id="password" name="password" type="password" required minlength="8" maxlength="128" />
          </label>
          <button type="submit">Log In</button>
        </form>
        <p id="auth-status" data-error="false"></p>
      </section>

      <section class="panel hidden" id="game-panel">
        <header class="game-header">
          <div id="user-info">Not authenticated</div>
          <div class="connection-meta">
            <span id="connection-status" data-state="disconnected">Disconnected</span>
            <span id="latency-info">RTT: —</span>
            <span id="tick-info" data-stale="true">Tick: —</span>
          </div>
          <div class="game-controls">
            <button type="button" id="ping-button">Send Ping</button>
            <button type="button" id="logout-button">Log Out</button>
          </div>
        </header>
        <div class="game-content">
          <div class="canvas-wrapper">
            <canvas id="game-canvas" width="720" height="480" aria-label="World view"></canvas>
            <p class="movement-hint">Move with WASD or Arrow keys</p>
          </div>
          <aside class="sidebar">
            <div class="player-roster">
              <div class="panel-header">
                <h2>Adventurers</h2>
                <span id="player-count" class="badge">0</span>
              </div>
              <ul id="player-roster" class="player-roster-list">
                <li class="player-roster-empty">No adventurers connected</li>
              </ul>
            </div>
            <div class="chat-section">
              <h2>Realm Chat</h2>
              <ul id="chat-messages" class="chat-log"></ul>
              <form id="chat-form" autocomplete="off">
                <input id="chat-input" type="text" placeholder="Send a message" maxlength="500" />
                <button type="submit">Send</button>
              </form>
            </div>
          </aside>
        </div>
      </section>
    </div>
  `;
}

/** Toggles between the authentication view and the in-game UI. */
export function showAuthPanel(show) {
  const authPanel = document.querySelector("#auth-panel");
  const gamePanel = document.querySelector("#game-panel");

  if (show) {
    authPanel?.classList.remove("hidden");
    gamePanel?.classList.add("hidden");
  } else {
    authPanel?.classList.add("hidden");
    gamePanel?.classList.remove("hidden");
  }
}
