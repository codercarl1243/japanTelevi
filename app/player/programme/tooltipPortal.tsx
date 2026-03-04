// app/player/programme/TooltipPortal.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Programme, StreamItem } from "../../types";

type Props = {
    programme: Programme;
    stream: StreamItem | undefined;
    anchorEl: HTMLElement | null;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    isPast: boolean;
};

export default function TooltipPortal({ programme, stream, anchorEl, onMouseEnter, onMouseLeave, isPast }: Props) {
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const portalEl = useRef<Element | null>(null);

    useEffect(() => {
        portalEl.current = document.getElementById("tooltip-portal");
    }, []);

    useEffect(() => {
        if (!anchorEl) return;
        const rect = anchorEl.getBoundingClientRect();
        setCoords({
            top: rect.top + window.scrollY - 2,   // 8px gap above cell
            left: rect.left + rect.width / 2,
        });
    }, [anchorEl]);

    const start = programme.start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const stop = programme.stop.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const tooltip = (
        <div
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            style={{
                position: "absolute",
                top: coords.top,
                left: coords.left,
                transform: "translate(-50%, -100%)",
                background: "#12121f",
                border: "1px solid #2a2a4a",
                borderRadius: 8,
                padding: "10px 14px",
                width: 240,
                height: 250,              // fixed height
                zIndex: 9999,
                boxShadow: "0 8px 32px #000a",
                overflow: "hidden",         // clip anything that exceeds
                boxSizing: "border-box",
            }}>
            <div style={{ fontSize: "0.75rem", color: "#c8a97e", marginBottom: 4 }}>
                {start} - {stop}
            </div>
            <div style={{
                fontSize: "1.1rem",
                fontWeight: 600,
                color: "#e8e0d0",
                marginBottom: 4,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",   // clamp long titles to one line
            }}>
                {programme.title}
            </div>
            {programme.desc && (
                <div style={{
                    fontSize: "0.9rem",
                    color: "#888",
                    maxHeight: "50%",
                    lineHeight: 1.5,
                    overflowY: "scroll",
                    display: "-webkit-box",
                    WebkitBoxOrient: "vertical",
                }}>
                    {programme.desc}
                </div>
            )}
            {stream && !isPast && (
                <div style={{
                    position: "absolute",   // pin to bottom so it doesn't push layout
                    bottom: 10,
                    left: 14,
                    fontSize: "0.75rem",
                    color: "#4ade80",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                }}>
                    <span>▶</span> Stream available
                </div>
            )}
        </div>
    );

    if (!portalEl.current) return null;
    return createPortal(tooltip, portalEl.current);
}