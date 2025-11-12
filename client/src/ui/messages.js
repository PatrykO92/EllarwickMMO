import { MAX_CHAT_MESSAGES } from "../constants.js";
import { clientState } from "../state/store.js";
import { createLocalId } from "../utils/id.js";
import { escapeHtml, formatTimestamp } from "../utils/text.js";

/** Chat UI helpers responsible for rendering and storing log entries. */

/** Forces the chat log to re-render from the in-memory message list. */
export function renderMessages() {
  const list = document.querySelector("#chat-messages");
  if (!list) return;

  list.innerHTML = clientState.messages
    .map((entry) => {
      if (entry.type === "system") {
        return `<li class="chat-message system"><span class="chat-timestamp">${formatTimestamp(
          entry.createdAt
        )}</span><span class="chat-text">${escapeHtml(entry.text)}</span></li>`;
      }

      return `<li class="chat-message"><span class="chat-timestamp">${formatTimestamp(entry.sentAt)}</span><span class="chat-username">${escapeHtml(
        entry.user?.username ?? "unknown"
      )}</span><span class="chat-text">${escapeHtml(entry.message)}</span></li>`;
    })
    .join("");

  list.scrollTop = list.scrollHeight;
}

/** Adds a message to the chat log and immediately refreshes the view. */
export function appendMessage(entry) {
  clientState.messages.push(entry);

  if (clientState.messages.length > MAX_CHAT_MESSAGES) {
    clientState.messages.shift();
  }

  renderMessages();
}

/** Convenience helper for system notices. */
export function appendSystemMessage(text) {
  appendMessage({
    id: createLocalId("system"),
    type: "system",
    text,
    createdAt: new Date().toISOString(),
  });
}
