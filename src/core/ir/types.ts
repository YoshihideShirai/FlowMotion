export type Vec2 = { x: number; y: number };
export type Size = { width: number; height: number };

export type ObjectType =
  | "rect"
  | "text"
  | "cpu"
  | "memory"
  | "database"
  | "queue"
  | "service"
  | "client"
  | "worker";

export type Style = {
  fill?: string;
  stroke?: string;
  color?: string;
  opacity?: number;
};

export type SceneObject = {
  id: string;
  type: ObjectType;
  label: string;
  position: Vec2;
  size: Size;
  style?: Style;
  visible?: boolean;
  highlighted?: boolean;
};

export type Relation = {
  id: string;
  from: string;
  to: string;
  type: "arrow" | "message" | "dataflow";
  label?: string;
  style?: Style;
  visible?: boolean;
  progress?: number;
};

export type AnimationAction =
  | { type: "show" }
  | { type: "hide" }
  | { type: "highlight"; color?: string }
  | { type: "unhighlight" }
  | { type: "move"; to: Vec2 }
  | { type: "text"; value: string }
  | { type: "grow" };

export type Keyframe = {
  time: number;
  targetId: string;
  action: AnimationAction;
  duration?: number;
};

export type Scene = {
  id: string;
  title?: string;
  width: number;
  height: number;
  background: string;
  objects: SceneObject[];
  relations: Relation[];
  timeline: Keyframe[];
};

export type ComputedScene = Omit<Scene, "timeline"> & {
  caption?: string;
};
