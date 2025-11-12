import { httpBaseUrl } from "../config.js";

/** Performs the login HTTP request and returns `{ token, user }` on success. */
export async function login(identifier, password) {
  const response = await fetch(`${httpBaseUrl}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ identifier, password }),
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    const message = result?.error ?? "Login failed";
    const error = new Error(message);
    error.isClientError = true;
    throw error;
  }

  if (!result?.token || !result?.user) {
    throw new Error("Malformed response");
  }

  return { token: result.token, user: result.user };
}
