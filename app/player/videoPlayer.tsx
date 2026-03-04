"use client";

import { useMemo, useState } from "react";
import { StreamItem, VideoPlayerProps } from "../types";
import ProgrammeTab from "./programme/programmeTab";
import StreamList from "./streamList";
import { FilterKey, getLiveChannelIdsByCategory } from "./filters";

export default function VideoPlayer({
    streams,
    programmes,
    current,
    setCurrent,
    videoRef,
    skip,
    availableFilters
}: VideoPlayerProps) {

    const [activeTab, setActiveTab] = useState<"streams" | "programmes">("streams");
    const [activeFilter, setActiveFilter] = useState<FilterKey | null>(null);

    function handleProgrammeSelect(stream: StreamItem) {
        setCurrent(stream);
        setActiveTab("streams");
    }
    const displayStreams = useMemo(() => {
        if (!activeFilter) return streams;
        const liveIds = getLiveChannelIdsByCategory(programmes, activeFilter);
        return streams.filter((s) => liveIds.has(s.channelId));
    }, [activeFilter, streams, programmes]);

    const tabs: { id: "streams" | "programmes"; label: string; kanji: string }[] = [
        { id: "streams", label: "Streams", kanji: "放送" },
        { id: "programmes", label: "Programme", kanji: "番組" },
    ];
    const skipBtnStyle = {
        padding: "6px 16px",
        background: "#0d0d16",
        border: "1px solid #2a2a4a",
        borderRadius: 6,
        color: "#e8e0d0",
        cursor: "pointer",
        fontSize: "0.8rem",
        letterSpacing: "0.05em",
    }
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* ── Tab bar ─────────────────────────────────────────────────── */}
            <div style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                borderBottom: "1px solid #1a1a2a",
                paddingBottom: 16,
            }}>
                <div style={{
                    display: "flex",
                    gap: 2,
                    padding: 4,
                    background: "#0d0d16",
                    borderRadius: 10,
                    border: "1px solid #1a1a2a",
                }}>
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    gap: 2,
                                    padding: "8px 28px",
                                    border: "none",
                                    borderRadius: 7,
                                    cursor: "pointer",
                                    transition: "all 0.2s ease",
                                    background: isActive ? "#1a1a2e" : "transparent",
                                    boxShadow: isActive
                                        ? "inset 0 1px 0 #2a2a4a, 0 2px 8px #00000066"
                                        : "none",
                                }}
                            >
                                <span style={{
                                    fontSize: "0.7rem",
                                    letterSpacing: "0.15em",
                                    color: isActive ? "#c8a97e" : "#444",
                                    fontFamily: "'Noto Serif JP', serif",
                                    transition: "color 0.2s",
                                }}>
                                    {tab.kanji}
                                </span>
                                <span style={{
                                    fontSize: "0.8rem",
                                    fontWeight: isActive ? 600 : 400,
                                    letterSpacing: "0.08em",
                                    color: isActive ? "#e8e0d0" : "#555",
                                    textTransform: "uppercase",
                                    transition: "color 0.2s",
                                }}>
                                    {tab.label}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Now playing pill — shown when a stream is active */}
                {current && (
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginLeft: 12,
                        padding: "6px 14px",
                        background: "#0d0d16",
                        border: "1px solid #2a2a4a",
                        borderRadius: 999,
                        fontSize: "0.8rem",
                    }}>
                        {/* Pulsing live dot */}
                        <span style={{
                            display: "inline-block",
                            width: 7,
                            height: 7,
                            borderRadius: "50%",
                            background: "#ef4444",
                            boxShadow: "0 0 6px #ef4444",
                            animation: "pulse 1.8s ease-in-out infinite",
                        }} />
                        <span style={{ color: "#888" }}>Now Playing</span>
                        <span style={{ color: "#e8e0d0", fontWeight: 500 }}>
                            {current.channelName}
                        </span>
                    </div>
                )}
            </div>

            {/* ── Programme tab ────────────────────────────────────────────── */}
            {activeTab === "programmes" && (
                <ProgrammeTab
                    programmes={programmes}
                    streams={displayStreams}
                    onSelectStream={handleProgrammeSelect}
                    availableFilters={availableFilters}
                    activeFilter={activeFilter}
                    setActiveFilter={setActiveFilter}
                />
            )}

            {/* ── Streams tab ──────────────────────────────────────────────── */}
            {activeTab === "streams" && (
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "340px 1fr",
                    gap: 24,
                    alignItems: "start",
                }}>
                    {/* Stream list */}
                    <StreamList
                        streams={displayStreams}
                        currentUrl={current?.url ?? null}
                        onSelect={setCurrent}
                    />

                    {/* Player panel */}
                    <div style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                    }}>
                        {current ? (
                            <>
                                {/* <video
                                    ref={videoRef}
                                    controls
                                    autoPlay
                                    style={{
                                        width:        "100%",
                                        height:       500,
                                        background:   "#000",
                                        borderRadius: 12,
                                        display:      "block",
                                        border:       "1px solid #1a1a2a",
                                    }}
                                /> */}
                                <div ref={videoRef} style={{ width: "100%", height: 500, borderRadius: 12, overflow: "hidden" }} />
                                {current && (
                                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                                        <button onClick={() => skip(-15)} style={skipBtnStyle}>
                                            ↺ 15s
                                        </button>
                                        <button onClick={() => skip(15)} style={skipBtnStyle}>
                                            15s ↻
                                        </button>
                                    </div>
                                )}
                                <div style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 10,
                                    fontSize: "0.8rem",
                                }}>
                                    <span style={{ color: "#555" }}>
                                        {current.streamTitle ?? current.channelId}
                                    </span>
                                    {current.status && (
                                        <span style={{
                                            padding: "2px 8px",
                                            borderRadius: 999,
                                            fontSize: "0.7rem",
                                            letterSpacing: "0.05em",
                                            background: current.status === "online" ? "#052e16" : "#1c1917",
                                            color: current.status === "online" ? "#4ade80" : "#78716c",
                                            border: `1px solid ${current.status === "online" ? "#166534" : "#44403c"}`,
                                        }}>
                                            {current.status}
                                        </span>
                                    )}
                                </div>
                            </>
                        ) : (
                            /* Empty state */
                            <div style={{
                                width: "100%",
                                height: 500,
                                background: "#0a0a0f",
                                borderRadius: 12,
                                border: "1px dashed #1a1a2a",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 12,
                                color: "#333",
                            }}>
                                <span style={{ fontSize: "2.5rem" }}>テレビ</span>
                                <span style={{ fontSize: "0.85rem", letterSpacing: "0.1em" }}>
                                    SELECT A STREAM
                                </span>
                            </div>
                        )}
                    </div>
                </div>

            )}

            {/* Pulse keyframe */}
            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50%       { opacity: 0.3; }
                }
            `}</style>
        </div>
    );
}