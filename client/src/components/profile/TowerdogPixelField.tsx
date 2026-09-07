import type { CSSProperties } from "react";

type PixelTone = "red" | "blue" | "purple";
type Cell = readonly [column: number, row: number];

interface PixelCluster {
  x: number;
  y: number;
  width: number;
  height: number;
  tone: PixelTone;
  cells: Cell[];
  delay: number;
  duration?: number;
  wave?: boolean;
  depth?: boolean;
}

const backgroundClusters: PixelCluster[] = [
  // Red stays on the left, with connected stepped groups.
  { x: 4, y: 13, width: 4, height: 3, tone: "red", cells: [[0, 0], [1, 0], [2, 0], [1, 1], [1, 2]], delay: 0 },
  { x: 15, y: 25, width: 4, height: 3, tone: "red", cells: [[0, 0], [1, 0], [1, 1], [2, 1], [3, 1]], delay: 2.4 },
  { x: 6, y: 39, width: 3, height: 3, tone: "red", cells: [[0, 1], [1, 1], [1, 0], [2, 0]], delay: 4.8 },
  { x: 20, y: 76, width: 4, height: 3, tone: "red", cells: [[0, 0], [1, 0], [1, 1], [2, 1], [3, 1]], delay: 1.2 },
  { x: 4, y: 86, width: 4, height: 3, tone: "red", cells: [[0, 0], [1, 0], [2, 0], [2, 1], [3, 1]], delay: 6.2 },
  { x: 29, y: 17, width: 3, height: 3, tone: "red", cells: [[0, 0], [0, 1], [1, 1], [2, 1]], delay: 8.4 },

  // Blue stays on the right, mirroring the red clusters.
  { x: 87, y: 12, width: 4, height: 3, tone: "blue", cells: [[1, 0], [2, 0], [2, 1], [1, 1], [0, 1]], delay: 1.1 },
  { x: 76, y: 24, width: 4, height: 3, tone: "blue", cells: [[3, 0], [2, 0], [2, 1], [1, 1], [0, 1]], delay: 3.5 },
  { x: 93, y: 38, width: 3, height: 3, tone: "blue", cells: [[2, 1], [1, 1], [1, 0], [0, 0]], delay: 5.9 },
  { x: 77, y: 76, width: 4, height: 3, tone: "blue", cells: [[3, 0], [2, 0], [2, 1], [1, 1], [0, 1]], delay: 2.3 },
  { x: 90, y: 86, width: 4, height: 3, tone: "blue", cells: [[3, 0], [2, 0], [1, 1], [0, 1], [0, 2]], delay: 7.3 },
  { x: 68, y: 17, width: 3, height: 3, tone: "blue", cells: [[2, 0], [2, 1], [1, 1], [0, 1]], delay: 9.2 },

  // Purple remains limited to the transition zone.
  { x: 43, y: 13, width: 4, height: 3, tone: "purple", cells: [[0, 1], [1, 1], [1, 0], [2, 0], [3, 0]], delay: 4.1 },
  { x: 53, y: 85, width: 4, height: 3, tone: "purple", cells: [[0, 0], [1, 0], [1, 1], [2, 1], [3, 1]], delay: 6.8 },
];

const depthClusters: PixelCluster[] = [
  { x: 2, y: 29, width: 3, height: 2, tone: "red", cells: [[0, 0], [1, 0], [1, 1]], delay: 0, depth: true },
  { x: 25, y: 8, width: 3, height: 2, tone: "red", cells: [[0, 0], [0, 1], [1, 1]], delay: 0, depth: true },
  { x: 12, y: 68, width: 3, height: 2, tone: "red", cells: [[1, 0], [1, 1], [2, 1]], delay: 0, depth: true },
  { x: 34, y: 92, width: 3, height: 2, tone: "red", cells: [[0, 0], [1, 0], [2, 1]], delay: 0, depth: true },
  { x: 94, y: 27, width: 3, height: 2, tone: "blue", cells: [[0, 0], [1, 0], [0, 1]], delay: 0, depth: true },
  { x: 73, y: 8, width: 3, height: 2, tone: "blue", cells: [[0, 0], [1, 0], [1, 1]], delay: 0, depth: true },
  { x: 86, y: 68, width: 3, height: 2, tone: "blue", cells: [[0, 0], [1, 0], [1, 1]], delay: 0, depth: true },
  { x: 64, y: 93, width: 3, height: 2, tone: "blue", cells: [[0, 0], [0, 1], [1, 1]], delay: 0, depth: true },
  { x: 48, y: 32, width: 3, height: 2, tone: "purple", cells: [[0, 0], [1, 0], [1, 1]], delay: 0, depth: true },
  { x: 58, y: 72, width: 3, height: 2, tone: "purple", cells: [[1, 0], [1, 1], [2, 1]], delay: 0, depth: true },
];

const waveClusters: PixelCluster[] = [
  // Each group is a short stepped path; neighboring groups hand off the wave.
  { x: 5, y: 34, width: 4, height: 3, tone: "red", cells: [[0, 0], [1, 0], [1, 1], [2, 1]], delay: 0, duration: 18, wave: true },
  { x: 18, y: 38, width: 4, height: 3, tone: "red", cells: [[0, 1], [1, 1], [1, 0], [2, 0]], delay: 1.8, duration: 18, wave: true },
  { x: 31, y: 42, width: 4, height: 3, tone: "purple", cells: [[0, 0], [1, 0], [1, 1], [2, 1]], delay: 3.6, duration: 18, wave: true },
  { x: 65, y: 55, width: 4, height: 3, tone: "purple", cells: [[2, 0], [1, 0], [1, 1], [0, 1]], delay: 3.9, duration: 18, wave: true },
  { x: 78, y: 51, width: 4, height: 3, tone: "blue", cells: [[2, 1], [1, 1], [1, 0], [0, 0]], delay: 2.1, duration: 18, wave: true },
  { x: 91, y: 47, width: 4, height: 3, tone: "blue", cells: [[3, 1], [2, 1], [2, 0], [1, 0]], delay: 0.3, duration: 18, wave: true },
];

function clusterStyle(cluster: PixelCluster): CSSProperties {
  return {
    left: `${cluster.x}%`,
    top: `${cluster.y}%`,
    gridTemplateColumns: `repeat(${cluster.width}, var(--pixel-cell))`,
    gridTemplateRows: `repeat(${cluster.height}, var(--pixel-cell))`,
  };
}

function pixelStyle(delay: number, duration?: number): CSSProperties {
  return {
    "--pixel-delay": `${delay}s`,
    "--pixel-duration": `${duration ?? 18}s`,
  } as CSSProperties;
}

function PixelClusterView({ cluster }: { cluster: PixelCluster }) {
  return (
    <div
      className={`towerdog-pixel-cluster towerdog-pixel-cluster--${cluster.tone}${cluster.wave ? " towerdog-pixel-cluster--wave" : ""}${cluster.depth ? " towerdog-pixel-cluster--depth" : ""}`}
      style={clusterStyle(cluster)}
      aria-hidden="true"
    >
      {cluster.cells.map(([column, row], index) => (
        <span
          key={`${column}-${row}`}
          className={`towerdog-pixel towerdog-pixel--${cluster.tone}`}
          style={{
            ...pixelStyle(cluster.delay + index * 0.28, cluster.duration),
            gridColumn: column + 1,
            gridRow: row + 1,
          }}
        />
      ))}
    </div>
  );
}

export function TowerdogPixelField() {
  return (
    <>
      <div className="towerdog-pixel-background profile-theme-global-background" aria-hidden="true">
        {backgroundClusters.map((cluster, index) => (
          <PixelClusterView key={`towerdog-background-cluster-${index}`} cluster={cluster} />
        ))}
        <div className="towerdog-pixel-depth-layer" aria-hidden="true">
          {depthClusters.map((cluster, index) => (
            <PixelClusterView key={`towerdog-depth-cluster-${index}`} cluster={cluster} />
          ))}
        </div>
      </div>
      <div className="towerdog-pixel-wave-overlay profile-theme-global-overlay" aria-hidden="true">
        {waveClusters.map((cluster, index) => (
          <PixelClusterView key={`towerdog-wave-cluster-${index}`} cluster={cluster} />
        ))}
      </div>
    </>
  );
}