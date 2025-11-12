/** Escapes HTML special characters so we can safely inject strings into the DOM. */
export function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Formats an ISO timestamp using the user's locale. */
export function formatTimestamp(timestamp) {
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  } catch {
    return String(timestamp);
  }
}
