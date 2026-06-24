import { mkdir, readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { db } from "@/lib/db";

export type BlogCommentData = {
  id: string;
  postId: string;
  authorName: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

export type BlogCommentInput = {
  postId: string;
  authorName: string;
  body: string;
};

function dataPath() {
  if (process.env.VERCEL) {
    return path.join(os.tmpdir(), "jisoo-blog-comments.json");
  }

  return path.join(process.cwd(), ".data", "blog-comments.json");
}

function serializeDbComment(comment: {
  id: string;
  postId: string;
  authorName: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
}): BlogCommentData {
  return {
    ...comment,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString()
  };
}

function normalizeFallbackComment(comment: Partial<BlogCommentData>): BlogCommentData {
  const now = new Date().toISOString();

  return {
    id: comment.id ?? randomUUID(),
    postId: comment.postId ?? "",
    authorName: comment.authorName ?? "Admin Mia",
    body: comment.body ?? "",
    createdAt: comment.createdAt ?? now,
    updatedAt: comment.updatedAt ?? now
  };
}

async function readFallbackComments(): Promise<BlogCommentData[]> {
  try {
    const content = await readFile(dataPath(), "utf8");
    const comments = JSON.parse(content) as Partial<BlogCommentData>[];
    return comments.map(normalizeFallbackComment).filter((comment) => comment.postId && comment.body);
  } catch {
    return [];
  }
}

async function writeFallbackComments(comments: BlogCommentData[]) {
  const filePath = dataPath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(comments, null, 2)}\n`, "utf8");
}

export async function listBlogComments(postId: string) {
  try {
    const comments = await db.blogComment.findMany({
      where: { postId },
      orderBy: { createdAt: "asc" }
    });

    return comments.map(serializeDbComment);
  } catch {
    const comments = await readFallbackComments();
    return comments
      .filter((comment) => comment.postId === postId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }
}

export async function createBlogComment(input: BlogCommentInput) {
  const now = new Date().toISOString();
  const payload = {
    postId: input.postId,
    authorName: input.authorName.trim() || "Admin Mia",
    body: input.body.trim()
  };

  try {
    const created = await db.blogComment.create({ data: payload });
    return serializeDbComment(created);
  } catch {
    const comments = await readFallbackComments();
    const created: BlogCommentData = {
      ...payload,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now
    };

    await writeFallbackComments([...comments, created]);
    return created;
  }
}
