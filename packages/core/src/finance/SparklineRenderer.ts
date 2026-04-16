import type { SparklineOptions, Theme } from '@tradecanvas/commons';

export function renderSparkline(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: SparklineOptions,
  theme: Theme,
): void {
  const { data, mode = 'area', lineWidth = 1.5, showLastPoint = false, showMinMax = false } = options;
  if (data.length < 2 || width <= 0 || height <= 0) return;

  const color = options.color ?? theme.lineColor;
  const fillColor = options.fillColor ?? color;

  const padding = 2;
  const w = width - padding * 2;
  const h = height - padding * 2;

  let min = Infinity;
  let max = -Infinity;
  let minIdx = 0;
  let maxIdx = 0;
  for (let i = 0; i < data.length; i++) {
    if (data[i] < min) { min = data[i]; minIdx = i; }
    if (data[i] > max) { max = data[i]; maxIdx = i; }
  }
  const range = max - min || 1;

  const toX = (i: number): number => padding + (i / (data.length - 1)) * w;
  const toY = (v: number): number => padding + h - ((v - min) / range) * h;

  // Area fill
  if (mode === 'area') {
    const gradient = ctx.createLinearGradient(0, padding, 0, height - padding);
    gradient.addColorStop(0, fillColor + (fillColor.startsWith('#') ? '40' : ''));
    gradient.addColorStop(1, 'transparent');

    ctx.beginPath();
    ctx.moveTo(toX(0), toY(data[0]));
    for (let i = 1; i < data.length; i++) ctx.lineTo(toX(i), toY(data[i]));
    ctx.lineTo(toX(data.length - 1), height - padding);
    ctx.lineTo(toX(0), height - padding);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  // Line
  ctx.beginPath();
  ctx.moveTo(toX(0), toY(data[0]));
  for (let i = 1; i < data.length; i++) ctx.lineTo(toX(i), toY(data[i]));
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Last point dot
  if (showLastPoint) {
    const lastColor = options.lastPointColor ?? color;
    const lx = toX(data.length - 1);
    const ly = toY(data[data.length - 1]);
    ctx.beginPath();
    ctx.arc(lx, ly, 3, 0, Math.PI * 2);
    ctx.fillStyle = lastColor;
    ctx.fill();
  }

  // Min/max dots
  if (showMinMax) {
    const minColor = options.minPointColor ?? theme.candleDown;
    const maxColor = options.maxPointColor ?? theme.candleUp;
    // Min
    ctx.beginPath();
    ctx.arc(toX(minIdx), toY(min), 2.5, 0, Math.PI * 2);
    ctx.fillStyle = minColor;
    ctx.fill();
    // Max
    ctx.beginPath();
    ctx.arc(toX(maxIdx), toY(max), 2.5, 0, Math.PI * 2);
    ctx.fillStyle = maxColor;
    ctx.fill();
  }
}
