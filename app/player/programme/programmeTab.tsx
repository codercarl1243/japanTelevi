"use client";

import { AppData, Programme, StreamItem } from "../../types";
import { FilterKey } from "../filters";
import { useProgrammeTab } from "./useProgrammeTab";
import ProgrammeControls from "./programmeControls";
import ProgrammeGrid from "./programmeGrid";
import { Dispatch, SetStateAction } from "react";

type Props = {
    programmes: Programme[];
    streams: StreamItem[];
    onSelectStream: (stream: StreamItem) => void;
    availableFilters: AppData["availableFilters"];
    setActiveFilter: Dispatch<SetStateAction<FilterKey | null>>;
    activeFilter: FilterKey | null;
};

const legend = [
    { color: "#3b5bdb", label: "Stream available" },
    { color: "#c8a97e", label: "Current hour" },
    { color: "#444", label: "No stream" },
];

export default function ProgrammeTab({ programmes, streams, onSelectStream, availableFilters, setActiveFilter, activeFilter }: Props) {
    const tab = useProgrammeTab({ programmes, streams, availableFilters });

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <ProgrammeControls
                query={tab.query}
                setQuery={tab.setQuery}
                sortedDays={tab.sortedDays}
                activeDay={tab.activeDay}
                setActiveDay={tab.setActiveDay}
                todayKey={tab.todayKey}
                activeFilter={activeFilter}
                setActiveFilter={setActiveFilter}
                availableFilters={availableFilters}
            />

            {/* Legend */}
            <div style={{ display: "flex", gap: 16, fontSize: "1rem", color: "#555" }}>
                {legend.map(({ color, label }) => (
                    <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
                        {label}
                    </div>
                ))}
            </div>

            <ProgrammeGrid
                programmesByChannel={tab.programmesByChannel}
                channelNameById={tab.channelNameById}
                timeSlots={tab.timeSlots}
                isToday={tab.isToday}
                now={tab.now}
                findStream={tab.findStream}
                buildRowCells={tab.buildRowCells}
                onSelectStream={onSelectStream}
                hoveredKey={tab.hoveredKey}
                setHoveredKey={tab.setHoveredKey}
                hideTimer={tab.hideTimer}
            />
        </div>
    );
}