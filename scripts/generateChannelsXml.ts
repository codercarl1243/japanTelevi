import { log } from "@/lib/log";
import fs from "fs/promises";
import path from "path";
import type { Channel, Guide, Stream, StreamItem } from "@/app/types";

const CACHE_FILE = path.join(process.cwd(), "app/data", "streams-cache.json");
const OUTPUT_FILE = path.join(process.cwd(), "docker", "channels.xml");

function escapeXml(str: string) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

async function fetchStreams(): Promise<StreamItem[]> {
    const [channelsRes, streamsRes, guidesRes] = await Promise.all([
        fetch("https://iptv-org.github.io/api/channels.json", { cache: "no-store" }),
        fetch("https://iptv-org.github.io/api/streams.json",  { cache: "no-store" }),
        fetch("https://iptv-org.github.io/api/guides.json",   { cache: "no-store" }),
    ]);

    if (!channelsRes.ok || !streamsRes.ok || !guidesRes.ok) {
        throw new Error("Remote fetch failed");
    }

    const allChannels: Channel[] = await channelsRes.json();
    const allStreams: Stream[]   = await streamsRes.json();
    const allGuides: Guide[]    = await guidesRes.json();

    const jpChannels      = allChannels.filter((c) => c.country === "JP" && !c.is_nsfw);
    const channelNameById = new Map(jpChannels.map((c) => [c.id, c.name]));

    const guideMap = new Map(
        allGuides
            .filter((g) => g.site === "tvguide.myjcom.jp" && g.channel)
            .map((g) => [g.channel, g.site_id])
    );

    const enrichedStreams: StreamItem[] = [];

    for (const s of allStreams) {
        if (!s.channel) continue;
        if (!channelNameById.has(s.channel)) continue;
        if (!s.url?.toLowerCase().includes(".m3u8") &&
            !s.url?.toLowerCase().includes("format=m3u8")) continue;

        const siteId = guideMap.get(s.channel);
        const name   = channelNameById.get(s.channel);
        if (!siteId || !name) continue;

        enrichedStreams.push({
            channelId:   s.channel,
            channelName: name,
            streamTitle: s.title ?? null,
            url:         s.url,
            status:      s.status ?? null,
            site_id:     siteId,
        });
    }

    return enrichedStreams;
}

async function getCachedOrFreshStreams(): Promise<StreamItem[]> {
    const today = new Date().toISOString().split("T")[0];

    try {
        const file   = await fs.readFile(CACHE_FILE, "utf-8");
        const parsed = JSON.parse(file);

        if (parsed.date === today) {
            log.step("Streams: using cache");
            return parsed.data.streams;
        }
    } catch {
        // Cache missing or invalid
    }

    log.step("Streams: fetching fresh data...");
    const streams = await fetchStreams();

    await fs.writeFile(
        CACHE_FILE,
        JSON.stringify({ date: today, data: { streams } }, null, 2)
    );

    return streams;
}

async function generate() {
    log.step("Generating channels.xml...");

    const streams = await getCachedOrFreshStreams();

    // Deduplicate by channelId
    const unique = new Map<string, StreamItem>();
    for (const s of streams) {
        if (!unique.has(s.channelId)) unique.set(s.channelId, s);
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<channels>
${Array.from(unique.values())
        .map(
            ({ channelId, channelName, site_id }) =>
                `  <channel site="tvguide.myjcom.jp" lang="ja" xmltv_id="${channelId}" site_id="${site_id}">${escapeXml(channelName)}</channel>`
        )
        .join("\n")}
</channels>`;

    await fs.writeFile(OUTPUT_FILE, xml);
    log.success(`Generated channels.xml with ${unique.size} channels`);
}

generate();