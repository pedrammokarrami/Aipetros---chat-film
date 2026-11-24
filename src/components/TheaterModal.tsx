import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  FolderOpen,
  Maximize,
  Minimize,
  Pause,
  PictureInPicture2,
  Play,
  Repeat,
  RotateCcw,
  RotateCw,
  Settings,
  Sliders,
  Subtitles,
  Upload,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type { MediaPreview } from '../types';
import { soundEngine } from '../utils/soundEngine';
import {
  formatTimecode,
  getActiveSubtitleCue,
  getBuiltInSubtitles,
  isRtlText,
  parseSubtitleFile,
  parseTimestampToSeconds,
  type SubtitleColor,
  type SubtitleCue,
  type SubtitleSettings,
  type SubtitleSize,
  type SubtitleStyle,
  type SubtitleTrackId,
} from '../utils/subtitleEngine';

interface TheaterModalProps {
  preview: MediaPreview | null;
  onClose: () => void;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;
const QUALITIES = ['4K HDR', '1080P', '720P', 'AUTO P2P'] as const;
const AUDIO_TRACKS = ['ORIGINAL 5.1', 'JP/EN STEREO', 'COMMENTARY'] as const;
const ASPECT_RATIOS = [
  { id: 'contain', label: '16:9 FIT' },
  { id: 'scope', label: '2.39:1 SCOPE' },
  { id: 'cover', label: 'FILL / CROP' },
] as const;

type QualityOption = (typeof QUALITIES)[number];
type AudioTrackOption = (typeof AUDIO_TRACKS)[number];
type AspectRatioOption = (typeof ASPECT_RATIOS)[number]['id'];
type ActivePopover = 'none' | 'subtitles' | 'settings';

const SUBTITLE_SIZE_CLASS: Record<SubtitleSize, string> = {
  SM: 'text-[11px] sm:text-sm',
  MD: 'text-xs sm:text-base',
  LG: 'text-sm sm:text-xl',
  XL: 'text-base sm:text-2xl',
};

const SUBTITLE_COLOR_CLASS: Record<SubtitleColor, string> = {
  WHITE: 'text-white',
  AMBER: 'text-amber-300',
  GREEN: 'text-emerald-300',
};

const SUBTITLE_STYLE_CLASS: Record<SubtitleStyle, string> = {
  BOX: 'border border-white/15 bg-black/80 px-2.5 py-1 sm:px-3.5 sm:py-1.5',
  SOLID: 'border border-emerald-500/45 bg-black px-2.5 py-1 sm:px-3.5 sm:py-1.5',
  OUTLINE:
    'bg-transparent px-2 py-0.5 sm:py-1 [text-shadow:0_2px_8px_rgba(0,0,0,1),0_0_3px_rgba(0,0,0,1),1px_1px_0_rgba(0,0,0,0.95)]',
};

function isDirectPlayableVideo(url: string): boolean {
  if (!url) return false;
  if (url.startsWith('blob:')) return true;
  if (url.includes('stream.cnet.local')) return false;
  return /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url);
}

export function TheaterModal({ preview, onClose }: TheaterModalProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const subtitleInputRef = useRef<HTMLInputElement | null>(null);
  const localVideoInputRef = useRef<HTMLInputElement | null>(null);
  const localVideoObjectUrlRef = useRef<string | null>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(true);
  const [durationSec, setDurationSec] = useState(5400);
  const [currentSec, setCurrentSec] = useState(21);
  const [volume, setVolume] = useState(0.85);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState<number>(1);
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [p2pSyncLocked, setP2pSyncLocked] = useState(true);

  // Media source state
  const [localVideoUrl, setLocalVideoUrl] = useState<string | null>(null);
  const [localVideoName, setLocalVideoName] = useState<string | null>(null);
  const [videoElementFailed, setVideoElementFailed] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  // Player display & settings state
  const [quality, setQuality] = useState<QualityOption>('4K HDR');
  const [audioTrack, setAudioTrack] = useState<AudioTrackOption>('ORIGINAL 5.1');
  const [aspectRatio, setAspectRatio] = useState<AspectRatioOption>('contain');
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activePopover, setActivePopover] = useState<ActivePopover>('none');
  const [copied, setCopied] = useState(false);
  const [statusFlash, setStatusFlash] = useState<string | null>(null);
  const [hoverSec, setHoverSec] = useState<number | null>(null);
  const [hoverPercent, setHoverPercent] = useState<number>(0);

  // Subtitle state
  const [subtitleSettings, setSubtitleSettings] = useState<SubtitleSettings>({
    trackId: 'FA',
    size: 'MD',
    style: 'BOX',
    color: 'WHITE',
    offsetSec: 0,
  });
  const [customCues, setCustomCues] = useState<SubtitleCue[]>([]);
  const [customSubFilename, setCustomSubFilename] = useState<string | null>(null);
  const [customSubError, setCustomSubError] = useState<string | null>(null);

  const flashTimerRef = useRef<number | null>(null);
  const triggerFlash = useCallback((message: string) => {
    setStatusFlash(message);
    if (flashTimerRef.current !== null) {
      window.clearTimeout(flashTimerRef.current);
    }
    flashTimerRef.current = window.setTimeout(() => {
      setStatusFlash(null);
      flashTimerRef.current = null;
    }, 1100);
  }, []);

  // Cleanup object URLs & timers on unmount
  useEffect(() => {
    return () => {
      if (localVideoObjectUrlRef.current) {
        URL.revokeObjectURL(localVideoObjectUrlRef.current);
        localVideoObjectUrlRef.current = null;
      }
      if (flashTimerRef.current !== null) {
        window.clearTimeout(flashTimerRef.current);
      }
    };
  }, []);

  // Reset player state when opening a new media preview
  useEffect(() => {
    if (!preview) return;
    const parsedDur = preview.duration ? parseTimestampToSeconds(preview.duration) : null;
    const resolvedDuration = parsedDur && parsedDur > 10 ? parsedDur : 5400;
    setDurationSec(resolvedDuration);
    setCurrentSec(Math.min(21, Math.floor(resolvedDuration * 0.1)));
    setIsPlaying(true);
    setSpeed(1);
    setCopied(false);
    setImgFailed(false);
    setVideoElementFailed(false);
    setActivePopover('none');
    setCustomSubError(null);
    setQuality(preview.resolution?.includes('4K') || preview.resolution?.includes('IMAX') ? '4K HDR' : '1080P');
    if (localVideoObjectUrlRef.current) {
      URL.revokeObjectURL(localVideoObjectUrlRef.current);
      localVideoObjectUrlRef.current = null;
    }
    setLocalVideoUrl(null);
    setLocalVideoName(null);
  }, [preview]);

  // Listen to native fullscreenchange so Escape or browser chrome stays in sync
  useEffect(() => {
    const onFullscreenChange = () => {
      const nativeActive = Boolean(document.fullscreenElement);
      if (!nativeActive) {
        setIsFullscreen(false);
      } else {
        setIsFullscreen(true);
      }
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const isVideoLike = Boolean(
    preview && (preview.kind === 'video' || preview.kind === 'embed' || localVideoUrl)
  );
  const activeVideoUrl = localVideoUrl ?? preview?.url ?? '';
  const useHtmlVideo = isVideoLike && !videoElementFailed && isDirectPlayableVideo(activeVideoUrl);

  // Sync HTML5 <video> element state whenever controls change
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !useHtmlVideo) return;
    el.volume = muted ? 0 : volume;
    el.muted = muted;
    el.playbackRate = speed;
    el.loop = loopEnabled;
  }, [useHtmlVideo, volume, muted, speed, loopEnabled]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !useHtmlVideo) return;
    if (isPlaying) {
      void el.play().catch(() => {
        // Autoplay policy or unsupported codec
      });
    } else {
      el.pause();
    }
  }, [useHtmlVideo, isPlaying, activeVideoUrl]);

  // Cinema stream playback clock (when using curated relay streams instead of direct <video>)
  useEffect(() => {
    if (!preview || !isVideoLike || useHtmlVideo || !isPlaying) return;
    const intervalMs = 250;
    const timer = window.setInterval(() => {
      setCurrentSec((prev) => {
        const next = prev + (intervalMs / 1000) * speed;
        if (next >= durationSec) {
          if (loopEnabled) return 0;
          setIsPlaying(false);
          return durationSec;
        }
        return next;
      });
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [preview, isVideoLike, useHtmlVideo, isPlaying, speed, durationSec, loopEnabled]);

  const seekTo = useCallback(
    (targetSec: number, showFeedback?: string) => {
      const clamped = Math.max(0, Math.min(durationSec, targetSec));
      setCurrentSec(clamped);
      if (useHtmlVideo && videoRef.current) {
        videoRef.current.currentTime = clamped;
      }
      if (showFeedback) {
        triggerFlash(showFeedback);
      }
    },
    [durationSec, useHtmlVideo, triggerFlash]
  );

  const togglePlay = useCallback(() => {
    if (!isVideoLike) return;
    soundEngine.playKeyTick();
    setIsPlaying((prev) => {
      const next = !prev;
      triggerFlash(next ? 'PLAY' : 'PAUSED');
      return next;
    });
  }, [isVideoLike, triggerFlash]);

  const toggleFullscreen = useCallback(() => {
    soundEngine.playKeyTick();
    setIsFullscreen((prev) => {
      const next = !prev;
      if (next) {
        const target = containerRef.current;
        if (target && typeof target.requestFullscreen === 'function') {
          void target.requestFullscreen().catch(() => {
            // CSS fullscreen fallback remains active in sandboxed iframes
          });
        }
        triggerFlash('FULLSCREEN');
      } else {
        if (document.fullscreenElement && typeof document.exitFullscreen === 'function') {
          void document.exitFullscreen().catch(() => {});
        }
        triggerFlash('THEATER VIEW');
      }
      return next;
    });
  }, [triggerFlash]);

  const cycleSubtitleTrack = useCallback(() => {
    soundEngine.playKeyTick();
    const order: SubtitleTrackId[] = customCues.length
      ? ['OFF', 'FA', 'EN', 'DUAL', 'CUSTOM']
      : ['OFF', 'FA', 'EN', 'DUAL'];
    setSubtitleSettings((prev) => {
      const idx = order.indexOf(prev.trackId);
      const nextTrack = order[(idx + 1) % order.length];
      triggerFlash(`CC: ${nextTrack}`);
      return { ...prev, trackId: nextTrack };
    });
  }, [customCues.length, triggerFlash]);

  const handleClose = useCallback(() => {
    if (document.fullscreenElement && typeof document.exitFullscreen === 'function') {
      void document.exitFullscreen().catch(() => {});
    }
    setIsFullscreen(false);
    soundEngine.playKeyTick();
    onClose();
  }, [onClose]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!preview) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        if (e.key === 'Escape') {
          (e.target as HTMLElement).blur();
        }
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        if (activePopover !== 'none') {
          setActivePopover('none');
          return;
        }
        if (isFullscreen) {
          toggleFullscreen();
          return;
        }
        handleClose();
        return;
      }

      if (!isVideoLike) return;

      const lower = e.key.toLowerCase();
      if (e.key === ' ' || lower === 'k') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowLeft' || lower === 'j') {
        e.preventDefault();
        soundEngine.playKeyTick();
        seekTo(currentSec - 10, '-10s');
      } else if (e.key === 'ArrowRight' || lower === 'l') {
        e.preventDefault();
        soundEngine.playKeyTick();
        seekTo(currentSec + 10, '+10s');
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMuted(false);
        setVolume((v) => {
          const next = Math.min(1, +(v + 0.1).toFixed(2));
          triggerFlash(`VOL ${Math.round(next * 100)}%`);
          return next;
        });
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setVolume((v) => {
          const next = Math.max(0, +(v - 0.1).toFixed(2));
          if (next === 0) setMuted(true);
          triggerFlash(`VOL ${Math.round(next * 100)}%`);
          return next;
        });
      } else if (lower === 'm') {
        e.preventDefault();
        soundEngine.playKeyTick();
        setMuted((m) => {
          triggerFlash(!m ? 'MUTED' : `VOL ${Math.round(volume * 100)}%`);
          return !m;
        });
      } else if (lower === 'f') {
        e.preventDefault();
        toggleFullscreen();
      } else if (lower === 'c') {
        e.preventDefault();
        cycleSubtitleTrack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    preview,
    isVideoLike,
    activePopover,
    isFullscreen,
    currentSec,
    volume,
    togglePlay,
    seekTo,
    toggleFullscreen,
    cycleSubtitleTrack,
    handleClose,
    triggerFlash,
  ]);

  // Built-in subtitles memoized per media item
  const builtInSubs = useMemo(() => {
    if (!preview) return { fa: [], en: [] };
    return getBuiltInSubtitles(`${preview.title} ${preview.url}`, durationSec);
  }, [preview, durationSec]);

  const activeSubDisplay = useMemo(() => {
    const { trackId, offsetSec } = subtitleSettings;
    if (!isVideoLike || trackId === 'OFF') return null;

    if (trackId === 'FA') {
      const cue = getActiveSubtitleCue(builtInSubs.fa, currentSec, offsetSec);
      return cue ? { primary: cue.text, secondary: null } : null;
    }
    if (trackId === 'EN') {
      const cue = getActiveSubtitleCue(builtInSubs.en, currentSec, offsetSec);
      return cue ? { primary: cue.text, secondary: null } : null;
    }
    if (trackId === 'DUAL') {
      const faCue = getActiveSubtitleCue(builtInSubs.fa, currentSec, offsetSec);
      const enCue = getActiveSubtitleCue(builtInSubs.en, currentSec, offsetSec);
      if (!faCue && !enCue) return null;
      return {
        primary: faCue?.text ?? enCue?.text ?? '',
        secondary: faCue && enCue ? enCue.text : null,
      };
    }
    if (trackId === 'CUSTOM') {
      const cue = getActiveSubtitleCue(customCues, currentSec, offsetSec);
      return cue ? { primary: cue.text, secondary: null } : null;
    }
    return null;
  }, [isVideoLike, subtitleSettings, builtInSubs, customCues, currentSec]);

  if (!preview) return null;

  const progressPercent = durationSec > 0 ? Math.min(100, (currentSec / durationSec) * 100) : 0;
  const bufferedPercent = Math.min(100, progressPercent + 14);

  const handleCopyUrl = () => {
    soundEngine.playConfirmBeep();
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(preview.url).catch(() => {});
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const handleSubtitleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseSubtitleFile(text);
      if (parsed.length === 0) {
        setCustomSubError('فرمت زیرنویس معتبر نبود (.SRT یا .VTT بارگذاری کنید)');
        return;
      }
      setCustomSubError(null);
      setCustomCues(parsed);
      setCustomSubFilename(file.name);
      setSubtitleSettings((prev) => ({ ...prev, trackId: 'CUSTOM' }));
      soundEngine.playConfirmBeep();
      triggerFlash(`SUB LOADED (${parsed.length})`);
    } catch {
      setCustomSubError('خطا در خواندن فایل زیرنویس');
    }
  };

  const handleLocalVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (localVideoObjectUrlRef.current) {
      URL.revokeObjectURL(localVideoObjectUrlRef.current);
    }
    const objUrl = URL.createObjectURL(file);
    localVideoObjectUrlRef.current = objUrl;
    setLocalVideoUrl(objUrl);
    setLocalVideoName(file.name);
    setVideoElementFailed(false);
    setCurrentSec(0);
    setIsPlaying(true);
    setActivePopover('none');
    soundEngine.playConfirmBeep();
    triggerFlash('LOCAL VIDEO READY');
  };

  const handlePictureInPicture = async () => {
    const el = videoRef.current;
    if (!el || !document.pictureInPictureEnabled) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await el.requestPictureInPicture();
      }
      soundEngine.playKeyTick();
    } catch {
      // Ignore unsupported PiP in headless/iframe
    }
  };

  const handleTimelinePointerMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return;
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverPercent(ratio * 100);
    setHoverSec(ratio * durationSec);
  };

  const mediaFilterStyle =
    brightness === 100 && contrast === 100
      ? undefined
      : { filter: `brightness(${brightness}%) contrast(${contrast}%)` };

  const mediaObjectClass =
    aspectRatio === 'cover' ? 'object-cover' : 'object-contain';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Fullscreen Theater: ${localVideoName ?? preview.title}`}
      data-testid="theater-modal"
      data-fullscreen={isFullscreen ? 'true' : 'false'}
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/94 ${
        isFullscreen ? 'p-0' : 'p-2 sm:p-5'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isFullscreen) {
          handleClose();
        }
      }}
    >
      {/* Hidden file inputs for local video & custom SRT/VTT subtitles */}
      <input
        ref={subtitleInputRef}
        type="file"
        accept=".srt,.vtt,.txt"
        onChange={handleSubtitleFileUpload}
        className="hidden"
        aria-label="Upload SRT or VTT subtitle file"
      />
      <input
        ref={localVideoInputRef}
        type="file"
        accept="video/*,.mp4,.webm,.ogg,.mov"
        onChange={handleLocalVideoUpload}
        className="hidden"
        aria-label="Load local video file"
      />

      <div
        ref={containerRef}
        data-testid="theater-shell"
        className={`animate-modal-pop relative flex flex-col bg-[#070B09] text-[#E0EFE6] shadow-[0_0_70px_rgba(0,0,0,0.95)] transition-[width,height] duration-200 ${
          isFullscreen
            ? 'h-screen w-screen max-h-none max-w-none border-0'
            : 'max-h-[94vh] w-full max-w-5xl border border-emerald-500/50'
        }`}
      >
        {/* Top Theater Bar */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#1E3527] bg-[#0B120E] px-3 py-2.5 sm:px-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[10px] text-emerald-400 sm:text-[11px]">
              <span>THEATER_VIEW // {localVideoName ? 'LOCAL_MEDIA' : preview.kind.toUpperCase()}</span>
              <span aria-hidden="true">·</span>
              <span>{quality}</span>
              {isVideoLike && (
                <>
                  <span aria-hidden="true" className="hidden sm:inline">·</span>
                  <span className="hidden sm:inline">{audioTrack}</span>
                </>
              )}
              {isFullscreen && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-amber-300">FULLSCREEN</span>
                </>
              )}
            </div>
            <h2 className="mt-0.5 truncate font-mono text-xs font-semibold text-white sm:text-sm md:text-base">
              {localVideoName ?? preview.title}
            </h2>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {isVideoLike && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playKeyTick();
                  localVideoInputRef.current?.click();
                }}
                title="Load local movie file (.mp4 / .webm)"
                aria-label="Load local video file"
                className="inline-flex min-h-[36px] items-center gap-1.5 border border-[#264834] bg-[#111B15] px-2.5 py-1.5 font-mono text-[11px] text-emerald-300 transition-colors hover:border-emerald-400 active:translate-y-[1px]"
              >
                <FolderOpen className="h-3.5 w-3.5" />
                <span className="hidden md:inline">LOAD FILE</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCopyUrl}
              aria-label="Copy encrypted media link"
              className="inline-flex min-h-[36px] items-center gap-1.5 border border-[#264834] bg-[#111B15] px-2.5 py-1.5 font-mono text-[11px] text-emerald-300 transition-colors hover:border-emerald-400 active:translate-y-[1px]"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{copied ? 'COPIED' : 'LINK'}</span>
            </button>

            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              data-testid="theater-fullscreen-top"
              className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center border border-[#264834] bg-[#111B15] px-2 text-emerald-300 transition-colors hover:border-emerald-400 active:translate-y-[1px]"
            >
              {isFullscreen ? (
                <Minimize className="h-4 w-4" />
              ) : (
                <Maximize className="h-4 w-4" />
              )}
            </button>

            <button
              type="button"
              onClick={handleClose}
              aria-label="Close fullscreen theater"
              className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center border border-red-500/45 bg-red-950/35 px-2 text-red-300 transition-colors hover:border-red-400 hover:bg-red-900/45 active:translate-y-[1px]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Media Viewport */}
        <div
          className={`relative flex w-full items-center justify-center overflow-hidden bg-black select-none ${
            isFullscreen ? 'min-h-0 flex-1' : 'aspect-video max-h-[65vh]'
          }`}
          onClick={() => {
            if (activePopover !== 'none') {
              setActivePopover('none');
              return;
            }
            if (isVideoLike) togglePlay();
          }}
          onDoubleClick={() => {
            toggleFullscreen();
          }}
        >
          {useHtmlVideo ? (
            <video
              ref={videoRef}
              src={activeVideoUrl}
              poster={preview.posterUrl}
              playsInline
              style={mediaFilterStyle}
              onLoadedMetadata={(e) => {
                const dur = e.currentTarget.duration;
                if (Number.isFinite(dur) && dur > 0) {
                  setDurationSec(dur);
                }
              }}
              onTimeUpdate={(e) => {
                setCurrentSec(e.currentTarget.currentTime);
              }}
              onEnded={() => {
                if (!loopEnabled) setIsPlaying(false);
              }}
              onError={() => {
                setVideoElementFailed(true);
              }}
              className={`h-full w-full ${mediaObjectClass}`}
            />
          ) : preview.posterUrl && !imgFailed ? (
            <img
              src={preview.posterUrl}
              alt={preview.title}
              referrerPolicy="no-referrer"
              style={mediaFilterStyle}
              onError={() => setImgFailed(true)}
              className={`h-full w-full ${mediaObjectClass} transition-all duration-500 ${
                isVideoLike && !isPlaying ? 'scale-100 opacity-75' : 'scale-[1.015] opacity-100'
              }`}
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center font-mono">
              <div className="text-sm font-semibold text-emerald-400">
                ENCRYPTED_LINK // {preview.domain}
              </div>
              <div className="mt-2 max-w-md break-all text-xs text-[#9BB8A7]">{preview.url}</div>
              <a
                href={preview.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="mt-4 inline-flex items-center gap-2 border border-emerald-500/50 bg-emerald-500/15 px-4 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25"
              >
                <span>OPEN EXTERNAL RELAY</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          )}

          {/* CinemaScope 2.39:1 matte bars */}
          {aspectRatio === 'scope' && (
            <>
              <div className="pointer-events-none absolute top-0 right-0 left-0 h-[11%] bg-black" />
              <div className="pointer-events-none absolute right-0 bottom-0 left-0 h-[11%] bg-black" />
            </>
          )}

          {/* Subtle bottom gradient scrim for subtitle legibility */}
          <div className="pointer-events-none absolute right-0 bottom-0 left-0 h-28 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

          {/* Top-left live telemetry HUD */}
          {isVideoLike && (
            <div className="pointer-events-none absolute top-3 left-3 flex flex-wrap items-center gap-2 border border-emerald-500/40 bg-black/75 px-2.5 py-1 font-mono text-[10px] text-emerald-300 sm:text-[11px]">
              <span className={isPlaying ? 'text-emerald-400' : 'text-amber-300'}>
                {isPlaying ? '▶ PLAYING' : '❚❚ PAUSED'}
              </span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{speed}x</span>
              <span aria-hidden="true">·</span>
              <span>CC: {subtitleSettings.trackId}</span>
              {p2pSyncLocked && (
                <>
                  <span aria-hidden="true" className="hidden sm:inline">·</span>
                  <span className="hidden text-emerald-400/90 sm:inline">P2P SYNC</span>
                </>
              )}
            </div>
          )}

          {/* Center transient action flash */}
          {statusFlash && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="border border-emerald-400/70 bg-black/80 px-4 py-2 font-mono text-xs font-bold tracking-widest text-emerald-300 shadow-[0_0_24px_rgba(34,197,94,0.3)] sm:text-sm">
                {statusFlash}
              </div>
            </div>
          )}

          {/* Center pause indicator when paused */}
          {isVideoLike && !isPlaying && !statusFlash && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="flex h-16 w-16 items-center justify-center border border-emerald-400/80 bg-black/75 text-emerald-400 shadow-[0_0_32px_rgba(34,197,94,0.35)]">
                <Play className="ml-1 h-7 w-7 fill-current" />
              </div>
            </div>
          )}

          {/* Live Subtitles Overlay */}
          {activeSubDisplay && (
            <div
              data-testid="subtitle-overlay"
              className="pointer-events-none absolute right-2 bottom-2 left-2 z-10 flex flex-col items-center gap-1 text-center sm:right-4 sm:bottom-6 sm:left-4 sm:gap-1.5"
            >
              <div
                dir={isRtlText(activeSubDisplay.primary) ? 'rtl' : 'ltr'}
                className={`max-w-[94%] whitespace-pre-line font-sans font-medium leading-snug sm:max-w-[92%] sm:leading-relaxed ${SUBTITLE_SIZE_CLASS[subtitleSettings.size]} ${SUBTITLE_COLOR_CLASS[subtitleSettings.color]} ${SUBTITLE_STYLE_CLASS[subtitleSettings.style]}`}
              >
                {activeSubDisplay.primary}
              </div>
              {activeSubDisplay.secondary && (
                <div
                  dir={isRtlText(activeSubDisplay.secondary) ? 'rtl' : 'ltr'}
                  className={`max-w-[94%] whitespace-pre-line font-sans text-[11px] leading-snug opacity-95 sm:max-w-[92%] sm:text-sm ${SUBTITLE_COLOR_CLASS[subtitleSettings.color]} ${SUBTITLE_STYLE_CLASS[subtitleSettings.style]}`}
                >
                  {activeSubDisplay.secondary}
                </div>
              )}
            </div>
          )}
        </div>

        {/* SUBTITLES (CC) POPOVER (anchored to theater-shell for spacious mobile & desktop height) */}
        {isVideoLike && activePopover === 'subtitles' && (
          <div
            data-testid="subtitle-menu"
            onClick={(e) => e.stopPropagation()}
            className="animate-modal-pop absolute right-2 bottom-[118px] z-30 max-h-[68vh] w-[calc(100%-1rem)] max-w-sm overflow-y-auto border border-emerald-500/60 bg-[#08100C]/98 p-3.5 text-left shadow-[0_0_40px_rgba(0,0,0,0.9)] sm:right-4 sm:bottom-[98px]"
          >
            <div className="flex items-center justify-between border-b border-[#1E3527] pb-2">
              <div className="flex items-center gap-2 font-mono text-xs font-semibold text-emerald-400">
                <Subtitles className="h-4 w-4" />
                <span>SUBTITLES</span>
                <span aria-hidden="true">//</span>
                <span className="font-sans text-xs font-semibold tracking-normal" dir="rtl">
                  زیرنویس
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActivePopover('none')}
                aria-label="Close subtitle menu"
                className="p-1 text-[#8AA896] hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Track Selection */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-[10px] text-[#8AA896]">
                <span className="font-mono tracking-wider uppercase">TRACK</span>
                <span className="font-sans text-[11px] tracking-normal" dir="rtl">
                  زبان زیرنویس
                </span>
              </div>
              <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                {(
                  [
                    { id: 'OFF', label: 'OFF · خاموش', isRtl: false },
                    { id: 'FA', label: 'فارسی (FA)', isRtl: true },
                    { id: 'EN', label: 'English (EN)', isRtl: false },
                    { id: 'DUAL', label: 'دوزبانه (FA+EN)', isRtl: true },
                  ] as const
                ).map((item) => {
                  const active = subtitleSettings.trackId === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        soundEngine.playKeyTick();
                        setSubtitleSettings((prev) => ({ ...prev, trackId: item.id }));
                      }}
                      className={`min-h-[34px] border px-2.5 py-1.5 font-sans text-xs tracking-normal transition-colors ${
                        active
                          ? 'border-emerald-400 bg-emerald-500/20 font-semibold text-emerald-300'
                          : 'border-[#244231] bg-[#0F1914] text-[#B6CFC0] hover:border-emerald-500/60'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>

                {/* Custom SRT/VTT Track */}
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playKeyTick();
                      subtitleInputRef.current?.click();
                    }}
                    className="inline-flex min-h-[34px] flex-1 items-center justify-center gap-1.5 border border-emerald-500/45 bg-[#101C16] px-2.5 py-1.5 font-mono text-[11px] text-emerald-300 hover:border-emerald-400 hover:bg-emerald-500/15"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>LOAD .SRT / .VTT</span>
                  </button>
                  {customCues.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playKeyTick();
                        setSubtitleSettings((prev) => ({ ...prev, trackId: 'CUSTOM' }));
                      }}
                      className={`min-h-[34px] border px-2.5 py-1.5 font-mono text-[11px] ${
                        subtitleSettings.trackId === 'CUSTOM'
                          ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300'
                          : 'border-[#244231] bg-[#0F1914] text-[#B6CFC0]'
                      }`}
                    >
                      CUSTOM ({customCues.length})
                    </button>
                  )}
                </div>
                {customSubFilename && (
                  <div className="mt-1 truncate font-mono text-[10px] text-emerald-400/90">
                    LOADED: {customSubFilename}
                  </div>
                )}
                {customSubError && (
                  <div className="mt-1 font-sans text-[11px] text-red-400" dir="rtl">
                    {customSubError}
                  </div>
                )}
              </div>

              {/* Font Size */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-[10px] text-[#8AA896]">
                  <span className="font-mono tracking-wider uppercase">TEXT SIZE</span>
                  <span className="font-sans text-[11px] tracking-normal" dir="rtl">
                    اندازه فونت
                  </span>
                </div>
                <div className="mt-1.5 grid grid-cols-4 gap-1.5">
                  {(['SM', 'MD', 'LG', 'XL'] as const).map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => {
                        soundEngine.playKeyTick();
                        setSubtitleSettings((prev) => ({ ...prev, size: sz }));
                      }}
                      className={`min-h-[32px] border font-mono text-[11px] ${
                        subtitleSettings.size === sz
                          ? 'border-emerald-400 bg-emerald-500/20 font-semibold text-emerald-300'
                          : 'border-[#244231] bg-[#0F1914] text-[#B6CFC0] hover:border-emerald-500/60'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>

              {/* Background Style & Text Color */}
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                <div>
                  <div className="flex items-center justify-between text-[10px] text-[#8AA896]">
                    <span className="font-mono tracking-wider uppercase">STYLE</span>
                    <span className="font-sans text-[11px] tracking-normal" dir="rtl">
                      پس‌زمینه
                    </span>
                  </div>
                  <div className="mt-1.5 flex gap-1">
                    {(['BOX', 'SOLID', 'OUTLINE'] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => {
                          soundEngine.playKeyTick();
                          setSubtitleSettings((prev) => ({ ...prev, style: st }));
                        }}
                        className={`min-h-[30px] flex-1 border px-1 font-mono text-[10px] ${
                          subtitleSettings.style === st
                            ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300'
                            : 'border-[#244231] bg-[#0F1914] text-[#B6CFC0]'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-[10px] text-[#8AA896]">
                    <span className="font-mono tracking-wider uppercase">COLOR</span>
                    <span className="font-sans text-[11px] tracking-normal" dir="rtl">
                      رنگ
                    </span>
                  </div>
                  <div className="mt-1.5 flex gap-1">
                    {(['WHITE', 'AMBER', 'GREEN'] as const).map((col) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => {
                          soundEngine.playKeyTick();
                          setSubtitleSettings((prev) => ({ ...prev, color: col }));
                        }}
                        className={`min-h-[30px] flex-1 border px-1 font-mono text-[10px] ${
                          subtitleSettings.color === col
                            ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300'
                            : 'border-[#244231] bg-[#0F1914] text-[#B6CFC0]'
                        }`}
                      >
                        {col}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Timing Sync Offset */}
              <div className="mt-3 border-t border-[#1E3527] pt-2.5">
                <div className="flex items-center justify-between text-[10px] text-[#8AA896]">
                  <span className="flex items-center gap-1.5">
                    <span className="font-mono">SYNC OFFSET</span>
                    <span className="font-sans text-[11px] tracking-normal" dir="rtl">
                      (همگام‌سازی)
                    </span>
                  </span>
                  <span className="font-mono tabular-nums text-emerald-300">
                    {subtitleSettings.offsetSec > 0 ? '+' : ''}
                    {subtitleSettings.offsetSec.toFixed(1)}s
                  </span>
                </div>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playKeyTick();
                      setSubtitleSettings((prev) => ({
                        ...prev,
                        offsetSec: +(prev.offsetSec - 0.5).toFixed(1),
                      }));
                    }}
                    className="min-h-[32px] flex-1 border border-[#244231] bg-[#0F1914] font-mono text-[11px] text-[#CBE0D3] hover:border-emerald-400"
                  >
                    -0.5s
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playKeyTick();
                      setSubtitleSettings((prev) => ({ ...prev, offsetSec: 0 }));
                    }}
                    className="min-h-[32px] flex-1 border border-[#244231] bg-[#0F1914] font-mono text-[11px] text-emerald-300 hover:border-emerald-400"
                  >
                    RESET
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playKeyTick();
                      setSubtitleSettings((prev) => ({
                        ...prev,
                        offsetSec: +(prev.offsetSec + 0.5).toFixed(1),
                      }));
                    }}
                    className="min-h-[32px] flex-1 border border-[#244231] bg-[#0F1914] font-mono text-[11px] text-[#CBE0D3] hover:border-emerald-400"
                  >
                    +0.5s
                  </button>
                </div>
              </div>
            </div>
          )}

        {/* PLAYER SETTINGS POPOVER */}
        {isVideoLike && activePopover === 'settings' && (
          <div
            data-testid="settings-menu"
            onClick={(e) => e.stopPropagation()}
            className="animate-modal-pop absolute right-2 bottom-[118px] z-30 max-h-[68vh] w-[calc(100%-1rem)] max-w-sm overflow-y-auto border border-emerald-500/60 bg-[#08100C]/98 p-3.5 text-left shadow-[0_0_40px_rgba(0,0,0,0.9)] sm:right-4 sm:bottom-[98px]"
          >
            <div className="flex items-center justify-between border-b border-[#1E3527] pb-2">
              <div className="flex items-center gap-2 font-mono text-xs font-semibold text-emerald-400">
                <Sliders className="h-4 w-4" />
                <span>SETTINGS</span>
                <span aria-hidden="true">//</span>
                <span className="font-sans text-xs font-semibold tracking-normal" dir="rtl">
                  تنظیمات پخش
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActivePopover('none')}
                aria-label="Close player settings"
                className="p-1 text-[#8AA896] hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Playback Speed */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-[10px] text-[#8AA896]">
                <span className="font-mono tracking-wider uppercase">PLAYBACK SPEED</span>
                <span className="font-sans text-[11px] tracking-normal" dir="rtl">
                  سرعت پخش
                </span>
              </div>
              <div className="mt-1.5 grid grid-cols-6 gap-1">
                {SPEEDS.map((sp) => (
                  <button
                    key={sp}
                    type="button"
                    onClick={() => {
                      soundEngine.playKeyTick();
                      setSpeed(sp);
                      triggerFlash(`SPEED ${sp}x`);
                    }}
                    className={`min-h-[30px] border font-mono text-[11px] tabular-nums ${
                      speed === sp
                        ? 'border-emerald-400 bg-emerald-500/20 font-semibold text-emerald-300'
                        : 'border-[#244231] bg-[#0F1914] text-[#B6CFC0] hover:border-emerald-500/60'
                    }`}
                  >
                    {sp}x
                  </button>
                ))}
              </div>
            </div>

            {/* Stream Quality */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-[10px] text-[#8AA896]">
                <span className="font-mono tracking-wider uppercase">STREAM QUALITY</span>
                <span className="font-sans text-[11px] tracking-normal" dir="rtl">
                  کیفیت تصویر
                </span>
              </div>
              <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                {QUALITIES.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => {
                      soundEngine.playKeyTick();
                      setQuality(q);
                      triggerFlash(`QUALITY: ${q}`);
                    }}
                    className={`min-h-[32px] border px-2 font-mono text-[11px] ${
                      quality === q
                        ? 'border-emerald-400 bg-emerald-500/20 font-semibold text-emerald-300'
                        : 'border-[#244231] bg-[#0F1914] text-[#B6CFC0] hover:border-emerald-500/60'
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Audio Track */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-[10px] text-[#8AA896]">
                <span className="font-mono tracking-wider uppercase">AUDIO TRACK</span>
                <span className="font-sans text-[11px] tracking-normal" dir="rtl">
                  باند صوتی
                </span>
              </div>
              <div className="mt-1.5 grid grid-cols-3 gap-1">
                {AUDIO_TRACKS.map((track) => (
                  <button
                    key={track}
                    type="button"
                    onClick={() => {
                      soundEngine.playKeyTick();
                      setAudioTrack(track);
                      triggerFlash(track);
                    }}
                    className={`min-h-[32px] border px-1.5 font-mono text-[10px] ${
                      audioTrack === track
                        ? 'border-emerald-400 bg-emerald-500/20 font-semibold text-emerald-300'
                        : 'border-[#244231] bg-[#0F1914] text-[#B6CFC0] hover:border-emerald-500/60'
                    }`}
                  >
                    {track}
                  </button>
                ))}
              </div>
            </div>

            {/* Aspect Ratio */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-[10px] text-[#8AA896]">
                <span className="font-mono tracking-wider uppercase">ASPECT RATIO</span>
                <span className="font-sans text-[11px] tracking-normal" dir="rtl">
                  نسبت تصویر
                </span>
              </div>
                <div className="mt-1.5 grid grid-cols-3 gap-1">
                  {ASPECT_RATIOS.map((ar) => (
                    <button
                      key={ar.id}
                      type="button"
                      onClick={() => {
                        soundEngine.playKeyTick();
                        setAspectRatio(ar.id);
                        triggerFlash(ar.label);
                      }}
                      className={`min-h-[32px] border px-1.5 font-mono text-[10px] ${
                        aspectRatio === ar.id
                          ? 'border-emerald-400 bg-emerald-500/20 font-semibold text-emerald-300'
                          : 'border-[#244231] bg-[#0F1914] text-[#B6CFC0] hover:border-emerald-500/60'
                      }`}
                    >
                      {ar.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Picture Calibration (Brightness & Contrast) */}
              <div className="mt-3 border-t border-[#1E3527] pt-2.5">
                <div className="flex items-center justify-between font-mono text-[10px] text-[#8AA896]">
                  <span>DISPLAY CALIBRATION</span>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playKeyTick();
                      setBrightness(100);
                      setContrast(100);
                    }}
                    className="text-emerald-400 hover:underline"
                  >
                    RESET
                  </button>
                </div>
                <div className="mt-2 space-y-2">
                  <label className="flex items-center gap-2 font-mono text-[10px] text-[#CBE0D3]">
                    <span className="w-20 shrink-0">BRIGHTNESS</span>
                    <input
                      type="range"
                      min={70}
                      max={130}
                      value={brightness}
                      aria-label="Brightness calibration"
                      onChange={(e) => setBrightness(Number(e.target.value))}
                      className="h-1 flex-1 cursor-pointer accent-emerald-400"
                    />
                    <span className="w-9 text-right tabular-nums text-emerald-300">
                      {brightness}%
                    </span>
                  </label>
                  <label className="flex items-center gap-2 font-mono text-[10px] text-[#CBE0D3]">
                    <span className="w-20 shrink-0">CONTRAST</span>
                    <input
                      type="range"
                      min={70}
                      max={130}
                      value={contrast}
                      aria-label="Contrast calibration"
                      onChange={(e) => setContrast(Number(e.target.value))}
                      className="h-1 flex-1 cursor-pointer accent-emerald-400"
                    />
                    <span className="w-9 text-right tabular-nums text-emerald-300">
                      {contrast}%
                    </span>
                  </label>
                </div>
              </div>

              {/* Loop & P2P Sync Toggles */}
              <div className="mt-3 grid grid-cols-2 gap-1.5 border-t border-[#1E3527] pt-2.5">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playKeyTick();
                    setLoopEnabled((v) => !v);
                  }}
                  className={`min-h-[32px] border px-2 font-mono text-[10px] ${
                    loopEnabled
                      ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300'
                      : 'border-[#244231] bg-[#0F1914] text-[#9BB8A7]'
                  }`}
                >
                  LOOP: {loopEnabled ? 'ON' : 'OFF'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playKeyTick();
                    setP2pSyncLocked((v) => !v);
                  }}
                  className={`min-h-[32px] border px-2 font-mono text-[10px] ${
                    p2pSyncLocked
                      ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300'
                      : 'border-[#244231] bg-[#0F1914] text-[#9BB8A7]'
                  }`}
                >
                  P2P SYNC: {p2pSyncLocked ? 'LOCKED' : 'SOLO'}
                </button>
              </div>

              {/* Shortcuts hint */}
              <div className="mt-2.5 border-t border-[#1E3527] pt-2 font-mono text-[10px] text-[#7D9C89]">
                KEYS: [SPACE] Play · [←/→] ±10s · [M] Mute · [C] Sub · [F] Fullscreen
              </div>
            </div>
          )}

        {/* Bottom Playback Controls Bar */}
        {isVideoLike ? (
          <div className="shrink-0 border-t border-[#1E3527] bg-[#0B120E] px-3 py-2.5 sm:px-4 sm:py-3">
            {/* Timeline Scrubber with Buffer + Chapter Ticks + Hover Timecode */}
            <div className="flex items-center gap-2.5 sm:gap-3">
              <span className="min-w-[60px] font-mono text-[11px] tabular-nums text-emerald-300 sm:text-xs">
                {formatTimecode(currentSec)}
              </span>

              <div
                ref={timelineRef}
                onMouseMove={handleTimelinePointerMove}
                onMouseLeave={() => setHoverSec(null)}
                className="relative flex flex-1 items-center py-2"
              >
                {/* Hover timecode badge */}
                {hoverSec !== null && (
                  <div
                    style={{ left: `${Math.min(94, Math.max(6, hoverPercent))}%` }}
                    className="pointer-events-none absolute -top-6 -translate-x-1/2 border border-emerald-500/60 bg-[#070B09] px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-emerald-300"
                  >
                    {formatTimecode(hoverSec)}
                  </div>
                )}

                {/* Visual Track */}
                <div className="pointer-events-none relative h-1.5 w-full bg-[#192B20]">
                  <div
                    style={{ width: `${bufferedPercent}%` }}
                    className="absolute inset-y-0 left-0 bg-emerald-500/25"
                  />
                  <div
                    style={{ width: `${progressPercent}%` }}
                    className="absolute inset-y-0 left-0 bg-emerald-400"
                  />
                  {/* Chapter ticks */}
                  {[25, 50, 75].map((mark) => (
                    <span
                      key={mark}
                      style={{ left: `${mark}%` }}
                      className="absolute top-0 bottom-0 w-px bg-[#070B09]/80"
                    />
                  ))}
                </div>

                {/* Accessible Range Overlay */}
                <input
                  type="range"
                  aria-label="Seek stream timeline"
                  min={0}
                  max={durationSec}
                  step={0.5}
                  value={currentSec}
                  onChange={(e) => seekTo(Number(e.target.value))}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
              </div>

              <span className="min-w-[60px] text-right font-mono text-[11px] tabular-nums text-[#7D9C89] sm:text-xs">
                {formatTimecode(durationSec)}
              </span>
            </div>

            {/* Primary & Secondary Control Row */}
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              {/* Left Playback Transport + Volume */}
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={togglePlay}
                  aria-label={isPlaying ? 'Pause stream' : 'Play stream'}
                  className="inline-flex min-h-[36px] items-center gap-1.5 border border-emerald-500/60 bg-emerald-500/15 px-3 py-1.5 font-mono text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/25 active:translate-y-[1px]"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">PAUSE</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">PLAY</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playKeyTick();
                    seekTo(currentSec - 10, '-10s');
                  }}
                  aria-label="Rewind 10 seconds"
                  className="inline-flex min-h-[36px] items-center gap-1 border border-[#244231] bg-[#111B15] px-2.5 py-1.5 font-mono text-xs text-[#B6CFC0] hover:border-emerald-400 active:translate-y-[1px]"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>-10</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playKeyTick();
                    seekTo(currentSec + 10, '+10s');
                  }}
                  aria-label="Forward 10 seconds"
                  className="inline-flex min-h-[36px] items-center gap-1 border border-[#244231] bg-[#111B15] px-2.5 py-1.5 font-mono text-xs text-[#B6CFC0] hover:border-emerald-400 active:translate-y-[1px]"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                  <span>+10</span>
                </button>

                {/* Volume Mute + Slider */}
                <div className="flex min-h-[36px] items-center gap-1.5 border border-[#244231] bg-[#111B15] px-2">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playKeyTick();
                      setMuted((m) => !m);
                    }}
                    aria-label={muted ? 'Unmute theater audio' : 'Mute theater audio'}
                    className="p-1 text-[#B6CFC0] hover:text-emerald-300"
                  >
                    {muted || volume === 0 ? (
                      <VolumeX className="h-3.5 w-3.5 text-amber-400" />
                    ) : (
                      <Volume2 className="h-3.5 w-3.5 text-emerald-400" />
                    )}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={muted ? 0 : volume}
                    aria-label="Audio volume"
                    onChange={(e) => {
                      const next = Number(e.target.value);
                      setVolume(next);
                      setMuted(next === 0);
                    }}
                    className="hidden h-1 w-16 cursor-pointer accent-emerald-400 sm:block"
                  />
                  <span className="hidden w-8 font-mono text-[10px] tabular-nums text-[#8AA896] md:inline">
                    {muted ? '0%' : `${Math.round(volume * 100)}%`}
                  </span>
                </div>
              </div>

              {/* Right: Speed, Loop, CC Subtitles, Settings, PiP, Fullscreen */}
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playKeyTick();
                    setLoopEnabled((v) => {
                      triggerFlash(!v ? 'LOOP ON' : 'LOOP OFF');
                      return !v;
                    });
                  }}
                  aria-label="Toggle loop playback"
                  aria-pressed={loopEnabled}
                  className={`inline-flex min-h-[36px] min-w-[36px] items-center justify-center border px-2 transition-colors active:translate-y-[1px] ${
                    loopEnabled
                      ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300'
                      : 'border-[#244231] bg-[#111B15] text-[#8AA896] hover:border-emerald-400 hover:text-emerald-300'
                  }`}
                >
                  <Repeat className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playKeyTick();
                    const idx = SPEEDS.indexOf(speed as (typeof SPEEDS)[number]);
                    const next = SPEEDS[(idx + 1) % SPEEDS.length];
                    setSpeed(next);
                    triggerFlash(`SPEED ${next}x`);
                  }}
                  aria-label="Cycle playback speed"
                  className="min-h-[36px] border border-[#244231] bg-[#111B15] px-2.5 py-1.5 font-mono text-xs tabular-nums text-emerald-300 hover:border-emerald-400 active:translate-y-[1px]"
                >
                  {speed}x
                </button>

                <button
                  type="button"
                  data-testid="theater-cc-btn"
                  onClick={() => {
                    soundEngine.playKeyTick();
                    setActivePopover((p) => (p === 'subtitles' ? 'none' : 'subtitles'));
                  }}
                  aria-label="Open subtitles menu"
                  aria-expanded={activePopover === 'subtitles'}
                  className={`inline-flex min-h-[36px] items-center gap-1.5 border px-2.5 py-1.5 font-mono text-xs transition-colors active:translate-y-[1px] ${
                    activePopover === 'subtitles' || subtitleSettings.trackId !== 'OFF'
                      ? 'border-emerald-400 bg-emerald-500/20 font-semibold text-emerald-300'
                      : 'border-[#244231] bg-[#111B15] text-[#B6CFC0] hover:border-emerald-400'
                  }`}
                >
                  <Subtitles className="h-3.5 w-3.5" />
                  <span>CC</span>
                  <span className="hidden text-[10px] opacity-85 sm:inline">
                    {subtitleSettings.trackId}
                  </span>
                </button>

                <button
                  type="button"
                  data-testid="theater-settings-btn"
                  onClick={() => {
                    soundEngine.playKeyTick();
                    setActivePopover((p) => (p === 'settings' ? 'none' : 'settings'));
                  }}
                  aria-label="Open player settings"
                  aria-expanded={activePopover === 'settings'}
                  className={`inline-flex min-h-[36px] items-center gap-1.5 border px-2.5 py-1.5 font-mono text-xs transition-colors active:translate-y-[1px] ${
                    activePopover === 'settings'
                      ? 'border-emerald-400 bg-emerald-500/20 font-semibold text-emerald-300'
                      : 'border-[#244231] bg-[#111B15] text-[#B6CFC0] hover:border-emerald-400'
                  }`}
                >
                  <Settings className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">SETTINGS</span>
                </button>

                {useHtmlVideo && typeof document !== 'undefined' && document.pictureInPictureEnabled && (
                  <button
                    type="button"
                    onClick={handlePictureInPicture}
                    aria-label="Toggle Picture-in-Picture"
                    className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center border border-[#244231] bg-[#111B15] px-2 text-[#B6CFC0] hover:border-emerald-400 hover:text-emerald-300"
                  >
                    <PictureInPicture2 className="h-3.5 w-3.5" />
                  </button>
                )}

                <button
                  type="button"
                  data-testid="theater-fullscreen-btn"
                  onClick={toggleFullscreen}
                  aria-label={isFullscreen ? 'Exit fullscreen mode' : 'Enter fullscreen mode'}
                  className={`inline-flex min-h-[36px] items-center gap-1.5 border px-2.5 py-1.5 font-mono text-xs font-semibold transition-colors active:translate-y-[1px] ${
                    isFullscreen
                      ? 'border-amber-400/70 bg-amber-500/15 text-amber-300'
                      : 'border-emerald-500/55 bg-emerald-500/10 text-emerald-300 hover:border-emerald-400 hover:bg-emerald-500/20'
                  }`}
                >
                  {isFullscreen ? (
                    <>
                      <Minimize className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">EXIT FULL</span>
                    </>
                  ) : (
                    <>
                      <Maximize className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">FULLSCREEN</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex shrink-0 items-center justify-between border-t border-[#1E3527] bg-[#0B120E] px-4 py-2.5 font-mono text-xs text-[#9BB8A7]">
            <span className="truncate">{preview.url}</span>
            <button
              type="button"
              onClick={handleClose}
              className="shrink-0 text-emerald-400 hover:underline"
            >
              RETURN TO CHAT
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
