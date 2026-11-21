import { readJsonData, normalizeText, scoreAgainstQuery } from "./shared.js";

async function loadHostel() {
  return readJsonData("hostel.json");
}

export const hostelSource = {
  id: "hostel",
  label: "Hostel",
  accent: "#0891b2",
  description: "Residence occupancy, facilities, wardens, notices, and forms.",
  async overview() {
    const data = await loadHostel();
    const occupied = data.blocks.reduce((total, block) => total + block.occupancy, 0);
    const capacity = data.blocks.reduce((total, block) => total + block.capacity, 0);
    return {
      sourceName: data.sourceName,
      lastSynced: data.lastSynced,
      metric: `${Math.round((occupied / capacity) * 100)}%`,
      metricLabel: "hostel occupancy",
      secondary: `${capacity - occupied} rooms/beds available`,
      dataStatus: data.dataStatus,
      items: data.blocks.slice(0, 4).map((block) => ({
        title: block.name,
        detail: `${block.occupancy}/${block.capacity} occupied - Warden: ${block.warden}`,
        status: `${block.capacity - block.occupancy} free`
      }))
    };
  },
  tools: [
    {
      name: "find_hostel",
      description: "Find hostel blocks, occupancy, facilities, wardens, notices, and forms.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Student's natural-language hostel request" }
        },
        required: ["query"]
      },
      async handler(args = {}) {
        const data = await loadHostel();
        const query = typeof args.query === "string" ? args.query : "";
        const ranked = data.blocks
          .map((block) => ({
            ...block,
            facilitiesText: block.facilities.join(" "),
            noticesText: block.notices.join(" "),
            score: scoreAgainstQuery(
              { ...block, facilitiesText: block.facilities.join(" "), noticesText: block.notices.join(" ") },
              query,
              ["name", "gender", "warden", "facilitiesText", "noticesText"]
            )
          }))
          .filter((block) => block.score > 0 || normalizeText(query).length < 3)
          .sort((a, b) => b.score - a.score)
          .slice(0, 5);
        return {
          summary: ranked.length ? `Found ${ranked.length} hostel block${ranked.length === 1 ? "" : "s"}.` : "No matching hostel block was found.",
          highlights: ranked.map((block) => `${block.name}: ${block.occupancy}/${block.capacity} occupied; ${block.facilities.join(", ")}; Warden ${block.warden}`),
          items: ranked.map((block) => ({
            id: block.id,
            title: block.name,
            detail: `Warden: ${block.warden}`,
            meta: `${block.capacity - block.occupancy} free - ${block.facilities.join(", ")}`,
            status: "Open"
          }))
        };
      }
    }
  ]
};
