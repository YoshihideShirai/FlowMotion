import type { Keyframe, ObjectType, Relation, Scene } from "../ir/types";
import { autoLayout } from "../layout/autoLayout";

const objectTypes = new Set<ObjectType>(["rect", "text", "cpu", "memory", "database", "queue", "service", "client", "worker"]);
const colors = new Map([
  ["red", "#ef4444"], ["yellow", "#facc15"], ["blue", "#3b82f6"], ["green", "#22c55e"], ["purple", "#a855f7"],
]);

export type ParseResult = { scene: Scene; diagnostics: string[] };

export function parseFlowMotion(source: string): ParseResult {
  const diagnostics: string[] = [];
  const objectDrafts: Array<{ id: string; type: ObjectType; label: string; visible: boolean }> = [];
  const relations: Relation[] = [];
  const timeline: Keyframe[] = [];
  let title = "Untitled FlowMotion";
  let inTimeline = false;

  source.split(/\r?\n/).forEach((raw, index) => {
    const lineNo = index + 1;
    const line = raw.trim();
    if (!line || line.startsWith("#")) return;
    if (line === "timeline:") { inTimeline = true; return; }

    if (inTimeline) {
      const match = line.match(/^(\d+(?:\.\d+)?)s?:\s+(show|hide|grow|highlight|unhighlight|text|move)\s*(.*)$/i);
      if (!match) { diagnostics.push(`Line ${lineNo}: invalid timeline entry.`); return; }
      const [, timeText, actionName, rest] = match;
      const time = Number(timeText);
      if (actionName === "text") {
        timeline.push({ time, targetId: "__caption", action: { type: "text", value: unquote(rest.trim()) } });
        return;
      }
      const [targetId, arg1, arg2] = rest.trim().split(/\s+/);
      if (!targetId) { diagnostics.push(`Line ${lineNo}: timeline action needs a target.`); return; }
      if (actionName === "highlight") {
        timeline.push({ time, targetId, action: { type: "highlight", color: colors.get(arg1) ?? arg1 } });
      } else if (actionName === "move") {
        timeline.push({ time, targetId, action: { type: "move", to: { x: Number(arg1), y: Number(arg2) } } });
      } else {
        timeline.push({ time, targetId, action: { type: actionName as "show" | "hide" | "grow" | "unhighlight" } });
      }
      return;
    }

    const titleMatch = line.match(/^title\s+(.+)$/i);
    if (titleMatch) { title = unquote(titleMatch[1]); return; }

    const relationMatch = line.match(/^(\w+)\s+(-{1,2}>)\s+(\w+)\s*(?::\s*(.+))?$/);
    if (relationMatch) {
      const [, from, arrow, to, label] = relationMatch;
      relations.push({ id: `${from}_${to}_${relations.length + 1}`, from, to, type: arrow === "-->" ? "message" : "arrow", label, visible: false, progress: 0 });
      return;
    }

    const objectMatch = line.match(/^(\w+)\s+(\w+)(?:\s+"(.+)")?$/);
    if (objectMatch && objectTypes.has(objectMatch[1] as ObjectType)) {
      const [, type, id, quotedLabel] = objectMatch;
      objectDrafts.push({ id, type: type as ObjectType, label: quotedLabel ?? id, visible: false });
      return;
    }

    diagnostics.push(`Line ${lineNo}: could not parse '${line}'.`);
  });

  return {
    diagnostics,
    scene: {
      id: slug(title), title, width: 960, height: 540, background: "#0f172a",
      objects: autoLayout(objectDrafts), relations, timeline,
    },
  };
}

function unquote(value: string) { return value.replace(/^"|"$/g, ""); }
function slug(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "scene"; }
