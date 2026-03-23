// ─── Parsing ──────────────────────────────────────────────────────────────────

export const Dates = {

    /** Parse an XMLTV date string (e.g. "20260322120000 +0900") into a Date */
    parseXmltvDate(dateStr: string): Date {
        const [datetime, offset] = dateStr.split(" ");
        const iso =
            `${datetime.slice(0, 4)}-${datetime.slice(4, 6)}-${datetime.slice(6, 8)}T` +
            `${datetime.slice(8, 10)}:${datetime.slice(10, 12)}:${datetime.slice(12, 14)}${offset}`;
        return new Date(iso);
    },

    /** Parse a "YYYY-MM-DD" string into a local midnight Date, avoiding timezone shift */
    parseLocalDay(day: string): Date {
        return new Date(day + "T00:00:00");
    },

    // ─── Formatting ───────────────────────────────────────────────────────────────

    /** Returns today's date as "YYYY-MM-DD" in UTC — used for cache keys */
    getUtcDateString(): string {
        return new Date().toISOString().slice(0, 10);
    },

    /** Returns a date as "YYYY-MM-DD" in local time — used for grouping keys */
    getLocalDateString(date: Date): string {
        return date.toLocaleDateString("en-CA");
    },

    /** Returns today's date as "YYYY-MM-DD" in local time */
    getTodayLocalString(): string {
        return this.getLocalDateString(new Date());
    },

    /** Format a Date as a time string e.g. "09:00" */
    formatTime(date: Date): string {
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    },

    /** Format a Date as a short date label e.g. "22 Mar" */
    formatShortDate(date: Date): string {
        return date.toLocaleDateString("en-AU", { day: "2-digit", month: "short" });
    },

    // ─── Comparisons ─────────────────────────────────────────────────────────────

    /** Returns local midnight for today */
    getLocalMidnightToday(): Date {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    },

    /** Returns midnight at the start of the next day after a given date */
    getNextMidnight(date: Date): Date {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + 1);
        return d;
    },

    /** Whether a programme is currently live */
    isLiveNow(start: Date, stop: Date): boolean {
        const now = new Date();
        return now >= start && now <= stop;
    },

    /** Whether a time slot hour matches the current hour */
    isCurrentHour(slot: Date): boolean {
        return new Date().getHours() === slot.getHours();
    },

    /** Whether a slot's end time is in the past */
    isPastSlot(slotEnd: Date): boolean {
        return slotEnd.getTime() <= new Date().getTime();
    },

} as const;