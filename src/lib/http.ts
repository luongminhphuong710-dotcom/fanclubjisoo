export function unauthorizedUnlessCron(request: Request): Response | null {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return null;
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) {
    return null;
  }

  return json({ error: "Unauthorized cron request" }, { status: 401 });
}

export function json(data: unknown, init?: ResponseInit): Response {
  return new Response(
    JSON.stringify(data, (_, value) => (typeof value === "bigint" ? value.toString() : value)),
    {
      ...init,
      headers: {
        "content-type": "application/json; charset=utf-8",
        ...init?.headers
      }
    }
  );
}

export function toJsonValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
