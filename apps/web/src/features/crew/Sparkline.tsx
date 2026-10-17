import { AlertTriangle } from 'lucide-react';
import { metrics } from '@somacast/core';
import type { Spark } from '../../data/ground';
import { withUnit } from '../../shared/format';

const W = 280;
const H = 64;
const PAD = 8;

// One metric, 14 days. Single series: 2px line, the latest day marked, the personal "usual"
// (baseline) as a dashed reference. Missing days break the line. Hover a day for its value.
export function Sparkline({
  spark,
  alerting,
}: {
  spark: Spark;
  alerting: boolean;
}) {
  const spec = metrics[spark.metric];
  const values = spark.points.flatMap(p => (p.value === null ? [] : [p.value]));
  const all = spark.usual === null ? values : [...values, spark.usual];
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const span = hi - lo;
  const n = Math.max(1, spark.points.length - 1);
  const x = (i: number) => PAD + (i * (W - 2 * PAD)) / n;
  // A flat series (or a single reading) sits in the middle instead of on the floor.
  const y = (v: number) =>
    span === 0 ? H / 2 : H - PAD - ((v - lo) * (H - 2 * PAD)) / span;

  let d = '';
  let pen = false;
  spark.points.forEach((p, i) => {
    if (p.value === null) {
      pen = false;
      return;
    }
    d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`;
    pen = true;
  });
  const lastIdx = spark.points.length - 1;
  const last = spark.points[lastIdx];
  const slot = (W - 2 * PAD) / n;

  return (
    <figure className={`spark${alerting ? ' spark-alert' : ''}`}>
      <figcaption>
        <span className="spark-label">{spec.label}</span>
        {alerting && (
          <span className="tag-alert">
            <AlertTriangle size={16} aria-hidden="true" /> Alert
          </span>
        )}
      </figcaption>
      <p className="spark-value">
        {spark.latest === null
          ? 'no reading'
          : withUnit(spark.latest, spec.unit)}
        <span className="muted small">
          {' '}
          · usual{' '}
          {spark.usual === null
            ? 'still learning'
            : withUnit(spark.usual, spec.unit, 2)}
        </span>
      </p>
      {values.length === 0 ? (
        <p className="muted small">No readings in the last 14 days.</p>
      ) : (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="spark-svg"
          role="img"
          aria-label={`${spec.label}, last ${spark.points.length} days. ${values.length} days with a reading.`}
        >
          {spark.usual !== null && (
            <line
              className="spark-usual"
              x1={PAD}
              x2={W - PAD}
              y1={y(spark.usual)}
              y2={y(spark.usual)}
            />
          )}
          <path className="spark-line" d={d} />
          {/* a lone reading between gaps would be invisible as a line, so every reading gets a dot */}
          {spark.points.map((p, i) =>
            p.value === null ? null : (
              <circle
                key={p.day}
                className="spark-dot"
                cx={x(i)}
                cy={y(p.value)}
                r={2}
              />
            ),
          )}
          {last?.value != null && (
            <circle
              className="spark-latest"
              cx={x(lastIdx)}
              cy={y(last.value)}
              r={4}
            />
          )}
          {spark.points.map((p, i) => (
            <rect
              key={`hit-${p.day}`}
              className="spark-hit"
              x={x(i) - slot / 2}
              y={0}
              width={slot}
              height={H}
            >
              <title>
                {`Day ${p.day}${p.date ? ` (${p.date})` : ''}: ${
                  p.value === null
                    ? 'no reading received'
                    : withUnit(p.value, spec.unit)
                }`}
              </title>
            </rect>
          ))}
        </svg>
      )}
    </figure>
  );
}
