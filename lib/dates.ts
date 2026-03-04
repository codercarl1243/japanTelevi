export function parseXmltvDate(dateStr: string) {
    const [datetime, offset] = dateStr.split(" ");
    const iso =
        `${datetime.slice(0, 4)}-${datetime.slice(4, 6)}-${datetime.slice(6, 8)}T` +
        `${datetime.slice(8, 10)}:${datetime.slice(10, 12)}:${datetime.slice(12, 14)}${offset}`;
    return new Date(iso);
}

export function getUtcDateString() {
    return new Date().toISOString().slice(0, 10);
}