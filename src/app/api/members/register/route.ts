import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { json } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const memberSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(160),
  fanName: z.string().trim().max(80).optional().default(""),
  favoriteSong: z.string().trim().max(80).optional().default("")
});

type Member = z.infer<typeof memberSchema> & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

const dataDir = path.join(process.cwd(), ".data");
const membersFile = path.join(dataDir, "members.json");

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
  const members = await readMembers();
  const existingIndex = members.findIndex((member) => member.email.toLowerCase() === incoming.email.toLowerCase());

  if (existingIndex >= 0) {
    members[existingIndex] = {
      ...members[existingIndex],
      ...incoming,
      updatedAt: now
    };
  } else {
    members.push({
      id: crypto.randomUUID(),
      ...incoming,
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
