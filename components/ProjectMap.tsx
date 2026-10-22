"use client";
import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, LayerGroup } from "leaflet";
import type { Point } from "@/lib/domain";
type Props = {
  polygon: Point[];
  onChange: (points: Point[]) => void;
  editable: boolean;
};
export default function ProjectMap({ polygon, onChange, editable }: Props) {
  const element = useRef<HTMLDivElement>(null),
    map = useRef<LeafletMap | null>(null),
    layer = useRef<LayerGroup | null>(null),
    draft = useRef<Point[]>([]),
    drawing = useRef(false);
  const [active, setActive] = useState(false),
    [count, setCount] = useState(0),
    [error, setError] = useState("");
  const change = useRef(onChange);
  useEffect(() => {
    change.current = onChange;
  }, [onChange]);
  useEffect(() => {
    let gone = false;
    import("leaflet").then((L) => {
      if (gone || !element.current) return;
      const m = L.map(element.current, { zoomControl: false }).setView(
        [-3.021, -55.031],
        13,
      );
      map.current = m;
      L.control.zoom({ position: "bottomright" }).addTo(m);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      })
        .on("tileerror", () =>
          setError(
            "Basemap tiles unavailable. Polygon coordinates and drawing remain available.",
          ),
        )
        .addTo(m);
      layer.current = L.layerGroup().addTo(m);
      m.on("click", (e) => {
        if (!drawing.current) return;
        if (draft.current.length >= 64) return;
        draft.current.push([
          Math.round(e.latlng.lng * 1e6) / 1e6,
          Math.round(e.latlng.lat * 1e6) / 1e6,
        ]);
        setCount(draft.current.length);
        layer.current?.clearLayers();
        L.polyline(
          draft.current.map((p) => [p[1], p[0]]),
          { color: "#cbf285", weight: 3 },
        ).addTo(layer.current!);
        draft.current.forEach((p) =>
          L.circleMarker([p[1], p[0]], {
            radius: 4,
            color: "#122c24",
            fillColor: "#cbf285",
            fillOpacity: 1,
          }).addTo(layer.current!),
        );
      });
    });
    return () => {
      gone = true;
      map.current?.remove();
      map.current = null;
    };
  }, []);
  useEffect(() => {
    let cancelled = false;
    import("leaflet").then((L) => {
      const update = () => {
        if (cancelled) return;
        if (!map.current || !layer.current) {
          requestAnimationFrame(update);
          return;
        }
        if (active) return;
        layer.current.clearLayers();
        const shape = L.polygon(
          polygon.map((p) => [p[1], p[0]]),
          {
            color: "#335f37",
            weight: 2,
            fillColor: "#a7cb76",
            fillOpacity: 0.4,
          },
        ).addTo(layer.current);
        map.current.fitBounds(shape.getBounds(), {
          padding: [65, 65],
          maxZoom: 14,
        });
      };
      update();
    });
    return () => {
      cancelled = true;
    };
  }, [polygon, active]);
  function finish() {
    if (draft.current.length < 3) return;
    drawing.current = false;
    setActive(false);
    change.current([...draft.current]);
  }
  return (
    <div className="map-wrap">
      <div ref={element} className="map" aria-label="Project polygon map" />
      <div className="map-label">
        <span className="live-dot" /> PROJECT BOUNDARY{" "}
        <small>Basemap ≠ environmental evidence</small>
      </div>
      <div className="map-location">
        {polygon[0][1].toFixed(3)}°, {polygon[0][0].toFixed(3)}°{" "}
        <span>WGS84</span>
      </div>
      <div className="map-tools">
        {editable && !active && (
          <button
            onClick={() => {
              draft.current = [];
              drawing.current = true;
              layer.current?.clearLayers();
              setActive(true);
              setCount(0);
            }}
          >
            ＋ Draw polygon
          </button>
        )}
        {active && (
          <>
            <span>Click map · {count} vertices</span>
            <button disabled={count < 3} onClick={finish}>
              Finish boundary
            </button>
            <button
              onClick={() => {
                drawing.current = false;
                setActive(false);
              }}
            >
              Cancel
            </button>
          </>
        )}
      </div>
      {error && <div className="map-error">{error}</div>}
    </div>
  );
}
