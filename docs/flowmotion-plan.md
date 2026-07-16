# FlowMotion 構築計画

FlowMotion は、PlantUML がテキストから静的な図を生成するように、ソフトウェア技術説明をテキストからアニメーション化するための DSL / IR / Renderer 基盤です。

目的は、一般的な動画編集ツールを作ることではありません。ソフトウェア説明で頻出する「オブジェクトが現れる」「矢印が伸びる」「データが流れる」「状態が変わる」「対象が強調される」といった状態遷移を、簡潔なテキスト記述から再生可能な動画表現へ変換することです。

---

## 1. プロダクト方針

### 目指すもの

- ソフトウェア技術説明に特化したテキスト駆動アニメーションツール
- Scene Graph と Timeline を中心にした拡張可能な中間表現
- DSL、Renderer、Export 形式を疎結合にしたアーキテクチャ
- Webプレビュー、VS Codeプレビュー、GIF/MP4エクスポートへ拡張できる基盤

### 目指さないもの

初期段階では次を目指しません。

- After Effects のような汎用動画編集機能
- 複雑な3Dアニメーション
- 高度なキーフレーム編集UI
- 本格的なGraphviz相当のレイアウトエンジン
- 音声合成やAI生成を前提にした設計

---

## 2. 基本アーキテクチャ

全体の処理パイプラインは次の形にします。

```text
DSL
 ↓
Parser
 ↓
IR / Scene Graph
 ↓
Timeline Compiler
 ↓
Renderer
 ↓
Preview / SVG / Canvas / GIF / MP4
```

重要なのは、最初からDSLを固定しすぎないことです。

長期的に安定させるべきなのは DSL ではなく IR です。DSLはユーザー体験に合わせて何度でも変更できますが、IRが安定していればRendererやExporterは再利用できます。

---

## 3. 中核IR設計

### Scene

Scene は1つの動画、または1つの説明シーンを表します。

```ts
type Scene = {
  id: string;
  title?: string;
  width: number;
  height: number;
  background?: string;
  objects: SceneObject[];
  relations: Relation[];
  timeline: Timeline;
};
```

### SceneObject

SceneObject は CPU、Memory、Database、Queue、Thread などの説明対象を表します。

```ts
type SceneObject = {
  id: string;
  type: ObjectType;
  label?: string;
  position: Vec2;
  size?: Size;
  style?: Style;
  state?: ObjectState;
  metadata?: Record<string, unknown>;
};
```

初期の ObjectType は次の程度で十分です。

```ts
type ObjectType =
  | "rect"
  | "circle"
  | "text"
  | "cpu"
  | "memory"
  | "database"
  | "queue"
  | "thread"
  | "service"
  | "client"
  | "worker";
```

### Relation

Relation はオブジェクト間の関係を表します。

```ts
type Relation = {
  id: string;
  from: string;
  to: string;
  type: "arrow" | "line" | "message" | "dataflow";
  label?: string;
  style?: Style;
  state?: RelationState;
};
```

### Timeline

Timeline は「いつ、何が、どう変わるか」を表します。

```ts
type Timeline = {
  tracks: TimelineTrack[];
};

type TimelineTrack = {
  targetId: string;
  keyframes: Keyframe[];
};

type Keyframe = {
  time: number;
  action: AnimationAction;
  duration?: number;
  easing?: Easing;
};
```

### AnimationAction

MVPでは次のアクションに絞ります。

```ts
type AnimationAction =
  | { type: "show" }
  | { type: "hide" }
  | { type: "move"; to: Vec2 }
  | { type: "highlight"; color?: string }
  | { type: "unhighlight" }
  | { type: "text"; value: string }
  | { type: "grow" }
  | { type: "fade"; opacity: number };
```

---

## 4. DSL設計方針

DSLは最初から1種類に固定せず、低レベルDSLと高レベルイベントDSLを分けて考えます。

### 低レベルDSL

IRに近く、MVPやデバッグに向いている記法です。

```text
title "CPU Memory Read"

cpu CPU
memory RAM
arrow bus CPU -> RAM

timeline:
  0s: show CPU
  1s: show RAM
  2s: grow bus
  3s: highlight CPU red
  4s: highlight RAM yellow
  5s: text "CPU reads memory"
```

### 高レベルイベントDSL

ユーザーが「何が起きたか」を書くと、システムがTimelineを自動生成します。

```text
participant Client
participant API
participant DB

Client -> API : GET /users
activate API
API -> DB : SELECT users
DB --> API : rows
API --> Client : JSON
deactivate API
```

この記述から、メッセージ移動、矢印成長、対象ハイライト、説明テキスト表示などを自動生成します。

---

## 5. MVPスコープ

MVPの完成条件は次です。

```text
ユーザーがDSLを書く
↓
CPU、RAM、矢印が表示される
↓
再生またはシークする
↓
CPUが現れる
↓
RAMが現れる
↓
矢印が伸びる
↓
対象がハイライトされる
↓
説明テキストが表示される
```

### MVPで実装する機能

1. オブジェクト定義
   - rect
   - text
   - cpu
   - memory
   - database
   - queue
   - service
   - client
   - worker
2. 関係定義
   - arrow
   - message
   - dataflow
3. Timelineアクション
   - show
   - hide
   - move
   - highlight
   - text
   - grow
4. SVGプレビュー
5. Webエディタ
6. シーク可能なTimeline Player

### MVPで後回しにする機能

- MP4エクスポート
- GIFエクスポート
- VS Code拡張
- 音声・字幕同期
- AIによるDSL生成
- 差分レンダリングの本格実装

---

## 6. Renderer設計

Renderer は IR にだけ依存させます。

```text
Scene + ComputedSceneState
 ↓
Renderer
 ↓
SVG / Canvas / WebGPU / Video Frames
```

初期RendererはSVGを選びます。

理由は次です。

- 図形、テキスト、矢印を扱いやすい
- DOMとして検査しやすい
- CSSによる見た目調整がしやすい
- CanvasやWebGPUよりデバッグしやすい
- 技術図解との相性がよい

将来的にはRendererを差し替えられるようにします。

```text
IR
 ├ SVG Renderer
 ├ Canvas Renderer
 ├ WebGPU Renderer
 └ Video Export Renderer
```

---

## 7. Timeline評価モデル

Timelineは、任意時刻のScene Stateを計算できる関数を中心にします。

```ts
evaluateSceneAt(scene, currentTime): ComputedSceneState
```

この関数を中心にすると、次が簡単になります。

- プレビュー再生
- タイムラインのシーク
- テスト
- GIF/MP4用のフレーム生成
- 差分レンダリング

初期実装では毎回再描画で十分です。パフォーマンス問題が出たら、次のような差分計算を追加します。

```ts
type ScenePatch =
  | { type: "addObject"; object: ComputedObject }
  | { type: "removeObject"; id: string }
  | { type: "updateObject"; id: string; changes: Partial<ComputedObject> }
  | { type: "addRelation"; relation: ComputedRelation }
  | { type: "updateRelation"; id: string; changes: Partial<ComputedRelation> };
```

---

## 8. Webアプリ構成

初期のUIは次の構成にします。

```text
+-------------------+-------------------+
| DSL Editor         | Preview           |
|                   |                   |
+-------------------+-------------------+
| Play / Pause / Seek / Export           |
+---------------------------------------+
```

### 必要なUI要素

- DSLエディタ
- パース診断表示
- SVGプレビュー
- Play / Pause
- Time Slider
- サンプル切り替え
- 将来的なExportボタン

MVPでは Monaco Editor は必須ではありません。最初は `textarea` でも構いません。パーサーとIRが安定してから Monaco Editor に置き換えます。

---

## 9. ソフトウェア部品ライブラリ

PlantUMLの強さは、単なる図形描画ではなく、ソフトウェア説明に必要な部品を最初から持っていることです。

FlowMotionでも同様に、次の部品を標準で持たせます。

### インフラ系

- service
- database
- cache
- queue
- load_balancer
- storage
- api_gateway

### コンピュータアーキテクチャ系

- cpu
- gpu
- memory
- disk
- register
- bus

### 並行処理系

- thread
- process
- mutex
- semaphore
- channel
- worker

### ネットワーク系

- client
- server
- packet
- router
- firewall

### 状態管理系

- state
- event
- reducer
- store

---

## 10. 開発フェーズ

### Phase 1: IR定義

- Scene
- SceneObject
- Relation
- Timeline
- Keyframe
- AnimationAction
- Style

まずはJSON IRを直接Rendererに渡して表示できる状態にします。

### Phase 2: SVG Renderer

- 静的Scene描画
- object描画
- relation描画
- label描画
- caption描画

### Phase 3: Timeline Engine

- `evaluateSceneAt` の実装
- show / hide / highlight / text / grow / move
- seek対応

### Phase 4: DSL Parser

- 行指向DSL
- object定義
- relation定義
- timeline定義
- diagnostics表示

### Phase 5: Web Preview

- React UI
- DSL Editor
- SVG Preview
- Timeline Slider
- Sample Loader

### Phase 6: 高レベルイベントDSL

- participant
- message
- activate / deactivate
- eventからTimelineを自動生成

### Phase 7: Export

優先順位は次です。

1. HTML Export
2. SVG Export
3. GIF / WebM Export
4. MP4 Export

---

## 11. サンプル駆動開発

MVPはサンプル駆動で進めます。

### CPU Memory

```text
title "CPU Memory Read"

cpu CPU
memory RAM

CPU -> RAM : Read
RAM --> CPU : Data

timeline:
  0s: show CPU
  1s: show RAM
  2s: grow CPU_RAM
  3s: highlight CPU red
  4s: highlight RAM yellow
  5s: text "CPU reads data from memory"
```

### API Database

```text
title "API Request"

client Browser
service API
database DB

Browser -> API : GET /users
API -> DB : SELECT users
DB --> API : rows
API --> Browser : JSON
```

### Queue Worker

```text
title "Background Job"

service API
queue Jobs
worker Worker
database DB

API -> Jobs : enqueue
Worker -> Jobs : dequeue
Worker -> DB : write result
```

---

## 12. 将来拡張

### VS Code拡張

`.flowmotion` ファイルを編集しながら横にプレビューを表示します。PlantUML拡張に近い体験を目指します。

### Markdown連携

Markdown内で次のように埋め込めるようにします。

````markdown
```flowmotion
participant Client
participant API

Client -> API : Request
API --> Client : Response
```
````

### 音声・字幕同期

```text
narration:
  0s: "First, the client sends a request."
  2s: "The API queries the database."
```

### テーマ

```text
theme dark
theme terminal
theme blueprint
theme whiteboard
```

### AI生成

将来的には自然言語からDSLを生成できるようにします。ただし、AI機能はIRとRendererが安定した後に追加します。

---

## 13. 実装優先順位

最優先:

1. IR設計
2. SVG Renderer
3. Timeline評価
4. 簡単なDSL
5. Web Preview

次点:

6. Sequence DSL
7. ソフトウェア部品ライブラリ
8. Export
9. VS Code拡張

後回し:

10. WebGPU
11. 高度な自動レイアウト
12. 音声合成
13. AI生成
14. 本格的なMP4編集機能

---

## 14. 判断基準

開発中に迷った場合は次の順で優先します。

1. IRの安定性
2. DSLの読みやすさ
3. プレビューの速さ
4. ソフトウェア説明への特化
5. Rendererの差し替えやすさ
6. Export機能
7. 見た目の派手さ

---

## 15. 結論

FlowMotionは、汎用動画編集ツールではなく、ソフトウェア説明に特化した状態遷移ベースのアニメーションDSLとして構築します。

最初に作るべきものは、派手な演出ではなく次の安定したパイプラインです。

```text
DSL
 ↓
Parser
 ↓
IR / Scene Graph
 ↓
Timeline
 ↓
Renderer
```

この基盤があれば、将来的にSequence DSL、VS Code拡張、GIF/MP4エクスポート、差分レンダリング、字幕同期、AI生成などへ自然に拡張できます。
