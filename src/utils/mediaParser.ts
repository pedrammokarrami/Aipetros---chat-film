import type { MediaPreview } from '../types';

export const ASSET_POSTERS = {
  desert: '/src/assets/images/poster_desert_planet_1795523608384.jpg',
  office: '/src/assets/images/poster_corridor_office_1795523607600.jpg',
  citadel: '/src/assets/images/poster_anime_citadel_1795523608959.jpg',
  tokyo: '/src/assets/images/poster_neo_tokyo_rain_1795523607945.jpg',
} as const;

const URL_REGEX = /(https?:\/\/[^\s<>()]+|\/src\/assets\/images\/[^\s<>()]+)/gi;

const VIDEO_EXT_REGEX = /\.(mp4|webm|ogg|mov|m3u8)(\?.*)?$/i;
const IMAGE_EXT_REGEX = /\.(jpg|jpeg|png|gif|webp|avif)(\?.*)?$/i;

export function stripTrailingPunctuation(raw: string): string {
  return raw.replace(/[.,!?;:)\]]+$/, '');
}

export function extractUrlsFromText(text: string): string[] {
  if (!text) return [];
  const matches = text.match(URL_REGEX);
  if (!matches) return [];
  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const item of matches) {
    const normalized = stripTrailingPunctuation(item.trim());
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      cleaned.push(normalized);
    }
  }
  return cleaned;
}

function resolveCuratedPoster(url: string): {
  posterUrl?: string;
  title?: string;
  duration?: string;
  resolution?: string;
} {
  const lower = url.toLowerCase();
  if (lower.includes('dune') || lower.includes('arrakis') || lower.includes('desert')) {
    return {
      posterUrl: ASSET_POSTERS.desert,
      title: 'Dune: Part Two — IMAX 70mm Sync Stream',
      duration: '02:46:12',
      resolution: '4K HDR · P2P',
    };
  }
  if (lower.includes('severance') || lower.includes('lumon') || lower.includes('corridor')) {
    return {
      posterUrl: ASSET_POSTERS.office,
      title: 'Severance S02E04 — Corridor Sequence Capture',
      duration: '00:54:18',
      resolution: '1080p · AES-256',
    };
  }
  if (lower.includes('aot') || lower.includes('titan') || lower.includes('citadel')) {
    return {
      posterUrl: ASSET_POSTERS.citadel,
      title: 'Attack on Titan: Final Chapters — Subtitled Relay',
      duration: '01:25:04',
      resolution: '1080p · JP/EN',
    };
  }
  if (lower.includes('ghost') || lower.includes('tokyo') || lower.includes('cyber') || lower.includes('gits')) {
    return {
      posterUrl: ASSET_POSTERS.tokyo,
      title: 'Ghost in the Shell (1995) — 4K Restoration Relay',
      duration: '01:22:40',
      resolution: '4K · REMUX',
    };
  }
  return {};
}

function getDomainLabel(url: string): string {
  if (url.startsWith('/')) {
    return 'LOCAL_ARCHIVE';
  }
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return 'ENCRYPTED_LINK';
  }
}

function getYoutubeId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') {
      const id = parsed.pathname.slice(1).split('/')[0];
      return id || null;
    }
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (parsed.pathname === '/watch') {
        return parsed.searchParams.get('v');
      }
      const embedMatch = parsed.pathname.match(/^\/(embed|shorts)\/([^/?]+)/);
      if (embedMatch) return embedMatch[2];
    }
  } catch {
    return null;
  }
  return null;
}

function getVimeoId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');
    if (host === 'vimeo.com') {
      const match = parsed.pathname.match(/^\/(\d+)/);
      return match ? match[1] : null;
    }
  } catch {
    return null;
  }
  return null;
}

export function parseMediaPreview(rawUrl: string): MediaPreview {
  const url = stripTrailingPunctuation(rawUrl.trim());
  const domain = getDomainLabel(url);
  const curated = resolveCuratedPoster(url);

  // Local or remote image
  if (IMAGE_EXT_REGEX.test(url)) {
    const filePart = url.split('/').pop()?.split('?')[0] ?? 'Captured Frame';
    return {
      url,
      kind: 'image',
      title: curated.title ?? filePart.replace(/[_-]+/g, ' '),
      domain,
      posterUrl: url,
      resolution: curated.resolution ?? 'STILL FRAME',
    };
  }

  // YouTube embed
  const ytId = getYoutubeId(url);
  if (ytId) {
    return {
      url,
      kind: 'embed',
      title: curated.title ?? `Video Transmission (${ytId})`,
      domain: 'youtube.com',
      posterUrl: curated.posterUrl ?? ASSET_POSTERS.tokyo,
      duration: curated.duration ?? 'STREAM',
      resolution: '1080p EMBED',
      embedUrl: `https://www.youtube.com/embed/${ytId}`,
    };
  }

  // Vimeo embed
  const vimeoId = getVimeoId(url);
  if (vimeoId) {
    return {
      url,
      kind: 'embed',
      title: curated.title ?? `Cinema Reel #${vimeoId}`,
      domain: 'vimeo.com',
      posterUrl: curated.posterUrl ?? ASSET_POSTERS.desert,
      duration: curated.duration ?? 'STREAM',
      resolution: '1080p EMBED',
      embedUrl: `https://player.vimeo.com/video/${vimeoId}`,
    };
  }

  // Direct video or internal watch relay stream
  if (
    VIDEO_EXT_REGEX.test(url) ||
    domain.includes('stream.cnet') ||
    domain.includes('watch.cnet') ||
    url.includes('/stream/')
  ) {
    const filePart = url.split('/').pop()?.split('?')[0] ?? 'Encrypted Video Stream';
    return {
      url,
      kind: 'video',
      title: curated.title ?? filePart.replace(/[_-]+/g, ' '),
      domain,
      posterUrl: curated.posterUrl ?? ASSET_POSTERS.desert,
      duration: curated.duration ?? '01:48:20',
      resolution: curated.resolution ?? '1080p · STREAM',
    };
  }

  // Generic encrypted link
  return {
    url,
    kind: 'link',
    title: curated.title ?? `ENCRYPTED_LINK // ${domain}`,
    domain,
    posterUrl: curated.posterUrl,
  };
}

export function extractMediaPreviews(text: string): MediaPreview[] {
  return extractUrlsFromText(text).map(parseMediaPreview);
}

export function generateBrandedShortLink(
  kind: 'telegram' | 'p2p' | 'dossier' | 'lobby',
  domain = 'cnet.relay',
  seed?: string
): string {
  const prefixMap: Record<typeof kind, string> = {
    telegram: 'tg',
    p2p: 'p2p',
    dossier: 'doc',
    lobby: 'sync',
  };
  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/+$/, '') || 'cnet.relay';
  const token =
    seed ??
    Math.random()
      .toString(36)
      .slice(2, 8)
      .toLowerCase();
  return `https://${cleanDomain}/${prefixMap[kind]}-${token}`;
}
