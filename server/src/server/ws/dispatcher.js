import EventEmitter from "eventemitter3";
import { randomUUID } from "crypto";
import { z } from "zod";

/**
 * The dispatcher is the single entry point for every WebSocket message. It
 * validates JSON payloads, routes them to registered handlers, and exposes
 * helpers for broadcasting events to all connections.
 */

const baseMessageSchema = z.object({
  type: z
    .string({ required_error: "type is required" })
    .min(1, "type must be a non-empty string"),
  payload: z.unknown().optional(),
  requestId: z.union([z.string(), z.number()]).optional(),
});

function normalizeIncomingPayload(payload, schema) {
  if (!schema) {
    return payload;
  }

  const result = schema.safeParse(payload);

  if (!result.success) {
    const issue = result.error.issues[0];
    const message = issue?.message ?? "Invalid payload";
    throw createClientError("invalid_payload", message, {
      details: issue,
    });
  }

  return result.data;
}

function normalizeRawMessage(raw) {
  if (typeof raw === "string") {
    return raw;
  }

  if (Array.isArray(raw)) {
    return Buffer.concat(raw).toString("utf-8");
  }

  if (raw instanceof ArrayBuffer) {
    return Buffer.from(raw).toString("utf-8");
  }

  if (Buffer.isBuffer(raw)) {
    return raw.toString("utf-8");
  }

  throw createClientError("invalid_message", "Unsupported WebSocket message format");
}

function safeJsonParse(raw) {
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw createClientError("invalid_json", "Message must be valid JSON");
  }
}

function createClientError(code, message, extras = {}) {
  const error = new Error(message ?? code);
  error.code = code;
  error.isClientError = true;
  if (extras.details) {
    error.details = extras.details;
  }
  return error;
}

function createOutboundMessage(type, payload, metadata) {
  const message = { type };

  if (typeof payload !== "undefined") {
    message.payload = payload;
  }

  if (typeof metadata !== "undefined") {
    message.meta = metadata;
  }

  return JSON.stringify(message);
}

/**
 * Creates a dispatcher with optional dependency injection for the event bus.
 * Modules register typed handlers via `registerHandler` so the rest of the
 * server can stay declarative.
 */
export function createWebSocketDispatcher(options = {}) {
  const emitter = options.emitter ?? new EventEmitter();
  const handlers = new Map();
  const connections = new Map();

  function registerHandler(definition) {
    const { type, schema, handler, description } = definition;

    if (typeof type !== "string" || type.length === 0) {
      throw new Error("WebSocket handler must define a non-empty type");
    }

    if (handlers.has(type)) {
      throw new Error(`WebSocket handler for type '${type}' is already registered`);
    }

    if (typeof handler !== "function") {
      throw new Error(`WebSocket handler for type '${type}' must be a function`);
    }

    handlers.set(type, {
      schema,
      handler,
      description,
    });
  }

  function sendToConnection(connection, type, payload, metadata) {
    const { ws } = connection;

    if (!ws || typeof ws.send !== "function") {
      return false;
    }

    if (ws.readyState !== ws.OPEN) {
      return false;
    }

    const serialized = createOutboundMessage(type, payload, metadata);
    ws.send(serialized);
    return true;
  }

  function broadcast(type, payload, metadata, filterFn = null) {
    for (const connection of connections.values()) {
      if (typeof filterFn === "function" && !filterFn(connection)) {
        continue;
      }

      sendToConnection(connection, type, payload, metadata);
    }
  }

  async function handleMessage(connection, rawMessage) {
    let normalized;

    try {
      normalized = normalizeRawMessage(rawMessage);
    } catch (error) {
      handleDispatchError(connection, error);
      return;
    }

    let parsed;

    try {
      parsed = safeJsonParse(normalized);
    } catch (error) {
      handleDispatchError(connection, error);
      return;
    }

    const baseResult = baseMessageSchema.safeParse(parsed);

    if (!baseResult.success) {
      const issue = baseResult.error.issues[0];
      handleDispatchError(
        connection,
        createClientError("invalid_message", issue?.message ?? "Invalid message format", {
          details: issue,
        })
      );
      return;
    }

    const { type, payload, requestId } = baseResult.data;
    const definition = handlers.get(type);

    if (!definition) {
      handleDispatchError(
        connection,
        createClientError("unknown_message", `No handler registered for message type '${type}'`)
      );
      return;
    }

    let normalizedPayload;

    try {
      normalizedPayload = normalizeIncomingPayload(payload, definition.schema);
    } catch (error) {
      handleDispatchError(connection, error, { requestId });
      return;
    }

    try {
      await definition.handler({
        connection,
        payload: normalizedPayload,
        rawPayload: payload,
        requestId,
        send: (outType, outPayload, metadata) => sendToConnection(connection, outType, outPayload, metadata),
        broadcast: (outType, outPayload, metadata, filter) =>
          broadcast(outType, outPayload, metadata, filter),
        emitter,
      });

      emitter.emit("message:handled", {
        type,
        connectionId: connection.id,
        requestId,
      });
    } catch (error) {
      console.error(
        `Error handling WebSocket message '${type}' for connection ${connection.id}:`,
        error
      );
      handleDispatchError(connection, error, { requestId });
    }
  }

  function handleDispatchError(connection, error, extras = {}) {
    const { ws } = connection;
    const isClientError = Boolean(error?.isClientError);
    const code = error?.code ?? "internal_error";
    const message = error?.message ?? "Internal server error";
    const payload = {
      code,
      message,
    };

    if (extras.requestId !== undefined) {
      payload.requestId = extras.requestId;
    }

    if (isClientError && error?.details) {
      payload.details = error.details;
    }

    sendToConnection(connection, "error", payload);

    if (!isClientError) {
      console.warn(
        `Non-client error while dispatching WebSocket message for connection ${connection.id}:`,
        error
      );
    }
  }

  function attachConnection(ws, context = {}) {
    const connectionId = randomUUID();
    const connection = {
      id: connectionId,
      ws,
      auth: context.auth ?? null,
      remoteAddress: context.remoteAddress ?? null,
      remotePort: context.remotePort ?? null,
      connectedAt: new Date(),
      metadata: context.metadata ?? {},
    };

    connections.set(connectionId, connection);

    const onMessage = (data) => handleMessage(connection, data);
    const onClose = () => detach();
    const onError = (error) => {
      emitter.emit("connection:error", {
        connectionId,
        error,
      });
    };

    ws.on("message", onMessage);
    ws.once("close", onClose);
    ws.on("error", onError);

    emitter.emit("connection:opened", {
      connectionId,
      connection,
    });

    function detach() {
      if (!connections.has(connectionId)) {
        return;
      }

      ws.off?.("message", onMessage);
      ws.off?.("error", onError);
      ws.removeListener?.("message", onMessage);
      ws.removeListener?.("error", onError);

      connections.delete(connectionId);

      emitter.emit("connection:closed", {
        connectionId,
        connection,
      });
    }

    return {
      connection,
      detach,
    };
  }

  return {
    emitter,
    registerHandler,
    attachConnection,
    broadcast,
    connections,
  };
}
