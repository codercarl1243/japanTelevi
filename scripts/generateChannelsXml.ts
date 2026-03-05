import { log } from "@/lib/log";
import path from "path";
import type { Channel, Guide, Stream, StreamItem } from "@/app/types";
import { isExtraChannel, isExtraGuideSite } from "@/app/data/extraChannels";
import { getUtcDateString } from "@/lib/dates";
import { readJsonCache, writeJsonCache } from "@/lib/json";
import { writeFile } from "@/lib/files";
import { escapeXml } from "@/lib/xml";

const CACHE_FILE_PATH = path.join(process.cwd(), "scripts", "generate-cache.json");
const OUTPUT_FILE_PATH = path.join(process.cwd(), "docker/public", "channels.xml");


async function fetchStreams(): Promise<StreamItem[]> {
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
    const ExtraChannelsIncluded: Channel[] = [];

    const channels = allChannels.filter((c) => {
        const isJapanese = c.country === "JP" && !c.is_nsfw;
        const isExtra = isExtraChannel(c);
        if (isExtra) {
            ExtraChannelsIncluded.push(c);
            log.success(`extra channel included: ${c.name}`);
        }
        return isJapanese || isExtra;
    });

    const channelNameById = new Map(channels.map((c) => [c.id, c.name]));
    const missingFromNameMap = ExtraChannelsIncluded.filter(
        (c) => !channelNameById.has(c.id)
    );
    if (missingFromNameMap.length) {
        log.warn(`Extra channels missing from channelNameById:`);
        missingFromNameMap.forEach((c) => log.warn(`  ${c.id} - ${c.name}`));
    }

    const guideMap: Map<string | null, {
        site: string;
        site_id: string;
    }> = new Map(
        allGuides
            .filter((g) => g.channel)
            .map((g) => [g.channel, { site: g.site, site_id: g.site_id }])
    );

    const missingFromGuideMap = ExtraChannelsIncluded.filter(
        (c) => !guideMap.has(c.id)
    );
    if (missingFromGuideMap.length) {
        log.warn(`Extra channels missing from guideMap:`);
        missingFromGuideMap.forEach((c) => log.warn(`  ${c.id} - ${c.name}`));
    }

    const enrichedStreams: StreamItem[] = [];
    const stats = {
        noChannelId: 0,  // stream has no channel ID at all
        notWantedChannel: 0,  // channel exists but is not in our JP/extra channel list
        unsupportedFormat: 0,  // stream URL is not HLS/m3u8
        noChannelName: 0,  // channel ID has no readable name
        noGuideEntry: 0,  // channel has no EPG guide mapping
        enriched: 0,  // successfully added to enriched streams
    };

    for (const s of allStreams) {
        if (!s.channel) {
            stats.noChannelId++;
            continue;
        }

        if (!channelNameById.has(s.channel)) {
            stats.notWantedChannel++;
            continue;
        }

        const isUnsupportedFormat =
            !s.url?.toLowerCase().includes(".m3u8") &&
            !s.url?.toLowerCase().includes("format=m3u8");

        if (isUnsupportedFormat) {
            stats.unsupportedFormat++;
            continue;
        }

        const name = channelNameById.get(s.channel);
        if (!name) {
            stats.noChannelName++;
            continue;
        }

        const guide = guideMap.get(s.channel);

        const siteId = guide?.site_id ?? null;

        if (!siteId) {
            stats.noGuideEntry++;
        }

        const site = guide?.site ?? null;

        enrichedStreams.push({
            channelId: s.channel,
            channelName: name,
            streamTitle: s.title ?? null,
            url: s.url,
            status: s.status ?? null,
            site: site,
            site_id: siteId,
        });

        stats.enriched++;
    }
    const enrichedIds = new Set(enrichedStreams.map(s => s.channelId));

    const missingFromEnriched = ExtraChannelsIncluded.filter(
        c => !enrichedIds.has(c.id)
    );

    if (missingFromEnriched.length) {
        log.warn(`Extra channels missing from enrichedStreams:`);
        missingFromEnriched.forEach((c) => log.warn(`  ${c.id} - ${c.name}`));
    }

    log.info("Stream enrichment stats:");
    console.log("-----------------------------")
    Object.entries(stats).forEach(([key, value]) => console.log(`${key}: ${value} `));
    console.log("-----------------------------")

    return enrichedStreams;
}

async function getCachedOrFreshStreams(): Promise<StreamItem[]> {
    const today = getUtcDateString();
    const cached = await readJsonCache<{ date: string; data: StreamItem[] }>(CACHE_FILE_PATH);

    const force = process.env.FORCE_REFRESH === "true";


    if (!force && cached?.date === today) {
        log.info("Channels: using cache");
        return cached.data;
    }

    log.step("Channels: fetching fresh data...");
    const streams: StreamItem[] = await fetchStreams();
    await writeJsonCache(CACHE_FILE_PATH, { date: today, data: streams });

    return streams;
}

async function generate() {
    log.step("Generating channels.xml...");
    const streams = await getCachedOrFreshStreams();

    log.step(`cleaning up streams data:`);
    // Deduplicate by channelId
    const unique = new Map<string, StreamItem>();

    for (const s of streams) {
        const existing = unique.get(s.channelId);

        if (!existing) {
            unique.set(s.channelId, s);
            continue;
        }

        // Prefer online streams over unknown/offline
        if (s.status === "online" && existing.status !== "online") {
            unique.set(s.channelId, s);
        }
    }

    log.step(`streams: ${streams.length} → deduplicated: ${unique.size}`);

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<channels>
${Array.from(unique.values())
            .map(({ channelId, channelName, site, site_id }) => {
                const site_id_Attr = site_id ? ` site_id="${site_id}"` : "";
                const site_Attr = site ? ` site="${site}"` : "";

                return `  <channel ${site_Attr} lang="ja" xmltv_id="${channelId}" ${site_id_Attr}>${escapeXml(channelName)}</channel>`;
            })
            .join("\n")}
</channels>`;

    await writeFile(OUTPUT_FILE_PATH, xml);
    log.success(`Generated channels.xml with ${unique.size} channels`);
}

generate();