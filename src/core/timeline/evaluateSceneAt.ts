import type { ComputedScene, Scene } from "../ir/types";

export function evaluateSceneAt(scene: Scene, currentTime: number): ComputedScene {
  const objects = scene.objects.map((object) => ({ ...object, style: { ...object.style } }));
  const relations = scene.relations.map((relation) => ({ ...relation, style: { ...relation.style } }));
  let caption = "";

  for (const keyframe of [...scene.timeline].sort((a, b) => a.time - b.time)) {
    if (keyframe.time > currentTime) continue;
    if (keyframe.targetId === "__caption" && keyframe.action.type === "text") { caption = keyframe.action.value; continue; }
    const object = objects.find((item) => item.id === keyframe.targetId);
    const relation = relations.find((item) => item.id === keyframe.targetId || `${item.from}_${item.to}` === keyframe.targetId);

    switch (keyframe.action.type) {
      case "show": if (object) object.visible = true; if (relation) relation.visible = true; break;
      case "hide": if (object) object.visible = false; if (relation) relation.visible = false; break;
      case "highlight": if (object) { object.highlighted = true; object.style = { ...object.style, stroke: keyframe.action.color ?? "#facc15" }; } break;
      case "unhighlight": if (object) { object.highlighted = false; object.style = { ...object.style, stroke: undefined }; } break;
      case "move": if (object) object.position = keyframe.action.to; break;
      case "grow": if (relation) { relation.visible = true; relation.progress = 1; } break;
    }
  }

  return { ...scene, objects, relations, caption };
}
