import { useMemo } from 'react';
import {
  ArrowBigDown,
  ArrowBigUp,
  MessageSquare,
  Plus,
  Search,
  Share2,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react';
import type { DossierPost, MediaCategory, MediaPreview } from '../types';
import { filterDossiers } from '../utils/dossierStore';
import { extractMediaPreviews } from '../utils/mediaParser';
import { soundEngine } from '../utils/soundEngine';
import { DossierFrame } from './DossierFrame';
import { MediaPreviewCard } from './MediaPreviewCard';
import { TypewriterText } from './TypewriterText';

interface FeedViewProps {
  posts: DossierPost[];
  categoryFilter: 'ALL' | MediaCategory;
  tagFilter: string | null;
  searchQuery: string;
  currentHandle: string;
  friendHandles: Set<string>;
  sentRequestHandles: Set<string>;
  onCategoryChange: (cat: 'ALL' | MediaCategory) => void;
  onTagFilterChange: (tag: string | null) => void;
  onSearchChange: (q: string) => void;
  onOpenNewDossier: () => void;
  onVote: (postId: string, dir: 'up' | 'down') => void;
  onOpenComments: (post: DossierPost) => void;
  onOpenShare: (post: DossierPost) => void;
  onAddFriend: (handle: string, code: string) => void;
  onExpandMedia: (preview: MediaPreview) => void;
}

const CATEGORIES: Array<{ id: 'ALL' | MediaCategory; label: string }> = [
  { id: 'ALL', label: 'ALL DOSSIERS' },
  { id: 'MOVIE', label: 'MOVIES' },
  { id: 'SERIES', label: 'TV SERIES' },
  { id: 'ANIME', label: 'ANIME' },
];

export function FeedView({
  posts,
  categoryFilter,
  tagFilter,
  searchQuery,
  currentHandle,
  friendHandles,
  sentRequestHandles,
  onCategoryChange,
  onTagFilterChange,
  onSearchChange,
  onOpenNewDossier,
  onVote,
  onOpenComments,
  onOpenShare,
  onAddFriend,
  onExpandMedia,
}: FeedViewProps) {
  const filteredPosts = useMemo(
    () =>
      filterDossiers(posts, {
        category: categoryFilter,
        tag: tagFilter,
        query: searchQuery,
      }),
    [posts, categoryFilter, tagFilter, searchQuery]
  );

  return (
    <div className="space-y-5">
      {/* Section Header + Primary CTA */}
      <div className="flex flex-col gap-3 border-b border-[#CDD8D1] pb-4 dark:border-[#1C2E24] sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="font-mono text-[11px] font-semibold tracking-wider text-emerald-700 dark:text-emerald-400">
            PUBLIC ARCHIVE // DOSSIERS
          </div>
          <h1 className="mt-1 font-mono text-xl font-bold tracking-tight text-[#111915] dark:text-[#E5F3EA] sm:text-2xl">
            <TypewriterText text="Active Cinema & Anime Briefings" speedMs={14} />
          </h1>
        </div>
        <button
          type="button"
          onClick={() => {
            soundEngine.playSecureChime();
            onOpenNewDossier();
          }}
          className="inline-flex min-h-[42px] shrink-0 items-center justify-center gap-2 border border-emerald-700 bg-emerald-700 px-4 py-2 font-mono text-xs font-semibold tracking-wider text-white transition-all hover:bg-emerald-800 dark:border-emerald-400 dark:bg-emerald-500/20 dark:text-emerald-300 dark:hover:bg-emerald-500/30 active:translate-y-[1px] whitespace-nowrap"
        >
          <Plus className="h-4 w-4" />
          <span>NEW DOSSIER</span>
        </button>
      </div>

      {/* Controls Bar: Category Filter + Search */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div
          role="tablist"
          aria-label="Filter dossiers by media category"
          className="flex flex-wrap items-center gap-1 border border-[#CDD8D1] bg-[#EDF1EE] p-1 dark:border-[#1D3226] dark:bg-[#0B120E]"
        >
          {CATEGORIES.map((cat) => {
            const active = categoryFilter === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  soundEngine.playKeyTick();
                  onCategoryChange(cat.id);
                }}
                className={`min-h-[36px] px-3 py-1.5 font-mono text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-emerald-700 text-white dark:bg-emerald-500/25 dark:text-emerald-300'
                    : 'text-[#43574B] hover:text-[#111915] dark:text-[#88A795] dark:hover:text-emerald-200'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        <div className="relative w-full lg:w-72">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#5D7266] dark:text-[#6C8A78]"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search dossiers, #tags, agents..."
            aria-label="Search public dossiers"
            className="min-h-[42px] w-full border border-[#CDD8D1] bg-white py-2 pr-3 pl-9 font-mono text-xs text-[#111915] placeholder:text-[#6B7F73] focus:border-emerald-600 focus:outline-none dark:border-[#1D3226] dark:bg-[#0B120E] dark:text-[#E0EFE6] dark:placeholder:text-[#5F7C6B] dark:focus:border-emerald-400"
          />
        </div>
      </div>

      {/* Quick Trending Tag Strip */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-y border-[#E1E9E4] py-2 font-mono text-xs dark:border-[#16271E]">
        <span className="text-[11px] font-semibold tracking-wider text-[#5D7266] dark:text-[#6C8A78]">
          HOT TAGS:
        </span>
        {['#Dune2', '#Severance', '#AttackOnTitan', '#GhostInTheShell', '#SciFi'].map(
          (tag) => {
            const selected = tagFilter?.toLowerCase() === tag.toLowerCase();
            return (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  soundEngine.playKeyTick();
                  onTagFilterChange(selected ? null : tag);
                }}
                className={`transition-colors whitespace-nowrap ${
                  selected
                    ? 'font-bold text-amber-700 underline underline-offset-4 dark:text-amber-400'
                    : 'text-emerald-700 hover:text-emerald-900 hover:underline dark:text-emerald-400/90 dark:hover:text-emerald-300'
                }`}
              >
                {tag}
              </button>
            );
          }
        )}
      </div>

      {/* Active Tag Filter Banner */}
      {tagFilter && (
        <div className="flex items-center justify-between border border-amber-500/40 bg-amber-50 px-3.5 py-2 font-mono text-xs text-amber-900 dark:bg-amber-950/25 dark:text-amber-300">
          <span>FILTER ACTIVE · TAG: {tagFilter}</span>
          <button
            type="button"
            onClick={() => {
              soundEngine.playKeyTick();
              onTagFilterChange(null);
            }}
            className="inline-flex items-center gap-1 font-semibold hover:underline"
          >
            <X className="h-3.5 w-3.5" />
            <span>CLEAR FILTER</span>
          </button>
        </div>
      )}

      {/* Feed List */}
      {filteredPosts.length === 0 ? (
        <DossierFrame tabLabel="NO MATCHING RECORDS" tabAccent="amber">
          <div className="py-8 text-center">
            <p className="font-mono text-sm text-[#43574B] dark:text-[#9BB8A7]">
              No dossiers match your current filter criteria.
            </p>
            <button
              type="button"
              onClick={() => {
                soundEngine.playKeyTick();
                onCategoryChange('ALL');
                onTagFilterChange(null);
                onSearchChange('');
              }}
              className="mt-4 inline-flex min-h-[40px] items-center border border-emerald-700 px-4 py-2 font-mono text-xs font-semibold text-emerald-800 hover:bg-emerald-700/10 dark:border-emerald-400 dark:text-emerald-300"
            >
              RESET FILTERS
            </button>
          </div>
        </DossierFrame>
      ) : (
        <div className="space-y-5">
          {filteredPosts.map((post, idx) => {
            const previews = extractMediaPreviews(post.body);
            const isOwn = post.authorHandle === currentHandle;
            const isFriend = friendHandles.has(post.authorHandle);
            const isRequested = sentRequestHandles.has(post.authorHandle);
            const tabAccent =
              post.classification === 'EYES_ONLY'
                ? 'amber'
                : post.classification === 'FIELD_BRIEF'
                  ? 'crimson'
                  : 'green';

            return (
              <article key={post.id} className="animate-fade-slide">
                <DossierFrame
                  tabLabel={`${post.fileCode} · ${post.category} · ${post.classification}`}
                  tabAccent={tabAccent}
                >
                  {/* Author & Metadata Header (Unboxed Typography) */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E1E9E4] pb-3 dark:border-[#182920]">
                    <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                      <span className="font-semibold text-emerald-800 dark:text-emerald-400">
                        {post.authorHandle}
                      </span>
                      <span className="text-[#697E72] dark:text-[#6A8876]" aria-hidden="true">
                        ·
                      </span>
                      <span className="text-[#5D7266] dark:text-[#789684]">
                        {post.authorCode}
                      </span>
                      <span className="text-[#697E72] dark:text-[#6A8876]" aria-hidden="true">
                        ·
                      </span>
                      <span className="text-[#5D7266] dark:text-[#789684]">
                        {post.createdAt}
                      </span>
                    </div>

                    {!isOwn && (
                      <button
                        type="button"
                        disabled={isFriend || isRequested}
                        onClick={() => {
                          soundEngine.playConfirmBeep();
                          onAddFriend(post.authorHandle, post.authorCode);
                        }}
                        aria-label={
                          isFriend
                            ? `${post.authorHandle} is already in your friends list`
                            : isRequested
                              ? `Friend request sent to ${post.authorHandle}`
                              : `Add ${post.authorHandle} as friend`
                        }
                        className={`inline-flex min-h-[34px] items-center gap-1.5 border px-2.5 py-1 font-mono text-[11px] font-medium transition-all whitespace-nowrap ${
                          isFriend
                            ? 'border-emerald-600/30 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-950/30 dark:text-emerald-400'
                            : isRequested
                              ? 'border-amber-500/40 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300'
                              : 'border-[#CDD8D1] bg-[#F5F8F6] text-[#1D2D24] hover:border-emerald-600 hover:text-emerald-800 dark:border-[#244231] dark:bg-[#101A14] dark:text-[#CBE0D3] dark:hover:border-emerald-400 dark:hover:text-emerald-300 active:translate-y-[1px]'
                        }`}
                      >
                        {isFriend ? (
                          <>
                            <UserCheck className="h-3.5 w-3.5" />
                            <span>FRIEND</span>
                          </>
                        ) : isRequested ? (
                          <span>REQUEST SENT</span>
                        ) : (
                          <>
                            <UserPlus className="h-3.5 w-3.5" />
                            <span>ADD FRIEND</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Dossier Title & Briefing Body */}
                  <div className="mt-3.5">
                    <h2 className="font-mono text-base font-bold leading-snug text-[#111915] dark:text-[#E8F5ED] sm:text-lg">
                      {post.title}
                    </h2>
                    <p className="mt-2 break-words whitespace-pre-wrap [overflow-wrap:anywhere] text-[15px] leading-relaxed text-[#2C3E34] dark:text-[#B5CEC0]">
                      {post.body}
                    </p>

                    {/* Automatic Inline Media Previews */}
                    {previews.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {previews.map((preview) => (
                          <MediaPreviewCard
                            key={preview.url}
                            preview={preview}
                            onExpand={onExpandMedia}
                          />
                        ))}
                      </div>
                    )}

                    {/* Interactive Media Tags (Clean Typographic Links) */}
                    <div className="mt-3.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs">
                      {post.tags.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            soundEngine.playKeyTick();
                            onTagFilterChange(tagFilter === tag ? null : tag);
                          }}
                          className={`transition-colors hover:underline ${
                            tagFilter === tag
                              ? 'font-bold text-amber-700 dark:text-amber-400'
                              : 'text-emerald-700 dark:text-emerald-400'
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#E1E9E4] pt-3 dark:border-[#182920]">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playConfirmBeep();
                          onVote(post.id, 'up');
                        }}
                        aria-label={`Upvote dossier ${post.fileCode} (${post.upvotes})`}
                        aria-pressed={post.userVote === 'up'}
                        className={`inline-flex min-h-[38px] items-center gap-1.5 border px-3 py-1.5 font-mono text-xs font-semibold transition-all active:translate-y-[1px] ${
                          post.userVote === 'up'
                            ? 'border-emerald-600 bg-emerald-700 text-white dark:border-emerald-400 dark:bg-emerald-500/25 dark:text-emerald-300'
                            : 'border-[#CDD8D1] bg-[#F5F8F6] text-[#283B30] hover:border-emerald-600 dark:border-[#223B2C] dark:bg-[#0F1914] dark:text-[#B4CEBF] dark:hover:border-emerald-400'
                        }`}
                      >
                        <ArrowBigUp className="h-4 w-4" />
                        <span>{post.upvotes}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playKeyTick();
                          onVote(post.id, 'down');
                        }}
                        aria-label={`Downvote dossier ${post.fileCode} (${post.downvotes})`}
                        aria-pressed={post.userVote === 'down'}
                        className={`inline-flex min-h-[38px] items-center gap-1.5 border px-3 py-1.5 font-mono text-xs font-semibold transition-all active:translate-y-[1px] ${
                          post.userVote === 'down'
                            ? 'border-red-600 bg-red-600 text-white dark:border-red-400 dark:bg-red-500/25 dark:text-red-300'
                            : 'border-[#CDD8D1] bg-[#F5F8F6] text-[#283B30] hover:border-red-500 dark:border-[#223B2C] dark:bg-[#0F1914] dark:text-[#B4CEBF] dark:hover:border-red-400'
                        }`}
                      >
                        <ArrowBigDown className="h-4 w-4" />
                        <span>{post.downvotes}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playKeyTick();
                          onOpenComments(post);
                        }}
                        aria-label={`Open comments thread for ${post.fileCode} (${post.comments.length} comments)`}
                        className="inline-flex min-h-[38px] items-center gap-1.5 border border-[#CDD8D1] bg-[#F5F8F6] px-3 py-1.5 font-mono text-xs font-medium text-[#283B30] transition-all hover:border-emerald-600 dark:border-[#223B2C] dark:bg-[#0F1914] dark:text-[#B4CEBF] dark:hover:border-emerald-400 active:translate-y-[1px]"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>{post.comments.length}</span>
                        <span className="hidden sm:inline">COMMENTS</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playSecureChime();
                        onOpenShare(post);
                      }}
                      aria-label={`Share dossier ${post.fileCode}`}
                      className="inline-flex min-h-[38px] items-center gap-1.5 border border-[#CDD8D1] bg-[#F5F8F6] px-3 py-1.5 font-mono text-xs font-medium text-[#283B30] transition-all hover:border-emerald-600 dark:border-[#223B2C] dark:bg-[#0F1914] dark:text-[#B4CEBF] dark:hover:border-emerald-400 active:translate-y-[1px]"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      <span>SHARE</span>
                    </button>
                  </div>
                </DossierFrame>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
