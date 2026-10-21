import { createServerFn } from "@tanstack/react-start";

export interface HltvVrsEntry {
  name: string;
  points: number;
}

/** Parses "Team Name(1234 Valve points)" rows out of the HLTV Valve ranking markdown. */
export function parseHltvVrsMarkdown(markdown: string): HltvVrsEntry[] {
  const out: HltvVrsEntry[] = [];
  const seen = new Set<string>();
  const re = /^\s*([^\n(]+?)\s*\((\d+)\s+Valve points\)/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(markdown))) {
    const name = m[1]!.replace(/^[#*\s\d.]+(?=\D)/, "").trim();
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    out.push({ name, points: Number(m[2]) });
  }
  return out;
}

export const fetchHltvVrs = createServerFn({ method: "POST" }).handler(async () => {
  const lovableKey = process.env['LOVABLE_API_KEY'];
  const fcKey = process.env['FIRECRAWL_API_KEY'];
  if (!lovableKey || !fcKey) throw new Error("Сервис загрузки HLTV не настроен");

  const d = new Date();
  const months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
  const candidates = [
    `https://www.hltv.org/valve-ranking/teams/${d.getUTCFullYear()}/${months[d.getUTCMonth()]}/${d.getUTCDate()}`,
    "https://www.hltv.org/valve-ranking/teams",
  ];

  let lastError = "";
  for (const url of candidates) {
    const res = await fetch("https://connector-gateway.lovable.dev/firecrawl/v2/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": fcKey,
      },
      body: JSON.stringify({ url, formats: ["markdown"] }),
    });
    if (!res.ok) {
      lastError = `[${res.status}] ${(await res.text()).slice(0, 300)}`;
      console.error("HLTV scrape failed", lastError);
      continue;
    }
    const json = (await res.json()) as { data?: { markdown?: string }; markdown?: string };
    const md = json.data?.markdown ?? json.markdown ?? "";
    const entries = parseHltvVrsMarkdown(md);
    if (entries.length) return { url, entries };
    lastError = "Рейтинг на странице не найден";
  }
  throw new Error(`Не удалось загрузить рейтинг HLTV: ${lastError}`);
});
