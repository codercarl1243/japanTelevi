import { useMemo, useState, useRef, useCallback } from "react";
import { Programme, StreamItem, AppData } from "../../types";
import { Dates } from "@/lib/dates";
import { FilterKey } from "../filters";

type Props = {
    programmes: Programme[];
    streams: StreamItem[];
    availableFilters: AppData["availableFilters"];
};

function normalize(text: string) {
    return text.toLowerCase().normalize("NFKC");
}

export function useProgrammeTab({ programmes, streams, availableFilters }: Props) {
    const [query, setQuery] = useState("");
    const [hoveredKey, setHoveredKey] = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState<FilterKey | null>(null);
    const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const todayKey = useMemo(() => Dates.getTodayLocalString(), []);
    const now = useMemo(() => new Date(), []);

    // ─── Grouping ─────────────────────────────────────────────────────────────

    const grouped = useMemo(() => {
        const map: Record<string, Programme[]> = {};
        programmes.forEach((p) => {
            const key = Dates.getLocalDateString(p.start);
            if (!map[key]) map[key] = [];
            map[key].push(p);
        });
        return map;
    }, [programmes]);

    const sortedDays = useMemo(() => {
        return Object.keys(grouped)
            .map((d) => ({ key: d, date: Dates.parseLocalDay(d) }))
            .filter(({ date }) => date >= Dates.getLocalMidnightToday())
            .sort((a, b) => a.date.getTime() - b.date.getTime())
            .map(({ key }) => key);
    }, [grouped]);

    const [activeDay, setActiveDay] = useState<string>(
        () => sortedDays.includes(todayKey) ? todayKey : sortedDays[0] ?? ""
    );

    const isToday = activeDay === todayKey;

    // ─── Day programmes ───────────────────────────────────────────────────────

    const rawDayProgrammes = grouped[activeDay] ?? [];

    const dayProgrammes = useMemo(() => {
        if (!query.trim()) return rawDayProgrammes;
        const q = normalize(query.trim());
        return rawDayProgrammes.filter((p) =>
            normalize(p.title ?? "").includes(q) ||
            normalize(p.desc ?? "").includes(q)
        );
    }, [rawDayProgrammes, query]);

    // ─── Time slots ───────────────────────────────────────────────────────────

    const timeSlots = useMemo(() => {
        if (!dayProgrammes.length) return [];
        const min = Math.min(...dayProgrammes.map((p) => p.start.getTime()));

        const dayStart = new Date(min);
        dayStart.setHours(0, 0, 0, 0);
        const midnight = Dates.getNextMidnight(dayStart);

        const max = Math.min(
            Math.max(...dayProgrammes.map((p) => p.stop.getTime())),
            midnight.getTime()
        );

        const start = new Date(min);
        start.setMinutes(0, 0, 0);
        const slots: Date[] = [];
        const cursor = new Date(start);
        while (cursor.getTime() < max) {
            slots.push(new Date(cursor));
            cursor.setHours(cursor.getHours() + 1);
        }
        return slots;
    }, [dayProgrammes]);

    // ─── Channel grouping ─────────────────────────────────────────────────────

    const channelNameById = useMemo(() => {
        const map = new Map<string, string>();
        streams.forEach((s) => map.set(s.channelId, s.channelName));
        return map;
    }, [streams]);

    const programmesByChannel = useMemo<[string, Programme[]][]>(() => {
        const map = new Map<string, Programme[]>();
        dayProgrammes.forEach((p) => {
            if (!map.has(p.channel)) map.set(p.channel, []);
            map.get(p.channel)!.push(p);
        });
        return Array.from(map.entries());
    }, [dayProgrammes]);

    // ─── Stream lookup ────────────────────────────────────────────────────────

    const findStream = useCallback((channelId: string): StreamItem | undefined => {
        return streams.find((s) => s.channelId === channelId);
    }, [streams]);

    // ─── Cell builder ─────────────────────────────────────────────────────────

    const buildRowCells = useCallback((progs: Programme[]) => {
        const cells: {
            programme: Programme | undefined;
            colSpan: number;
            slotIndex: number;
        }[] = [];

        let i = 0;
        while (i < timeSlots.length) {
            const slot = timeSlots[i];

            const programme = progs.find(
                (p) => p.start <= slot && p.stop > slot
            );

            if (programme) {
                let span = 1;
                while (
                    i + span < timeSlots.length &&
                    programme.stop > timeSlots[i + span]
                ) {
                    span++;
                }
                const isFirst =
                    programme.start <= slot &&
                    (i === 0 || !(programme.start <= timeSlots[i - 1] && programme.stop > timeSlots[i - 1]));

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

    return {
        // state
        query, setQuery,
        hoveredKey, setHoveredKey,
        hideTimer,
        activeDay, setActiveDay,
        activeFilter, setActiveFilter,
        // derived
        todayKey,
        now,
        isToday,
        sortedDays,
        timeSlots,
        channelNameById,
        programmesByChannel,
        findStream,
        buildRowCells,
        availableFilters,
    };
}