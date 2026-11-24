import { useState } from 'react';
import { ExternalLink, Film, Image as ImageIcon, Maximize2, Play } from 'lucide-react';
import type { MediaPreview } from '../types';
import { soundEngine } from '../utils/soundEngine';

interface MediaPreviewCardProps {
  preview: MediaPreview;
  onExpand: (preview: MediaPreview) => void;
  compact?: boolean;
}

export function MediaPreviewCard({
  preview,
  onExpand,
  compact = false,
}: MediaPreviewCardProps) {
  const [imgFailed, setImgFailed] = useState(false);

  const handleOpen = () => {
    soundEngine.playSecureChime();
    onExpand(preview);
  };

  if (preview.kind === 'link') {
    return (
      <button
        type="button"
        onClick={handleOpen}
        aria-label={`Open encrypted link preview: ${preview.title}`}
        className="mt-2 flex w-full items-center justify-between gap-3 border border-[#CDD8D1] dark:border-[#244231] bg-[#EDF1EE] dark:bg-[#0F1914] px-3 py-2.5 text-left transition-all hover:border-emerald-600 dark:hover:border-emerald-400 active:translate-y-[1px]"
      >
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[11px] font-semibold tracking-wider text-emerald-800 dark:text-emerald-400">
            ENCRYPTED_LINK · {preview.domain}
          </div>
          <div className="mt-0.5 truncate text-xs text-[#2B3B31] dark:text-[#CBE0D3]">
            {preview.url}
          </div>
        </div>
        <ExternalLink className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
      </button>
    );
  }

  const isVideo = preview.kind === 'video' || preview.kind === 'embed';

  return (
    <button
      type="button"
      onClick={handleOpen}
      aria-label={`Expand ${preview.kind} preview in fullscreen theater: ${preview.title}`}
      className={`group mt-2.5 block w-full overflow-hidden border border-[#C1D2C7] dark:border-[#264834] bg-[#0B120E] text-left transition-all hover:border-emerald-600 dark:hover:border-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 active:scale-[0.995] ${
        compact ? 'max-w-sm' : 'max-w-lg'
      }`}
    >
      <div className="relative aspect-video w-full overflow-hidden bg-[#070B09]">
        {preview.posterUrl && !imgFailed ? (
          <img
            src={preview.posterUrl}
            alt={preview.title}
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#0D1A13] via-[#070B09] to-[#112319] p-4 text-emerald-400">
            {isVideo ? (
              <Film className="h-8 w-8 opacity-80" />
            ) : (
              <ImageIcon className="h-8 w-8 opacity-80" />
            )}
            <span className="mt-2 font-mono text-xs tracking-wider uppercase">
              {preview.domain}
            </span>
          </div>
        )}

        {/* Measured contrast scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/15" />

        {/* Center play / expand affordance */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-12 w-12 items-center justify-center border border-emerald-400/80 bg-[#070B09]/80 text-emerald-400 shadow-[0_0_24px_rgba(34,197,94,0.28)] transition-transform duration-200 group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-[#070B09]">
            {isVideo ? (
              <Play className="ml-0.5 h-5 w-5 fill-current" />
            ) : (
              <Maximize2 className="h-5 w-5" />
            )}
          </div>
        </div>

        {/* Bottom metadata bar inside media scrim */}
        <div className="absolute right-0 bottom-0 left-0 flex items-end justify-between gap-2 px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <div className="truncate font-mono text-xs font-semibold text-white">
              {preview.title}
            </div>
            <div className="mt-0.5 truncate font-mono text-[10px] text-emerald-300">
              <span>{isVideo ? 'INLINE STREAM' : 'IMAGE FRAME'}</span>
              <span aria-hidden="true"> · </span>
              <span>{preview.resolution ?? preview.domain}</span>
              {preview.duration && (
                <>
                  <span aria-hidden="true"> · </span>
                  <span>{preview.duration}</span>
                </>
              )}
            </div>
          </div>
          <span className="shrink-0 font-mono text-[10px] font-semibold tracking-wider text-emerald-300 uppercase">
            THEATER ↗
          </span>
        </div>
      </div>
    </button>
  );
}
