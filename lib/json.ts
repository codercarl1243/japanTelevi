import fs from "fs/promises";

export async function readJsonCache<T>(filePath: string): Promise<T | null> {
    try {
        const file = await fs.readFile(filePath, "utf-8");
        return JSON.parse(file) as T;
    } catch {
        return null;
    }
}

export async function writeJsonCache(filePath: string, data: unknown) {
    const tmp = filePath + ".tmp";
    await fs.writeFile(tmp, JSON.stringify(data, null, 2));
    await fs.rename(tmp, filePath);
}