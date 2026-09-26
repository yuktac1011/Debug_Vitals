"use client";

import { Node, type GraphNode, type GraphEdge } from "./Node";

/**
 * DRD §3.5 / §4.4 — schematic node graph.
 * Straight connector lines, boxy nodes, divergent nodes labeled with mismatch.
 * Responsive: horizontal scroll inside its container rather than breaking layout.
 */

interface DependencyMapProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  width?: number;
  height?: number;
}

export function DependencyMap({
  nodes,
  edges,
  width = 1100,
  height = 500,
}: DependencyMapProps) {
  /** Find the center-bottom of a node for edge routing */
  function nodeAnchor(
    nodeId: string,
    side: "right" | "left" | "bottom" | "top"
  ) {
    const n = nodes.find((n) => n.id === nodeId);
    if (!n) return { x: 0, y: 0 };
    const w = n.width ?? 140;
    const h = n.height ?? 44;
    switch (side) {
      case "right":
        return { x: n.x + w, y: n.y + h / 2 };
      case "left":
        return { x: n.x, y: n.y + h / 2 };
      case "bottom":
        return { x: n.x + w / 2, y: n.y + h };
      case "top":
        return { x: n.x + w / 2, y: n.y };
    }
  }

  return (
    <div
      className="overflow-x-auto"
      role="img"
      aria-label="Dependency and environment map"
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="block"
        style={{ minWidth: width }}
      >
        {/* Edges — straight lines, text-dim color */}
        <g>
          {edges.map((edge) => {
            const from = nodeAnchor(edge.fromId, "right");
            const to = nodeAnchor(edge.toId, "left");
            return (
              <line
                key={edge.id}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                className="stroke-text-dim"
                strokeWidth={1}
                strokeDasharray="4 3"
              />
            );
          })}
        </g>

        {/* Nodes */}
        <g>
          {nodes.map((node) => (
            <Node key={node.id} node={node} />
          ))}
        </g>
      </svg>
    </div>
  );
}
