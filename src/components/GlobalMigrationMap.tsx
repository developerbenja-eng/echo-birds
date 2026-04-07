'use client';

import { useState, useMemo } from 'react';
import Map, { Marker, Source, Layer } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { MigrationRange } from '@/lib/migration';
import type { Species } from '@/lib/types';
import Link from 'next/link';

const DARK_STYLE = {
  version: 8 as const,
  sources: {
    'carto-dark': {
      type: 'raster' as const,
      tiles: [
        'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
      ],
      tileSize: 256,
      attribution: '&copy; CARTO &middot; &copy; OpenStreetMap',
    },
  },
  layers: [
    {
      id: 'carto-dark-layer',
      type: 'raster' as const,
      source: 'carto-dark',
      minzoom: 0,
      maxzoom: 20,
    },
  ],
};

const MEMPHIS: [number, number] = [-89.9711, 35.1495];

type StatusFilter = 'all' | 'summer-breeder' | 'winter-visitor' | 'migrant-pass-through';

interface MigrationEntry {
  species: Species;
  migration: MigrationRange;
}

function arc(
  start: [number, number],
  end: [number, number],
  steps = 48,
): [number, number][] {
  const coords: [number, number][] = [];
  const lon1 = (start[0] * Math.PI) / 180;
  const lat1 = (start[1] * Math.PI) / 180;
  const lon2 = (end[0] * Math.PI) / 180;
  const lat2 = (end[1] * Math.PI) / 180;
  const d =
    2 *
    Math.asin(
      Math.sqrt(
        Math.sin((lat2 - lat1) / 2) ** 2 +
          Math.cos(lat1) * Math.cos(lat2) * Math.sin((lon2 - lon1) / 2) ** 2,
      ),
    );
  if (d === 0) return [start, end];
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
    const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
    const z = A * Math.sin(lat1) + B * Math.sin(lat2);
    const lat = (Math.atan2(z, Math.sqrt(x * x + y * y)) * 180) / Math.PI;
    const lon = (Math.atan2(y, x) * 180) / Math.PI;
    coords.push([lon, lat]);
  }
  return coords;
}

const STATUS_COLORS: Record<string, string> = {
  'summer-breeder': '#fbbf24',
  'winter-visitor': '#38bdf8',
  'migrant-pass-through': '#a78bfa',
};

export function GlobalMigrationMap({
  entries,
  height = 500,
}: {
  entries: MigrationEntry[];
  height?: number;
}) {
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      filter === 'all'
        ? entries
        : entries.filter((e) => e.species.status === filter),
    [entries, filter],
  );

  const arcData = useMemo(() => {
    const features: GeoJSON.Feature<GeoJSON.LineString>[] = [];
    for (const { species, migration } of filtered) {
      const color = STATUS_COLORS[species.status] ?? '#94a3b8';
      const isHovered = hoveredSlug === species.slug;
      if (migration.wintersAt) {
        features.push({
          type: 'Feature',
          properties: { color, slug: species.slug, opacity: isHovered ? 0.9 : 0.25, width: isHovered ? 3 : 1 },
          geometry: {
            type: 'LineString',
            coordinates: arc(migration.wintersAt, MEMPHIS),
          },
        });
      }
      if (migration.breedsAt && (migration.breedsAt[0] !== MEMPHIS[0] || migration.breedsAt[1] !== MEMPHIS[1])) {
        features.push({
          type: 'Feature',
          properties: { color, slug: species.slug, opacity: isHovered ? 0.9 : 0.25, width: isHovered ? 3 : 1 },
          geometry: {
            type: 'LineString',
            coordinates: arc(MEMPHIS, migration.breedsAt),
          },
        });
      }
    }
    return {
      type: 'FeatureCollection' as const,
      features,
    };
  }, [filtered, hoveredSlug]);

  const endpointMarkers = useMemo(() => {
    if (!hoveredSlug) return null;
    const entry = filtered.find((e) => e.species.slug === hoveredSlug);
    if (!entry) return null;
    return entry;
  }, [filtered, hoveredSlug]);

  const filters: { value: StatusFilter; label: string; color: string }[] = [
    { value: 'all', label: 'All', color: 'text-white' },
    { value: 'summer-breeder', label: 'Summer', color: 'text-amber-300' },
    { value: 'winter-visitor', label: 'Winter', color: 'text-sky-300' },
    { value: 'migrant-pass-through', label: 'Migrants', color: 'text-violet-300' },
  ];

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              filter === f.value
                ? `${f.color} bg-slate-800 ring-1 ring-slate-600`
                : 'text-slate-400 hover:text-slate-200 bg-slate-900/50'
            }`}
          >
            {f.label}
            <span className="ml-1 text-slate-500">
              {f.value === 'all'
                ? entries.length
                : entries.filter((e) => e.species.status === f.value).length}
            </span>
          </button>
        ))}
      </div>

      {/* Map */}
      <div
        className="relative w-full rounded-xl overflow-hidden border border-slate-800"
        style={{ height }}
      >
        <Map
          initialViewState={{
            longitude: -50,
            latitude: 15,
            zoom: 1.8,
          }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          mapStyle={DARK_STYLE as any}
          interactive={true}
          attributionControl={{ compact: true }}
        >
          <Source id="arcs" type="geojson" data={arcData}>
            <Layer
              id="arc-lines"
              type="line"
              paint={{
                'line-color': ['get', 'color'],
                'line-width': ['get', 'width'],
                'line-opacity': ['get', 'opacity'],
              }}
            />
          </Source>

          {/* Memphis marker */}
          <Marker longitude={MEMPHIS[0]} latitude={MEMPHIS[1]} anchor="center">
            <div className="relative flex items-center justify-center">
              <div className="w-5 h-5 rounded-full bg-amber-400 border-2 border-amber-200 shadow-lg shadow-amber-500/50 z-10" />
              <span className="absolute inset-0 rounded-full bg-amber-400/40 animate-ping" />
              <span className="absolute top-6 whitespace-nowrap text-[10px] font-bold text-amber-300 bg-slate-900/80 px-1.5 py-0.5 rounded z-10">
                MEMPHIS
              </span>
            </div>
          </Marker>

          {/* Hovered species endpoints */}
          {endpointMarkers?.migration.wintersAt && (
            <Marker
              longitude={endpointMarkers.migration.wintersAt[0]}
              latitude={endpointMarkers.migration.wintersAt[1]}
              anchor="center"
            >
              <div className="relative flex items-center justify-center">
                <div className="w-4 h-4 rounded-full bg-sky-500 border-2 border-sky-300 shadow-lg shadow-sky-500/40" />
                <span className="absolute top-5 whitespace-nowrap text-[9px] font-bold text-sky-300 bg-slate-900/80 px-1 py-0.5 rounded">
                  {endpointMarkers.migration.wintersIn ?? 'Winter'}
                </span>
              </div>
            </Marker>
          )}

          {endpointMarkers?.migration.breedsAt &&
            (endpointMarkers.migration.breedsAt[0] !== MEMPHIS[0] ||
              endpointMarkers.migration.breedsAt[1] !== MEMPHIS[1]) && (
              <Marker
                longitude={endpointMarkers.migration.breedsAt[0]}
                latitude={endpointMarkers.migration.breedsAt[1]}
                anchor="center"
              >
                <div className="relative flex items-center justify-center">
                  <div className="w-4 h-4 rounded-full bg-emerald-500 border-2 border-emerald-300 shadow-lg shadow-emerald-500/40" />
                  <span className="absolute top-5 whitespace-nowrap text-[9px] font-bold text-emerald-300 bg-slate-900/80 px-1 py-0.5 rounded">
                    {endpointMarkers.migration.breedsIn ?? 'Breeds'}
                  </span>
                </div>
              </Marker>
            )}
        </Map>

        {/* Legend overlay */}
        <div className="absolute bottom-3 left-3 bg-slate-900/90 backdrop-blur-sm rounded-lg px-3 py-2 text-[10px]">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span className="text-slate-400">Memphis</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-0.5 bg-amber-400" />
              <span className="text-slate-400">Summer breeders</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-0.5 bg-sky-400" />
              <span className="text-slate-400">Winter visitors</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-0.5 bg-violet-400" />
              <span className="text-slate-400">Migrants</span>
            </div>
          </div>
        </div>

        <style jsx global>{`
          .maplibregl-ctrl-attrib {
            background: rgba(15, 23, 42, 0.75) !important;
            color: rgb(148, 163, 184) !important;
          }
          .maplibregl-ctrl-attrib a {
            color: rgb(148, 163, 184) !important;
          }
        `}</style>
      </div>

      {/* Species list — hover to highlight on map */}
      <p className="text-xs text-slate-500 italic">
        Hover a bird below to see its route on the map
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
        {filtered
          .sort((a, b) => (b.migration.roundTripMiles ?? 0) - (a.migration.roundTripMiles ?? 0))
          .map(({ species, migration }) => {
            const color = STATUS_COLORS[species.status] ?? '#94a3b8';
            return (
              <Link
                key={species.slug}
                href={`/${species.slug}`}
                onMouseEnter={() => setHoveredSlug(species.slug)}
                onMouseLeave={() => setHoveredSlug(null)}
                className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition-all ${
                  hoveredSlug === species.slug
                    ? 'bg-slate-800 ring-1 ring-slate-600'
                    : 'bg-slate-900/40 hover:bg-slate-800/60'
                }`}
              >
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="text-slate-300 truncate">{species.commonName}</span>
                {migration.roundTripMiles && (
                  <span className="ml-auto text-slate-500 shrink-0">
                    {(migration.roundTripMiles / 1000).toFixed(1)}k
                  </span>
                )}
              </Link>
            );
          })}
      </div>
    </div>
  );
}
