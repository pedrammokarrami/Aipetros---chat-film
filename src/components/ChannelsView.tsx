import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Copy,
  Film,
  Link2,
  Lock,
  MessageSquare,
  Play,
  Plus,
  Radio,
  Search,
  Send,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import type {
  ChannelSubTab,
  Friend,
  MediaPreview,
  WatchLobby,
} from '../types';
import {
  ASSET_POSTERS,
  extractMediaPreviews,
  parseMediaPreview,
} from '../utils/mediaParser';
import { soundEngine } from '../utils/soundEngine';
import { MediaPreviewCard } from './MediaPreviewCard';

interface ChannelsViewProps {
  subTab: ChannelSubTab;
  lobbies: WatchLobby[];
  friends: Friend[];
  activeLobbyId: string | null;
  activeFriendId: string | null;
  currentHandle: string;
  friendHandles: Set<string>;
  sentRequestHandles: Set<string>;
  onSubTabChange: (tab: ChannelSubTab) => void;
  onSelectLobby: (id: string | null) => void;
  onSelectFriend: (id: string | null) => void;
  onOpenHostLobby: () => void;
  onSendLobbyMessage: (lobbyId: string, text: string) => void;
  onSendDmMessage: (friendId: string, text: string) => void;
  onAddFriendByHandle: (handle: string, code?: string) => void;
  onExpandMedia: (preview: MediaPreview) => void;
}

const QUICK_SAMPLE_MEDIA = [
  {
    label: 'Dune 2 Stream',
    url: 'https://stream.cnet.local/stream/dune2-imax-70mm.m3u8',
  },
  {
    label: 'Severance Frame',
    url: ASSET_POSTERS.office,
  },
  {
    label: 'AoT Stream',
    url: 'https://stream.cnet.local/stream/aot-final-citadel.mp4',
  },
];

export function ChannelsView({
  subTab,
  lobbies,
  friends,
  activeLobbyId,
  activeFriendId,
  currentHandle,
  friendHandles,
  sentRequestHandles,
  onSubTabChange,
  onSelectLobby,
  onSelectFriend,
  onOpenHostLobby,
  onSendLobbyMessage,
  onSendDmMessage,
  onAddFriendByHandle,
  onExpandMedia,
}: ChannelsViewProps) {
  const [messageDraft, setMessageDraft] = useState('');
  const [membersDrawerOpen, setMembersDrawerOpen] = useState(false);
  const [copiedSync, setCopiedSync] = useState(false);
  const [friendSearch, setFriendSearch] = useState('');
  const [showSamplePicker, setShowSamplePicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const lobbyScrollRef = useRef<HTMLDivElement>(null);
  const dmScrollRef = useRef<HTMLDivElement>(null);

  const activeLobby = useMemo(
    () => lobbies.find((l) => l.id === activeLobbyId) ?? null,
    [lobbies, activeLobbyId]
  );

  const activeFriend = useMemo(
    () => friends.find((f) => f.id === activeFriendId) ?? null,
    [friends, activeFriendId]
  );

  useEffect(() => {
    if (lobbyScrollRef.current) {
      lobbyScrollRef.current.scrollTop = lobbyScrollRef.current.scrollHeight;
    }
  }, [activeLobby?.id, activeLobby?.messages.length]);

  useEffect(() => {
    if (dmScrollRef.current) {
      dmScrollRef.current.scrollTop = dmScrollRef.current.scrollHeight;
    }
  }, [activeFriend?.id, activeFriend?.messages.length]);

  const filteredFriends = useMemo(() => {
    const q = friendSearch.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter(
      (f) =>
        f.handle.toLowerCase().includes(q) ||
        f.activity.toLowerCase().includes(q) ||
        f.code.toLowerCase().includes(q)
    );
  }, [friends, friendSearch]);

  const isInChat =
    (subTab === 'LOBBIES' && activeLobby !== null) ||
    (subTab === 'DMS' && activeFriend !== null);

  const handleSubmitMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = messageDraft.trim();
    if (!trimmed) return;
    soundEngine.playKeyTick();

    if (subTab === 'LOBBIES' && activeLobby) {
      onSendLobbyMessage(activeLobby.id, trimmed);
    } else if (subTab === 'DMS' && activeFriend) {
      onSendDmMessage(activeFriend.id, trimmed);
    }
    setMessageDraft('');
    setShowSamplePicker(false);
  };

  const handleCopyLobbyLink = (url: string) => {
    soundEngine.playConfirmBeep();
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(url).catch(() => {});
    }
    setCopiedSync(true);
    window.setTimeout(() => setCopiedSync(false), 1600);
  };

  const handleQuickAddHandle = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = friendSearch.trim();
    if (!cleaned) return;
    const formatted = cleaned.startsWith('@')
      ? cleaned.toUpperCase()
      : `@${cleaned.toUpperCase()}`;
    soundEngine.playConfirmBeep();
    onAddFriendByHandle(formatted);
    setFriendSearch('');
  };

  return (
    <div className="flex h-[calc(100vh-148px)] min-h-[540px] flex-col lg:h-[calc(100vh-108px)]">
      {/* Top Switcher Bar (hidden on mobile when deep inside an active chat) */}
      <div
        className={`mb-4 flex flex-col gap-3 border-b border-[#CDD8D1] pb-3.5 dark:border-[#1C2E24] sm:flex-row sm:items-center sm:justify-between ${
          isInChat ? 'hidden lg:flex' : 'flex'
        }`}
      >
        <div
          role="tablist"
          aria-label="Channel sections"
          className="inline-flex border border-[#CDD8D1] bg-[#EDF1EE] p-1 dark:border-[#1D3226] dark:bg-[#0B120E]"
        >
          <button
            type="button"
            role="tab"
            aria-selected={subTab === 'LOBBIES'}
            onClick={() => {
              soundEngine.playKeyTick();
              onSubTabChange('LOBBIES');
            }}
            className={`min-h-[38px] px-3.5 py-1.5 font-mono text-xs font-semibold transition-colors whitespace-nowrap ${
              subTab === 'LOBBIES'
                ? 'bg-emerald-700 text-white dark:bg-emerald-500/25 dark:text-emerald-300'
                : 'text-[#43574B] hover:text-[#111915] dark:text-[#88A795] dark:hover:text-emerald-200'
            }`}
          >
            WATCH LOBBIES & CLUBS
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={subTab === 'DMS'}
            onClick={() => {
              soundEngine.playKeyTick();
              onSubTabChange('DMS');
            }}
            className={`min-h-[38px] px-3.5 py-1.5 font-mono text-xs font-semibold transition-colors whitespace-nowrap ${
              subTab === 'DMS'
                ? 'bg-emerald-700 text-white dark:bg-emerald-500/25 dark:text-emerald-300'
                : 'text-[#43574B] hover:text-[#111915] dark:text-[#88A795] dark:hover:text-emerald-200'
            }`}
          >
            DIRECT MESSAGES & FRIENDS ({friends.length})
          </button>
        </div>

        {subTab === 'LOBBIES' && (
          <button
            type="button"
            onClick={() => {
              soundEngine.playSecureChime();
              onOpenHostLobby();
            }}
            className="inline-flex min-h-[40px] shrink-0 items-center justify-center gap-2 border border-emerald-700 bg-emerald-700 px-3.5 py-2 font-mono text-xs font-semibold text-white transition-all hover:bg-emerald-800 dark:border-emerald-400 dark:bg-emerald-500/20 dark:text-emerald-300 dark:hover:bg-emerald-500/30 active:translate-y-[1px] whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            <span>HOST WATCH LOBBY</span>
          </button>
        )}
      </div>

      {/* Main Split Workspace */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Left List Pane (Lobbies/Clubs or Friends List) */}
        <div
          className={`min-h-0 flex-col border border-[#CDD8D1] bg-white dark:border-[#1D3226] dark:bg-[#0B120E] lg:col-span-4 lg:flex ${
            isInChat ? 'hidden' : 'flex'
          }`}
        >
          {subTab === 'LOBBIES' ? (
            <>
              <div className="flex items-center justify-between border-b border-[#E1E9E4] px-4 py-3 font-mono text-[11px] font-semibold text-[#43574B] dark:border-[#182920] dark:text-[#88A795]">
                <span>ACTIVE LOBBIES & CLUBS</span>
                <span>{lobbies.length} CHANNELS</span>
              </div>
              <div className="flex-1 divide-y divide-[#E1E9E4] overflow-y-auto dark:divide-[#17281F]">
                {lobbies.map((lobby) => {
                  const selected = lobby.id === activeLobbyId;
                  const statusLabel =
                    lobby.status === 'LIVE'
                      ? '[LIVE]'
                      : lobby.status === 'WAITING_ROOM'
                        ? 'WAITING ROOM'
                        : 'CLUB';
                  const statusColor =
                    lobby.status === 'LIVE'
                      ? 'text-red-600 dark:text-red-400'
                      : lobby.status === 'WAITING_ROOM'
                        ? 'text-amber-700 dark:text-amber-400'
                        : 'text-emerald-700 dark:text-emerald-400';

                  return (
                    <button
                      key={lobby.id}
                      type="button"
                      onClick={() => {
                        soundEngine.playKeyTick();
                        onSelectLobby(lobby.id);
                      }}
                      className={`block w-full px-4 py-3.5 text-left transition-colors ${
                        selected
                          ? 'bg-emerald-50 dark:bg-[#122219]'
                          : 'hover:bg-[#F5F8F6] dark:hover:bg-[#0F1914]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 font-mono text-[11px]">
                        <span className={`font-bold ${statusColor}`}>
                          {statusLabel} · {lobby.code}
                        </span>
                        <span className="text-[#5D7266] dark:text-[#789684]">
                          {lobby.viewerCount} online
                        </span>
                      </div>
                      <div className="mt-1 truncate font-mono text-sm font-bold text-[#111915] dark:text-[#E8F5ED]">
                        {lobby.title}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-[#43574B] dark:text-[#9BB8A7]">
                        {lobby.mediaTitle}
                      </div>
                      <div className="mt-1.5 font-mono text-[10px] text-emerald-700 dark:text-emerald-400/90">
                        {lobby.syncTimestamp}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              {/* Friends Search & Quick Handle Add */}
              <div className="border-b border-[#E1E9E4] p-3 dark:border-[#182920]">
                <form onSubmit={handleQuickAddHandle} className="flex gap-2">
                  <div className="relative flex-1">
                    <Search
                      aria-hidden="true"
                      className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-[#5D7266] dark:text-[#6C8A78]"
                    />
                    <input
                      type="text"
                      value={friendSearch}
                      onChange={(e) => setFriendSearch(e.target.value)}
                      placeholder="Filter or enter @handle to add..."
                      aria-label="Search friends or enter handle to add friend"
                      className="min-h-[38px] w-full border border-[#CDD8D1] bg-[#F5F8F6] py-1.5 pr-2.5 pl-8 font-mono text-xs text-[#111915] placeholder:text-[#6B7F73] focus:border-emerald-600 focus:outline-none dark:border-[#244231] dark:bg-[#070B09] dark:text-[#E0EFE6] dark:placeholder:text-[#5F7C6B] dark:focus:border-emerald-400"
                    />
                  </div>
                  <button
                    type="submit"
                    aria-label="Add friend by handle"
                    className="inline-flex min-h-[38px] shrink-0 items-center gap-1 border border-emerald-700 bg-emerald-700 px-2.5 font-mono text-[11px] font-semibold text-white hover:bg-emerald-800 dark:border-emerald-400 dark:bg-emerald-500/20 dark:text-emerald-300 dark:hover:bg-emerald-500/30"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>ADD</span>
                  </button>
                </form>
              </div>

              <div className="flex-1 divide-y divide-[#E1E9E4] overflow-y-auto dark:divide-[#17281F]">
                {filteredFriends.map((friend) => {
                  const selected = friend.id === activeFriendId;
                  const statusTone =
                    friend.status === 'WATCHING'
                      ? 'text-amber-700 dark:text-amber-400'
                      : friend.status === 'IN_LOBBY'
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-emerald-700 dark:text-emerald-400';

                  return (
                    <div
                      key={friend.id}
                      className={`flex items-center justify-between gap-3 px-4 py-3.5 transition-colors ${
                        selected
                          ? 'bg-emerald-50 dark:bg-[#122219]'
                          : 'hover:bg-[#F5F8F6] dark:hover:bg-[#0F1914]'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 font-mono text-sm font-bold text-[#111915] dark:text-[#E8F5ED]">
                          <span className="truncate">{friend.handle}</span>
                          {friend.unreadCount > 0 && (
                            <span className="font-mono text-[11px] font-bold text-amber-600 dark:text-amber-400">
                              [{friend.unreadCount}]
                            </span>
                          )}
                        </div>
                        <div
                          className={`mt-0.5 truncate font-mono text-[11px] ${statusTone}`}
                        >
                          {friend.activity}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playKeyTick();
                          onSelectFriend(friend.id);
                        }}
                        aria-label={`Open private message with ${friend.handle}`}
                        className="inline-flex min-h-[36px] shrink-0 items-center gap-1.5 border border-[#CDD8D1] bg-[#F5F8F6] px-3 py-1 font-mono text-[11px] font-semibold text-[#1D2D24] transition-colors hover:border-emerald-600 hover:text-emerald-800 dark:border-[#244231] dark:bg-[#101A14] dark:text-emerald-300 dark:hover:border-emerald-400"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>MESSAGE</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Right Full-Height Chat & Synced Media Workspace */}
        <div
          className={`relative min-h-0 flex-col border border-[#CDD8D1] bg-white dark:border-[#1D3226] dark:bg-[#0B120E] lg:col-span-8 lg:flex ${
            isInChat ? 'flex' : 'hidden'
          }`}
        >
          {subTab === 'LOBBIES' && activeLobby ? (
            <>
              {/* Lobby Chat Header */}
              <div className="flex items-center justify-between gap-2 border-b border-[#CDD8D1] bg-[#F5F8F6] px-3.5 py-3 dark:border-[#1D3226] dark:bg-[#0F1914]">
                <div className="flex min-w-0 items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playKeyTick();
                      onSelectLobby(null);
                      setMembersDrawerOpen(false);
                    }}
                    aria-label="Back to watch lobbies list"
                    className="inline-flex min-h-[38px] items-center gap-1 border border-[#CDD8D1] bg-white px-2.5 font-mono text-xs font-semibold text-[#111915] hover:border-emerald-600 dark:border-[#244231] dark:bg-[#0B120E] dark:text-emerald-300 lg:hidden"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>BACK</span>
                  </button>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 font-mono text-[11px] text-emerald-700 dark:text-emerald-400">
                      <span>SECURE_CHANNEL · {activeLobby.code}</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {activeLobby.status === 'LIVE'
                          ? '[LIVE]'
                          : activeLobby.status === 'WAITING_ROOM'
                            ? 'WAITING ROOM'
                            : 'CLUB'}
                      </span>
                    </div>
                    <h2 className="truncate font-mono text-sm font-bold text-[#111915] dark:text-[#E8F5ED] sm:text-base">
                      {activeLobby.title}
                    </h2>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playKeyTick();
                    setMembersDrawerOpen((o) => !o);
                  }}
                  aria-expanded={membersDrawerOpen}
                  aria-label="Toggle online members drawer"
                  className="inline-flex min-h-[38px] shrink-0 items-center gap-1.5 border border-[#CDD8D1] bg-white px-3 font-mono text-xs font-semibold text-[#1D2D24] hover:border-emerald-600 dark:border-[#244231] dark:bg-[#0B120E] dark:text-emerald-300 dark:hover:border-emerald-400"
                >
                  <Users className="h-3.5 w-3.5" />
                  <span>{activeLobby.members.length}</span>
                  <span className="hidden sm:inline">MEMBERS</span>
                </button>
              </div>

              {/* Synced Media / Stream Link Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E1E9E4] bg-[#EDF1EE] px-4 py-2.5 dark:border-[#182920] dark:bg-[#09100C]">
                <div className="flex min-w-0 items-center gap-2.5">
                  <Radio className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
                  <div className="min-w-0">
                    <div className="truncate font-mono text-xs font-semibold text-[#111915] dark:text-[#E0EFE6]">
                      {activeLobby.mediaTitle}
                    </div>
                    <div className="truncate font-mono text-[11px] text-[#5D7266] dark:text-[#7FA08C]">
                      SYNC: {activeLobby.syncTimestamp} · {activeLobby.streamUrl}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyLobbyLink(activeLobby.streamUrl)}
                    className="inline-flex min-h-[34px] items-center gap-1 border border-[#CDD8D1] bg-white px-2.5 font-mono text-[11px] text-[#283B30] hover:border-emerald-600 dark:border-[#244231] dark:bg-[#101A14] dark:text-[#B5CEC0] dark:hover:border-emerald-400"
                  >
                    {copiedSync ? (
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    <span>{copiedSync ? 'COPIED' : 'STREAM URL'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playSecureChime();
                      onExpandMedia({
                        ...parseMediaPreview(activeLobby.streamUrl),
                        title: activeLobby.mediaTitle,
                        posterUrl: activeLobby.posterUrl,
                      });
                    }}
                    className="inline-flex min-h-[34px] items-center gap-1.5 border border-emerald-700 bg-emerald-700 px-3 font-mono text-[11px] font-semibold text-white hover:bg-emerald-800 dark:border-emerald-400 dark:bg-emerald-500/20 dark:text-emerald-300 dark:hover:bg-emerald-500/30"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>OPEN THEATER</span>
                  </button>
                </div>
              </div>

              {/* Chat Messages + Slide-Over Members Drawer */}
              <div className="relative flex min-h-0 flex-1 overflow-hidden">
                <div
                  ref={lobbyScrollRef}
                  data-testid="lobby-messages"
                  className="flex-1 space-y-3.5 overflow-y-auto p-4"
                >
                  {activeLobby.messages.map((msg) => {
                    const previews = extractMediaPreviews(msg.text);
                    if (msg.systemNotice) {
                      return (
                        <div
                          key={msg.id}
                          className="border border-emerald-600/30 bg-emerald-50/70 px-3 py-2 font-mono text-[11px] text-emerald-900 dark:bg-emerald-950/25 dark:text-emerald-300"
                        >
                          [{msg.timestamp}] {msg.text}
                        </div>
                      );
                    }
                    const isSelf = msg.isOwn || msg.senderHandle === currentHandle;
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center gap-2 font-mono text-[11px] text-[#5D7266] dark:text-[#789684]">
                          <span className="font-semibold text-emerald-800 dark:text-emerald-400">
                            {msg.senderHandle}
                          </span>
                          <span>{msg.timestamp}</span>
                        </div>
                        <div
                          className={`mt-1 max-w-[90%] border px-3.5 py-2.5 text-sm leading-relaxed sm:max-w-[78%] ${
                            isSelf
                              ? 'border-emerald-700/40 bg-emerald-50 text-[#111915] dark:border-emerald-500/40 dark:bg-[#112319] dark:text-[#E8F5ED]'
                              : 'border-[#CDD8D1] bg-[#F7FAF8] text-[#1D2D24] dark:border-[#1E3327] dark:bg-[#0F1914] dark:text-[#D5E6DC]'
                          }`}
                        >
                          <div className="break-words whitespace-pre-wrap">
                            {msg.text}
                          </div>
                          {previews.map((preview) => (
                            <MediaPreviewCard
                              key={preview.url}
                              preview={preview}
                              onExpand={onExpandMedia}
                              compact
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Online Members Drawer */}
                {membersDrawerOpen && (
                  <aside
                    aria-label="Online lobby members"
                    className="absolute inset-y-0 right-0 z-20 flex w-64 flex-col border-l border-[#CDD8D1] bg-white shadow-xl dark:border-[#1E3527] dark:bg-[#09100C]"
                  >
                    <div className="flex items-center justify-between border-b border-[#E1E9E4] px-3.5 py-2.5 dark:border-[#182920]">
                      <span className="font-mono text-xs font-semibold text-emerald-800 dark:text-emerald-400">
                        SYNCED PEERS ({activeLobby.members.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => setMembersDrawerOpen(false)}
                        aria-label="Close members drawer"
                        className="p-1 text-[#5D7266] hover:text-[#111915] dark:text-[#88A795] dark:hover:text-white"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex-1 divide-y divide-[#E1E9E4] overflow-y-auto p-2 dark:divide-[#16261D]">
                      {activeLobby.members.map((member) => {
                        const isSelf = member.handle === currentHandle;
                        const isFriend = friendHandles.has(member.handle);
                        const isRequested = sentRequestHandles.has(member.handle);
                        return (
                          <div
                            key={member.handle}
                            className="flex items-center justify-between gap-2 py-2.5 px-1.5"
                          >
                            <div className="min-w-0">
                              <div className="truncate font-mono text-xs font-semibold text-[#111915] dark:text-[#E0EFE6]">
                                {member.handle}
                              </div>
                              <div className="font-mono text-[10px] text-[#5D7266] dark:text-[#789684]">
                                {member.role} · {member.status}
                              </div>
                            </div>
                            {!isSelf && !isFriend && !isRequested && (
                              <button
                                type="button"
                                onClick={() => {
                                  soundEngine.playConfirmBeep();
                                  onAddFriendByHandle(member.handle, member.code);
                                }}
                                aria-label={`Add ${member.handle} as friend`}
                                className="border border-[#CDD8D1] px-2 py-1 font-mono text-[10px] text-emerald-800 hover:border-emerald-600 dark:border-[#244231] dark:text-emerald-300"
                              >
                                + ADD
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </aside>
                )}
              </div>
            </>
          ) : subTab === 'DMS' && activeFriend ? (
            <>
              {/* P2P Direct Message Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#CDD8D1] bg-[#F5F8F6] px-3.5 py-3 dark:border-[#1D3226] dark:bg-[#0F1914]">
                <div className="flex min-w-0 items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playKeyTick();
                      onSelectFriend(null);
                    }}
                    aria-label="Back to friends list"
                    className="inline-flex min-h-[38px] items-center gap-1 border border-[#CDD8D1] bg-white px-2.5 font-mono text-xs font-semibold text-[#111915] hover:border-emerald-600 dark:border-[#244231] dark:bg-[#0B120E] dark:text-emerald-300 lg:hidden"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>BACK</span>
                  </button>
                  <div className="min-w-0">
                    <div className="font-mono text-sm font-bold text-[#111915] dark:text-[#E8F5ED]">
                      {activeFriend.handle}{' '}
                      <span className="text-xs font-normal text-[#5D7266] dark:text-[#789684]">
                        · {activeFriend.code}
                      </span>
                    </div>
                    <div className="truncate font-mono text-[11px] text-emerald-700 dark:text-emerald-400">
                      {activeFriend.activity}
                    </div>
                  </div>
                </div>

                <div className="inline-flex items-center gap-1.5 border border-emerald-600/40 bg-emerald-50 px-2.5 py-1 font-mono text-[10px] font-semibold tracking-wider text-emerald-900 dark:bg-emerald-950/35 dark:text-emerald-300">
                  <Lock className="h-3 w-3" />
                  <span>E2E P2P // ZERO SERVER STORAGE</span>
                </div>
              </div>

              {/* DM Transcript */}
              <div
                ref={dmScrollRef}
                data-testid="dm-messages"
                className="flex-1 space-y-3.5 overflow-y-auto p-4"
              >
                {activeFriend.messages.map((msg) => {
                  const previews = extractMediaPreviews(msg.text);
                  const isSelf = msg.isOwn || msg.senderHandle === currentHandle;
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-2 font-mono text-[11px] text-[#5D7266] dark:text-[#789684]">
                        <span className="font-semibold text-emerald-800 dark:text-emerald-400">
                          {msg.senderHandle}
                        </span>
                        <span>{msg.timestamp}</span>
                      </div>
                      <div
                        className={`mt-1 max-w-[90%] border px-3.5 py-2.5 text-sm leading-relaxed sm:max-w-[78%] ${
                          isSelf
                            ? 'border-emerald-700/40 bg-emerald-50 text-[#111915] dark:border-emerald-500/40 dark:bg-[#112319] dark:text-[#E8F5ED]'
                            : 'border-[#CDD8D1] bg-[#F7FAF8] text-[#1D2D24] dark:border-[#1E3327] dark:bg-[#0F1914] dark:text-[#D5E6DC]'
                        }`}
                      >
                        <div className="break-words whitespace-pre-wrap">
                          {msg.text}
                        </div>
                        {previews.map((preview) => (
                          <MediaPreviewCard
                            key={preview.url}
                            preview={preview}
                            onExpand={onExpandMedia}
                            compact
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
              <Film className="h-10 w-10 text-emerald-700/60 dark:text-emerald-400/60" />
              <div className="mt-3 font-mono text-sm font-semibold text-[#111915] dark:text-[#E0EFE6]">
                {subTab === 'LOBBIES'
                  ? 'Select a Watch Lobby or Club to open SECURE_CHANNEL'
                  : 'Select a Friend to open E2E P2P Direct Messaging'}
              </div>
              <p className="mt-1.5 max-w-sm text-xs text-[#5D7266] dark:text-[#789684]">
                Paste any video stream, YouTube/Vimeo link, or image URL in chat
                to generate an automatic inline preview and fullscreen theater.
              </p>
            </div>
          )}

          {/* Message Composer (visible whenever a lobby or DM is active) */}
          {isInChat && (
            <div className="border-t border-[#CDD8D1] bg-[#F5F8F6] p-3 dark:border-[#1D3226] dark:bg-[#0F1914]">
              {showSamplePicker && (
                <div className="mb-2.5 flex flex-wrap items-center gap-2 border border-[#CDD8D1] bg-white p-2 dark:border-[#244231] dark:bg-[#070B09]">
                  <span className="font-mono text-[10px] font-semibold text-[#5D7266] dark:text-[#789684]">
                    INSERT STREAM / FRAME LINK:
                  </span>
                  {QUICK_SAMPLE_MEDIA.map((sample) => (
                    <button
                      key={sample.label}
                      type="button"
                      onClick={() => {
                        soundEngine.playKeyTick();
                        setMessageDraft((prev) =>
                          prev ? `${prev} ${sample.url}` : sample.url
                        );
                        setShowSamplePicker(false);
                        inputRef.current?.focus();
                      }}
                      className="border border-emerald-700/40 bg-emerald-50 px-2 py-1 font-mono text-[11px] text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300"
                    >
                      + {sample.label}
                    </button>
                  ))}
                </div>
              )}

              <form onSubmit={handleSubmitMessage} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playKeyTick();
                    setShowSamplePicker((s) => !s);
                  }}
                  aria-label="Insert sample media or stream URL"
                  title="Insert sample media link"
                  className="inline-flex min-h-[42px] min-w-[42px] shrink-0 items-center justify-center border border-[#CDD8D1] bg-white text-[#43574B] transition-colors hover:border-emerald-600 hover:text-emerald-700 dark:border-[#244231] dark:bg-[#070B09] dark:text-[#88A795] dark:hover:border-emerald-400 dark:hover:text-emerald-300"
                >
                  <Link2 className="h-4 w-4" />
                </button>
                <input
                  ref={inputRef}
                  type="text"
                  value={messageDraft}
                  onChange={(e) => setMessageDraft(e.target.value)}
                  placeholder="Transmit message or paste video/image URL for inline preview..."
                  aria-label="Chat message input"
                  className="min-h-[42px] flex-1 border border-[#CDD8D1] bg-white px-3.5 font-mono text-xs text-[#111915] placeholder:text-[#6B7F73] focus:border-emerald-600 focus:outline-none dark:border-[#244231] dark:bg-[#070B09] dark:text-[#E0EFE6] dark:placeholder:text-[#5F7C6B] dark:focus:border-emerald-400"
                />
                <button
                  type="submit"
                  aria-label="Send message"
                  className="inline-flex min-h-[42px] shrink-0 items-center gap-1.5 border border-emerald-700 bg-emerald-700 px-4 font-mono text-xs font-semibold text-white transition-all hover:bg-emerald-800 dark:border-emerald-400 dark:bg-emerald-500/20 dark:text-emerald-300 dark:hover:bg-emerald-500/30 active:translate-y-[1px]"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">SEND</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
