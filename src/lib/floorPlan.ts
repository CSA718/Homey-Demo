// Deterministic floor-plan generator. Unlike a rendered "concept video" (which
// would need a real image/video model this demo doesn't have), a schematic
// floor plan can honestly be *computed* from the buyer's actual inputs —
// bedroom/bathroom counts, square footage, stories, garage size — so this
// produces a genuine, input-driven layout rather than a generic placeholder.
// It is still an illustrative schematic, not an architectural or engineered
// drawing: room adjacency and proportions are approximated, not designed.

export interface FloorPlanSpecInput {
  bedrooms: string;
  bathrooms: string;
  stories: string;
  garage: string;
  sqft: string;
}

export interface FloorPlanRoom {
  name: string;
  xFt: number;
  yFt: number;
  wFt: number;
  hFt: number;
}

export interface FloorPlanLevel {
  label: string;
  widthFt: number;
  depthFt: number;
  areaSqft: number;
  rooms: FloorPlanRoom[];
  garage?: FloorPlanRoom;
}

export interface FloorPlanResult {
  levels: FloorPlanLevel[];
  totalSqft: number;
  bedrooms: number;
  bathrooms: number;
  garageBays: number;
}

function hashString(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return hash >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function parseStories(value: string): number {
  if (value === "1.5") return 1.5;
  if (value === "3+") return 3;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 2;
}

function parseGarageBays(value: string): number {
  if (value === "none") return 0;
  const n = Number(value);
  return Number.isFinite(n) ? clamp(n, 0, 3) : 0;
}

function floorAreaSplits(stories: number): number[] {
  if (stories <= 1) return [1];
  if (stories === 1.5) return [0.62, 0.38];
  if (stories === 2) return [0.54, 0.46];
  return [0.4, 0.34, 0.26];
}

interface WeightedRoom {
  name: string;
  weight: number;
}

// Alternating slice-and-dice treemap: guarantees the room list exactly tiles
// the floor rectangle with no gaps or overlaps, regardless of how the room
// list was assembled.
function tile(
  rooms: WeightedRoom[],
  x: number,
  y: number,
  w: number,
  h: number,
  horizontal: boolean,
): FloorPlanRoom[] {
  if (rooms.length === 0) return [];
  if (rooms.length === 1) {
    return [{ name: rooms[0].name, xFt: x, yFt: y, wFt: w, hFt: h }];
  }
  const total = rooms.reduce((s, r) => s + r.weight, 0);
  const target = total / 2;
  let cum = 0;
  let splitIdx = 1;
  let bestDiff = Infinity;
  for (let i = 0; i < rooms.length - 1; i++) {
    cum += rooms[i].weight;
    const diff = Math.abs(cum - target);
    if (diff < bestDiff) {
      bestDiff = diff;
      splitIdx = i + 1;
    }
  }
  const left = rooms.slice(0, splitIdx);
  const right = rooms.slice(splitIdx);
  const leftWeight = left.reduce((s, r) => s + r.weight, 0);
  const frac = leftWeight / total;

  if (horizontal) {
    const w1 = w * frac;
    return [
      ...tile(left, x, y, w1, h, !horizontal),
      ...tile(right, x + w1, y, w - w1, h, !horizontal),
    ];
  }
  const h1 = h * frac;
  return [
    ...tile(left, x, y, w, h1, !horizontal),
    ...tile(right, x, y + h1, w, h - h1, !horizontal),
  ];
}

function computeBedsPerFloor(numFloors: number, bedrooms: number): number[] {
  const beds = new Array(numFloors).fill(0);
  if (numFloors === 1) {
    beds[0] = bedrooms;
    return beds;
  }
  let remaining = bedrooms;
  let extraOnGround = 0;
  if (bedrooms >= 5) {
    extraOnGround = 1;
    remaining -= 1;
  }
  const topIdx = numFloors - 1;
  beds[topIdx] = 1; // primary bedroom always tops out the upper floor
  remaining -= 1;
  let idx = topIdx;
  while (remaining > 0) {
    idx--;
    if (idx < 1) idx = topIdx; // only distribute across upper floors, never ground
    beds[idx]++;
    remaining--;
  }
  beds[0] += extraOnGround;
  return beds;
}

function computeBathsPerFloor(numFloors: number, bedsPerFloor: number[], bathPool: number): number[] {
  const baths = new Array(numFloors).fill(0);
  let remaining = bathPool;
  const topIdx = numFloors - 1;
  if (remaining > 0) {
    baths[topIdx] += 1; // primary ensuite (or the only bath, on a single story)
    remaining--;
  }
  for (let i = numFloors - 2; i >= 0 && remaining > 0; i--) {
    if (bedsPerFloor[i] > 0) {
      baths[i] += 1;
      remaining--;
    }
  }
  while (remaining > 0) {
    baths[0] += 1;
    remaining--;
  }
  return baths;
}

export function generateFloorPlan(input: FloorPlanSpecInput): FloorPlanResult {
  const bedrooms = clamp(Math.round(Number(input.bedrooms) || 3), 1, 10);
  const bathrooms = clamp(Number(input.bathrooms) || 2, 1, 10);
  const stories = parseStories(input.stories);
  const garageBays = parseGarageBays(input.garage);
  const totalSqft = clamp(Math.round(Number(input.sqft) || 2400), 600, 12000);

  const splits = floorAreaSplits(stories);
  const numFloors = splits.length;
  const rng = mulberry32(
    hashString(`${bedrooms}|${bathrooms}|${stories}|${garageBays}|${totalSqft}`),
  );

  const bedsPerFloor = computeBedsPerFloor(numFloors, bedrooms);
  const bathPool = Math.floor(bathrooms);
  const hasHalfBath = bathrooms % 1 !== 0;
  const bathsPerFloor = computeBathsPerFloor(numFloors, bedsPerFloor, bathPool);

  const ratio = 1.32 + rng() * 0.3;
  const groundArea = totalSqft * splits[0];
  const groundWidth = Math.round(Math.sqrt(groundArea * ratio));

  const primaryFloorIdx = numFloors - 1; // computeBedsPerFloor/computeBathsPerFloor
  // always seat the primary suite on the top floor (or the only floor).
  let bedroomCounter = 1;
  let halfBathRemaining = hasHalfBath ? 1 : 0;

  const levels: FloorPlanLevel[] = [];
  const floorLabels = numFloors === 1
    ? ["Floor Plan"]
    : numFloors === 2
      ? ["First Floor", "Second Floor"]
      : ["First Floor", "Second Floor", "Third Floor"];

  for (let i = 0; i < numFloors; i++) {
    const isGround = i === 0;
    const floorArea = Math.round(totalSqft * splits[i]);
    const widthFt = groundWidth;
    const depthFt = Math.round(floorArea / widthFt);

    const rooms: WeightedRoom[] = [];
    if (isGround) {
      rooms.push({ name: "Entry", weight: 45 });
      if (numFloors > 1) rooms.push({ name: "Stairs", weight: 35 });
      if (halfBathRemaining > 0) {
        rooms.push({ name: "Half Bath", weight: 30 });
        halfBathRemaining--;
      }
      rooms.push({ name: "Kitchen", weight: 200 });
      rooms.push({ name: "Dining Area", weight: 140 });
      rooms.push({ name: "Living Room", weight: 260 });
      rooms.push({ name: "Mudroom / Laundry", weight: 70 });
    } else {
      rooms.push({ name: "Stairs / Landing", weight: 40 });
    }

    for (let b = 0; b < bedsPerFloor[i]; b++) {
      if (i === primaryFloorIdx && b === 0) {
        rooms.push({ name: "Primary Bedroom", weight: 220 });
      } else {
        bedroomCounter++;
        rooms.push({ name: `Bedroom ${bedroomCounter}`, weight: 130 });
      }
    }

    for (let b = 0; b < bathsPerFloor[i]; b++) {
      if (i === primaryFloorIdx && b === 0) {
        rooms.push({ name: "Primary Bath", weight: 65 });
      } else {
        rooms.push({ name: "Full Bath", weight: 55 });
      }
    }

    if (i === primaryFloorIdx && bedsPerFloor[i] > 0) {
      rooms.push({ name: "Walk-in Closet", weight: 40 });
    }

    // Normalize weights to exactly fill the floor's target area.
    const weightSum = rooms.reduce((s, r) => s + r.weight, 0);
    const scale = floorArea / weightSum;
    const scaledRooms = rooms.map((r) => ({ ...r, weight: r.weight * scale }));

    const tiledRooms = tile(scaledRooms, 0, 0, widthFt, depthFt, widthFt >= depthFt);

    const level: FloorPlanLevel = {
      label: floorLabels[i],
      widthFt,
      depthFt,
      areaSqft: floorArea,
      rooms: tiledRooms,
    };

    if (isGround && garageBays > 0) {
      const garageArea = garageBays * 230;
      const garageDepth = Math.min(depthFt, 24);
      const garageWidth = Math.round(garageArea / garageDepth);
      level.garage = {
        name: `Garage (${garageBays}-car)`,
        xFt: widthFt + 4,
        yFt: depthFt - garageDepth,
        wFt: garageWidth,
        hFt: garageDepth,
      };
    }

    levels.push(level);
  }

  return { levels, totalSqft, bedrooms, bathrooms, garageBays };
}
