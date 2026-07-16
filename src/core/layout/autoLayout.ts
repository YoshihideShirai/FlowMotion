import type { SceneObject } from "../ir/types";

const DEFAULT_SIZE = { width: 132, height: 76 };

export function autoLayout(objects: Omit<SceneObject, "position" | "size">[]): SceneObject[] {
  const gap = 76;
  const startX = Math.max(64, 480 - ((objects.length * DEFAULT_SIZE.width + Math.max(0, objects.length - 1) * gap) / 2));
  return objects.map((object, index) => ({
    ...object,
    position: { x: startX + index * (DEFAULT_SIZE.width + gap), y: 190 },
    size: DEFAULT_SIZE,
  }));
}
