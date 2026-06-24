import { readFile } from "node:fs/promises";
import crypto from "node:crypto";
import { promisify } from "node:util";
import path from "node:path";
import { z } from "zod";
import { db } from "@/lib/db";
import { json } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const loginSchema = z.object({
  email: z.string().trim().email().max(160),
  password: z.string().min(1).max(120)
});

type FallbackMember = {
  id: string;
  email: string;
  displayName: string;
  fanName?: string;
  favoriteSong?: string;
  passwordHash: string;
};

const membersFile = path.join(process.cwd(), ".data", "members.json");
const scryptAsync = promisify(crypto.scrypt);

async function verifyPassword(password: string, passwordHash: string | null | undefined) {
  if (!passwordHash) {
    return false;
  }

  const [salt, storedHash] = passwordHash.split(":");
  if (!salt || !storedHash) {
    return false;
  }

  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  const candidate = Buffer.from(derivedKey.toString("hex"));
  const stored = Buffer.from(storedHash);

  return candidate.length === stored.length && crypto.timingSafeEqual(candidate, stored);
}

async function readFallbackMembers(): Promise<FallbackMember[]> {
  try {
    const content = await readFile(membersFile, "utf8");
    return JSON.parse(content) as FallbackMember[];
  } catch {
    return [];
  }
}

function createMemberCookie(memberId: string, email: string) {
  const value = Buffer.from(JSON.stringify({ memberId, email, at: Date.now() })).toString("base64url");
  return `jisoo_member_session=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`;
}

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return json({ message: "Thông tin đăng nhập chưa hợp lệ." }, { status: 400 });
  }

  const { email, password } = parsed.data;

  try {
    const user = await db.user.findUnique({ where: { email } });

    if (user && (await verifyPassword(password, user.passwordHash))) {
      return json(
        {
          message: "Đăng nhập thành viên thành công.",
          user: {
            id: user.id,
            displayName: user.displayName,
            email: user.email,
            role: user.role
          }
        },
        {
          headers: {
            "set-cookie": createMemberCookie(user.id, user.email)
          }
        }
      );
    }
  } catch {
    // Fallback below keeps preview mode working before PostgreSQL is configured.
  }

  const members = await readFallbackMembers();
  const member = members.find((item) => item.email.toLowerCase() === email.toLowerCase());

  if (!member || !(await verifyPassword(password, member.passwordHash))) {
    return json({ message: "Email hoặc mật khẩu chưa đúng." }, { status: 401 });
  }

  return json(
    {
      message: "Đăng nhập thành viên thành công.",
      user: {
        id: member.id,
        displayName: member.displayName,
        email: member.email,
        fanName: member.fanName,
        favoriteSong: member.favoriteSong
      }
    },
    {
      headers: {
        "set-cookie": createMemberCookie(member.id, member.email)
      }
    }
  );
}
