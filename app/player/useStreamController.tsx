"use client";

import { useEffect, useState } from "react";
import { useFilteredStreams } from "./useFilteredStreams";
import type { StreamItem } from "../types";

export default function useStreamsController(
  streams: StreamItem[]
) {
  const [query, setQuery] = useState("");
  const [current, setCurrent] = useState<StreamItem | null>(null);

  const filtered = useFilteredStreams(streams, query);
  
  // Derived — no useEffect needed
  const resolvedCurrent = current && filtered.some((s) => s.url === current.url)
    ? current
    : null;

  return {
    filtered,
    query,
    setQuery,
    current,
    setCurrent
  }
}