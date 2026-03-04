"use client";

import { useMemo } from "react";
import type { StreamItem } from "../types";

export function useFilteredStreams(streams: StreamItem[], query: string) {
  return useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return streams;

    return streams.filter((s) => {
      const text = `${s.channelName} ${s.streamTitle ?? ""} ${s.channelId}`.toLowerCase();
      return text.includes(normalizedQuery);
    });
  }, [streams, query]);
}