import fs from "fs/promises";
import { log } from "./log";

export async function fileExists(filePath: string) {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

export async function readUTF8File(filePath: string): Promise<string | null> {
    try {
        return await fs.readFile(filePath, "utf-8");
    } catch (err) {
        log.error(`error reading filepath: ${filePath} \n ${err instanceof Error ? err.message : String(err)}`);
        return null;
    }
}
export async function writeFile(filePath: string, stringData: string) {
    try {
        await fs.writeFile(filePath, stringData);
        log.success(`written: ${filePath}`);
    } catch (err) {
        log.error(`failed to write ${filePath}: ${err}`);
        throw err; // re-throw so the caller knows it failed
    }
}