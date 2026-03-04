export const runtime = "nodejs";

import fs from "fs/promises";
import path from "path";
import { XMLParser } from "fast-xml-parser";
import type { AppData, Channel, Guide, Programme, Stream, StreamItem } from "../types";
import { getUtcDateString, parseXmltvDate } from "../../lib/dates";
import { log } from "@/lib/log";

// ─── Paths ────────────────────────────────────────────────────────────────────

const STREAMS_CACHE = path.join(process.cwd(), "app/data", "streams-cache.json");
const EPG_CACHE = path.join(process.cwd(), "app/data", "epg-cache.json");
const DOCKER_EPG_FILE = path.join(process.cwd(), "docker", "programmes.xml");


// ─── Helpers ──────────────────────────────────────────────────────────────────

async function fileExists(filePath: string) {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

async function readJsonCache<T>(filePath: string): Promise<T | null> {
    try {
        const file = await fs.readFile(filePath, "utf-8");
        return JSON.parse(file) as T;
    } catch {
        return null;
    }
}

async function writeJsonCache(filePath: string, data: unknown) {
    const tmp = filePath + ".tmp";
    await fs.writeFile(tmp, JSON.stringify(data, null, 2));
    await fs.rename(tmp, filePath);
}

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

    const jpChannels = allChannels.filter((c) => c.country === "JP" && !c.is_nsfw);
    const channelNameById = new Map(jpChannels.map((c) => [c.id, c.name]));

    const jpStreams = allStreams.filter(
        (s) =>
            s.channel &&
            channelNameById.has(s.channel) &&
            (s.url?.toLowerCase().includes(".m3u8") ||
                s.url?.toLowerCase().includes("format=m3u8"))
    );

    const guideMap = new Map(
        allGuides
            .filter((g) => g.site === "tvguide.myjcom.jp" && g.channel)
            .map((g) => [g.channel, g.site_id])
    );

    const activeChannelIds = new Set<string>();
    const enrichedStreams: StreamItem[] = [];

    for (const s of jpStreams) {
        if (!s.channel) continue;
        const siteId = guideMap.get(s.channel);
        const name = channelNameById.get(s.channel);
        if (!siteId || !name) continue;

        if (!activeChannelIds.has(s.channel)) {
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
    }
    log.success(`Streams cached: ${enrichedStreams.length}`);

    return {
        channels: jpChannels.filter((c) => activeChannelIds.has(c.id)),
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

    const xml = await fs.readFile(DOCKER_EPG_FILE, "utf-8");

    if (!xml || xml.length < 500) {
        throw new Error("EPG file too small — likely invalid");
    }

    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });
    const parsed = parser.parse(xml);

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

    return { channels, streams, programmes };
}