/**
 * Illustrative migration-range data for Memphis migratory species.
 *
 * These are *rough* centroid coordinates for each species' wintering and
 * breeding grounds — enough to draw a conceptual migration arrow on a map.
 * NOT scientifically precise range polygons. For true range data, integrate
 * eBird Status & Trends (see BIRDS-APIS.md).
 *
 * [lng, lat] pairs, GeoJSON convention.
 */

export interface MigrationRange {
  /** Rough centroid of wintering range */
  wintersAt?: [number, number];
  /** Rough centroid of breeding range */
  breedsAt?: [number, number];
  /** Human-readable description */
  wintersIn?: string;
  breedsIn?: string;
  /** Rough distance in miles (for display) */
  roundTripMiles?: number;
}

export const MIGRATION_DATA: Record<string, MigrationRange> = {
  'mississippi-kite': {
    wintersAt: [-60, -20], // central South America (Paraguay/Brazil)
    breedsAt: [-89.97, 35.15], // Memphis (they breed here)
    wintersIn: 'Paraguay, northern Argentina, southern Brazil',
    breedsIn: 'Memphis & the Southern U.S.',
    roundTripMiles: 10000,
  },
  'ruby-throated-hummingbird': {
    wintersAt: [-88, 15], // southern Mexico, Central America
    breedsAt: [-85, 40], // eastern U.S. interior / lower Great Lakes
    wintersIn: 'Southern Mexico & Central America',
    breedsIn: 'Eastern U.S. and southern Canada',
    roundTripMiles: 3500,
  },
  'prothonotary-warbler': {
    wintersAt: [-76, 8], // northern Colombia / Venezuela / Panama mangroves
    breedsAt: [-88, 34], // lower Mississippi Valley
    wintersIn: 'Mangroves of northern South America',
    breedsIn: 'Bottomland forests of the Southeast',
    roundTripMiles: 4500,
  },
  'yellow-billed-cuckoo': {
    wintersAt: [-60, -15], // central-northern South America
    breedsAt: [-85, 38], // eastern U.S.
    wintersIn: 'Central South America',
    breedsIn: 'Eastern & central U.S.',
    roundTripMiles: 7500,
  },
  'indigo-bunting': {
    wintersAt: [-88, 17], // southern Mexico / Caribbean
    breedsAt: [-85, 40], // eastern U.S.
    wintersIn: 'Southern Mexico, Central America, Caribbean',
    breedsIn: 'Eastern U.S. and southern Canada',
    roundTripMiles: 3200,
  },
  'summer-tanager': {
    wintersAt: [-78, 5], // northern South America
    breedsAt: [-90, 35], // Southern U.S.
    wintersIn: 'Northern South America',
    breedsIn: 'Southern U.S. and northern Mexico',
    roundTripMiles: 4800,
  },
  'purple-martin': {
    wintersAt: [-62, -15], // Amazon basin
    breedsAt: [-85, 40], // eastern U.S.
    wintersIn: 'Amazon basin, Brazil',
    breedsIn: 'Eastern U.S. and Canada',
    roundTripMiles: 10000,
  },
  'chimney-swift': {
    wintersAt: [-77, -10], // upper Amazon / Peru
    breedsAt: [-85, 38], // eastern U.S.
    wintersIn: 'Upper Amazon basin, Peru & Ecuador',
    breedsIn: 'Eastern U.S. and southeastern Canada',
    roundTripMiles: 8000,
  },
  'white-throated-sparrow': {
    wintersAt: [-85, 34], // Southeast U.S.
    breedsAt: [-80, 55], // Canadian boreal
    wintersIn: 'Southeastern U.S.',
    breedsIn: 'Canadian boreal forest',
    roundTripMiles: 3000,
  },
  'dark-eyed-junco': {
    wintersAt: [-88, 35], // Southern U.S.
    breedsAt: [-95, 58], // Canadian boreal / Rockies
    wintersIn: 'U.S. (South of breeding range)',
    breedsIn: 'Boreal forest & mountain West',
    roundTripMiles: 3500,
  },
  'american-white-pelican': {
    wintersAt: [-95, 29], // Gulf Coast
    breedsAt: [-103, 49], // prairie-pothole lakes (Dakotas, prairie Canada)
    wintersIn: 'Gulf Coast & lower Mississippi',
    breedsIn: 'Prairie lakes of the northern U.S. & Canada',
    roundTripMiles: 3000,
  },
};

export function getMigrationFor(speciesId: string): MigrationRange | null {
  return MIGRATION_DATA[speciesId] ?? null;
}
