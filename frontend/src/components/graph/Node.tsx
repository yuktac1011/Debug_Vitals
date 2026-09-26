"use client";

/**
 * DRD §3.5 — Boxy node, straight connector lines (schematic/circuit aesthetic).
 * Divergent node: --divergent border + inline mismatch label.
 * Color never alone — divergent also includes the mismatch label text.
 */

export type NodeState = "normal" | "divergent" | "confirmed" | "pending";

export interface GraphNode {
  id: string;
  label: string;
  type: "runtime" | "dependency" | "service" | "test";
  state: NodeState;
  /** The mismatch label shown inline for divergent nodes ("expected 20.x, found 18.x") */
  mismatchLabel?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
}

export interface GraphEdge {
  id: string;
  fromId: string;
  toId: string;
}

const NODE_TYPE_TAG: Record<GraphNode["type"], string> = {
  runtime: "runtime",
  dependency: "dep",
  service: "service",
  test: "test",
};

const STATE_BORDER: Record<NodeState, string> = {
  normal: "stroke-text-dim",
  divergent: "stroke-divergent",
  confirmed: "stroke-confirmed",
  pending: "stroke-pending",
};

const STATE_BG: Record<NodeState, string> = {
  normal: "fill-ink-raised",
  divergent: "fill-divergent/10",
  confirmed: "fill-confirmed/10",
  pending: "fill-pending/10",
};

interface NodeProps {
  node: GraphNode;
}

export function Node({ node }: NodeProps) {
  const w = node.width ?? 140;
  const h = node.height ?? (node.mismatchLabel ? 64 : 44);

  return (
    <g
      transform={`translate(${node.x},${node.y})`}
      role="img"
      aria-label={`${node.label}${node.mismatchLabel ? `, ${node.mismatchLabel}` : ""}`}
    >
      {/* Box */}
      <rect
        width={w}
        height={h}
        rx={0}
        ry={0}
        className={`${STATE_BG[node.state]} ${STATE_BORDER[node.state]}`}
        strokeWidth={node.state === "divergent" ? 2 : 1}
      />

      {/* Type tag */}
      <text
        x={6}
        y={13}
        className="font-mono fill-text-dim"
        style={{ fontSize: 10, fontFamily: "IBM Plex Mono, monospace" }}
      >
        [{NODE_TYPE_TAG[node.type]}]
      </text>

      {/* Label */}
      <text
        x={6}
        y={30}
        className={
          node.state === "divergent" ? "fill-divergent" : "fill-text"
        }
        style={{
          fontSize: 12,
          fontFamily: "IBM Plex Sans, sans-serif",
          fontWeight: 500,
        }}
      >
        {node.label}
      </text>

      {/* Mismatch label — inline, mono, divergent color */}
      {node.mismatchLabel && (
        <text
          x={6}
          y={48}
          className="fill-divergent"
          style={{ fontSize: 10, fontFamily: "IBM Plex Mono, monospace" }}
        >
          {node.mismatchLabel}
        </text>
      )}
    </g>
  );
}
