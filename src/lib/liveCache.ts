type CacheEntry<T> = {
  data: T;
  updatedAt: string;
  expiresAt: number;
};

type CacheResult<T> = {
  data: T;
  updatedAt: string;
  cacheStatus: "hit" | "miss";
};

const cache = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<CacheResult<unknown>>>();

export async function getCachedData<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>
): Promise<CacheResult<T>> {
  const now = Date.now();
  const cached = cache.get(key) as CacheEntry<T> | undefined;

  if (cached && cached.expiresAt > now) {
    return {
      data: cached.data,
      updatedAt: cached.updatedAt,
      cacheStatus: "hit"
    };
  }

  const running = inflight.get(key) as Promise<CacheResult<T>> | undefined;
  if (running) {
    return running;
  }

  const request = loader()
    .then((data) => {
      const updatedAt = new Date().toISOString();
      cache.set(key, {
        data,
        updatedAt,
        expiresAt: Date.now() + ttlMs
      });

      return {
        data,
        updatedAt,
        cacheStatus: "miss" as const
      };
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, request as Promise<CacheResult<unknown>>);
  return request;
}
