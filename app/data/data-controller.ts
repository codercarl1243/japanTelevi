export const runtime = "nodejs";

import path from "path";
import type { AppData, Channel, Guide, Programme, Stream, StreamItem } from "../types";
import { getUtcDateString, parseXmltvDate } from "../../lib/dates";
import { log } from "@/lib/log";
import { getAvailableFilters } from "../player/filters";
import { isExtraChannel } from "./extraChannels";
import { readJsonCache, writeJsonCache } from "@/lib/json";
import { fileExists, readUTF8File } from "@/lib/files";
import { parseXML } from "@/lib/xml";

// ─── Paths ────────────────────────────────────────────────────────────────────

const STREAMS_CACHE = path.join(process.cwd(), "app/data", "streams-cache.json");
const EPG_CACHE = path.join(process.cwd(), "app/data", "epg-cache.json");
const DOCKER_EPG_FILE = path.join(process.cwd(), "docker", "programmes.xml");


// ─── Streams ──────────────────────────────────────────────────────────────────

async function fetchStreams(): Promise<{ channels: Channel[]; streams: StreamItem[] }> {
    const [channelsRes, streamsRes, guidesRes] = await Promise.all([
        fetch("https://iptv-org.github.io/api/channels.json", { cache: "no-store" }),
        fetch("https://iptv-org.github.io/api/streams.json", { cache: "no-store" }),
        fetch("https://iptv-org.github.io/api/guides.json", { cache: "no-store" }),
    ]);

    if (!channelsRes.ok || !streamsRes.ok || !guidesRes.ok) {
        throw new Error("Remote fetch failed");
    }

    const allChannels: Channel[] = await channelsRes.json();
    const allStreams: Stream[] = await streamsRes.json();
    const allGuides: Guide[] = await guidesRes.json();

    const channels = allChannels.filter((c) => {
        const isJapanese = c.country === "JP" && !c.is_nsfw;
        const isExtra = isExtraChannel(c);
        return isJapanese || isExtra;
    });
    const channelNameById = new Map(channels.map((c) => [c.id, c.name]));

    const activeStreams = allStreams.filter(
        (s) =>
            s.channel &&
            channelNameById.has(s.channel) &&
            (s.url?.toLowerCase().includes(".m3u8") ||
                s.url?.toLowerCase().includes("format=m3u8"))
    );

    const guideMap = new Map(
        allGuides
            .filter((g) => g.channel)
            .map((g) => [g.channel, { site: g.site, site_id: g.site_id }])
    );

    const activeChannelIds = new Set<string>();
    const enrichedStreams: StreamItem[] = [];

    const stats = {
        noChannelId: 0,  // stream has no channel ID at all
        notWantedChannel: 0,  // channel exists but is not in our JP/extra channel list
        unsupportedFormat: 0,  // stream URL is not HLS/m3u8
        noChannelName: 0,  // channel ID has no readable name
        noGuideEntry: 0,  // channel has no EPG guide mapping
        enriched: 0,  // successfully added to enriched streams
    };


    for (const s of activeStreams) {
        if (!s.channel) {
            stats.noChannelId++;
            continue;
        }
        if (!channelNameById.has(s.channel)) {
            stats.notWantedChannel++;
            continue;
        }
        const name = channelNameById.get(s.channel);
        if (!name) {
            stats.noChannelName++;
            continue;
        }

        const isUnsupportedFormat =
            !s.url?.toLowerCase().includes(".m3u8") &&
            !s.url?.toLowerCase().includes("format=m3u8");

        if (isUnsupportedFormat) {
            stats.unsupportedFormat++;
            continue;
        }

        const guide = guideMap.get(s.channel);

        const siteId = guide?.site_id ?? null;
        if (!siteId) {
            stats.noGuideEntry++;
        }
        const site = guide?.site ?? null;

        if (!activeChannelIds.has(s.channel)) {
            activeChannelIds.add(s.channel);

            enrichedStreams.push({
                channelId: s.channel,
                channelName: name,
                streamTitle: s.title ?? null,
                url: s.url,
                status: s.status ?? null,
                site,
                site_id: siteId,
            });

            stats.enriched++;
        }
    }
    log.info("Stream enrichment stats:");
    console.log("-----------------------------")
    Object.entries(stats).forEach(([key, value]) => console.log(`${key}: ${value} `));
    console.log("-----------------------------")

    return {
        channels: channels.filter((c) => activeChannelIds.has(c.id)),
        streams: enrichedStreams,
    };
}

async function getCachedOrFreshStreams() {
    const today = getUtcDateString();
    const cached = await readJsonCache<{ date: string; data: { channels: Channel[]; streams: StreamItem[] } }>(STREAMS_CACHE);

    const force = process.env.FORCE_REFRESH === "true";

    if (!force && cached?.date === today) {
        log.info("Streams: using cache");
        return cached.data;
    }

    log.info(`Streams: fetching fresh`)
    const fresh = await fetchStreams();
    await writeJsonCache(STREAMS_CACHE, { date: today, data: fresh });
    return fresh;
}

// ─── EPG ──────────────────────────────────────────────────────────────────────

async function parseEPG(activeChannelIds: Set<string>): Promise<Programme[]> {
    if (!(await fileExists(DOCKER_EPG_FILE))) {
        throw new Error("Docker EPG file not found");
    }

    const xml = await readUTF8File(DOCKER_EPG_FILE);

    if (!xml || xml.length < 500) {
        throw new Error("EPG file too small — likely invalid");
    }

    const parsed = parseXML(xml);

    if (!parsed?.tv?.programme?.length) {
        throw new Error("Invalid EPG structure");
    }

    const programmes: Programme[] = parsed.tv.programme
        .map((p: any) => {
            if (!p.start || !p.stop) return null;
            if (!activeChannelIds.has(p.channel)) return null;

            const start = parseXmltvDate(p.start);
            const stop = parseXmltvDate(p.stop);

            if (isNaN(start.getTime()) || isNaN(stop.getTime())) return null;

            return {
                channel: p.channel,
                title: typeof p.title === "object" ? p.title["#text"] : p.title,
                desc: typeof p.desc === "object" ? p.desc["#text"] : p.desc ?? null,
                start,
                stop,
            };
        })
        .filter(Boolean)
        .sort((a: Programme, b: Programme) => a.start.getTime() - b.start.getTime());

    if (programmes.length < 50) {
        throw new Error(`Too few programmes (${programmes.length}) — rejecting`);
    }

    log.info(`Programmes cached: ${programmes.length}`)

    return programmes;
}

function rehydrateProgrammes(programmes: any[]): Programme[] {
    return programmes.map((p) => ({
        ...p,
        start: new Date(p.start),
        stop: new Date(p.stop),
    }));
}

async function getCachedOrFreshEPG(activeChannelIds: Set<string>): Promise<Programme[]> {
    const today = getUtcDateString();
    const cached = await readJsonCache<{ date: string; programmes: any[] }>(EPG_CACHE);

    const force = process.env.FORCE_REFRESH === "true";

    if (!force && cached?.date === today) {
        log.info("EPG: using cache");
        return rehydrateProgrammes(cached.programmes);
    }

    try {
        log.step(`EPG: parsing docker file`)

        const programmes = await parseEPG(activeChannelIds);
        await writeJsonCache(EPG_CACHE, { date: today, programmes });
        return programmes;

    } catch (err) {
        console.error("EPG parse failed:", err);

        if (cached) {
            log.warn("EPG: falling back to stale cache");

            return rehydrateProgrammes(cached.programmes);
        }

        throw new Error("No valid EPG source or cache available");
    }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default async function getAppData(): Promise<AppData> {
    const { channels, streams } = await getCachedOrFreshStreams();

    const activeChannelIds = new Set(streams.map((s) => s.channelId));
    const programmes = await getCachedOrFreshEPG(activeChannelIds);

    log.info('generating available filters based on programmes')
    const availableFilters = getAvailableFilters(programmes);

    return { channels, streams, programmes, availableFilters };
}