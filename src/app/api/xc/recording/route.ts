import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxies the Xeno-canto API to fetch a single high-quality recording URL
 * for a given species + call type.
 *
 * Usage:
 *   GET /api/xc/recording?species=Cardinalis+cardinalis&type=song
 *   GET /api/xc/recording?species=Cardinalis+cardinalis&type=call
 *
 * Uses the public v2 API (no key required). If XENO_CANTO_KEY is set,
 * falls back to v3 for potentially better coverage.
 *
 * Returns: { url, length, recordist, license, sonogramUrl, source }
 */

export const runtime = 'edge';

interface XCRecordingV2 {
  id: string;
  gen: string;
  sp: string;
  en: string;
  cnt: string;
  loc: string;
  type: string;
  q: string;
  length: string;
  file: string;
  'file-name': string;
  sono?: { small: string; med: string; large: string; full: string };
  lic: string;
  rec: string;
  url?: string;
}

interface XCResponseV2 {
  numRecordings: string;
  numSpecies: string;
  page: number;
  numPages: number;
  recordings: XCRecordingV2[];
}

function normalizeUrl(u: string): string {
  if (!u) return u;
  if (u.startsWith('//')) return `https:${u}`;
  if (u.startsWith('http')) return u;
  return `https://${u}`;
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const species = params.get('species');
  const type = (params.get('type') ?? 'song').toLowerCase();
  if (!species) {
    return NextResponse.json({ error: 'species required' }, { status: 400 });
  }

  // Build the XC query. Best-quality (q:A) + matching type.
  // Example: "Cardinalis cardinalis q:A type:song"
  const query = `${species} q:A type:${type}`.trim();
  const url = `https://xeno-canto.org/api/2/recordings?query=${encodeURIComponent(
    query,
  )}&page=1`;

  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Memphis-Birds/1.0',
      },
      next: { revalidate: 604800 }, // 7-day cache (bird calls don't change)
    });
    if (!res.ok) {
      // fallback: drop quality filter
      const relaxedQuery = `${species} type:${type}`.trim();
      const relaxedUrl = `https://xeno-canto.org/api/2/recordings?query=${encodeURIComponent(
        relaxedQuery,
      )}&page=1`;
      const res2 = await fetch(relaxedUrl, {
        headers: { Accept: 'application/json', 'User-Agent': 'Memphis-Birds/1.0' },
        next: { revalidate: 604800 },
      });
      if (!res2.ok) {
        return NextResponse.json(
          { error: `xc_fetch_failed: ${res2.status}` },
          { status: res2.status },
        );
      }
      const data2: XCResponseV2 = await res2.json();
      if (!data2.recordings?.length) {
        return NextResponse.json({ error: 'no_recordings' }, { status: 404 });
      }
      return buildResponse(data2.recordings[0]);
    }

    const data: XCResponseV2 = await res.json();
    if (!data.recordings?.length) {
      // try without quality constraint
      const relaxedQuery = `${species} type:${type}`.trim();
      const relaxedUrl = `https://xeno-canto.org/api/2/recordings?query=${encodeURIComponent(
        relaxedQuery,
      )}&page=1`;
      const res2 = await fetch(relaxedUrl, {
        headers: { Accept: 'application/json', 'User-Agent': 'Memphis-Birds/1.0' },
        next: { revalidate: 604800 },
      });
      if (res2.ok) {
        const data2: XCResponseV2 = await res2.json();
        if (data2.recordings?.length) return buildResponse(data2.recordings[0]);
      }
      return NextResponse.json({ error: 'no_recordings' }, { status: 404 });
    }
    return buildResponse(data.recordings[0]);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

function buildResponse(rec: XCRecordingV2) {
  return NextResponse.json(
    {
      url: normalizeUrl(rec.file),
      length: rec.length,
      recordist: rec.rec,
      location: rec.loc,
      country: rec.cnt,
      quality: rec.q,
      type: rec.type,
      license: rec.lic,
      sonogramUrl: rec.sono?.med ? normalizeUrl(rec.sono.med) : null,
      pageUrl: rec.url ? normalizeUrl(rec.url) : `https://xeno-canto.org/${rec.id}`,
      source: 'xeno-canto',
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=604800, stale-while-revalidate=2592000',
      },
    },
  );
}
