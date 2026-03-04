export const runtime = "nodejs";

import fs from "fs/promises";
import path from "path";
import { XMLParser } from "fast-xml-parser";
import { getUtcDateString, parseXmltvDate } from "../../lib/dates";

const EPG_CACHE_FILE = path.join(
    process.cwd(),
    "app/data",
    "epg-cache.json"
);

const DOCKER_EPG_FILE = path.join(
    process.cwd(),
    "docker",
    "programmes.xml"
);

const STREAM_CACHE_FILE = path.join(
    process.cwd(),
    "app/data",
    "streams-cache.json"
);

async function fileExists(filePath: string) {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

async function fetchAndCacheEPG() {
    try {
        // Ensure docker file exists
        if (!(await fileExists(DOCKER_EPG_FILE))) {
            throw new Error("Docker EPG file not found");
        }

        const xml = await fs.readFile(
            DOCKER_EPG_FILE,
            "utf-8"
        );

        if (!xml || xml.length < 500) {
            throw new Error("EPG file too small — likely invalid");
        }
        const streamFile = await fs.readFile(STREAM_CACHE_FILE, "utf-8");
        const streamParsed = JSON.parse(streamFile);

        const streams: { channelId: string }[] = streamParsed.data.streams;

        const activeChannelIds = new Set(
            streams.map(s => s.channelId)
        );

        const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "",
        });

        const parsed = parser.parse(xml);

        if (!parsed?.tv?.programme?.length) {
            throw new Error("Invalid EPG structure");
        }

        const programmes = parsed.tv.programme.map((p: any) => {
            if (!p.start || !p.stop) return null;
            if (!activeChannelIds.has(p.channel)) return null;

            const start = parseXmltvDate(p.start);
            const stop = parseXmltvDate(p.stop);

            if (isNaN(start.getTime()) || isNaN(stop.getTime())) {
                return null;
            }

            const title =
                typeof p.title === "object" ? p.title["#text"] : p.title;

            const desc =
                typeof p.desc === "object"
                    ? p.desc["#text"]
                    : p.desc ?? null;

            return {
                channel: p.channel,
                title,
                desc,
                start,
                stop,
            };
        }).filter(Boolean);

        if (programmes.length < 50) {
            throw new Error("Too few programmes — rejecting update");
        }

        const simplified = {
            date: getUtcDateString(),
            programmes,
        };

        // prevent partial write corruption.
        const tmpFile = EPG_CACHE_FILE + ".tmp";

        await fs.writeFile(tmpFile, JSON.stringify(simplified, null, 2));
        await fs.rename(tmpFile, EPG_CACHE_FILE);
        console.log("EPG cache updated successfully\nReturning updated Programme");

        return simplified;

    } catch (err) {
        console.error("EPG update failed:", err);

        // fallback to existing cache if available
        try {
            // Ensure docker file exists
            if (!(await fileExists(EPG_CACHE_FILE))) {
                throw new Error("Cached EPG file not found");
            }
            const file = await fs.readFile(EPG_CACHE_FILE, "utf-8");
            const parsed = JSON.parse(file);

            parsed.programmes = parsed.programmes.map((p: any) => ({
                ...p,
                start: new Date(p.start),
                stop: new Date(p.stop),
            }));

            return parsed;

        } catch {
            throw new Error("No valid EPG cache available");
        }
    }
}


export default async function getCachedOrFreshEPG() {
    const today = getUtcDateString();
    let cached: any = null;

    try {
        const file = await fs.readFile(EPG_CACHE_FILE, "utf-8");
        cached = JSON.parse(file);
        // Rehydrate Date objects
        cached.programmes = cached.programmes.map((p: any, /** index: number*/) => {
            /**
              if (index === 0) { 
                 console.log("inside getCachedOrFreshEPG", p) 
                const checkStart = new Date(p.start)
                console.log("checkStart", checkStart)
             }
                 */
            return {
                ...p,
                start: new Date(p.start),
                stop: new Date(p.stop),
            }
        });

        if (cached.date === today) {
            console.log("Using cached EPG (fresh)");
            return cached;
        }
    } catch {
        // No valid cache yet
    }

    // If docker hasn't generated file yet, fallback
    try {
        await fs.access(EPG_CACHE_FILE);
    } catch {
        console.log("EPG not generated yet, using cache if available");
        if (cached) return cached;
        throw new Error("No EPG source and no cache available");
    }

    console.log("Refreshing EPG from docker file");
    return fetchAndCacheEPG();
}