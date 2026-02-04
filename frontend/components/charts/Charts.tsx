"use client";

import { useMemo } from "react";

// =============== Types ===============

export interface ChartDataPoint {
    label: string;
    value: number;
    color?: string;
    metadata?: Record<string, unknown>;
}

export interface LineChartDataPoint {
    x: string | number;
    y: number;
    label?: string;
}

export interface LineChartSeries {
    name: string;
    data: LineChartDataPoint[];
    color: string;
    strokeWidth?: number;
    dashed?: boolean;
}

// =============== Color Palettes ===============

export const chartColors = {
    primary: ["#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe", "#dbeafe"],
    success: ["#10b981", "#34d399", "#6ee7b7", "#a7f3d0", "#d1fae5"],
    warning: ["#f59e0b", "#fbbf24", "#fcd34d", "#fde68a", "#fef3c7"],
    danger: ["#ef4444", "#f87171", "#fca5a5", "#fecaca", "#fee2e2"],
    purple: ["#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe", "#ede9fe"],
    mixed: ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4"],
};

// =============== Bar Chart ===============

interface BarChartProps {
    data: ChartDataPoint[];
    height?: number;
    horizontal?: boolean;
    showValues?: boolean;
    showLabels?: boolean;
    barColor?: string;
    className?: string;
}

export function BarChart({
    data,
    height = 200,
    horizontal = false,
    showValues = true,
    showLabels = true,
    barColor = "#3b82f6",
    className = "",
}: BarChartProps) {
    const maxValue = Math.max(...data.map((d) => d.value), 1);

    if (horizontal) {
        return (
            <div className={`space-y-3 ${className}`}>
                {data.map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                        {showLabels && (
                            <span className="text-sm text-foreground/60 w-24 truncate">
                                {item.label}
                            </span>
                        )}
                        <div className="flex-1 h-6 bg-foreground/5 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                    width: `${(item.value / maxValue) * 100}%`,
                                    backgroundColor: item.color || barColor,
                                }}
                            />
                        </div>
                        {showValues && (
                            <span className="text-sm font-medium text-foreground w-12 text-right">
                                {item.value}
                            </span>
                        )}
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className={`flex items-end justify-between gap-2 ${className}`} style={{ height }}>
            {data.map((item, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    {showValues && (
                        <span className="text-xs font-medium text-foreground/70">
                            {item.value}
                        </span>
                    )}
                    <div
                        className="w-full rounded-t-lg transition-all duration-500 hover:opacity-80"
                        style={{
                            height: `${(item.value / maxValue) * 100}%`,
                            backgroundColor: item.color || barColor,
                            minHeight: 4,
                        }}
                    />
                    {showLabels && (
                        <span className="text-xs text-foreground/50 truncate w-full text-center">
                            {item.label}
                        </span>
                    )}
                </div>
            ))}
        </div>
    );
}

// =============== Line Chart ===============

interface LineChartProps {
    series: LineChartSeries[];
    height?: number;
    showGrid?: boolean;
    showDots?: boolean;
    showArea?: boolean;
    showLegend?: boolean;
    className?: string;
}

export function LineChart({
    series,
    height = 200,
    showGrid = true,
    showDots = true,
    showArea = false,
    showLegend = true,
    className = "",
}: LineChartProps) {
    const { allPoints, xLabels, yMax, yMin } = useMemo(() => {
        const points = series.flatMap((s) => s.data);
        const yValues = points.map((p) => p.y);
        return {
            allPoints: points,
            xLabels: [...new Set(points.map((p) => String(p.x)))],
            yMax: Math.max(...yValues) * 1.1,
            yMin: Math.min(0, ...yValues),
        };
    }, [series]);

    const width = 100;
    const chartHeight = height - 40;
    const xStep = width / (xLabels.length - 1 || 1);

    const getY = (value: number) => {
        const range = yMax - yMin;
        return chartHeight - ((value - yMin) / range) * chartHeight;
    };

    const getX = (x: string | number) => {
        const index = xLabels.indexOf(String(x));
        return index * xStep;
    };

    return (
        <div className={className}>
            <svg
                viewBox={`0 0 ${width} ${height}`}
                className="w-full"
                preserveAspectRatio="none"
            >
                {/* Grid lines */}
                {showGrid && (
                    <g className="text-foreground/10">
                        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
                            <line
                                key={ratio}
                                x1="0"
                                y1={ratio * chartHeight}
                                x2={width}
                                y2={ratio * chartHeight}
                                stroke="currentColor"
                                strokeDasharray="2,2"
                            />
                        ))}
                    </g>
                )}

                {/* Lines and areas */}
                {series.map((s, si) => {
                    const pathData = s.data
                        .map((p, i) => `${i === 0 ? "M" : "L"} ${getX(p.x)} ${getY(p.y)}`)
                        .join(" ");

                    const areaData = `${pathData} L ${getX(s.data[s.data.length - 1]?.x)} ${chartHeight} L ${getX(s.data[0]?.x)} ${chartHeight} Z`;

                    return (
                        <g key={si}>
                            {/* Area fill */}
                            {showArea && (
                                <path
                                    d={areaData}
                                    fill={s.color}
                                    fillOpacity={0.1}
                                />
                            )}

                            {/* Line */}
                            <path
                                d={pathData}
                                fill="none"
                                stroke={s.color}
                                strokeWidth={s.strokeWidth || 2}
                                strokeDasharray={s.dashed ? "4,4" : undefined}
                                vectorEffect="non-scaling-stroke"
                            />

                            {/* Dots */}
                            {showDots &&
                                s.data.map((p, i) => (
                                    <circle
                                        key={i}
                                        cx={getX(p.x)}
                                        cy={getY(p.y)}
                                        r="3"
                                        fill={s.color}
                                        className="hover:r-4 transition-all"
                                    />
                                ))}
                        </g>
                    );
                })}

                {/* X-axis labels */}
                {xLabels.map((label, i) => (
                    <text
                        key={i}
                        x={i * xStep}
                        y={height - 5}
                        textAnchor="middle"
                        className="text-[8px] fill-foreground/50"
                    >
                        {label}
                    </text>
                ))}
            </svg>

            {/* Legend */}
            {showLegend && series.length > 1 && (
                <div className="flex items-center justify-center gap-4 mt-2">
                    {series.map((s, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                            <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: s.color }}
                            />
                            <span className="text-xs text-foreground/60">{s.name}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// =============== Donut/Pie Chart ===============

interface DonutChartProps {
    data: ChartDataPoint[];
    size?: number;
    thickness?: number;
    showLabels?: boolean;
    showLegend?: boolean;
    centerLabel?: string;
    centerValue?: string | number;
    className?: string;
}

export function DonutChart({
    data,
    size = 160,
    thickness = 20,
    showLabels = false,
    showLegend = true,
    centerLabel,
    centerValue,
    className = "",
}: DonutChartProps) {
    const total = data.reduce((sum, d) => sum + d.value, 0);
    const radius = (size - thickness) / 2;
    const circumference = 2 * Math.PI * radius;

    let offset = 0;

    return (
        <div className={`flex items-center gap-6 ${className}`}>
            <div className="relative" style={{ width: size, height: size }}>
                <svg width={size} height={size} className="-rotate-90">
                    {data.map((item, i) => {
                        const percentage = item.value / total;
                        const strokeDasharray = `${percentage * circumference} ${circumference}`;
                        const strokeDashoffset = -offset;
                        offset += percentage * circumference;

                        return (
                            <circle
                                key={i}
                                cx={size / 2}
                                cy={size / 2}
                                r={radius}
                                fill="none"
                                stroke={item.color || chartColors.mixed[i % chartColors.mixed.length]}
                                strokeWidth={thickness}
                                strokeDasharray={strokeDasharray}
                                strokeDashoffset={strokeDashoffset}
                                className="transition-all duration-500"
                            />
                        );
                    })}
                </svg>

                {/* Center text */}
                {(centerLabel || centerValue) && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        {centerValue && (
                            <span className="text-2xl font-bold text-foreground">
                                {centerValue}
                            </span>
                        )}
                        {centerLabel && (
                            <span className="text-xs text-foreground/50">{centerLabel}</span>
                        )}
                    </div>
                )}
            </div>

            {/* Legend */}
            {showLegend && (
                <div className="space-y-2">
                    {data.map((item, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <div
                                className="w-3 h-3 rounded-full"
                                style={{
                                    backgroundColor:
                                        item.color || chartColors.mixed[i % chartColors.mixed.length],
                                }}
                            />
                            <span className="text-sm text-foreground/70">{item.label}</span>
                            <span className="text-sm font-medium text-foreground ml-auto">
                                {item.value}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// =============== Progress Ring ===============

interface ProgressRingProps {
    value: number;
    max?: number;
    size?: number;
    thickness?: number;
    color?: string;
    trackColor?: string;
    showValue?: boolean;
    label?: string;
    className?: string;
}

export function ProgressRing({
    value,
    max = 100,
    size = 80,
    thickness = 8,
    color = "#3b82f6",
    trackColor = "rgba(255,255,255,0.1)",
    showValue = true,
    label,
    className = "",
}: ProgressRingProps) {
    const percentage = Math.min(value / max, 1);
    const radius = (size - thickness) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference * (1 - percentage);

    return (
        <div className={`relative inline-flex items-center justify-center ${className}`}>
            <svg width={size} height={size} className="-rotate-90">
                {/* Track */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={trackColor}
                    strokeWidth={thickness}
                />
                {/* Progress */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={thickness}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                />
            </svg>

            {showValue && (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold text-foreground">
                        {Math.round(percentage * 100)}%
                    </span>
                    {label && <span className="text-[10px] text-foreground/50">{label}</span>}
                </div>
            )}
        </div>
    );
}

// =============== Sparkline ===============

interface SparklineProps {
    data: number[];
    width?: number;
    height?: number;
    color?: string;
    showArea?: boolean;
    className?: string;
}

export function Sparkline({
    data,
    width = 100,
    height = 30,
    color = "#3b82f6",
    showArea = true,
    className = "",
}: SparklineProps) {
    if (data.length < 2) return null;

    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;

    const points = data.map((value, i) => ({
        x: (i / (data.length - 1)) * width,
        y: height - ((value - min) / range) * height,
    }));

    const pathData = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    const areaData = `${pathData} L ${width} ${height} L 0 ${height} Z`;

    return (
        <svg width={width} height={height} className={className}>
            {showArea && (
                <path d={areaData} fill={color} fillOpacity={0.1} />
            )}
            <path
                d={pathData}
                fill="none"
                stroke={color}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

// =============== Stacked Bar Chart ===============

interface StackedBarChartProps {
    data: { label: string; values: ChartDataPoint[] }[];
    height?: number;
    showLabels?: boolean;
    showLegend?: boolean;
    className?: string;
}

export function StackedBarChart({
    data,
    height = 200,
    showLabels = true,
    showLegend = true,
    className = "",
}: StackedBarChartProps) {
    const maxTotal = Math.max(...data.map((d) => d.values.reduce((sum, v) => sum + v.value, 0)));
    const categories = data[0]?.values.map((v) => v.label) || [];

    return (
        <div className={className}>
            <div className="flex items-end justify-between gap-2" style={{ height }}>
                {data.map((bar, i) => {
                    const total = bar.values.reduce((sum, v) => sum + v.value, 0);
                    const barHeight = (total / maxTotal) * 100;

                    return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                            <div
                                className="w-full flex flex-col-reverse rounded-t-lg overflow-hidden"
                                style={{ height: `${barHeight}%` }}
                            >
                                {bar.values.map((segment, j) => (
                                    <div
                                        key={j}
                                        style={{
                                            height: `${(segment.value / total) * 100}%`,
                                            backgroundColor:
                                                segment.color || chartColors.mixed[j % chartColors.mixed.length],
                                        }}
                                        className="transition-all duration-500"
                                    />
                                ))}
                            </div>
                            {showLabels && (
                                <span className="text-xs text-foreground/50 truncate w-full text-center">
                                    {bar.label}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>

            {showLegend && (
                <div className="flex items-center justify-center gap-4 mt-4">
                    {categories.map((cat, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                            <div
                                className="w-3 h-3 rounded"
                                style={{ backgroundColor: chartColors.mixed[i % chartColors.mixed.length] }}
                            />
                            <span className="text-xs text-foreground/60">{cat}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// =============== Gauge Chart ===============

interface GaugeChartProps {
    value: number;
    min?: number;
    max?: number;
    thresholds?: { value: number; color: string }[];
    size?: number;
    label?: string;
    unit?: string;
    className?: string;
}

export function GaugeChart({
    value,
    min = 0,
    max = 100,
    thresholds = [
        { value: 33, color: "#ef4444" },
        { value: 66, color: "#f59e0b" },
        { value: 100, color: "#10b981" },
    ],
    size = 160,
    label,
    unit = "%",
    className = "",
}: GaugeChartProps) {
    const percentage = Math.min(Math.max((value - min) / (max - min), 0), 1);
    const angle = percentage * 180 - 90; // -90 to 90 degrees
    const radius = size / 2 - 10;

    // Find current threshold color
    const currentColor = thresholds.reduce(
        (color, t) => (value <= t.value ? color : t.color),
        thresholds[0]?.color || "#3b82f6"
    );

    return (
        <div className={`relative ${className}`} style={{ width: size, height: size / 2 + 20 }}>
            <svg width={size} height={size / 2 + 10} className="overflow-visible">
                {/* Background arc */}
                <path
                    d={`M 10 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 10} ${size / 2}`}
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth={12}
                    strokeLinecap="round"
                />

                {/* Value arc */}
                <path
                    d={`M 10 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 10} ${size / 2}`}
                    fill="none"
                    stroke={currentColor}
                    strokeWidth={12}
                    strokeLinecap="round"
                    strokeDasharray={`${percentage * Math.PI * radius} ${Math.PI * radius}`}
                />

                {/* Needle */}
                <g transform={`translate(${size / 2}, ${size / 2})`}>
                    <line
                        x1="0"
                        y1="0"
                        x2="0"
                        y2={-radius + 15}
                        stroke="currentColor"
                        strokeWidth={3}
                        strokeLinecap="round"
                        className="text-foreground origin-bottom"
                        style={{ transform: `rotate(${angle}deg)` }}
                    />
                    <circle r="6" fill="currentColor" className="text-foreground" />
                </g>
            </svg>

            {/* Value label */}
            <div
                className="absolute inset-x-0 flex flex-col items-center"
                style={{ top: size / 2 - 10 }}
            >
                <span className="text-2xl font-bold text-foreground">
                    {value}
                    <span className="text-sm font-normal text-foreground/50">{unit}</span>
                </span>
                {label && <span className="text-xs text-foreground/50">{label}</span>}
            </div>
        </div>
    );
}
