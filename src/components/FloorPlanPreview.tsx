import { useMemo, useState } from "react";
import { generateFloorPlan, type FloorPlanRoom } from "../lib/floorPlan";
import { GARAGE_OPTIONS } from "../lib/homeSpec";

export interface FloorPlanSpec {
  bedrooms: string;
  bathrooms: string;
  stories: string;
  garage: string;
  style: string;
  notes: string;
  sqft: string;
}

function garageLabel(value: string) {
  return GARAGE_OPTIONS.find((g) => g.value === value)?.label ?? value;
}

function roomColor(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("kitchen")) return "#f0d9a8";
  if (n.includes("living")) return "#c9d9c0";
  if (n.includes("dining")) return "#f0c9a8";
  if (n.includes("primary bedroom")) return "#c3d3e8";
  if (n.includes("bedroom")) return "#d3ddf0";
  if (n.includes("bath")) return "#bfe0dd";
  if (n.includes("closet")) return "#e3ded2";
  if (n.includes("entry")) return "#e8dfc9";
  if (n.includes("stair")) return "#d8d2c4";
  if (n.includes("mudroom") || n.includes("laundry")) return "#dccce0";
  return "#e5e0d3";
}

const MARGIN = 6;

// Rough average glyph width as a fraction of font-size for this font/weight —
// used to shrink labels so they never overflow a narrow room's rectangle.
const CHAR_WIDTH = 0.6;

function fitFontSize(text: string, widthFt: number, maxSize: number, minSize: number) {
  const maxByWidth = (widthFt * 0.9) / (text.length * CHAR_WIDTH);
  return Math.max(minSize, Math.min(maxSize, maxByWidth));
}

function RoomRect({ room }: { room: FloorPlanRoom }) {
  const cx = room.xFt + room.wFt / 2;
  const cy = room.yFt + room.hFt / 2;
  if (room.wFt < 3.5 || room.hFt < 3.5) {
    return (
      <rect
        x={room.xFt}
        y={room.yFt}
        width={room.wFt}
        height={room.hFt}
        fill={roomColor(room.name)}
        stroke="#332e28"
        strokeWidth={0.18}
      />
    );
  }

  const singleLineSize = fitFontSize(room.name, room.wFt, 1.9, 1.05);
  const parts = room.name.includes(" / ") ? room.name.split(" / ") : null;
  const useTwoLines = parts && singleLineSize < 1.35;
  const dimsText = `${Math.round(room.wFt)}' × ${Math.round(room.hFt)}'`;
  const dimsSize = fitFontSize(dimsText, room.wFt, 1.4, 0.9);
  const showDims = room.hFt > (useTwoLines ? 8.5 : 6.5) && dimsSize >= 0.95;

  return (
    <g>
      <rect
        x={room.xFt}
        y={room.yFt}
        width={room.wFt}
        height={room.hFt}
        fill={roomColor(room.name)}
        stroke="#332e28"
        strokeWidth={0.18}
      />
      {useTwoLines ? (
        <>
          <text x={cx} y={cy - 1.7} textAnchor="middle" fontSize={1.7} fontWeight={600} fill="#2c2822">
            {parts![0]}
          </text>
          <text x={cx} y={cy - 0.2} textAnchor="middle" fontSize={1.7} fontWeight={600} fill="#2c2822">
            {parts![1]}
          </text>
        </>
      ) : (
        <text x={cx} y={cy - 0.9} textAnchor="middle" fontSize={singleLineSize} fontWeight={600} fill="#2c2822">
          {room.name}
        </text>
      )}
      {showDims && (
        <text x={cx} y={cy + 1.6} textAnchor="middle" fontSize={dimsSize} fill="#5a5346">
          {dimsText}
        </text>
      )}
    </g>
  );
}

export default function FloorPlanPreview({ spec }: { spec: FloorPlanSpec }) {
  const [levelIdx, setLevelIdx] = useState(0);

  const hasSpec = spec.bedrooms || spec.bathrooms || spec.style;

  const plan = useMemo(
    () =>
      generateFloorPlan({
        bedrooms: spec.bedrooms,
        bathrooms: spec.bathrooms,
        stories: spec.stories,
        garage: spec.garage,
        sqft: spec.sqft,
      }),
    [spec.bedrooms, spec.bathrooms, spec.stories, spec.garage, spec.sqft],
  );

  if (!hasSpec) return null;

  const level = plan.levels[Math.min(levelIdx, plan.levels.length - 1)];
  const garageExtraW = level.garage ? 4 + level.garage.wFt : 0;
  const viewW = level.widthFt + garageExtraW + MARGIN * 2;
  const viewH = level.depthFt + MARGIN * 2;
  const scaleBarFt = level.widthFt > 60 ? 20 : 10;

  return (
    <div className="mt-8 rounded-2xl border border-line bg-paper-raised p-6 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
        Concept Preview
      </p>
      <h2 className="mt-1 font-serif text-xl text-ink">
        An illustrative floor plan for this build
      </h2>

      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <span className="rounded-full bg-sand px-3 py-1 text-ink-soft">
          {plan.totalSqft.toLocaleString()} sq ft
        </span>
        <span className="rounded-full bg-sand px-3 py-1 text-ink-soft">
          {spec.bedrooms} bed
        </span>
        <span className="rounded-full bg-sand px-3 py-1 text-ink-soft">
          {spec.bathrooms} bath
        </span>
        <span className="rounded-full bg-sand px-3 py-1 text-ink-soft">
          {spec.stories} {spec.stories === "1" ? "story" : "stories"}
        </span>
        <span className="rounded-full bg-sand px-3 py-1 text-ink-soft">
          {garageLabel(spec.garage)} garage
        </span>
        <span className="rounded-full bg-sand px-3 py-1 text-ink-soft">{spec.style}</span>
      </div>
      {spec.notes && (
        <p className="mt-3 text-sm italic text-ink-soft">"{spec.notes}"</p>
      )}

      {plan.levels.length > 1 && (
        <div className="mt-6 flex gap-2">
          {plan.levels.map((l, i) => (
            <button
              key={l.label}
              onClick={() => setLevelIdx(i)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                i === levelIdx
                  ? "bg-forest text-paper"
                  : "bg-sand text-ink-soft hover:bg-sand/70"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-paper p-4">
        <svg
          viewBox={`0 0 ${viewW} ${viewH}`}
          className="mx-auto block w-full max-w-2xl"
          style={{ minWidth: 320 }}
        >
          <g transform={`translate(${MARGIN}, ${MARGIN})`}>
            <rect
              x={-0.3}
              y={-0.3}
              width={level.widthFt + 0.6}
              height={level.depthFt + 0.6}
              fill="none"
              stroke="#332e28"
              strokeWidth={0.4}
            />
            {level.rooms.map((room, i) => (
              <RoomRect key={`${room.name}-${i}`} room={room} />
            ))}
            {level.garage && (
              <g>
                <rect
                  x={level.garage.xFt}
                  y={level.garage.yFt}
                  width={level.garage.wFt}
                  height={level.garage.hFt}
                  fill="#dfdcd3"
                  stroke="#332e28"
                  strokeWidth={0.3}
                  strokeDasharray="1 0.8"
                />
                <text
                  x={level.garage.xFt + level.garage.wFt / 2}
                  y={level.garage.yFt + level.garage.hFt / 2 - 0.5}
                  textAnchor="middle"
                  fontSize={1.7}
                  fontWeight={600}
                  fill="#2c2822"
                >
                  {level.garage.name}
                </text>
                <text
                  x={level.garage.xFt + level.garage.wFt / 2}
                  y={level.garage.yFt + level.garage.hFt / 2 + 1.5}
                  textAnchor="middle"
                  fontSize={1.4}
                  fill="#5a5346"
                >
                  {Math.round(level.garage.wFt)}' × {Math.round(level.garage.hFt)}'
                </text>
              </g>
            )}
            {/* scale bar */}
            <g transform={`translate(0, ${level.depthFt + 3})`}>
              <line
                x1={0}
                y1={0}
                x2={scaleBarFt}
                y2={0}
                stroke="#5a5346"
                strokeWidth={0.3}
              />
              <line x1={0} y1={-0.6} x2={0} y2={0.6} stroke="#5a5346" strokeWidth={0.3} />
              <line
                x1={scaleBarFt}
                y1={-0.6}
                x2={scaleBarFt}
                y2={0.6}
                stroke="#5a5346"
                strokeWidth={0.3}
              />
              <text x={scaleBarFt / 2} y={2.4} textAnchor="middle" fontSize={1.4} fill="#5a5346">
                {scaleBarFt} ft
              </text>
            </g>
          </g>
        </svg>
      </div>

      <p className="mt-3 text-xs text-ink-soft">
        This layout is computed from your actual bedroom, bathroom, square
        footage, story, and garage inputs above — it's a real, input-driven
        schematic, not a stock image. It's still illustrative: room
        adjacency and proportions are approximated for concept purposes, not
        designed or engineered. A real floor plan would come from a licensed
        architect or designer.
      </p>
    </div>
  );
}
