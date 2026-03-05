import { log } from "@/lib/log";
import { Channel, Guide } from "../types";

export type ExtraChannel = {
    country: string;
    label?: string; // optional note on why it's included
    guideSite: string;
};

export const EXTRA_CHANNELS: Record<string, ExtraChannel> = {
    // "ESPN.au": { country: "AU", label: "ESPN Australia", guideSite: "foxtel.com.au" },
    // "ESPN2.au": { country: "AU", label: "ESPN2 Australia", guideSite: "foxtel.com.au" },
};

export function isExtraChannel(channel: Channel): boolean {
    const channelObject = EXTRA_CHANNELS[channel.id];
    return !!channelObject && channelObject.country === channel.country;
}

export const extraGuideSites = new Set(
    Object.values(EXTRA_CHANNELS)
        .map((c) => c.guideSite)
        .filter(Boolean)
);

export function isExtraGuideSite(guide: Guide): boolean {
    if (!guide.channel) return false;
    return !!EXTRA_CHANNELS[guide.channel] && EXTRA_CHANNELS[guide.channel].guideSite === guide.site;  // must match the preferred site
}