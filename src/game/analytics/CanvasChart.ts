/**
 * Canvas Chart Renderer
 * Pure canvas 2D charts with game theme styling (barn colors, wheat text).
 * No external chart library dependency.
 */

const THEME = {
  bg: "#3E2723",
  gridLine: "rgba(255, 248, 225, 0.1)",
  text: "#fef9c3",
  textDim: "rgba(254, 249, 195, 0.5)",
  line: "#b91c1c",
  lineAlt: "#fbbf24",
  bar: "#b91c1c",
  barAlt: "#8D6E63",
  heatLow: "#3E2723",
  heatHigh: "#b91c1c",
  font: "12px monospace",
  titleFont: "bold 14px monospace",
};

interface LineChartData {
  labels: string[];
  datasets: { label: string; data: number[]; color?: string }[];
}

interface BarChartData {
  labels: string[];
  values: number[];
  color?: string;
}

interface HeatMapData {
  width: number;
  height: number;
  data: number[][]; // [y][x] normalized 0-1
  xLabels?: string[];
  yLabels?: string[];
}

function clearCanvas(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.fillStyle = THEME.bg;
  ctx.fillRect(0, 0, width, height);
}

export function drawLineChart(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  data: LineChartData,
  title?: string,
): void {
  clearCanvas(ctx, width, height);

  const padding = { top: title ? 35 : 15, right: 15, bottom: 40, left: 50 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Title
  if (title) {
    ctx.fillStyle = THEME.text;
    ctx.font = THEME.titleFont;
    ctx.textAlign = "center";
    ctx.fillText(title, width / 2, 20);
  }

  // Find data range
  const allValues = data.datasets.flatMap((d) => d.data);
  const minVal = Math.min(0, ...allValues);
  const maxVal = Math.max(1, ...allValues);
  const range = maxVal - minVal || 1;

  // Grid lines
  ctx.strokeStyle = THEME.gridLine;
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (chartH * i) / 4;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(padding.left + chartW, y);
    ctx.stroke();

    ctx.fillStyle = THEME.textDim;
    ctx.font = THEME.font;
    ctx.textAlign = "right";
    const val = maxVal - (range * i) / 4;
    ctx.fillText(Math.round(val).toString(), padding.left - 5, y + 4);
  }

  // X labels
  const step = Math.max(1, Math.floor(data.labels.length / 8));
  ctx.fillStyle = THEME.textDim;
  ctx.textAlign = "center";
  for (let i = 0; i < data.labels.length; i += step) {
    const x = padding.left + (chartW * i) / Math.max(1, data.labels.length - 1);
    ctx.fillText(data.labels[i], x, height - padding.bottom + 15);
  }

  // Draw datasets
  const colors = [THEME.line, THEME.lineAlt, "#4CAF50", "#2196F3"];
  for (let d = 0; d < data.datasets.length; d++) {
    const ds = data.datasets[d];
    const color = ds.color || colors[d % colors.length];
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    for (let i = 0; i < ds.data.length; i++) {
      const x = padding.left + (chartW * i) / Math.max(1, ds.data.length - 1);
      const y = padding.top + chartH - ((ds.data[i] - minVal) / range) * chartH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

export function drawBarChart(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  data: BarChartData,
  title?: string,
): void {
  clearCanvas(ctx, width, height);

  const padding = { top: title ? 35 : 15, right: 15, bottom: 40, left: 50 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  if (title) {
    ctx.fillStyle = THEME.text;
    ctx.font = THEME.titleFont;
    ctx.textAlign = "center";
    ctx.fillText(title, width / 2, 20);
  }

  const maxVal = Math.max(1, ...data.values);
  const barWidth = chartW / data.labels.length * 0.7;
  const gap = chartW / data.labels.length * 0.3;

  for (let i = 0; i < data.values.length; i++) {
    const barH = (data.values[i] / maxVal) * chartH;
    const x = padding.left + i * (barWidth + gap) + gap / 2;
    const y = padding.top + chartH - barH;

    ctx.fillStyle = data.color || THEME.bar;
    ctx.fillRect(x, y, barWidth, barH);

    // Label
    ctx.fillStyle = THEME.textDim;
    ctx.font = THEME.font;
    ctx.textAlign = "center";
    ctx.fillText(data.labels[i], x + barWidth / 2, height - padding.bottom + 15);
  }
}

export function drawHeatMap(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  data: HeatMapData,
  title?: string,
): void {
  clearCanvas(ctx, width, height);

  const padding = { top: title ? 35 : 15, right: 15, bottom: 15, left: 15 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  if (title) {
    ctx.fillStyle = THEME.text;
    ctx.font = THEME.titleFont;
    ctx.textAlign = "center";
    ctx.fillText(title, width / 2, 20);
  }

  const cellW = chartW / data.width;
  const cellH = chartH / data.height;

  for (let y = 0; y < data.height; y++) {
    for (let x = 0; x < data.width; x++) {
      const val = data.data[y]?.[x] ?? 0;
      // Interpolate between low and high colors
      const r = Math.round(62 + val * (185 - 62));
      const g = Math.round(39 + val * (28 - 39));
      const b = Math.round(35 + val * (28 - 35));
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(
        padding.left + x * cellW,
        padding.top + y * cellH,
        cellW,
        cellH,
      );
    }
  }
}
