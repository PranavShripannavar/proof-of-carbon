import type { Point } from "./domain";
export const GRID = 10_000; // microdegrees = 0.01 degrees
export const MAX_CELLS = 64;
const cross = (a: Point, b: Point, c: Point) =>
  (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
const on = (a: Point, b: Point, p: Point) =>
  cross(a, b, p) === 0 &&
  p[0] >= Math.min(a[0], b[0]) &&
  p[0] <= Math.max(a[0], b[0]) &&
  p[1] >= Math.min(a[1], b[1]) &&
  p[1] <= Math.max(a[1], b[1]);
export function intersects(a: Point, b: Point, c: Point, d: Point) {
  const x = cross(a, b, c),
    y = cross(a, b, d),
    z = cross(c, d, a),
    w = cross(c, d, b);
  return (
    (((x > 0 && y < 0) || (x < 0 && y > 0)) &&
      ((z > 0 && w < 0) || (z < 0 && w > 0))) ||
    on(a, b, c) ||
    on(a, b, d) ||
    on(c, d, a) ||
    on(c, d, b)
  );
}
export function inside(p: Point, ring: Point[]) {
  let yes = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[j],
      b = ring[i];
    if (on(a, b, p)) return true;
    if (
      a[1] > p[1] !== b[1] > p[1] &&
      p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]
    )
      yes = !yes;
  }
  return yes;
}
export function normalizePolygon(points: Point[]): Point[] {
  if (!Array.isArray(points) || points.length < 3 || points.length > 65)
    throw Error("Use a single polygon with 3–64 vertices, without holes.");
  let p: Point[] = points.map((a) => {
    if (
      !Array.isArray(a) ||
      a.length !== 2 ||
      !a.every(Number.isFinite) ||
      Math.abs(a[0]) >= 180 ||
      Math.abs(a[1]) > 80
    )
      throw Error(
        "Coordinates must be finite, longitude inside ±180°, latitude inside ±80°.",
      );
    return [Math.round(a[0] * 1e6), Math.round(a[1] * 1e6)];
  });
  if (p[0][0] === p.at(-1)![0] && p[0][1] === p.at(-1)![1]) p.pop();
  if (
    p.length < 3 ||
    p.length > 64 ||
    new Set(p.map((a) => a.join(","))).size !== p.length
  )
    throw Error("Repeated or collapsed polygon vertices.");
  const xs = p.map((a) => a[0]),
    ys = p.map((a) => a[1]);
  if (
    Math.max(...xs) - Math.min(...xs) > 150_000 ||
    Math.max(...ys) - Math.min(...ys) > 150_000
  )
    throw Error("Polygon extent exceeds 0.15°; use a small project area.");
  for (let i = 0; i < p.length; i++)
    for (let j = i + 1; j < p.length; j++) {
      if (j === i + 1 || (i === 0 && j === p.length - 1)) continue;
      if (intersects(p[i], p[(i + 1) % p.length], p[j], p[(j + 1) % p.length]))
        throw Error("Polygon self-intersects or touches itself.");
    }
  for (let i = 0; i < p.length; i++)
    if (
      cross(p[(i + p.length - 1) % p.length], p[i], p[(i + 1) % p.length]) === 0
    )
      throw Error("Remove collinear vertices.");
  // Translate to the first vertex to keep arithmetic exact within the extent bound.
  const signed = p.reduce(
    (s, a, i) => s + cross(p[0], a, p[(i + 1) % p.length]),
    0,
  );
  const lat = p.reduce((s, a) => s + a[1], 0) / p.length / 1e6;
  const area =
    (Math.abs(signed) / 2 / 1e12) *
    111_320 ** 2 *
    Math.cos((lat * Math.PI) / 180);
  if (area < 100 || area > 25_000_000)
    throw Error("Project area must be between 100 m² and 25 km².");
  if (signed < 0) p = p.reverse();
  const first = p.reduce(
    (best, a, i) =>
      a[0] < p[best][0] || (a[0] === p[best][0] && a[1] < p[best][1])
        ? i
        : best,
    0,
  );
  return [...p.slice(first), ...p.slice(0, first)];
}
export function polygonCells(p: Point[]): number[] {
  const xs = p.map((a) => a[0] + 180e6),
    ys = p.map((a) => a[1] + 90e6);
  const minX =
      Math.floor(Math.min(...xs) / GRID) -
      (Math.min(...xs) % GRID === 0 ? 1 : 0),
    maxX = Math.floor(Math.max(...xs) / GRID);
  const minY =
      Math.floor(Math.min(...ys) / GRID) -
      (Math.min(...ys) % GRID === 0 ? 1 : 0),
    maxY = Math.floor(Math.max(...ys) / GRID);
  if ((maxX - minX + 1) * (maxY - minY + 1) > 289)
    throw Error("Bounding box too large.");
  const result: number[] = [];
  for (let y = minY; y <= maxY; y++)
    for (let x = minX; x <= maxX; x++) {
      const a = x * GRID - 180e6,
        b = y * GRID - 90e6;
      const box: Point[] = [
        [a, b],
        [a + GRID, b],
        [a + GRID, b + GRID],
        [a, b + GRID],
      ];
      if (
        p.some(
          (q) => q[0] >= a && q[0] <= a + GRID && q[1] >= b && q[1] <= b + GRID,
        ) ||
        box.some((q) => inside(q, p)) ||
        p.some((q, i) =>
          box.some((r, j) =>
            intersects(q, p[(i + 1) % p.length], r, box[(j + 1) % 4]),
          ),
        )
      )
        result.push(y * 36000 + x + 1);
    }
  if (result.length > MAX_CELLS)
    throw Error(
      "Polygon touches more than 64 cells. Choose a smaller polygon.",
    );
  return result.sort((a, b) => a - b);
}
