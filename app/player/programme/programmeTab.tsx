"use client";

import { useMemo, useState, useRef, useCallback, SetStateAction, Dispatch, RefObject } from "react";
import { Programme, StreamItem } from "../../types";
import TooltipPortal from "./tooltipPortal";

type Props = {
    programmes: Programme[];
    streams: StreamItem[];
    onSelectStream: (stream: StreamItem) => void;
};

function normalize(text: string) {
    return text.toLowerCase().normalize("NFKC");
}

function parseDay(day: string): Date {
    // Avoid local-timezone shift by forcing midnight local
    return new Date(day + "T00:00:00");
}

// ─── Programme Cell ───────────────────────────────────────────────────────────

function ProgrammeCell({
    programme,
    stream,
    colSpan,
    isPast,
    isCurrent,
    onClick,
    hoveredKey,
    setHoveredKey,
    hideTimerRef,
    cellKey
}: {
    programme: Programme | undefined;
    stream: StreamItem | undefined;
    colSpan: number;
    isPast: boolean;
    isCurrent: boolean;
    onClick: () => void;
    hoveredKey: string | null;
    setHoveredKey: Dispatch<SetStateAction<string | null>>;
    hideTimerRef: RefObject<NodeJS.Timeout | null>;
    cellKey: string;
}) {
    const hovered = hoveredKey === cellKey;
    const cellRef = useRef<HTMLTableCellElement>(null);
    const hasStream = !!stream;

    function showTooltip() {
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        setHoveredKey(cellKey);
    }
    function hideTooltip() {
        // Small delay so mouse can travel from cell onto tooltip
        hideTimerRef.current = setTimeout(() => {
            setHoveredKey((prev) => prev === cellKey ? null : prev);
        }, 250);
    }

    if (!programme) {
        return (
            <td
                colSpan={colSpan}
                style={{
                    minWidth: 120 * colSpan,
                    height: 64,
                    background: "#0d0d16",
                    border: "1px solid #1a1a2a",
                }}
            />
        );
    }

    return (
        <td
            colSpan={colSpan}
            ref={cellRef}
            onMouseEnter={showTooltip}
            onMouseLeave={hideTooltip}
            onClick={() => { if (hasStream && !isPast) onClick(); }}
            style={{
                position: "relative",
                minWidth: 150 * colSpan,
                height: 64,
                padding: "6px 8px",
                verticalAlign: "top",
                cursor: hasStream && !isPast ? "pointer" : "default",
                background: isCurrent
                    ? "#1e1a0a"
                    : isPast
                        ? "#0d0d16"
                        : hasStream
                            ? "#111827"
                            : "#0f0f1a",
                borderTop: "1px solid #1a1a2a",
                borderRight: "1px solid #1a1a2a",
                borderBottom: "1px solid #1a1a2a",
                borderLeft: isCurrent
                    ? "2px solid #c8a97e"
                    : hasStream && !isPast
                        ? "2px solid #3b5bdb"
                        : "1px solid #1a1a2a",
                opacity: isPast ? 0.45 : 1,
                transition: "background 0.15s",
            }}
        >
            {hovered && (
                <TooltipPortal
                    programme={programme}
                    stream={stream}
                    anchorEl={cellRef.current}
                    onMouseEnter={showTooltip}
                    onMouseLeave={hideTooltip}
                    isPast={isPast}
                />
            )}
            <div style={{
                fontSize: "0.9rem",
                fontWeight: 500,
                color: isCurrent ? "#c8a97e" : "#c8c8d8",
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
            }}>
                {programme.title}
            </div>

            {hasStream && !isPast && (
                <div style={{
                    position: "absolute",
                    bottom: 5,
                    right: 6,
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#3b5bdb",
                }} />
            )}
        </td>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProgrammeTab({ programmes, streams, onSelectStream }: Props) {
    const [query, setQuery] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);
    const [hoveredKey, setHoveredKey] = useState<string | null>(null);
    const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Friendly channel name lookup from streams
    const channelNameById = useMemo(() => {
        const map = new Map<string, string>();
        streams.forEach((s) => map.set(s.channelId, s.channelName));
        return map;
    }, [streams]);

    const grouped = useMemo(() => {
        const map: Record<string, Programme[]> = {};
        programmes.forEach((p) => {
            const key = p.start.toLocaleDateString("en-CA");
            if (!map[key]) map[key] = [];
            map[key].push(p);
        });
        return map;
    }, [programmes]);

    const sortedDays = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return Object.keys(grouped)
            .map((d) => ({ key: d, date: parseDay(d) }))
            .filter(({ date }) => date >= today)
            .sort((a, b) => a.date.getTime() - b.date.getTime())
            .map(({ key }) => key);
    }, [grouped]);

    const todayKey = new Date().toLocaleDateString("en-CA");

    const [activeDay, setActiveDay] = useState<string>(
        () => sortedDays.includes(todayKey) ? todayKey : sortedDays[0] ?? ""
    );

    const isToday = activeDay === todayKey;
    const now = new Date();

    const rawDayProgrammes = grouped[activeDay] ?? [];

    const dayProgrammes = useMemo(() => {
        if (!query.trim()) return rawDayProgrammes;
        const q = normalize(query.trim());
        return rawDayProgrammes.filter((p) =>
            normalize(p.title ?? "").includes(q) ||
            normalize(p.desc ?? "").includes(q)
        );
    }, [rawDayProgrammes, query]);

    // Hourly slots
    const timeSlots = useMemo(() => {
        if (!dayProgrammes.length) return [];
        const min = Math.min(...dayProgrammes.map((p) => p.start.getTime()));
        const max = Math.max(...dayProgrammes.map((p) => p.stop.getTime()));
        const start = new Date(min);
        start.setMinutes(0, 0, 0);
        const slots: Date[] = [];
        const cursor = new Date(start);
        while (cursor.getTime() <= max) {
            slots.push(new Date(cursor));
            cursor.setHours(cursor.getHours() + 1);
        }
        return slots;
    }, [dayProgrammes]);

    // Group by channel
    const programmesByChannel = useMemo<[string, Programme[]][]>(() => {
        const map = new Map<string, Programme[]>();
        dayProgrammes.forEach((p) => {
            if (!map.has(p.channel)) map.set(p.channel, []);
            map.get(p.channel)!.push(p);
        });
        return Array.from(map.entries());
    }, [dayProgrammes]);

    const findStream = useCallback((channelId: string): StreamItem | undefined => {
        return streams.find((s) => s.channelId === channelId);
    }, [streams])

    // Build row cells with multi-hour spanning
    const buildRowCells = useCallback((progs: Programme[]) => {
        const cells: {
            programme: Programme | undefined;
            colSpan: number;
            slotIndex: number;
        }[] = [];

        let i = 0;
        while (i < timeSlots.length) {
            const slot = timeSlots[i];
            const slotEnd = new Date(slot);
            slotEnd.setHours(slotEnd.getHours() + 1);

            const programme = progs.find(
                (p) => p.start <= slot && p.stop > slot
            );

            if (programme) {
                // Calculate how many slots this programme spans
                let span = 1;
                while (
                    i + span < timeSlots.length &&
                    programme.stop > timeSlots[i + span]
                ) {
                    span++;
                }
                // Only render at the first slot
                const isFirst = programme.start <= slot && (i === 0 || !(programme.start <= timeSlots[i - 1] && programme.stop > timeSlots[i - 1]));
                if (isFirst) {
                    cells.push({ programme, colSpan: span, slotIndex: i });
                    i += span;
                } else {
                    i++;
                }
            } else {
                cells.push({ programme: undefined, colSpan: 1, slotIndex: i });
                i++;
            }
        }
        return cells;
    }, [timeSlots]);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Search */}
            <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search programmes (English or 日本語)…"
                style={{
                    padding: "8px 14px",
                    width: "100%",
                    borderRadius: 8,
                    border: "1px solid #2a2a4a",
                    background: "#0d0d16",
                    color: "#e8e0d0",
                    fontSize: "1.125rem",
                    outline: "none",
                    boxSizing: "border-box",
                }}
            />

            {/* Day tabs */}
            <div style={{ display: "flex", gap: 4 }}>
                {sortedDays.map((day) => {
                    const date = parseDay(day);
                    const isActive = day === activeDay;
                    const isDay = day === todayKey;
                    const label = isDay
                        ? "Today"
                        : date.toLocaleDateString("en-AU", { day: "2-digit", month: "short" });

                    return (
                        <button
                            key={day}
                            onClick={() => setActiveDay(day)}
                            style={{
                                padding: "5px 14px",
                                borderRadius: 6,
                                border: "1px solid",
                                borderColor: isActive ? "#c8a97e" : "#2a2a4a",
                                background: isActive ? "#1a1a2e" : "transparent",
                                color: isActive ? "#c8a97e" : "#555",
                                cursor: "pointer",
                                fontSize: "1.2rem",
                                fontWeight: isActive ? 600 : 400,
                                letterSpacing: "0.05em",
                                transition: "all 0.15s",
                            }}
                        >
                            {label}
                        </button>
                    );
                })}
            </div>

            {/* Legend */}
            <div style={{ display: "flex", gap: 16, fontSize: "1rem", color: "#555" }}>
                {[
                    { color: "#3b5bdb", label: "Stream available" },
                    { color: "#c8a97e", label: "Current hour" },
                    { color: "#444", label: "No stream" },
                ].map(({ color, label }) => (
                    <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
                        {label}
                    </div>
                ))}
            </div>

            {/* Grid */}
            <div
                ref={scrollRef}
                style={{
                    overflowX: "auto",
                    overflowY: "auto",
                    maxHeight: "65vh",
                    border: "1px solid #1a1a2a",
                    borderRadius: 8,
                }}
            >
                <table style={{ borderCollapse: "collapse", minWidth: 800 }}>
                    <thead>
                        <tr>
                            <th style={{
                                position: "sticky",
                                left: 0,
                                top: 0,
                                background: "#0a0a0f",
                                zIndex: 10,
                                border: "1px solid #1a1a2a",
                                padding: "8px 12px",
                                fontSize: "1rem",
                                color: "#555",
                                fontWeight: 700,
                                letterSpacing: "0.1em",
                                textTransform: "uppercase",
                                minWidth: 180,
                                textAlign: "left",
                            }}>
                                Channel
                            </th>
                            {timeSlots.map((slot) => {
                                const isCurrent =
                                    isToday &&
                                    now.getHours() === slot.getHours();
                                const isFuture = isToday &&
                                    now.getHours() < slot.getHours();
                                return (
                                    <th
                                        key={slot.toISOString()}
                                        style={{
                                            position: "sticky",
                                            top: 0,
                                            zIndex: 5,
                                            border: "1px solid #1a1a2a",
                                            padding: "8px 6px",
                                            background: isCurrent ? "#1e1a0a" : "#0a0a0f",
                                            color: isCurrent ? "#c8a97e" : isFuture ? "#ffffff" : "#555",
                                            fontWeight: isCurrent ? 600 : 400,
                                            minWidth: 120,
                                            textAlign: "center",
                                            borderBottom: isCurrent ? "2px solid #c8a97e" : "1px solid #1a1a2a",
                                        }}
                                    >
                                        {slot.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>

                    <tbody>
                        {programmesByChannel.map(([channelId, progs]) => {
                            const cells = buildRowCells(progs);
                            const stream = findStream(channelId);
                            const friendlyName = channelNameById.get(channelId) ?? channelId;

                            return (
                                <tr key={channelId}>
                                    <td style={{
                                        position: "sticky",
                                        left: 0,
                                        zIndex: 2,
                                        background: "#0d0d18",
                                        border: "1px solid #1a1a2a",
                                        padding: "8px 12px",
                                        fontWeight: 500,
                                        fontSize: "1rem",
                                        color: "#e8e0d0",
                                        minWidth: 180,
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        maxWidth: 180,
                                    }}>
                                        {friendlyName}
                                    </td>

                                    {cells.map(({ programme, colSpan, slotIndex }) => {
                                        const slot = timeSlots[slotIndex];
                                        const slotEnd = new Date(slot);
                                        slotEnd.setHours(slotEnd.getHours() + colSpan);

                                        const isPast = isToday && slotEnd.getTime() <= now.getTime();
                                        const isCurrent = isToday && now.getHours() === slot.getHours();

                                        return (
                                            <ProgrammeCell
                                                hideTimerRef={hideTimer}
                                                key={`${channelId}-${slot.toISOString()}`}
                                                programme={programme}
                                                stream={programme ? stream : undefined}
                                                colSpan={colSpan}
                                                isPast={isPast}
                                                isCurrent={isCurrent}
                                                onClick={() => { if (stream) onSelectStream(stream); }}
                                                hoveredKey={hoveredKey}
                                                setHoveredKey={setHoveredKey}
                                                cellKey={`${channelId}-${slot.toISOString()}`}
                                            />
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}