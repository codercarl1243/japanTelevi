import getAppData from "@/app/data/data-controller";
import { log } from "@/lib/log";

async function warm() {
  log.step("Warming caches...");
  await getAppData();
  log.success("Cache warm complete");
}

warm();