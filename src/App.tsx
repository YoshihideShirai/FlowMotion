import { useMemo, useState } from "react";
import { parseFlowMotion } from "./core/parser/parseFlowMotion";
import { evaluateSceneAt } from "./core/timeline/evaluateSceneAt";
import { renderSvg } from "./core/renderer/svgRenderer";
import { cpuMemorySample } from "./samples/cpuMemory";
import "./styles.css";

export function App() {
  const [source, setSource] = useState(cpuMemorySample);
  const [time, setTime] = useState(0);
  const parsed = useMemo(() => parseFlowMotion(source), [source]);
  const computed = useMemo(() => evaluateSceneAt(parsed.scene, time), [parsed.scene, time]);
  const svg = useMemo(() => renderSvg(computed), [computed]);
  const duration = Math.max(6, ...parsed.scene.timeline.map((item) => item.time + (item.duration ?? 0)));

  return <main className="app-shell">
    <section className="hero">
      <div>
        <p className="eyebrow">FlowMotion MVP</p>
        <h1>Text-to-animation diagrams for software explainers.</h1>
        <p>Write a compact DSL, compile it into a scene graph and timeline, then preview the computed SVG state at any point in time.</p>
      </div>
    </section>
    <section className="workspace">
      <div className="panel editor-panel">
        <div className="panel-header"><strong>DSL</strong><span>{parsed.scene.objects.length} objects · {parsed.scene.relations.length} relations</span></div>
        <textarea value={source} onChange={(event) => setSource(event.target.value)} spellCheck={false} />
        {parsed.diagnostics.length > 0 && <div className="diagnostics">{parsed.diagnostics.map((item) => <p key={item}>{item}</p>)}</div>}
      </div>
      <div className="panel preview-panel">
        <div className="panel-header"><strong>Preview</strong><span>{time.toFixed(1)}s</span></div>
        <div className="preview" dangerouslySetInnerHTML={{ __html: svg }} />
        <input type="range" min="0" max={duration} step="0.1" value={time} onChange={(event) => setTime(Number(event.target.value))} />
      </div>
    </section>
  </main>;
}
