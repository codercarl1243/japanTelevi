"use client";

import { useRef, Dispatch, SetStateAction, RefObject, useCallback } from "react";
import { Programme, StreamItem } from "../../types";
import { Dates } from "@/lib/dates";
import TooltipPortal from "./tooltipPortal";

// ─── Programme Cell ───────────────────────────────────────────────────────────

function ProgrammeCell({
    programme, stream, colSpan, isPast, isCurrent, onClick,
    hoveredKey, setHoveredKey, hideTimerRef, cellKey,
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
                background: isCurrent ? "#1e1a0a" : isPast ? "#0d0d16" : hasStream ? "#111827" : "#0f0f1a",
                borderTop: "1px solid #1a1a2a",
                borderRight: "1px solid #1a1a2a",
                borderBottom: "1px solid #1a1a2a",
                borderLeft: isCurrent ? "2px solid #c8a97e" : hasStream && !isPast ? "2px solid #3b5bdb" : "1px solid #1a1a2a",
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

// ─── Grid ─────────────────────────────────────────────────────────────────────

type GridProps = {
    programmesByChannel: [string, Programme[]][];
    channelNameById: Map<string, string>;
    timeSlots: Date[];
    isToday: boolean;
    now: Date;
    findStream: (channelId: string) => StreamItem | undefined;
    buildRowCells: (progs: Programme[]) => { programme: Programme | undefined; colSpan: number; slotIndex: number }[];
    onSelectStream: (stream: StreamItem) => void;
    hoveredKey: string | null;
    setHoveredKey: Dispatch<SetStateAction<string | null>>;
    hideTimer: RefObject<NodeJS.Timeout | null>;
};

export default function ProgrammeGrid({
    programmesByChannel, channelNameById, timeSlots,
    isToday, now, findStream, buildRowCells, onSelectStream,
    hoveredKey, setHoveredKey, hideTimer,
}: GridProps) {
    return (
        <div
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
                            position: "sticky", left: 0, top: 0,
                            background: "#0a0a0f", zIndex: 10,
                            border: "1px solid #1a1a2a", padding: "8px 12px",
                            fontSize: "1rem", color: "#555", fontWeight: 700,
                            letterSpacing: "0.1em", textTransform: "uppercase",
                            minWidth: 180, textAlign: "left",
                        }}>
                            Channel
                        </th>
                        {timeSlots.map((slot) => {
                            const isCurrent = isToday && Dates.isCurrentHour(slot);
                            const isFuture = isToday && now.getHours() < slot.getHours();
                            return (
                                <th
                                    key={slot.toISOString()}
                                    style={{
                                        position: "sticky", top: 0, zIndex: 5,
                                        border: "1px solid #1a1a2a", padding: "8px 6px",
                                        background: isCurrent ? "#1e1a0a" : "#0a0a0f",
                                        color: isCurrent ? "#c8a97e" : isFuture ? "#ffffff" : "#555",
                                        fontWeight: isCurrent ? 600 : 400,
                                        minWidth: 120, textAlign: "center",
                                        borderBottom: isCurrent ? "2px solid #c8a97e" : "1px solid #1a1a2a",
                                    }}
                                >
                                    {Dates.formatTime(slot)}
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
                                    position: "sticky", left: 0, zIndex: 2,
                                    background: "#0d0d18", border: "1px solid #1a1a2a",
                                    padding: "8px 12px", fontWeight: 500,
                                    fontSize: "1rem", color: "#e8e0d0",
                                    minWidth: 180, whiteSpace: "nowrap",
                                    overflow: "hidden", textOverflow: "ellipsis",
                                    maxWidth: 180, height: 64,
                                }}>
                                    {friendlyName}
                                </td>
                                {cells.map(({ programme, colSpan, slotIndex }) => {
                                    const slot = timeSlots[slotIndex];
                                    const slotEnd = new Date(slot);
                                    slotEnd.setHours(slotEnd.getHours() + colSpan);

                                    const isPast = isToday && Dates.isPastSlot(slotEnd);
                                    const isCurrent = isToday && Dates.isCurrentHour(slot);

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
    );
}