"use client";

import { Dispatch, SetStateAction } from "react";
import { Dates } from "@/lib/dates";
import { FILTERS, FilterKey } from "../filters";
import { AppData } from "../../types";

type Props = {
    query: string;
    setQuery: Dispatch<SetStateAction<string>>;
    sortedDays: string[];
    activeDay: string;
    setActiveDay: Dispatch<SetStateAction<string>>;
    todayKey: string;
    activeFilter: FilterKey | null;
    setActiveFilter: Dispatch<SetStateAction<FilterKey | null>>;
    availableFilters: AppData["availableFilters"];
};

export default function ProgrammeControls({
    query, setQuery,
    sortedDays, activeDay, setActiveDay, todayKey,
    activeFilter, setActiveFilter,
    availableFilters,
}: Props) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            {/* Category filter pills */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button
                    onClick={() => setActiveFilter(null)}
                    style={{
                        padding: "4px 12px",
                        borderRadius: 999,
                        border: "1px solid",
                        borderColor: activeFilter === null ? "#c8a97e" : "#2a2a4a",
                        background: activeFilter === null ? "#1a1a2e" : "transparent",
                        color: activeFilter === null ? "#c8a97e" : "#555",
                        cursor: "pointer",
                        fontSize: "0.75rem",
                        letterSpacing: "0.05em",
                    }}
                >
                    すべて All
                </button>

                {availableFilters.map((key) => {
                    const isActive = activeFilter === key;
                    const filter = FILTERS[key];
                    return (
                        <button
                            key={key}
                            onClick={() => setActiveFilter(isActive ? null : key)}
                            style={{
                                padding: "4px 12px",
                                borderRadius: 999,
                                border: "1px solid",
                                borderColor: isActive ? "#c8a97e" : "#2a2a4a",
                                background: isActive ? "#1a1a2e" : "transparent",
                                color: isActive ? "#c8a97e" : "#555",
                                cursor: "pointer",
                                fontSize: "0.75rem",
                                letterSpacing: "0.05em",
                                transition: "all 0.15s",
                            }}
                        >
                            {filter.labelJa} {filter.label}
                        </button>
                    );
                })}
            </div>

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
                    const date = Dates.parseLocalDay(day);
                    const isActive = day === activeDay;
                    const isDay = day === todayKey;
                    const label = isDay ? "Today" : Dates.formatShortDate(date);

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
        </div>
    );
}