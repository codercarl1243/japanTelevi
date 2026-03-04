"use client";

import type { StreamItem } from "../types";

export default function StreamList({
  streams,
  currentUrl,
  onSelect,
}: {
  streams: StreamItem[];
  currentUrl: string | null;
  onSelect: (stream: StreamItem) => void;
}) {
  return (
    <div style={{ height: 560, overflowY: "auto", border: "1px solid #ddd", borderRadius: 8 }}>
      {streams.map((s) => {
        const isActive = currentUrl === s.url;

        return (
          <button
            key={s.url}
            onClick={() => onSelect(s)}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              padding: 10,
              border: 0,
              borderBottom: "1px solid #eee",
              cursor: "pointer",
              background: isActive ? "#222" : "white",
              color: isActive ? "white" : "black",
            }}
          >
            <div style={{ fontWeight: 700 }}>{s.channelName}</div>
            <div style={{ fontSize: 12 }}>
              {s.streamTitle ?? s.channelId}
              {s.status ? ` • ${s.status}` : ""}
            </div>
          </button>
        );
      })}
    </div>
  );
}