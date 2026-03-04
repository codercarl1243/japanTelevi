import { XMLParser } from "fast-xml-parser";

// WIP
export default async function getBaseballChannels() {
  const res = await fetch(
    "https://iptv-org.github.io/epg/guides/jp.xml",
    { cache: "no-store" }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch EPG");
  }

  const xml = await res.text();

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
  });

  const parsed = parser.parse(xml);

  const programmes = parsed.tv.programme;

  const now = new Date();

  return programmes
    .filter((p: any) => {
      const start = new Date(
        p.start.slice(0, 14).replace(
          /(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/,
          "$1-$2-$3T$4:$5:$6"
        )
      );

      const stop = new Date(
        p.stop.slice(0, 14).replace(
          /(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/,
          "$1-$2-$3T$4:$5:$6"
        )
      );

      const title = p.title?.toLowerCase() || "";

      const isLiveNow = now >= start && now <= stop;

      const isBaseball =
        title.includes("野球") ||
        title.includes("ベースボール") ||
        title.includes("baseball");

      return isLiveNow && isBaseball;
    })
    .map((p: any) => p.channel);
}