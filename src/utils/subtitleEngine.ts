export interface SubtitleCue {
  id: string;
  startSec: number;
  endSec: number;
  text: string;
  secondaryText?: string;
}

export type SubtitleTrackId = 'OFF' | 'FA' | 'EN' | 'DUAL' | 'CUSTOM';

export type SubtitleSize = 'SM' | 'MD' | 'LG' | 'XL';
export type SubtitleStyle = 'BOX' | 'SOLID' | 'OUTLINE';
export type SubtitleColor = 'WHITE' | 'AMBER' | 'GREEN';

export interface SubtitleSettings {
  trackId: SubtitleTrackId;
  size: SubtitleSize;
  style: SubtitleStyle;
  color: SubtitleColor;
  offsetSec: number;
}

export interface SubtitleBundle {
  fa: SubtitleCue[];
  en: SubtitleCue[];
}

/**
 * Parses an SRT or WebVTT timestamp ("00:01:23,450" or "01:23.450") into seconds.
 */
export function parseTimestampToSeconds(raw: string): number | null {
  const cleaned = raw.trim().replace(',', '.');
  const parts = cleaned.split(':');
  if (parts.length < 2 || parts.length > 3) return null;

  const nums = parts.map((p) => Number(p));
  if (nums.some((n) => Number.isNaN(n) || n < 0)) return null;

  if (nums.length === 3) {
    return nums[0] * 3600 + nums[1] * 60 + nums[2];
  }
  return nums[0] * 60 + nums[1];
}

/**
 * Formats seconds into HH:MM:SS (or MM:SS when under an hour if compact=true).
 */
export function formatTimecode(totalSec: number, alwaysHours = true): string {
  const safe = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  if (!alwaysHours && h === 0) {
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

/**
 * Parses standard .srt or .vtt subtitle file text into sorted SubtitleCue entries.
 */
export function parseSubtitleFile(rawText: string): SubtitleCue[] {
  if (!rawText || !rawText.trim()) return [];
  const normalized = rawText
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/^WEBVTT[^\n]*\n+/i, '');

  const blocks = normalized.split(/\n{2,}/);
  const cues: SubtitleCue[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const lines = blocks[i]
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length < 2) continue;

    const timingLineIdx = lines.findIndex((line) => line.includes('-->'));
    if (timingLineIdx === -1) continue;

    const timingLine = lines[timingLineIdx];
    const [rawStart, rawEndRest] = timingLine.split('-->');
    if (!rawStart || !rawEndRest) continue;

    const rawEnd = rawEndRest.trim().split(/\s+/)[0];
    const startSec = parseTimestampToSeconds(rawStart);
    const endSec = parseTimestampToSeconds(rawEnd);
    if (startSec === null || endSec === null || endSec <= startSec) continue;

    const textLines = lines
      .slice(timingLineIdx + 1)
      .join('\n')
      .replace(/<[^>]+>/g, '')
      .trim();

    if (!textLines) continue;

    cues.push({
      id: `cue-${i}-${Math.round(startSec * 100)}`,
      startSec,
      endSec,
      text: textLines,
    });
  }

  return cues.sort((a, b) => a.startSec - b.startSec);
}

/**
 * Returns the active subtitle cue at currentSec adjusted by offsetSec.
 * Positive offset delays subtitles; negative offset advances them.
 */
export function getActiveSubtitleCue(
  cues: SubtitleCue[],
  currentSec: number,
  offsetSec = 0
): SubtitleCue | null {
  if (!cues.length) return null;
  const effectiveTime = currentSec - offsetSec;
  for (const cue of cues) {
    if (effectiveTime >= cue.startSec && effectiveTime <= cue.endSec) {
      return cue;
    }
  }
  return null;
}

/**
 * Detects whether a text string starts with or primarily contains RTL (Persian/Arabic) script.
 */
export function isRtlText(text: string): boolean {
  return /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
}

/**
 * Generates repeating synced subtitle tracks across a full cinema timeline so every
 * timestamp on the scrubber immediately shows rich, authentic Persian & English dialogue.
 */
function buildRepeatingCues(
  samples: Array<{ fa: string; en: string }>,
  totalDurationSec: number,
  stepSec = 7
): SubtitleBundle {
  const fa: SubtitleCue[] = [];
  const en: SubtitleCue[] = [];
  let cursor = 0;
  let idx = 0;

  while (cursor < totalDurationSec) {
    const line = samples[idx % samples.length];
    const startSec = cursor;
    const endSec = Math.min(totalDurationSec, cursor + stepSec - 0.25);
    fa.push({
      id: `fa-${idx}`,
      startSec,
      endSec,
      text: line.fa,
    });
    en.push({
      id: `en-${idx}`,
      startSec,
      endSec,
      text: line.en,
    });
    cursor += stepSec;
    idx += 1;
  }

  return { fa, en };
}

export function getBuiltInSubtitles(
  titleOrUrl: string,
  totalDurationSec = 5400
): SubtitleBundle {
  const key = titleOrUrl.toLowerCase();

  if (key.includes('severance') || key.includes('corridor') || key.includes('office')) {
    return buildRepeatingCues(
      [
        {
          fa: 'سنسورهای راهروی طبقه تفکیک‌شده بدون خطا همگام هستند.',
          en: 'The severed floor corridor sensors are synced with zero drift.',
        },
        {
          fa: 'به فاصله چراغ‌های سقف دقت کن؛ نقشه این بخش تغییر کرده است.',
          en: 'Look at the ceiling light spacing; this wing has been remapped.',
        },
        {
          fa: 'پرونده شماره ۸۳۹ روی ترمینال انتهای سالن در حال بازگشایی است.',
          en: 'File #0839 is decrypting on the far terminal desk right now.',
        },
        {
          fa: 'هرگز اجازه نده بخش نظارت متوجه اتصال رمزگذاری‌شده ما شود.',
          en: 'Never let floor oversight trace our encrypted peer relay.',
        },
      ],
      totalDurationSec
    );
  }

  if (key.includes('titan') || key.includes('aot') || key.includes('citadel')) {
    return buildRepeatingCues(
      [
        {
          fa: 'پشت دیوارهای این دژ، آسمان هنگام غروب به رنگ کهربایی درمی‌آید.',
          en: 'Beyond the citadel walls, the twilight sky burns pure amber.',
        },
        {
          fa: 'واحد دیده‌بانی گزارش داد که ستون‌های بخار از دره شمالی نزدیک می‌شوند.',
          en: 'Scouts report steam columns rising across the northern valley.',
        },
        {
          fa: 'اگر این لحظه را فریم‌به‌فریم ببینیم، تغییر نورپردازی کاملاً مشهود است.',
          en: 'Watch frame by frame — the entire sunset palette inverts right here.',
        },
        {
          fa: 'همه اعضا آماده همگام‌سازی صوتی برای پرده پایانی باشند.',
          en: 'All peers lock audio sync for the final chapter sequence.',
        },
      ],
      totalDurationSec
    );
  }

  if (key.includes('ghost') || key.includes('tokyo') || key.includes('gits')) {
    return buildRepeatingCues(
      [
        {
          fa: 'باران شبانه انعکاس چراغ‌های زمردی را روی سنگ‌فرش شهر پخش کرده است.',
          en: 'Nocturnal rain scatters emerald neon across the wet alleyway.',
        },
        {
          fa: 'شبکه گسترده و بی‌انتهاست؛ سیگنال از لایه حافظه عبور می‌کند.',
          en: 'The net is vast and infinite; the signal passes straight through.',
        },
        {
          fa: 'بازسازی ۴K تمام جزئیات نقاشی دستی سلول‌های سال ۱۹۹۵ را حفظ کرده است.',
          en: 'This 4K restoration preserves every hand-painted 1995 cel layer.',
        },
        {
          fa: 'کانال امن P2P با حداقل تأخیر متصل باقی می‌ماند.',
          en: 'Secure P2P channel remains locked with minimal packet latency.',
        },
      ],
      totalDurationSec
    );
  }

  // Default: Dune / Sci-Fi Cinema
  return buildRepeatingCues(
    [
      {
        fa: 'در افق بیابان آراکیس، صدای فرکانس پایین پیش از طوفان شن به گوش می‌رسد.',
        en: 'Across the desert horizon, sub-bass tremors precede the dust storm.',
      },
      {
        fa: 'کشتی غول‌پیکر در مه طلایی غروب متوقف شد — لنز ۷۰ میلی‌متری را ببینید.',
        en: 'The monolith vessel hovers in amber haze — notice the 70mm framing.',
      },
      {
        fa: 'قدرت بیابان را دست‌کم نگیر؛ هر ذره شن مسیر باد را تغییر می‌دهد.',
        en: 'Never underestimate desert power; every grain shifts with the wind.',
      },
      {
        fa: 'همگام‌سازی پخش IMAX برای تمام اعضای لابی با دقت کامل برقرار است.',
        en: 'IMAX playback timecode is locked across every peer in this lobby.',
      },
    ],
    totalDurationSec
  );
}
