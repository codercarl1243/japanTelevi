import type { Programme } from "@/app/types";

// ─── Filter Definitions ───────────────────────────────────────────────────────

export type FilterKey = keyof typeof FILTERS;

export const FILTERS = {
  // Sports
  baseball: { label: "Baseball", labelJa: "野球", keywords: ["野球", "ベースボール", "baseball", 'WBC'] },
  soccer: { label: "Soccer", labelJa: "サッカー", keywords: ["サッカー", "football", "soccer", "Ｊリーグ", "ワールドカップ", "jリーグ"] },
  sumo: { label: "Sumo", labelJa: "相撲", keywords: ["相撲", "大相撲", "sumo"] },
  tennis: { label: "Tennis", labelJa: "テニス", keywords: ["テニス", "tennis"] },
  golf: { label: "Golf", labelJa: "ゴルフ", keywords: ["ゴルフ", "golf"] },
  swimming: { label: "Swimming", labelJa: "水泳", keywords: ["水泳", "競泳", "swimming"] },
  martial: { label: "Martial Arts", labelJa: "格闘技", keywords: ["格闘技", "柔道", "空手", "剣道", "wrestling", "ufc", "ボクシング", "boxing"] },
  olympics: { label: "Olympics", labelJa: "オリンピック", keywords: ["オリンピック", "olympic", "パラリンピック"] },
  basketball: { label: "Basketball", labelJa: "バスケ", keywords: ["バスケ", "バスケットボール", "basketball", "nba", "bリーグ"] },
  volleyball: { label: "Volleyball", labelJa: "バレー", keywords: ["バレー", "バレーボール", "volleyball"] },
  rugby: { label: "Rugby", labelJa: "ラグビー", keywords: ["ラグビー", "rugby"] },
  athletics: { label: "Athletics", labelJa: "陸上", keywords: ["陸上", "マラソン", "marathon", "athletics", "トラック"] },
  cycling: { label: "Cycling", labelJa: "自転車", keywords: ["自転車", "cycling", "ツール", "競輪"] },
  motorsport: { label: "Motorsport", labelJa: "モータースポーツ", keywords: ["f1", "モータースポーツ", "motorsport", "レース", "racing", "moto"] },

  // Drama & Film
  drama: { label: "Drama", labelJa: "ドラマ", keywords: ["ドラマ", "drama", "連続ドラマ", "テレビドラマ"] },
  movie: { label: "Movie", labelJa: "映画", keywords: ["映画", "movie", "film", "シネマ", "cinema"] },
  anime: { label: "Anime", labelJa: "アニメ", keywords: ["アニメ", "anime", "アニメーション"] },
  tokusatsu: { label: "Tokusatsu", labelJa: "特撮", keywords: ["特撮", "tokusatsu", "戦隊", "仮面ライダー"] },

  // News & Current Affairs
  news: { label: "News", labelJa: "ニュース", keywords: ["ニュース", "news", "報道", "時事", "速報"] },
  weather: { label: "Weather", labelJa: "天気", keywords: ["天気", "気象", "weather", "forecast", "予報"] },
  politics: { label: "Politics", labelJa: "政治", keywords: ["政治", "国会", "選挙", "politics", "国政"] },
  business: { label: "Business", labelJa: "経済", keywords: ["経済", "ビジネス", "business", "株", "market", "マーケット"] },

  // Lifestyle
  cooking: { label: "Cooking", labelJa: "料理", keywords: ["料理", "クッキング", "グルメ", "cooking", "食", "レシピ", "レストラン"] },
  travel: { label: "Travel", labelJa: "旅行", keywords: ["旅", "旅行", "トラベル", "travel", "観光", "世界遺産"] },
  nature: { label: "Nature", labelJa: "自然", keywords: ["自然", "動物", "nature", "wildlife", "環境", "生き物"] },
  music: { label: "Music", labelJa: "音楽", keywords: ["音楽", "ミュージック", "コンサート", "music", "live", "ライブ", "歌"] },
  variety: { label: "Variety", labelJa: "バラエティ", keywords: ["バラエティ", "variety", "お笑い", "コメディ", "トーク"] },
  fashion: { label: "Fashion", labelJa: "ファッション", keywords: ["ファッション", "fashion", "ビューティ", "beauty", "スタイル"] },
  health: { label: "Health", labelJa: "健康", keywords: ["健康", "medical", "医療", "病院", "wellness", "フィットネス"] },

  // Education & Documentary
  documentary: { label: "Documentary", labelJa: "ドキュメンタリー", keywords: ["ドキュメンタリー", "documentary", "ドキュメント"] },
  education: { label: "Education", labelJa: "教育", keywords: ["教育", "education", "学習", "講座", "eテレ"] },
  science: { label: "Science", labelJa: "科学", keywords: ["科学", "サイエンス", "science", "宇宙", "テクノロジー"] },
  history: { label: "History", labelJa: "歴史", keywords: ["歴史", "history", "時代劇", "大河"] },
  kids: { label: "Kids", labelJa: "子ども", keywords: ["子ども", "こども", "kids", "children", "幼児", "小学"] },
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function programmeText(p: Programme): string {
  return `${p.title ?? ""} ${p.desc ?? ""}`.toLowerCase();
}

function matchesFilter(text: string, key: FilterKey): boolean {
  return FILTERS[key].keywords.some((k) => text.includes(k.toLowerCase()));
}

/**
 * Returns only the filter keys that have at least one matching programme.
 * Use this to avoid showing empty filter buttons.
 */
export function getAvailableFilters(programmes: Programme[]): FilterKey[] {
  const texts = programmes.map(programmeText);
  
  return (Object.keys(FILTERS) as FilterKey[]).filter((key) =>
    texts.some((text) => matchesFilter(text, key))
  );
}

/**
 * Filter programmes by a category key.
 */
export function filterByCategory(programmes: Programme[], key: FilterKey): Programme[] {
  return programmes.filter((p) => matchesFilter(programmeText(p), key));
}

/**
 * Filter to currently live programmes only.
 */
export function getLiveNow(programmes: Programme[]): Programme[] {
  const now = new Date();
  return programmes.filter((p) => now >= p.start && now <= p.stop);
}

/**
 * Get live programmes for a specific category.
 */
export function getLiveByCategory(programmes: Programme[], key: FilterKey): Programme[] {
  return filterByCategory(getLiveNow(programmes), key);
}

/**
 * Get channel IDs currently airing a category — useful for filtering streams.
 */
export function getLiveChannelIdsByCategory(
  programmes: Programme[],
  key: FilterKey
): Set<string> {
  return new Set(getLiveByCategory(programmes, key).map((p) => p.channel));
}