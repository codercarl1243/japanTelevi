import fs from "fs/promises";
import path from "path";
import type { Channel, Guide, Stream, StreamItem } from "../types";

const CACHE_FILE = path.join(process.cwd(), "app/data", "streams-cache.json");

async function fetchRemoteData() {
    const [channelsRes, streamsRes, guidesRes] = await Promise.all([
        fetch("https://iptv-org.github.io/api/channels.json", {
            cache: "no-store",
        }),
        fetch("https://iptv-org.github.io/api/streams.json", {
            cache: "no-store",
        }),
        fetch("https://iptv-org.github.io/api/guides.json", {
            cache: "no-store",
        })
    ]);

    if (!channelsRes.ok || !streamsRes.ok || !guidesRes.ok) {
        throw new Error("Remote fetch failed");
    }

    const allChannels: Channel[] = await channelsRes.json();
    const allStreams: Stream[] = await streamsRes.json();
    const allGuides: Guide[] = await guidesRes.json();

    const jpChannels = allChannels.filter((c) => c.country === "JP" && !c.is_nsfw);
    const channelNameById = new Map(jpChannels.map((c: Channel) => [c.id, c.name]));

    const jpStreams = allStreams.filter(
        (s) =>
            s.channel &&
            channelNameById.has(s.channel) &&
            (
                s.url?.toLowerCase().includes(".m3u8") ||
                s.url?.toLowerCase().includes("format=m3u8")
            )
    );

    const guideMap = new Map(
        allGuides.filter(g => g.site === "tvguide.myjcom.jp" && g.channel).map(g => [g.channel, g.site_id])
    );

    const activeChannelIds = new Set<string>();
    const enrichedStreams: StreamItem[] = [];

    for (const s of jpStreams) {
        if (!s.channel) continue;

        const siteId = guideMap.get(s.channel);
        const name = channelNameById.get(s.channel);

        if (!siteId || !name) continue;
        
        activeChannelIds.add(s.channel);

        enrichedStreams.push({
            channelId: s.channel,
            channelName: name,
            streamTitle: s.title ?? null,
            url: s.url,
            status: s.status ?? null,
            site_id: siteId,
        });
    }

    const activeChannels = jpChannels.filter(c =>
        activeChannelIds.has(c.id)
    );

    return {
        channels: activeChannels,
        streams: enrichedStreams
    };
}

export default async function getCachedOrFreshData() {
    try {
        const file = await fs.readFile(CACHE_FILE, "utf-8");
        const parsed = JSON.parse(file);

        const today = new Date().toISOString().split("T")[0];

        if (parsed.date === today) {
            console.log("Using cached data");
            return parsed.data;
        }
    } catch {
        // Cache doesn't exist or is invalid
    }

    console.log("Fetching fresh data");

    const freshData = await fetchRemoteData();

    await fs.writeFile(
        CACHE_FILE,
        JSON.stringify(
            {
                date: new Date().toISOString().split("T")[0],
                data: freshData,
            },
            null,
            2
        )
    );

    return freshData;
}