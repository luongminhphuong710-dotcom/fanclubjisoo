import { mkdir, readFile, writeFile } from "node:fs/promises";
import crypto from "node:crypto";
import { promisify } from "node:util";
import path from "node:path";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { json } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const memberSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(160),
  password: z.string().min(8).max(120),
  fanName: z.string().trim().max(80).optional().default(""),
  favoriteSong: z.string().trim().max(80).optional().default("")
});

type Member = Omit<z.infer<typeof memberSchema>, "password"> & {
  id: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
};

const dataDir = path.join(process.cwd(), ".data");
const membersFile = path.join(dataDir, "members.json");
const scryptAsync = promisify(crypto.scrypt);

async function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function readMembers(): Promise<Member[]> {
  try {
    const content = await readFile(membersFile, "utf8");
    return JSON.parse(content) as Member[];
  } catch {
    return [];
  }
}

async function writeMembers(members: Member[]) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(membersFile, `${JSON.stringify(members, null, 2)}\n`, "utf8");
}

export async function POST(request: Request) {
  const parsed = memberSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return json({ message: "Thông tin đăng ký chưa hợp lệ." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const incoming = parsed.data;
  const passwordHash = await hashPassword(incoming.password);

  try {
    const user = await db.user.upsert({
      where: { email: incoming.email },
      update: {
        displayName: incoming.displayName,
        fanName: incoming.fanName,
        favoriteSong: incoming.favoriteSong,
        passwordHash
      },
      create: {
        displayName: incoming.displayName,
        email: incoming.email,
        fanName: incoming.fanName,
        favoriteSong: incoming.favoriteSong,
        passwordHash,
        role: UserRole.FAN
      }
    });

    return json({
      message: "Tài khoản thành viên đã được tạo/cập nhật.",
      user: {
        id: user.id,
        displayName: user.displayName,
        email: user.email,
        fanName: user.fanName,
        favoriteSong: user.favoriteSong,
        role: user.role
      }
    });
  } catch {
    // Fallback keeps local preview working when PostgreSQL is not configured.
  }

  const members = await readMembers();
  const existingIndex = members.findIndex((member) => member.email.toLowerCase() === incoming.email.toLowerCase());
  const memberData = {
    displayName: incoming.displayName,
    email: incoming.email,
    fanName: incoming.fanName,
    favoriteSong: incoming.favoriteSong,
    passwordHash
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

  await writeMembers(members);

  return json({
    message: existingIndex >= 0 ? "Thông tin thành viên đã được cập nhật." : "Đăng ký thành viên thành công.",
    memberCount: members.length
  });
}
