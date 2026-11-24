import { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  MessageSquare,
  Radio,
  Send,
  Share2,
  X,
} from 'lucide-react';
import type {
  DossierPost,
  Friend,
  MediaCategory,
  MediaPreview,
  WatchLobby,
} from '../types';
import {
  normalizeTags,
  validateDossierInput,
  validateLobbyInput,
} from '../utils/dossierStore';
import {
  ASSET_POSTERS,
  extractMediaPreviews,
  generateBrandedShortLink,
} from '../utils/mediaParser';
import { soundEngine } from '../utils/soundEngine';
import { MediaPreviewCard } from './MediaPreviewCard';

/* -------------------------------------------------------------------------- */
/* 1. NEW DOSSIER MODAL                                                        */
/* -------------------------------------------------------------------------- */
interface NewDossierModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (data: {
    title: string;
    body: string;
    category: MediaCategory;
    tags: string[];
    classification: DossierPost['classification'];
  }) => void;
}

export function NewDossierModal({
  open,
  onClose,
  onCreate,
}: NewDossierModalProps) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<MediaCategory>('MOVIE');
  const [tagsRaw, setTagsRaw] = useState('#Dune2 #SciFi');
  const [classification, setClassification] =
    useState<DossierPost['classification']>('DECLASSIFIED');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const check = validateDossierInput({ title, body, tagsRaw });
    if (!check.valid) {
      soundEngine.playErrorBuzz();
      setError(check.error ?? 'Invalid dossier fields.');
      return;
    }
    soundEngine.playConfirmBeep();
    onCreate({
      title: title.trim(),
      body: body.trim(),
      category,
      tags: normalizeTags(tagsRaw),
      classification,
    });
    setTitle('');
    setBody('');
    setTagsRaw('#Severance');
    setError(null);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-dossier-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="animate-modal-pop w-full max-w-xl border border-[#CDD8D1] bg-white shadow-2xl dark:border-emerald-500/45 dark:bg-[#0B120E]"
      >
        <div className="flex items-center justify-between border-b border-[#CDD8D1] bg-[#F5F8F6] px-5 py-3.5 dark:border-[#1C2E24] dark:bg-[#0F1914]">
          <h2
            id="new-dossier-title"
            className="font-mono text-sm font-bold tracking-wider text-emerald-800 dark:text-emerald-400"
          >
            + NEW DOSSIER // FILE BRIEFING
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close new dossier dialog"
            className="p-1 text-[#5D7266] hover:text-[#111915] dark:text-[#88A795] dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {error && (
            <div
              role="alert"
              className="border border-red-500/40 bg-red-50 px-3 py-2 font-mono text-xs text-red-700 dark:bg-red-950/35 dark:text-red-300"
            >
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="dossier-title-input"
              className="block font-mono text-xs font-semibold text-[#43574B] dark:text-[#9BB8A7]"
            >
              DOSSIER SUBJECT / TITLE
            </label>
            <input
              id="dossier-title-input"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setError(null);
              }}
              placeholder="e.g. Severance S02E05 — Testing Floor Door Analysis"
              className="mt-1.5 min-h-[42px] w-full border border-[#CDD8D1] bg-[#F8FAF8] px-3 font-mono text-xs text-[#111915] focus:border-emerald-600 focus:outline-none dark:border-[#244231] dark:bg-[#070B09] dark:text-[#E0EFE6] dark:focus:border-emerald-400"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="dossier-category-select"
                className="block font-mono text-xs font-semibold text-[#43574B] dark:text-[#9BB8A7]"
              >
                MEDIA CATEGORY
              </label>
              <select
                id="dossier-category-select"
                value={category}
                onChange={(e) => setCategory(e.target.value as MediaCategory)}
                className="mt-1.5 min-h-[42px] w-full border border-[#CDD8D1] bg-[#F8FAF8] px-3 font-mono text-xs text-[#111915] focus:border-emerald-600 focus:outline-none dark:border-[#244231] dark:bg-[#070B09] dark:text-[#E0EFE6] dark:focus:border-emerald-400"
              >
                <option value="MOVIE">MOVIE</option>
                <option value="SERIES">TV SERIES</option>
                <option value="ANIME">ANIME</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="dossier-class-select"
                className="block font-mono text-xs font-semibold text-[#43574B] dark:text-[#9BB8A7]"
              >
                CLEARANCE STAMP
              </label>
              <select
                id="dossier-class-select"
                value={classification}
                onChange={(e) =>
                  setClassification(
                    e.target.value as DossierPost['classification']
                  )
                }
                className="mt-1.5 min-h-[42px] w-full border border-[#CDD8D1] bg-[#F8FAF8] px-3 font-mono text-xs text-[#111915] focus:border-emerald-600 focus:outline-none dark:border-[#244231] dark:bg-[#070B09] dark:text-[#E0EFE6] dark:focus:border-emerald-400"
              >
                <option value="DECLASSIFIED">DECLASSIFIED</option>
                <option value="EYES_ONLY">EYES_ONLY</option>
                <option value="FIELD_BRIEF">FIELD_BRIEF</option>
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="dossier-body-input"
              className="block font-mono text-xs font-semibold text-[#43574B] dark:text-[#9BB8A7]"
            >
              BRIEFING TEXT (URLS AUTO-GENERATE INLINE PREVIEWS)
            </label>
            <textarea
              id="dossier-body-input"
              rows={4}
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                setError(null);
              }}
              placeholder="Write your analysis, theory, or drop a stream/frame URL..."
              className="mt-1.5 w-full border border-[#CDD8D1] bg-[#F8FAF8] p-3 text-sm text-[#111915] focus:border-emerald-600 focus:outline-none dark:border-[#244231] dark:bg-[#070B09] dark:text-[#E0EFE6] dark:focus:border-emerald-400"
            />
          </div>

          <div>
            <label
              htmlFor="dossier-tags-input"
              className="block font-mono text-xs font-semibold text-[#43574B] dark:text-[#9BB8A7]"
            >
              MEDIA TAGS (SPACE OR COMMA SEPARATED)
            </label>
            <input
              id="dossier-tags-input"
              type="text"
              value={tagsRaw}
              onChange={(e) => setTagsRaw(e.target.value)}
              placeholder="#AttackOnTitan #Dune2 #Severance"
              className="mt-1.5 min-h-[42px] w-full border border-[#CDD8D1] bg-[#F8FAF8] px-3 font-mono text-xs text-[#111915] focus:border-emerald-600 focus:outline-none dark:border-[#244231] dark:bg-[#070B09] dark:text-[#E0EFE6] dark:focus:border-emerald-400"
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-[#E1E9E4] pt-4 dark:border-[#182920]">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] border border-[#CDD8D1] px-4 font-mono text-xs font-semibold text-[#43574B] hover:border-[#9AB5A4] dark:border-[#244231] dark:text-[#9BB8A7]"
            >
              CANCEL
            </button>
            <button
              type="submit"
              className="min-h-[40px] border border-emerald-700 bg-emerald-700 px-4 font-mono text-xs font-semibold text-white hover:bg-emerald-800 dark:border-emerald-400 dark:bg-emerald-500/20 dark:text-emerald-300 dark:hover:bg-emerald-500/30"
            >
              PUBLISH DOSSIER
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. HOST WATCH LOBBY MODAL                                                   */
/* -------------------------------------------------------------------------- */
interface HostLobbyModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (data: {
    title: string;
    mediaTitle: string;
    category: MediaCategory;
    streamUrl: string;
    status: 'LIVE' | 'WAITING_ROOM';
    description: string;
    posterUrl: string;
  }) => void;
}

const STREAM_PRESETS = [
  {
    label: 'Dune 2 70mm Relay',
    mediaTitle: 'Dune: Part Two (2024)',
    category: 'MOVIE' as MediaCategory,
    url: 'https://stream.cnet.local/stream/dune2-imax-70mm.m3u8',
    poster: ASSET_POSTERS.desert,
  },
  {
    label: 'Severance S02E04',
    mediaTitle: 'Severance — S02E04',
    category: 'SERIES' as MediaCategory,
    url: 'https://stream.cnet.local/stream/severance-s02e04.mp4',
    poster: ASSET_POSTERS.office,
  },
  {
    label: 'AoT Final Chapters',
    mediaTitle: 'Attack on Titan: Final Chapters',
    category: 'ANIME' as MediaCategory,
    url: 'https://stream.cnet.local/stream/aot-final-citadel.mp4',
    poster: ASSET_POSTERS.citadel,
  },
];

export function HostLobbyModal({
  open,
  onClose,
  onCreate,
}: HostLobbyModalProps) {
  const [title, setTitle] = useState('');
  const [mediaTitle, setMediaTitle] = useState('');
  const [category, setCategory] = useState<MediaCategory>('ANIME');
  const [streamUrl, setStreamUrl] = useState(
    'https://stream.cnet.local/stream/aot-final-citadel.mp4'
  );
  const [status, setStatus] = useState<'LIVE' | 'WAITING_ROOM'>('LIVE');
  const [description, setDescription] = useState('');
  const [posterUrl, setPosterUrl] = useState<string>(ASSET_POSTERS.citadel);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const check = validateLobbyInput({ title, mediaTitle, streamUrl });
    if (!check.valid) {
      soundEngine.playErrorBuzz();
      setError(check.error ?? 'Invalid lobby configuration.');
      return;
    }
    soundEngine.playSecureChime();
    onCreate({
      title: title.trim(),
      mediaTitle: mediaTitle.trim(),
      category,
      streamUrl: streamUrl.trim(),
      status,
      description:
        description.trim() ||
        'Synced P2P screening room with live timecode chat.',
      posterUrl,
    });
    setTitle('');
    setMediaTitle('');
    setDescription('');
    setError(null);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="host-lobby-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="animate-modal-pop w-full max-w-xl border border-[#CDD8D1] bg-white shadow-2xl dark:border-emerald-500/45 dark:bg-[#0B120E]"
      >
        <div className="flex items-center justify-between border-b border-[#CDD8D1] bg-[#F5F8F6] px-5 py-3.5 dark:border-[#1C2E24] dark:bg-[#0F1914]">
          <h2
            id="host-lobby-title"
            className="flex items-center gap-2 font-mono text-sm font-bold tracking-wider text-emerald-800 dark:text-emerald-400"
          >
            <Radio className="h-4 w-4" />
            <span>+ HOST WATCH LOBBY</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close host watch lobby dialog"
            className="p-1 text-[#5D7266] hover:text-[#111915] dark:text-[#88A795] dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {error && (
            <div
              role="alert"
              className="border border-red-500/40 bg-red-50 px-3 py-2 font-mono text-xs text-red-700 dark:bg-red-950/35 dark:text-red-300"
            >
              {error}
            </div>
          )}

          {/* Quick Stream Presets */}
          <div>
            <div className="font-mono text-[11px] font-semibold text-[#5D7266] dark:text-[#789684]">
              QUICK FILL VERIFIED RELAY PRESET:
            </div>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {STREAM_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    soundEngine.playKeyTick();
                    setMediaTitle(preset.mediaTitle);
                    setCategory(preset.category);
                    setStreamUrl(preset.url);
                    setPosterUrl(preset.poster);
                    if (!title) setTitle(`${preset.label} Watch Party`);
                    setError(null);
                  }}
                  className="border border-[#CDD8D1] bg-[#F5F8F6] px-2.5 py-1 font-mono text-[11px] text-emerald-800 hover:border-emerald-600 dark:border-[#244231] dark:bg-[#101A14] dark:text-emerald-300"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="lobby-title-input"
                className="block font-mono text-xs font-semibold text-[#43574B] dark:text-[#9BB8A7]"
              >
                LOBBY NAME
              </label>
              <input
                id="lobby-title-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Late Night Anime Sync"
                className="mt-1.5 min-h-[42px] w-full border border-[#CDD8D1] bg-[#F8FAF8] px-3 font-mono text-xs text-[#111915] focus:border-emerald-600 focus:outline-none dark:border-[#244231] dark:bg-[#070B09] dark:text-[#E0EFE6]"
              />
            </div>
            <div>
              <label
                htmlFor="lobby-media-input"
                className="block font-mono text-xs font-semibold text-[#43574B] dark:text-[#9BB8A7]"
              >
                MOVIE / SERIES / ANIME TITLE
              </label>
              <input
                id="lobby-media-input"
                type="text"
                value={mediaTitle}
                onChange={(e) => setMediaTitle(e.target.value)}
                placeholder="e.g. Attack on Titan Final"
                className="mt-1.5 min-h-[42px] w-full border border-[#CDD8D1] bg-[#F8FAF8] px-3 font-mono text-xs text-[#111915] focus:border-emerald-600 focus:outline-none dark:border-[#244231] dark:bg-[#070B09] dark:text-[#E0EFE6]"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="lobby-stream-url"
              className="block font-mono text-xs font-semibold text-[#43574B] dark:text-[#9BB8A7]"
            >
              SYNCED STREAM / VIDEO URL
            </label>
            <input
              id="lobby-stream-url"
              type="text"
              value={streamUrl}
              onChange={(e) => setStreamUrl(e.target.value)}
              placeholder="https://stream.cnet.local/stream/..."
              className="mt-1.5 min-h-[42px] w-full border border-[#CDD8D1] bg-[#F8FAF8] px-3 font-mono text-xs text-[#111915] focus:border-emerald-600 focus:outline-none dark:border-[#244231] dark:bg-[#070B09] dark:text-[#E0EFE6]"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="lobby-category"
                className="block font-mono text-xs font-semibold text-[#43574B] dark:text-[#9BB8A7]"
              >
                CATEGORY
              </label>
              <select
                id="lobby-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as MediaCategory)}
                className="mt-1.5 min-h-[42px] w-full border border-[#CDD8D1] bg-[#F8FAF8] px-3 font-mono text-xs text-[#111915] dark:border-[#244231] dark:bg-[#070B09] dark:text-[#E0EFE6]"
              >
                <option value="MOVIE">MOVIE</option>
                <option value="SERIES">TV SERIES</option>
                <option value="ANIME">ANIME</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="lobby-status"
                className="block font-mono text-xs font-semibold text-[#43574B] dark:text-[#9BB8A7]"
              >
                INITIAL ROOM STATE
              </label>
              <select
                id="lobby-status"
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as 'LIVE' | 'WAITING_ROOM')
                }
                className="mt-1.5 min-h-[42px] w-full border border-[#CDD8D1] bg-[#F8FAF8] px-3 font-mono text-xs text-[#111915] dark:border-[#244231] dark:bg-[#070B09] dark:text-[#E0EFE6]"
              >
                <option value="LIVE">[LIVE] NOW PLAYING</option>
                <option value="WAITING_ROOM">WAITING ROOM</option>
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="lobby-desc"
              className="block font-mono text-xs font-semibold text-[#43574B] dark:text-[#9BB8A7]"
            >
              HOST BRIEFING (OPTIONAL)
            </label>
            <input
              id="lobby-desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Subtitle tracks, audio spec, spoiler policy..."
              className="mt-1.5 min-h-[42px] w-full border border-[#CDD8D1] bg-[#F8FAF8] px-3 text-xs text-[#111915] dark:border-[#244231] dark:bg-[#070B09] dark:text-[#E0EFE6]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-[#E1E9E4] pt-4 dark:border-[#182920]">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] border border-[#CDD8D1] px-4 font-mono text-xs font-semibold text-[#43574B] dark:border-[#244231] dark:text-[#9BB8A7]"
            >
              CANCEL
            </button>
            <button
              type="submit"
              className="min-h-[40px] border border-emerald-700 bg-emerald-700 px-4 font-mono text-xs font-semibold text-white hover:bg-emerald-800 dark:border-emerald-400 dark:bg-emerald-500/20 dark:text-emerald-300 dark:hover:bg-emerald-500/30"
            >
              OPEN WATCH LOBBY
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. COMMENTS THREAD DRAWER                                                   */
/* -------------------------------------------------------------------------- */
interface CommentsDrawerProps {
  post: DossierPost | null;
  onClose: () => void;
  onAddComment: (postId: string, text: string) => void;
  onExpandMedia: (preview: MediaPreview) => void;
}

export function CommentsDrawer({
  post,
  onClose,
  onAddComment,
  onExpandMedia,
}: CommentsDrawerProps) {
  const [draft, setDraft] = useState('');

  if (!post) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;
    soundEngine.playConfirmBeep();
    onAddComment(post.id, trimmed);
    setDraft('');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Comments thread for ${post.fileCode}`}
      className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-xs"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="animate-drawer-in flex h-full w-full max-w-lg flex-col border-l border-[#CDD8D1] bg-white shadow-2xl dark:border-emerald-500/40 dark:bg-[#0B120E]"
      >
        <div className="flex items-center justify-between border-b border-[#CDD8D1] bg-[#F5F8F6] px-5 py-3.5 dark:border-[#1C2E24] dark:bg-[#0F1914]">
          <div className="min-w-0">
            <div className="font-mono text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
              THREAD DRAWER · {post.fileCode}
            </div>
            <h2 className="truncate font-mono text-sm font-bold text-[#111915] dark:text-[#E8F5ED]">
              {post.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close comments drawer"
            className="p-1.5 text-[#5D7266] hover:text-[#111915] dark:text-[#88A795] dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {post.comments.length === 0 ? (
            <div className="border border-dashed border-[#CDD8D1] p-6 text-center font-mono text-xs text-[#5D7266] dark:border-[#244231] dark:text-[#789684]">
              No intelligence notes logged on this file yet. Add the first
              entry below.
            </div>
          ) : (
            post.comments.map((comment) => {
              const previews = extractMediaPreviews(comment.text);
              return (
                <div
                  key={comment.id}
                  className="border border-[#E1E9E4] bg-[#F8FAF8] p-3.5 dark:border-[#1B2E23] dark:bg-[#0F1914]"
                >
                  <div className="flex items-center justify-between font-mono text-[11px]">
                    <span className="font-semibold text-emerald-800 dark:text-emerald-400">
                      {comment.authorHandle}{' '}
                      <span className="font-normal text-[#5D7266] dark:text-[#789684]">
                        · {comment.authorCode}
                      </span>
                    </span>
                    <span className="text-[#5D7266] dark:text-[#789684]">
                      {comment.createdAt}
                    </span>
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-[#2C3E34] dark:text-[#CBE0D3]">
                    {comment.text}
                  </p>
                  {previews.map((p) => (
                    <MediaPreviewCard
                      key={p.url}
                      preview={p}
                      onExpand={onExpandMedia}
                      compact
                    />
                  ))}
                </div>
              );
            })
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 border-t border-[#CDD8D1] bg-[#F5F8F6] p-4 dark:border-[#1C2E24] dark:bg-[#0F1914]"
        >
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Append comment or media URL to thread..."
            aria-label="New comment text"
            className="min-h-[42px] flex-1 border border-[#CDD8D1] bg-white px-3 font-mono text-xs text-[#111915] focus:border-emerald-600 focus:outline-none dark:border-[#244231] dark:bg-[#070B09] dark:text-[#E0EFE6]"
          />
          <button
            type="submit"
            aria-label="Post comment"
            className="inline-flex min-h-[42px] items-center gap-1.5 border border-emerald-700 bg-emerald-700 px-3.5 font-mono text-xs font-semibold text-white hover:bg-emerald-800 dark:border-emerald-400 dark:bg-emerald-500/20 dark:text-emerald-300"
          >
            <Send className="h-3.5 w-3.5" />
            <span>POST</span>
          </button>
        </form>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. SHARE DOSSIER MODAL (Copy Encrypted Link, Send to Lobby, Send via DM)   */
/* -------------------------------------------------------------------------- */
interface ShareDossierModalProps {
  post: DossierPost | null;
  lobbies: WatchLobby[];
  friends: Friend[];
  relayDomain: string;
  onClose: () => void;
  onShareToLobby: (post: DossierPost, lobbyId: string, link: string) => void;
  onShareToFriend: (post: DossierPost, friendId: string, link: string) => void;
}

export function ShareDossierModal({
  post,
  lobbies,
  friends,
  relayDomain,
  onClose,
  onShareToLobby,
  onShareToFriend,
}: ShareDossierModalProps) {
  const [copied, setCopied] = useState(false);
  const [sentNotice, setSentNotice] = useState<string | null>(null);

  useEffect(() => {
    setCopied(false);
    setSentNotice(null);
  }, [post]);

  if (!post) return null;

  const encryptedLink = generateBrandedShortLink(
    'dossier',
    relayDomain,
    post.id.replace(/[^a-z0-9]/gi, '').slice(-6)
  );

  const handleCopy = () => {
    soundEngine.playConfirmBeep();
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(encryptedLink).catch(() => {});
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-dossier-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="animate-modal-pop w-full max-w-lg border border-[#CDD8D1] bg-white shadow-2xl dark:border-emerald-500/45 dark:bg-[#0B120E]"
      >
        <div className="flex items-center justify-between border-b border-[#CDD8D1] bg-[#F5F8F6] px-5 py-3.5 dark:border-[#1C2E24] dark:bg-[#0F1914]">
          <h2
            id="share-dossier-title"
            className="flex items-center gap-2 font-mono text-sm font-bold text-emerald-800 dark:text-emerald-400"
          >
            <Share2 className="h-4 w-4" />
            <span>SHARE DOSSIER · {post.fileCode}</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close share modal"
            className="p-1 text-[#5D7266] hover:text-[#111915] dark:text-[#88A795] dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          {sentNotice && (
            <div className="border border-emerald-600/40 bg-emerald-50 px-3 py-2 font-mono text-xs text-emerald-900 dark:bg-emerald-950/35 dark:text-emerald-300">
              {sentNotice}
            </div>
          )}

          {/* Copy Encrypted Link */}
          <div>
            <div className="font-mono text-[11px] font-semibold text-[#5D7266] dark:text-[#789684]">
              ENCRYPTED_LINK
            </div>
            <div className="mt-1.5 flex gap-2">
              <input
                type="text"
                readOnly
                value={encryptedLink}
                aria-label="Encrypted dossier link"
                className="min-h-[40px] flex-1 border border-[#CDD8D1] bg-[#F8FAF8] px-3 font-mono text-xs text-[#111915] dark:border-[#244231] dark:bg-[#070B09] dark:text-emerald-300"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex min-h-[40px] items-center gap-1.5 border border-emerald-700 bg-emerald-700 px-3.5 font-mono text-xs font-semibold text-white hover:bg-emerald-800 dark:border-emerald-400 dark:bg-emerald-500/20 dark:text-emerald-300"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? 'COPIED' : 'COPY LINK'}</span>
              </button>
            </div>
          </div>

          {/* Send to Watch Lobby */}
          <div>
            <div className="font-mono text-[11px] font-semibold text-[#5D7266] dark:text-[#789684]">
              SEND TO WATCH LOBBY OR CLUB
            </div>
            <div className="mt-2 max-h-36 space-y-1.5 overflow-y-auto">
              {lobbies.map((lobby) => (
                <button
                  key={lobby.id}
                  type="button"
                  onClick={() => {
                    soundEngine.playConfirmBeep();
                    onShareToLobby(post, lobby.id, encryptedLink);
                    setSentNotice(`Dispatched ${post.fileCode} to ${lobby.title}.`);
                  }}
                  className="flex w-full items-center justify-between border border-[#E1E9E4] bg-[#F8FAF8] px-3 py-2 text-left font-mono text-xs hover:border-emerald-600 dark:border-[#1D3226] dark:bg-[#0F1914] dark:hover:border-emerald-400"
                >
                  <span className="truncate font-semibold text-[#111915] dark:text-[#E0EFE6]">
                    {lobby.code} · {lobby.title}
                  </span>
                  <span className="ml-2 shrink-0 text-emerald-700 dark:text-emerald-400">
                    DISPATCH →
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Send via P2P DM */}
          <div>
            <div className="font-mono text-[11px] font-semibold text-[#5D7266] dark:text-[#789684]">
              SEND VIA P2P DIRECT MESSAGE
            </div>
            <div className="mt-2 max-h-36 space-y-1.5 overflow-y-auto">
              {friends.map((friend) => (
                <button
                  key={friend.id}
                  type="button"
                  onClick={() => {
                    soundEngine.playConfirmBeep();
                    onShareToFriend(post, friend.id, encryptedLink);
                    setSentNotice(`Transmitted ${post.fileCode} via E2E P2P to ${friend.handle}.`);
                  }}
                  className="flex w-full items-center justify-between border border-[#E1E9E4] bg-[#F8FAF8] px-3 py-2 text-left font-mono text-xs hover:border-emerald-600 dark:border-[#1D3226] dark:bg-[#0F1914] dark:hover:border-emerald-400"
                >
                  <span className="flex items-center gap-2 font-semibold text-[#111915] dark:text-[#E0EFE6]">
                    <MessageSquare className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
                    <span>{friend.handle}</span>
                  </span>
                  <span className="shrink-0 text-emerald-700 dark:text-emerald-400">
                    SEND DM →
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
