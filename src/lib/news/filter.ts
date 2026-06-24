export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function matchKeywords(text: string, keywords: string[]): string[] {
  const normalizedText = normalizeText(text);

  return keywords
    .map((keyword) => keyword.trim())
    .filter(Boolean)
    .filter((keyword, index, all) => all.indexOf(keyword) === index)
    .filter((keyword) => normalizedText.includes(normalizeText(keyword)));
}

export function scoreArticleMatch(title: string, body: string, matchedKeywords: string[]): number {
  const normalizedTitle = normalizeText(title);
  const titleHits = matchedKeywords.filter((keyword) => normalizedTitle.includes(normalizeText(keyword))).length;

  return matchedKeywords.length + titleHits * 2 + Math.min(Math.floor(body.length / 500), 3);
}
