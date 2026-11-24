import { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Check,
  Radio,
  Search,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import type { DiscoverableAgent, WatchLobby } from '../types';
import { TRENDING_TAGS } from '../data/seedData';
import { soundEngine } from '../utils/soundEngine';
import { DossierFrame } from './DossierFrame';
import { TypewriterText } from './TypewriterText';

interface ExploreViewProps {
  lobbies: WatchLobby[];
  agents: DiscoverableAgent[];
  friendHandles: Set<string>;
  sentRequestHandles: Set<string>;
  onSelectTag: (tag: string) => void;
  onOpenLobby: (lobbyId: string) => void;
  onToggleJoinClub: (lobbyId: string) => void;
  onAddFriend: (handle: string, code: string) => void;
}

export function ExploreView({
  lobbies,
  agents,
  friendHandles,
  sentRequestHandles,
  onSelectTag,
  onOpenLobby,
  onToggleJoinClub,
  onAddFriend,
}: ExploreViewProps) {
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();

  const activeLobbies = useMemo(
    () =>
      lobbies.filter(
        (l) =>
          l.kind === 'LOBBY' &&
          (!q ||
            l.title.toLowerCase().includes(q) ||
            l.mediaTitle.toLowerCase().includes(q) ||
            l.tags.some((t) => t.toLowerCase().includes(q)))
      ),
    [lobbies, q]
  );

  const clubs = useMemo(
    () =>
      lobbies.filter(
        (l) =>
          l.kind === 'CLUB' &&
          (!q ||
            l.title.toLowerCase().includes(q) ||
            l.description.toLowerCase().includes(q) ||
            l.tags.some((t) => t.toLowerCase().includes(q)))
      ),
    [lobbies, q]
  );

  const filteredAgents = useMemo(
    () =>
      agents.filter(
        (a) =>
          !q ||
          a.handle.toLowerCase().includes(q) ||
          a.specialty.toLowerCase().includes(q) ||
          a.favoriteTag.toLowerCase().includes(q)
      ),
    [agents, q]
  );

  const filteredTags = useMemo(
    () =>
      TRENDING_TAGS.filter((t) => !q || t.tag.toLowerCase().includes(q)),
    [q]
  );

  return (
    <div className="space-y-6">
      {/* Header + Global Explore Search */}
      <div className="flex flex-col gap-3 border-b border-[#CDD8D1] pb-4 dark:border-[#1C2E24] sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="font-mono text-[11px] font-semibold tracking-wider text-emerald-700 dark:text-emerald-400">
            DIRECTORY // NETWORK RADAR
          </div>
          <h1 className="mt-1 font-mono text-xl font-bold tracking-tight text-[#111915] dark:text-[#E5F3EA] sm:text-2xl">
            <TypewriterText text="Explore Lobbies, Clubs & Agents" speedMs={14} />
          </h1>
        </div>
        <div className="relative w-full sm:w-80">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#5D7266] dark:text-[#6C8A78]"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search clubs, lobbies, #tags, @agents..."
            aria-label="Search clubs, watch lobbies, tags, and agents"
            className="min-h-[42px] w-full border border-[#CDD8D1] bg-white py-2 pr-3 pl-9 font-mono text-xs text-[#111915] placeholder:text-[#6B7F73] focus:border-emerald-600 focus:outline-none dark:border-[#1D3226] dark:bg-[#0B120E] dark:text-[#E0EFE6] dark:placeholder:text-[#5F7C6B] dark:focus:border-emerald-400"
          />
        </div>
      </div>

      {/* Trending Tags */}
      <section aria-labelledby="trending-tags-heading">
        <h2
          id="trending-tags-heading"
          className="font-mono text-xs font-semibold tracking-wider text-[#43574B] uppercase dark:text-[#88A795]"
        >
          Trending Dossier Tags
        </h2>
        <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {filteredTags.map((item) => (
            <button
              key={item.tag}
              type="button"
              onClick={() => {
                soundEngine.playKeyTick();
                onSelectTag(item.tag);
              }}
              className="flex min-h-[60px] flex-col justify-between border border-[#CDD8D1] bg-white p-3 text-left transition-all hover:border-emerald-600 dark:border-[#1D3226] dark:bg-[#0B120E] dark:hover:border-emerald-400 active:translate-y-[1px]"
            >
              <span className="truncate font-mono text-xs font-bold text-emerald-800 dark:text-emerald-400">
                {item.tag}
              </span>
              <span className="mt-1 font-mono text-[11px] text-[#5D7266] dark:text-[#789684]">
                {item.count} files · {item.category}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Active Watch Lobbies */}
      <section aria-labelledby="active-lobbies-heading">
        <div className="flex items-center justify-between">
          <h2
            id="active-lobbies-heading"
            className="font-mono text-xs font-semibold tracking-wider text-[#43574B] uppercase dark:text-[#88A795]"
          >
            Active Watch Lobbies
          </h2>
          <span className="font-mono text-xs text-[#5D7266] dark:text-[#789684]">
            {activeLobbies.length} channels online
          </span>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {activeLobbies.map((lobby) => (
            <DossierFrame
              key={lobby.id}
              tabLabel={`${lobby.code} · ${lobby.status === 'LIVE' ? '[LIVE]' : 'WAITING ROOM'}`}
              tabAccent={lobby.status === 'LIVE' ? 'crimson' : 'amber'}
              bodyClassName="p-0 overflow-hidden"
            >
              <div className="relative aspect-video w-full bg-[#070B09]">
                <img
                  src={lobby.posterUrl}
                  alt={lobby.mediaTitle}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                <div className="absolute right-3 bottom-2.5 left-3 flex items-end justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-mono text-xs font-semibold text-white">
                      {lobby.mediaTitle}
                    </div>
                    <div className="font-mono text-[10px] text-emerald-300">
                      {lobby.syncTimestamp} · {lobby.viewerCount} peers
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-mono text-sm font-bold text-[#111915] dark:text-[#E8F5ED]">
                  {lobby.title}
                </h3>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#43574B] dark:text-[#9BB8A7]">
                  {lobby.description}
                </p>
                <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#E1E9E4] pt-3 dark:border-[#182920]">
                  <span className="font-mono text-[11px] text-[#5D7266] dark:text-[#789684]">
                    HOST: {lobby.hostHandle}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playSecureChime();
                      onOpenLobby(lobby.id);
                    }}
                    className="inline-flex min-h-[36px] items-center gap-1.5 border border-emerald-700 bg-emerald-700 px-3 py-1 font-mono text-xs font-semibold text-white transition-all hover:bg-emerald-800 dark:border-emerald-400 dark:bg-emerald-500/20 dark:text-emerald-300 dark:hover:bg-emerald-500/30 active:translate-y-[1px]"
                  >
                    <Radio className="h-3.5 w-3.5" />
                    <span>ENTER LOBBY</span>
                  </button>
                </div>
              </div>
            </DossierFrame>
          ))}
        </div>
      </section>

      {/* Film & Anime Clubs */}
      <section aria-labelledby="clubs-heading">
        <h2
          id="clubs-heading"
          className="font-mono text-xs font-semibold tracking-wider text-[#43574B] uppercase dark:text-[#88A795]"
        >
          Film & Anime Clubs
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
          {clubs.map((club) => (
            <DossierFrame
              key={club.id}
              tabLabel={`${club.code} · ${club.category} CLUB`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-mono text-base font-bold text-[#111915] dark:text-[#E8F5ED]">
                    {club.title}
                  </h3>
                  <div className="mt-0.5 font-mono text-xs text-emerald-700 dark:text-emerald-400">
                    {club.mediaTitle}
                  </div>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 font-mono text-xs text-[#5D7266] dark:text-[#789684]">
                  <Users className="h-3.5 w-3.5" />
                  <span>{club.viewerCount}</span>
                </span>
              </div>
              <p className="mt-2.5 text-sm leading-relaxed text-[#2C3E34] dark:text-[#B5CEC0]">
                {club.description}
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#E1E9E4] pt-3 dark:border-[#182920]">
                <span className="font-mono text-[11px] text-[#5D7266] dark:text-[#789684]">
                  {club.syncTimestamp}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playConfirmBeep();
                      onToggleJoinClub(club.id);
                    }}
                    className={`inline-flex min-h-[36px] items-center gap-1.5 border px-3 py-1 font-mono text-xs font-semibold transition-all active:translate-y-[1px] ${
                      club.joined
                        ? 'border-emerald-600/40 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400'
                        : 'border-[#CDD8D1] bg-[#F5F8F6] text-[#111915] hover:border-emerald-600 dark:border-[#244231] dark:bg-[#101A14] dark:text-[#CBE0D3] dark:hover:border-emerald-400'
                    }`}
                  >
                    {club.joined && <Check className="h-3.5 w-3.5" />}
                    <span>{club.joined ? 'JOINED' : 'JOIN CLUB'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playKeyTick();
                      onOpenLobby(club.id);
                    }}
                    className="inline-flex min-h-[36px] items-center gap-1 border border-emerald-700 px-3 py-1 font-mono text-xs font-semibold text-emerald-800 hover:bg-emerald-700/10 dark:border-emerald-400 dark:text-emerald-300"
                  >
                    <span>OPEN</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </DossierFrame>
          ))}
        </div>
      </section>

      {/* Search & Add Players / Agents */}
      <section aria-labelledby="agents-heading">
        <h2
          id="agents-heading"
          className="font-mono text-xs font-semibold tracking-wider text-[#43574B] uppercase dark:text-[#88A795]"
        >
          Discover & Add Agents
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filteredAgents.map((agent) => {
            const isFriend = friendHandles.has(agent.handle);
            const isRequested = sentRequestHandles.has(agent.handle);
            return (
              <div
                key={agent.id}
                className="flex items-center justify-between gap-3 border border-[#CDD8D1] bg-white p-4 dark:border-[#1D3226] dark:bg-[#0B120E]"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 font-mono text-sm font-bold text-[#111915] dark:text-[#E8F5ED]">
                    <span className="truncate">{agent.handle}</span>
                    <span className="text-xs font-normal text-[#5D7266] dark:text-[#789684]">
                      {agent.code}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-[#43574B] dark:text-[#9BB8A7]">
                    {agent.specialty}
                  </p>
                  <div className="mt-1.5 font-mono text-[11px] text-emerald-700 dark:text-emerald-400">
                    REP: {agent.reputation} · {agent.favoriteTag}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isFriend || isRequested}
                  onClick={() => {
                    soundEngine.playConfirmBeep();
                    onAddFriend(agent.handle, agent.code);
                  }}
                  className={`inline-flex min-h-[38px] shrink-0 items-center gap-1.5 border px-3 py-1.5 font-mono text-xs font-semibold transition-all active:translate-y-[1px] ${
                    isFriend
                      ? 'border-emerald-600/35 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400'
                      : isRequested
                        ? 'border-amber-500/40 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300'
                        : 'border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800 dark:border-emerald-400 dark:bg-emerald-500/20 dark:text-emerald-300 dark:hover:bg-emerald-500/30'
                  }`}
                >
                  {isFriend ? (
                    <>
                      <UserCheck className="h-3.5 w-3.5" />
                      <span>FRIEND</span>
                    </>
                  ) : isRequested ? (
                    <span>PENDING</span>
                  ) : (
                    <>
                      <UserPlus className="h-3.5 w-3.5" />
                      <span>ADD</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
