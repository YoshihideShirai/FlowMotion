import { useEffect, useMemo, useRef, useState } from "react";
import { parseFlowMotion } from "./core/parser/parseFlowMotion";
import { evaluateSceneAt } from "./core/timeline/evaluateSceneAt";
import { renderSvg } from "./core/renderer/svgRenderer";
import { cpuMemorySample } from "./samples/cpuMemory";
import "./styles.css";

export function App() {
  const [source, setSource] = useState(cpuMemorySample);
  const [time, setTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const animationFrame = useRef<number | null>(null);
  const playbackStartedAt = useRef(0);
  const playbackStartTime = useRef(0);
  const parsed = useMemo(() => parseFlowMotion(source), [source]);
  const computed = useMemo(() => evaluateSceneAt(parsed.scene, time), [parsed.scene, time]);
  const svg = useMemo(() => renderSvg(computed), [computed]);
  const duration = Math.max(6, ...parsed.scene.timeline.map((item) => item.time + (item.duration ?? 0)));

  useEffect(() => {
    if (!isPlaying) {
      if (animationFrame.current !== null) cancelAnimationFrame(animationFrame.current);
      animationFrame.current = null;
      return;
    }

    playbackStartedAt.current = performance.now();
    playbackStartTime.current = time >= duration ? 0 : time;
    if (time >= duration) setTime(0);

    const tick = (now: number) => {
      const nextTime = Math.min(duration, playbackStartTime.current + (now - playbackStartedAt.current) / 1000);
      setTime(nextTime);

      if (nextTime >= duration) {
        setIsPlaying(false);
        animationFrame.current = null;
        return;
      }

      animationFrame.current = requestAnimationFrame(tick);
    };

    animationFrame.current = requestAnimationFrame(tick);

    return () => {
      if (animationFrame.current !== null) cancelAnimationFrame(animationFrame.current);
      animationFrame.current = null;
    };
  }, [duration, isPlaying]);

  const handleTimeChange = (nextTime: number) => {
    setTime(nextTime);
    if (isPlaying) {
      playbackStartedAt.current = performance.now();
      playbackStartTime.current = nextTime;
    }
  };

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
        <div className="preview-controls">
          <button className="play-button" type="button" aria-label={isPlaying ? "Pause preview" : "Play preview"} onClick={() => setIsPlaying((current) => !current)}>
            <span className={isPlaying ? "pause-icon" : "play-icon"} aria-hidden="true" />
          </button>
          <input type="range" min="0" max={duration} step="0.1" value={time} onChange={(event) => handleTimeChange(Number(event.target.value))} />
        </div>
      </div>
    </section>
  </main>;
}
