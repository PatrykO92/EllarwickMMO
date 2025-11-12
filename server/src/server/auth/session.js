import crypto from "crypto";
import { prisma } from "../../db/prismaClient.js";

/** Session helpers for issuing and validating WebSocket login tokens. */

const SESSION_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

export async function createUserSession(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  const session = await prisma.session.create({
    data: {
      token,
      expires_at: expiresAt,
      user_id: userId,
    },
  });

  return { token: session.token, expiresAt: session.expires_at };
}

export async function removeExpiredSessions(userId) {
  await prisma.session.deleteMany({
    where: {
      user_id: userId,
      expires_at: {
        lt: new Date(),
      },
    },
  });
}

export async function verifySessionToken(token) {
  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true,
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  if (session.expires_at <= new Date()) {
    await prisma.session
      .delete({
        where: { token },
      })
      .catch(() => {});
    return null;
  }

  return {
    token: session.token,
    expiresAt: session.expires_at,
    userId: session.user.id,
    user: session.user,
  };
}
