import type { ComputedScene, Relation, SceneObject } from "../ir/types";

export function renderSvg(scene: ComputedScene): string {
  const objectsById = new Map(scene.objects.map((object) => [object.id, object]));
  return `
<svg viewBox="0 0 ${scene.width} ${scene.height}" role="img" aria-label="${escapeXml(scene.title ?? scene.id)}">
  <defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#93c5fd" /></marker></defs>
  <rect width="${scene.width}" height="${scene.height}" fill="${scene.background}" rx="20" />
  <text x="40" y="52" fill="#e2e8f0" font-family="Inter, sans-serif" font-size="28" font-weight="700">${escapeXml(scene.title ?? "")}</text>
  ${scene.relations.map((relation) => renderRelation(relation, objectsById)).join("\n")}
  ${scene.objects.map(renderObject).join("\n")}
  ${scene.caption ? `<text x="480" y="492" text-anchor="middle" fill="#f8fafc" font-family="Inter, sans-serif" font-size="24">${escapeXml(scene.caption)}</text>` : ""}
</svg>`;
}

function renderObject(object: SceneObject): string {
  if (!object.visible) return "";
  const { x, y } = object.position;
  const { width, height } = object.size;
  const fill = object.style?.fill ?? fillFor(object.type);
  const stroke = object.style?.stroke ?? (object.highlighted ? "#facc15" : "#38bdf8");
  const icon = iconFor(object.type);
  return `<g filter="drop-shadow(0 10px 16px rgba(0,0,0,.24))">
    <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="16" fill="${fill}" stroke="${stroke}" stroke-width="${object.highlighted ? 5 : 2}" />
    <text x="${x + width / 2}" y="${y + 32}" text-anchor="middle" fill="#e0f2fe" font-size="13" font-family="Inter, sans-serif" opacity=".78">${icon}</text>
    <text x="${x + width / 2}" y="${y + 54}" text-anchor="middle" fill="#f8fafc" font-size="20" font-weight="700" font-family="Inter, sans-serif">${escapeXml(object.label)}</text>
  </g>`;
}

function renderRelation(relation: Relation, objects: Map<string, SceneObject>): string {
  if (!relation.visible) return "";
  const from = objects.get(relation.from); const to = objects.get(relation.to);
  if (!from || !to || !from.visible || !to.visible) return "";
  const x1 = from.position.x + from.size.width; const y1 = from.position.y + from.size.height / 2;
  const x2 = to.position.x; const y2 = to.position.y + to.size.height / 2;
  const progress = relation.progress ?? 1;
  const ex = x1 + (x2 - x1) * progress; const ey = y1 + (y2 - y1) * progress;
  return `<g>
    <line x1="${x1}" y1="${y1}" x2="${ex}" y2="${ey}" stroke="#93c5fd" stroke-width="4" stroke-linecap="round" marker-end="url(#arrow)" />
    ${relation.label ? `<text x="${(x1 + x2) / 2}" y="${y1 - 16}" fill="#bfdbfe" text-anchor="middle" font-family="Inter, sans-serif" font-size="16">${escapeXml(relation.label)}</text>` : ""}
  </g>`;
}

function fillFor(type: string) {
  return ({ cpu: "#1e3a8a", memory: "#365314", database: "#4c1d95", queue: "#713f12", service: "#164e63", client: "#7f1d1d", worker: "#14532d" } as Record<string, string>)[type] ?? "#1e293b";
}
function iconFor(type: string) { return ({ cpu: "CPU", memory: "MEM", database: "DB", queue: "QUEUE", service: "SVC", client: "CLIENT", worker: "WORKER" } as Record<string, string>)[type] ?? type.toUpperCase(); }
function escapeXml(value: string) { return value.replace(/[<>&"]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[char] ?? char)); }
