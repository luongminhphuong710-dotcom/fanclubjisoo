import { get, put } from "@vercel/blob";

export function hasBlobStore() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function readBlobJson<T>(pathname: string): Promise<T | null> {
  if (!hasBlobStore()) {
    return null;
  }

  try {
    const result = await get(pathname, { access: "private", useCache: false });

    if (!result?.stream) {
      return null;
    }

    const content = await new Response(result.stream).text();
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

export async function writeBlobJson<T>(pathname: string, data: T) {
  if (!hasBlobStore()) {
    return false;
  }

  await put(pathname, `${JSON.stringify(data, null, 2)}\n`, {
    access: "private",
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 60
  });

  return true;
}
