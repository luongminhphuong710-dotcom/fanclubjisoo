import { mkdir, readFile, writeFile } from "node:fs/promises";
import crypto from "node:crypto";
import { promisify } from "node:util";
import os from "node:os";
import path from "node:path";
import { UserRole } from "@prisma/client";
import { db } from "@/lib/db";

export type MemberRegistrationInput = {
  displayName: string;
  email: string;
  password: string;
  fanName?: string;
  favoriteSong?: string;
};

export type PublicMember = {
  id: string;
  email: string;
  displayName: string;
  fanName: string | null;
  favoriteSong: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
};

type StoredMember = PublicMember & {
  passwordHash: string;
};

export const MEMBER_SESSION_COOKIE = "jisoo_member_session";

const scryptAsync = promisify(crypto.scrypt);

function dataPath() {
  if (process.env.VERCEL) {
    return path.join(os.tmpdir(), "jisoo-members.json");
  }

  return path.join(process.cwd(), ".data", "members.json");
}

function publicMember(member: StoredMember): PublicMember {
  return {
    id: member.id,
    email: member.email,
    displayName: member.displayName,
    fanName: member.fanName ?? null,
    favoriteSong: member.favoriteSong ?? null,
    role: member.role ?? "FAN",
    createdAt: member.createdAt,
    updatedAt: member.updatedAt
  };
}

function serializeDbUser(user: {
  id: string;
  email: string;
  displayName: string;
  fanName: string | null;
  favoriteSong: string | null;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}): PublicMember {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    fanName: user.fanName,
    favoriteSong: user.favoriteSong,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString()
  };
}

export async function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, passwordHash: string | null | undefined) {
  if (!passwordHash) {
    return false;
  }

  const [salt, storedHash] = passwordHash.split(":");
  if (!salt || !storedHash) {
    return false;
  }

  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  const stored = Buffer.from(storedHash, "hex");

  return derivedKey.length === stored.length && crypto.timingSafeEqual(derivedKey, stored);
}

export async function readFallbackMembers(): Promise<StoredMember[]> {
  try {
    const content = await readFile(dataPath(), "utf8");
    const members = JSON.parse(content) as Partial<StoredMember>[];

    return members
      .filter((member) => member.id && member.email && member.displayName && member.passwordHash)
      .map((member) => ({
        id: member.id ?? crypto.randomUUID(),
        email: member.email ?? "",
        displayName: member.displayName ?? "",
        fanName: member.fanName ?? null,
        favoriteSong: member.favoriteSong ?? null,
        role: member.role ?? "FAN",
        passwordHash: member.passwordHash ?? "",
        createdAt: member.createdAt ?? new Date().toISOString(),
        updatedAt: member.updatedAt ?? new Date().toISOString()
      }));
  } catch {
    return [];
  }
}

async function writeFallbackMembers(members: StoredMember[]) {
  const filePath = dataPath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(members, null, 2)}\n`, "utf8");
}

export function createMemberCookie(memberId: string, email: string) {
  const value = Buffer.from(JSON.stringify({ memberId, email, at: Date.now() })).toString("base64url");
  return `${MEMBER_SESSION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`;
}

function readSessionPayload(request: Request) {
  const cookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${MEMBER_SESSION_COOKIE}=`));

  if (!cookie) {
    return null;
  }

  try {
    const rawValue = cookie.slice(MEMBER_SESSION_COOKIE.length + 1);
    return JSON.parse(Buffer.from(rawValue, "base64url").toString("utf8")) as {
      memberId?: string;
      email?: string;
      at?: number;
    };
  } catch {
    return null;
  }
}

export async function registerMember(input: MemberRegistrationInput) {
  const now = new Date().toISOString();
  const passwordHash = await hashPassword(input.password);
  const normalizedEmail = input.email.trim().toLowerCase();

  try {
    const user = await db.user.upsert({
      where: { email: normalizedEmail },
      update: {
        displayName: input.displayName,
        fanName: input.fanName || null,
        favoriteSong: input.favoriteSong || null,
        passwordHash
      },
      create: {
        displayName: input.displayName,
        email: normalizedEmail,
        fanName: input.fanName || null,
        favoriteSong: input.favoriteSong || null,
        passwordHash,
        role: UserRole.FAN
      }
    });

    return serializeDbUser(user);
  } catch {
    const members = await readFallbackMembers();
    const existingIndex = members.findIndex((member) => member.email.toLowerCase() === normalizedEmail);
    const memberData = {
      displayName: input.displayName,
      email: normalizedEmail,
      fanName: input.fanName || null,
      favoriteSong: input.favoriteSong || null,
      passwordHash,
      role: "FAN"
    };

    if (existingIndex >= 0) {
      members[existingIndex] = {
        ...members[existingIndex],
        ...memberData,
        updatedAt: now
      };
    } else {
      members.push({
        id: crypto.randomUUID(),
        ...memberData,
        createdAt: now,
        updatedAt: now
      });
    }

    await writeFallbackMembers(members);
    return publicMember(members[existingIndex >= 0 ? existingIndex : members.length - 1]);
  }
}

export async function authenticateMember(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();

  try {
    const user = await db.user.findUnique({ where: { email: normalizedEmail } });

    if (user && (await verifyPassword(password, user.passwordHash))) {
      return serializeDbUser(user);
    }
  } catch {
    // Fallback below keeps preview mode working before PostgreSQL is configured.
  }

  const members = await readFallbackMembers();
  const member = members.find((item) => item.email.toLowerCase() === normalizedEmail);

  if (!member || !(await verifyPassword(password, member.passwordHash))) {
    return null;
  }

  return publicMember(member);
}

export async function getMemberFromRequest(request: Request) {
  const session = readSessionPayload(request);

  if (!session?.memberId || !session.email) {
    return null;
  }

  try {
    const user = await db.user.findUnique({ where: { id: session.memberId } });

    if (user && user.email.toLowerCase() === session.email.toLowerCase()) {
      return serializeDbUser(user);
    }
  } catch {
    // Fallback below keeps preview mode working before PostgreSQL is configured.
  }

  const members = await readFallbackMembers();
  const member = members.find(
    (item) => item.id === session.memberId && item.email.toLowerCase() === session.email?.toLowerCase()
  );

  return member ? publicMember(member) : null;
}

export async function listMembers() {
  try {
    const users = await db.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 200
    });

    return users.map(serializeDbUser);
  } catch {
    const members = await readFallbackMembers();
    return members
      .map(publicMember)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}
