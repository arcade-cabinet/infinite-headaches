/**
 * Stats Modal - Local analytics dashboard with tabs for
 * Overview, History, Charts, and Heat Map.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useResponsiveScale } from "../hooks/useResponsiveScale";
import { GameButton } from "./GameButton";
import {
  getSessionHistory,
  getLifetimeStats,
  exportStatsAsJSON,
  type SessionRecord,
  type LifetimeStats,
} from "../analytics/SessionLog";
import { drawLineChart, drawBarChart, drawHeatMap } from "../analytics/CanvasChart";

interface StatsModalProps {
  onClose: () => void;
}

type StatsTab = "overview" | "history" | "charts" | "heatmap";

const TAB_LABELS: Record<StatsTab, string> = {
  overview: "Overview",
  history: "History",
  charts: "Charts",
  heatmap: "Heat Map",
};

export function StatsModal({ onClose }: StatsModalProps) {
  const { fontSize, spacing } = useResponsiveScale();
  const [activeTab, setActiveTab] = useState<StatsTab>("overview");
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [stats, setStats] = useState<LifetimeStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [s, st] = await Promise.all([getSessionHistory(), getLifetimeStats()]);
      setSessions(s);
      setStats(st);
      setLoading(false);
    })();
  }, []);

  const handleExport = useCallback(() => {
    if (!stats) return;
    const json = exportStatsAsJSON(sessions, stats);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `homestead-headaches-stats-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [sessions, stats]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.8)" }}
    >
      <div
        className="relative rounded-2xl border-4 border-[#6b5a3a] overflow-hidden"
        style={{
          backgroundColor: "#3E2723",
          width: "min(95vw, 600px)",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#6b5a3a]">
          <h2 className="game-font text-[#fef9c3]" style={{ fontSize: fontSize.md }}>
            Stats
          </h2>
          <button
            onClick={onClose}
            className="game-font text-[#fef9c3] hover:text-white text-2xl leading-none cursor-pointer"
            aria-label="Close stats"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#6b5a3a]">
          {(Object.keys(TAB_LABELS) as StatsTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 game-font text-sm cursor-pointer transition-colors ${
                activeTab === tab
                  ? "text-[#fef9c3] bg-[#554730]"
                  : "text-[#a89070] hover:text-[#fef9c3]"
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4" style={{ minHeight: 200 }}>
          {loading ? (
            <p className="game-font text-[#fef9c3] text-center" style={{ fontSize: fontSize.sm }}>
              Loading...
            </p>
          ) : activeTab === "overview" ? (
            <OverviewTab stats={stats!} fontSize={fontSize} />
          ) : activeTab === "history" ? (
            <HistoryTab sessions={sessions} fontSize={fontSize} />
          ) : activeTab === "charts" ? (
            <ChartsTab sessions={sessions} />
          ) : (
            <HeatMapTab sessions={sessions} />
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-center gap-3 p-4 border-t border-[#6b5a3a]">
          <GameButton size="sm" variant="secondary" onClick={handleExport}>
            Export JSON
          </GameButton>
          <GameButton size="sm" onClick={onClose}>
            Close
          </GameButton>
        </div>
      </div>
    </div>
  );
}

function OverviewTab({ stats, fontSize }: { stats: LifetimeStats; fontSize: any }) {
  const rows = [
    ["Games Played", stats.totalGames.toLocaleString()],
    ["Total Score", stats.totalScore.toLocaleString()],
    ["Best Score", stats.bestScore.toLocaleString()],
    ["Best Level", stats.bestLevel.toString()],
    ["Best Combo", stats.bestCombo.toString()],
    ["Catch Rate", `${(stats.catchRate * 100).toFixed(1)}%`],
    ["Avg Score", stats.averageScore.toLocaleString()],
    ["Play Time", formatDuration(stats.totalPlayTime)],
  ];

  return (
    <div className="space-y-2">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between">
          <span className="game-font text-[#a89070]" style={{ fontSize: fontSize.xs }}>
            {label}
          </span>
          <span className="game-font text-[#fef9c3]" style={{ fontSize: fontSize.xs }}>
            {value}
          </span>
        </div>
      ))}
    </div>
  );
}

function HistoryTab({ sessions, fontSize }: { sessions: SessionRecord[]; fontSize: any }) {
  const reversed = [...sessions].reverse().slice(0, 50);

  if (reversed.length === 0) {
    return (
      <p className="game-font text-[#a89070] text-center" style={{ fontSize: fontSize.sm }}>
        No sessions recorded yet. Play a game!
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {reversed.map((s) => (
        <div
          key={s.id}
          className="flex justify-between items-center border-b border-[#554730] pb-1"
        >
          <div>
            <div className="game-font text-[#fef9c3]" style={{ fontSize: fontSize.xs }}>
              {s.score.toLocaleString()} pts — Lv.{s.levelReached}
            </div>
            <div className="game-font text-[#a89070]" style={{ fontSize: "10px" }}>
              {new Date(s.date).toLocaleDateString()} · {formatDuration(s.duration)}
            </div>
          </div>
          <div className="game-font text-[#a89070]" style={{ fontSize: "10px" }}>
            {s.catches}c/{s.misses}m
          </div>
        </div>
      ))}
    </div>
  );
}

function ChartsTab({ sessions }: { sessions: SessionRecord[] }) {
  const scoreCanvasRef = useRef<HTMLCanvasElement>(null);
  const levelCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (sessions.length === 0) return;

    const recent = sessions.slice(-30);

    if (scoreCanvasRef.current) {
      const ctx = scoreCanvasRef.current.getContext("2d");
      if (ctx) {
        drawLineChart(ctx, 560, 200, {
          labels: recent.map((_, i) => (i + 1).toString()),
          datasets: [{ label: "Score", data: recent.map((s) => s.score) }],
        }, "Score Trend (Last 30)");
      }
    }

    if (levelCanvasRef.current) {
      const ctx = levelCanvasRef.current.getContext("2d");
      if (ctx) {
        // Level distribution as bar chart
        const levelCounts: Record<number, number> = {};
        for (const s of sessions) {
          levelCounts[s.levelReached] = (levelCounts[s.levelReached] || 0) + 1;
        }
        const levels = Object.keys(levelCounts)
          .map(Number)
          .sort((a, b) => a - b);
        drawBarChart(ctx, 560, 200, {
          labels: levels.map(String),
          values: levels.map((l) => levelCounts[l]),
        }, "Level Distribution");
      }
    }
  }, [sessions]);

  if (sessions.length === 0) {
    return <p className="game-font text-[#a89070] text-center text-sm">No data yet.</p>;
  }

  return (
    <div className="space-y-4">
      <canvas ref={scoreCanvasRef} width={560} height={200} className="w-full rounded" />
      <canvas ref={levelCanvasRef} width={560} height={200} className="w-full rounded" />
    </div>
  );
}

function HeatMapTab({ sessions }: { sessions: SessionRecord[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (sessions.length === 0 || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    // Build heat map from catch/miss positions
    // Positions are normalized x-values. We'll bucket into 20 columns, 2 rows (catch/miss)
    const cols = 20;
    const catchBuckets = new Array(cols).fill(0);
    const missBuckets = new Array(cols).fill(0);

    for (const s of sessions) {
      for (const x of s.catchPositions) {
        const bucket = Math.min(cols - 1, Math.max(0, Math.floor(((x + 8) / 16) * cols)));
        catchBuckets[bucket]++;
      }
      for (const x of s.missPositions) {
        const bucket = Math.min(cols - 1, Math.max(0, Math.floor(((x + 8) / 16) * cols)));
        missBuckets[bucket]++;
      }
    }

    const maxVal = Math.max(1, ...catchBuckets, ...missBuckets);
    const data = [
      catchBuckets.map((v) => v / maxVal),
      missBuckets.map((v) => v / maxVal),
    ];

    drawHeatMap(ctx, 560, 150, {
      width: cols,
      height: 2,
      data,
    }, "Catch (top) vs Miss (bottom) Positions");
  }, [sessions]);

  if (sessions.length === 0) {
    return <p className="game-font text-[#a89070] text-center text-sm">No data yet.</p>;
  }

  return <canvas ref={canvasRef} width={560} height={150} className="w-full rounded" />;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}
