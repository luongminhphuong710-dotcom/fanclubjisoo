export type XPost = {
  id: string;
  text: string;
  authorId: string | null;
  authorUsername: string | null;
  createdAt: string | null;
  publicMetrics?: {
    retweet_count?: number;
    reply_count?: number;
    like_count?: number;
    quote_count?: number;
    bookmark_count?: number;
    impression_count?: number;
  };
};

type XRecentSearchResponse = {
  data?: Array<{
    id: string;
    text: string;
    author_id?: string;
    created_at?: string;
    public_metrics?: XPost["publicMetrics"];
  }>;
  includes?: {
    users?: Array<{ id: string; username?: string }>;
  };
};

export async function searchRecentPosts(query: string, maxResults = 25): Promise<XPost[]> {
  const token = process.env.X_BEARER_TOKEN;

  if (!token) {
    throw new Error("Missing X_BEARER_TOKEN");
  }

  const url = new URL("https://api.x.com/2/tweets/search/recent");
  url.searchParams.set("query", query);
  url.searchParams.set("max_results", String(Math.min(Math.max(maxResults, 10), 100)));
  url.searchParams.set("tweet.fields", "author_id,created_at,public_metrics");
  url.searchParams.set("expansions", "author_id");
  url.searchParams.set("user.fields", "username");

  const response = await fetch(url, {
    headers: {
      authorization: `Bearer ${token}`
    },
    next: { revalidate: 0 }
  });

  if (!response.ok) {
    throw new Error(`X recent search request failed: ${response.status}`);
  }

  const payload = (await response.json()) as XRecentSearchResponse;
  const usersById = new Map((payload.includes?.users ?? []).map((user) => [user.id, user]));

  return (payload.data ?? []).map((post) => ({
    id: post.id,
    text: post.text,
    authorId: post.author_id ?? null,
    authorUsername: post.author_id ? usersById.get(post.author_id)?.username ?? null : null,
    createdAt: post.created_at ?? null,
    publicMetrics: post.public_metrics
  }));
}
