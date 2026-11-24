import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bell,
  Compass,
  FileText,
  Radio,
  Server,
  Shield,
  User,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type {
  AgentProfile,
  AlertItem,
  BridgeSettings,
  ChannelSubTab,
  DossierPost,
  Friend,
  FriendRequest,
  InviteChannel,
  MediaCategory,
  MediaPreview,
  NavTab,
  WatchLobby,
} from './types';
import {
  INITIAL_ALERTS,
  INITIAL_BRIDGE_SETTINGS,
  INITIAL_DISCOVERABLE_AGENTS,
  INITIAL_DOSSIERS,
  INITIAL_FRIEND_REQUESTS,
  INITIAL_FRIENDS,
  INITIAL_LOBBIES,
  INITIAL_PROFILE,
} from './data/seedData';
import {
  acceptFriendRequestState,
  applyVote,
  computePeerReputation,
  declineFriendRequestState,
} from './utils/dossierStore';
import { generateBrandedShortLink } from './utils/mediaParser';
import { soundEngine } from './utils/soundEngine';
import { AccessGate } from './components/AccessGate';
import { FeedView } from './components/FeedView';
import { ExploreView } from './components/ExploreView';
import { ChannelsView } from './components/ChannelsView';
import { AlertsView } from './components/AlertsView';
import { TheaterModal } from './components/TheaterModal';
import {
  CommentsDrawer,
  HostLobbyModal,
  NewDossierModal,
  ShareDossierModal,
} from './components/DossierModals';
import { ProfileModal } from './components/ProfileModal';
import { SettingsModal } from './components/SettingsModal';

const STORAGE_UNLOCKED_KEY = 'classified_net_unlocked';
const STORAGE_THEME_KEY = 'classified_net_theme';
const STORAGE_BRIDGE_KEY = 'classified_net_bridge_settings';

function getInitialUnlocked(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  if (params.get('autostart') === '1') return true;
  return window.localStorage.getItem(STORAGE_UNLOCKED_KEY) === 'true';
}

function getInitialDark(): boolean {
  if (typeof window === 'undefined') return true;
  const saved = window.localStorage.getItem(STORAGE_THEME_KEY);
  return saved ? saved === 'dark' : true;
}

function getInitialBridgeSettings(): BridgeSettings {
  if (typeof window === 'undefined') return INITIAL_BRIDGE_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_BRIDGE_KEY);
    if (!raw) return INITIAL_BRIDGE_SETTINGS;
    return { ...INITIAL_BRIDGE_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return INITIAL_BRIDGE_SETTINGS;
  }
}

function formatNowTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes()
  ).padStart(2, '0')}`;
}

export default function App() {
  const [unlocked, setUnlocked] = useState<boolean>(getInitialUnlocked);
  const [isDark, setIsDark] = useState<boolean>(getInitialDark);
  const [isMuted, setIsMuted] = useState<boolean>(() => soundEngine.isMuted());

  const [activeTab, setActiveTab] = useState<NavTab>('FEED');
  const [channelSubTab, setChannelSubTab] = useState<ChannelSubTab>('LOBBIES');

  // Core Data State
  const [profile, setProfile] = useState<AgentProfile>(INITIAL_PROFILE);
  const [posts, setPosts] = useState<DossierPost[]>(INITIAL_DOSSIERS);
  const [lobbies, setLobbies] = useState<WatchLobby[]>(INITIAL_LOBBIES);
  const [friends, setFriends] = useState<Friend[]>(INITIAL_FRIENDS);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>(
    INITIAL_FRIEND_REQUESTS
  );
  const [alerts, setAlerts] = useState<AlertItem[]>(INITIAL_ALERTS);
  const [bridgeSettings, setBridgeSettings] = useState<BridgeSettings>(
    getInitialBridgeSettings
  );
  const [sentRequestHandles, setSentRequestHandles] = useState<Set<string>>(
    () => new Set()
  );

  // Feed Filters
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | MediaCategory>(
    'ALL'
  );
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [feedSearch, setFeedSearch] = useState('');

  // Active Chat Selection
  const [activeLobbyId, setActiveLobbyId] = useState<string | null>(
    INITIAL_LOBBIES[0].id
  );
  const [activeFriendId, setActiveFriendId] = useState<string | null>(
    INITIAL_FRIENDS[0].id
  );

  // Modals & Drawers
  const [newDossierOpen, setNewDossierOpen] = useState(false);
  const [hostLobbyOpen, setHostLobbyOpen] = useState(false);
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);
  const [sharePost, setSharePost] = useState<DossierPost | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [theaterPreview, setTheaterPreview] = useState<MediaPreview | null>(
    null
  );

  // Subtle status toast
  const [toast, setToast] = useState<string | null>(null);
  const showToast = useCallback((message: string) => {
    setToast(message);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(t);
  }, [toast]);

  // Sync dark mode class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) root.classList.add('dark');
    else root.classList.remove('dark');
    window.localStorage.setItem(STORAGE_THEME_KEY, isDark ? 'dark' : 'light');
  }, [isDark]);

  // Persist bridge settings
  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_BRIDGE_KEY,
      JSON.stringify(bridgeSettings)
    );
  }, [bridgeSettings]);

  const friendHandles = useMemo(
    () => new Set(friends.map((f) => f.handle)),
    [friends]
  );

  const userPosts = useMemo(
    () => posts.filter((p) => p.authorHandle === profile.handle),
    [posts, profile.handle]
  );

  const peerReputation = useMemo(
    () =>
      computePeerReputation({
        baseReputation: profile.baseReputation,
        referralsCount: profile.referralsCount,
        postsCount: userPosts.length,
        friendsCount: friends.length,
      }),
    [
      profile.baseReputation,
      profile.referralsCount,
      userPosts.length,
      friends.length,
    ]
  );

  const unreadAlertsCount = useMemo(
    () =>
      friendRequests.length + alerts.filter((a) => !a.read).length,
    [friendRequests.length, alerts]
  );

  const commentsPost = useMemo(
    () => posts.find((p) => p.id === commentsPostId) ?? null,
    [posts, commentsPostId]
  );

  // Handlers
  const handleUnlock = useCallback(
    (channel: InviteChannel) => {
      window.localStorage.setItem(STORAGE_UNLOCKED_KEY, 'true');
      setUnlocked(true);
      setProfile((prev) => ({
        ...prev,
        referralsCount: prev.referralsCount + 1,
      }));
      showToast(
        `INVITE DISPATCHED VIA ${channel} · +25 PEER REPUTATION GRANTED`
      );
    },
    [showToast]
  );

  const handleToggleMute = () => {
    const next = soundEngine.toggleMute();
    setIsMuted(next);
  };

  const handleCreateDossier = (data: {
    title: string;
    body: string;
    category: MediaCategory;
    tags: string[];
    classification: DossierPost['classification'];
  }) => {
    const fileNumber = 843 + posts.length;
    const nextPost: DossierPost = {
      id: `dos-${Date.now()}`,
      fileCode: `FILE #0${fileNumber}`,
      title: data.title,
      body: data.body,
      category: data.category,
      tags: data.tags,
      authorHandle: profile.handle,
      authorCode: profile.code,
      createdAt: 'JUST NOW',
      upvotes: 1,
      downvotes: 0,
      userVote: 'up',
      comments: [],
      classification: data.classification,
    };
    setPosts((prev) => [nextPost, ...prev]);
    setCategoryFilter('ALL');
    setTagFilter(null);
    showToast(`PUBLISHED ${nextPost.fileCode} · +15 PEER REPUTATION`);
  };

  const handleVote = (postId: string, dir: 'up' | 'down') => {
    setPosts((prev) =>
      prev.map((post) => (post.id === postId ? applyVote(post, dir) : post))
    );
  };

  const handleAddComment = (postId: string, text: string) => {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? {
              ...post,
              comments: [
                ...post.comments,
                {
                  id: `c-${Date.now()}`,
                  authorHandle: profile.handle,
                  authorCode: profile.code,
                  text,
                  createdAt: 'JUST NOW',
                },
              ],
            }
          : post
      )
    );
  };

  const handleAddFriend = (handle: string, code = 'AG-700') => {
    if (friendHandles.has(handle) || sentRequestHandles.has(handle)) {
      showToast(`${handle} IS ALREADY LINKED OR PENDING`);
      return;
    }
    setSentRequestHandles((prev) => new Set(prev).add(handle));
    setAlerts((prev) => [
      {
        id: `al-req-${Date.now()}`,
        type: 'SYSTEM',
        title: `P2P HANDSHAKE DISPATCHED // ${handle}`,
        detail: `Encrypted friend invitation sent to ${handle} (${code}).`,
        timestamp: 'JUST NOW',
        read: false,
      },
      ...prev,
    ]);
    showToast(`FRIEND REQUEST SENT TO ${handle}`);
  };

  const handleAcceptRequest = (reqId: string) => {
    const result = acceptFriendRequestState(friendRequests, friends, reqId);
    setFriendRequests(result.requests);
    setFriends(result.friends);
    if (result.accepted) {
      showToast(
        `${result.accepted.handle} ADDED TO P2P FRIENDS LIST (+10 REP)`
      );
    }
  };

  const handleDeclineRequest = (reqId: string) => {
    setFriendRequests((prev) => declineFriendRequestState(prev, reqId));
    showToast('FRIEND REQUEST DECLINED');
  };

  const handleCreateLobby = (data: {
    title: string;
    mediaTitle: string;
    category: MediaCategory;
    streamUrl: string;
    status: 'LIVE' | 'WAITING_ROOM';
    description: string;
    posterUrl: string;
  }) => {
    const newId = `lob-${Date.now()}`;
    const lobbyCode = `LOBBY-0${lobbies.filter((l) => l.kind === 'LOBBY').length + 1}`;
    const newLobby: WatchLobby = {
      id: newId,
      kind: 'LOBBY',
      code: lobbyCode,
      title: data.title,
      mediaTitle: data.mediaTitle,
      category: data.category,
      status: data.status,
      hostHandle: profile.handle,
      streamUrl: data.streamUrl,
      posterUrl: data.posterUrl,
      syncTimestamp: data.status === 'LIVE' ? '00:00:12 / SYNCED' : 'WAITING ROOM',
      viewerCount: 1,
      description: data.description,
      tags: [`#${data.category}`],
      joined: true,
      members: [
        {
          handle: profile.handle,
          code: profile.code,
          role: 'HOST',
          status: 'SYNCED',
        },
      ],
      messages: [
        {
          id: `lm-init-${Date.now()}`,
          senderHandle: 'SYSTEM',
          senderCode: 'NODE',
          text: `WATCH LOBBY ${lobbyCode} INITIALIZED BY ${profile.handle}. Stream relay active.`,
          timestamp: formatNowTime(),
          systemNotice: true,
        },
        {
          id: `lm-link-${Date.now()}`,
          senderHandle: profile.handle,
          senderCode: profile.code,
          text: `Synced stream link ready: ${data.streamUrl}`,
          timestamp: formatNowTime(),
          isOwn: true,
        },
      ],
    };
    setLobbies((prev) => [newLobby, ...prev]);
    setActiveTab('CHANNELS');
    setChannelSubTab('LOBBIES');
    setActiveLobbyId(newId);
    showToast(`${lobbyCode} OPENED // READY FOR PEERS`);
  };

  const handleSendLobbyMessage = (lobbyId: string, text: string) => {
    setLobbies((prev) =>
      prev.map((lobby) =>
        lobby.id === lobbyId
          ? {
              ...lobby,
              messages: [
                ...lobby.messages,
                {
                  id: `lm-${Date.now()}`,
                  senderHandle: profile.handle,
                  senderCode: profile.code,
                  text,
                  timestamp: formatNowTime(),
                  isOwn: true,
                },
              ],
            }
          : lobby
      )
    );
  };

  const handleSendDmMessage = (friendId: string, text: string) => {
    setFriends((prev) =>
      prev.map((friend) =>
        friend.id === friendId
          ? {
              ...friend,
              unreadCount: 0,
              messages: [
                ...friend.messages,
                {
                  id: `dm-${Date.now()}`,
                  senderHandle: profile.handle,
                  senderCode: profile.code,
                  text,
                  timestamp: formatNowTime(),
                  isOwn: true,
                },
              ],
            }
          : friend
      )
    );
  };

  const handleSelectFriend = (friendId: string | null) => {
    setActiveFriendId(friendId);
    if (friendId) {
      setFriends((prev) =>
        prev.map((f) => (f.id === friendId ? { ...f, unreadCount: 0 } : f))
      );
    }
  };

  const handleShareToLobby = (
    post: DossierPost,
    lobbyId: string,
    link: string
  ) => {
    handleSendLobbyMessage(
      lobbyId,
      `Shared ${post.fileCode} — "${post.title}" ${link}`
    );
  };

  const handleShareToFriend = (
    post: DossierPost,
    friendId: string,
    link: string
  ) => {
    handleSendDmMessage(
      friendId,
      `Shared ${post.fileCode} — "${post.title}" ${link}`
    );
  };

  const handleGenerateShortLink = (kind: 'telegram' | 'p2p') => {
    const url = generateBrandedShortLink(
      kind,
      bridgeSettings.customRelayDomain
    );
    const label =
      kind === 'telegram'
        ? 'TELEGRAM FAILOVER RELAY'
        : 'ZERO-STORAGE P2P SHORT LINK';
    setBridgeSettings((prev) => ({
      ...prev,
      generatedLinks: [
        {
          id: `gl-${Date.now()}`,
          label,
          url,
          createdAt: formatNowTime(),
        },
        ...prev.generatedLinks.slice(0, 5),
      ],
    }));
    showToast(`GENERATED ${url}`);
  };

  const handleRelockGate = () => {
    window.localStorage.removeItem(STORAGE_UNLOCKED_KEY);
    setSettingsOpen(false);
    setUnlocked(false);
  };

  const navItems: Array<{
    id: NavTab;
    label: string;
    icon: typeof FileText;
    badge?: number;
  }> = [
    { id: 'FEED', label: 'FEED', icon: FileText },
    { id: 'EXPLORE', label: 'EXPLORE', icon: Compass },
    { id: 'CHANNELS', label: 'CHANNELS', icon: Radio },
    {
      id: 'ALERTS',
      label: 'ALERTS',
      icon: Bell,
      badge: unreadAlertsCount > 0 ? unreadAlertsCount : undefined,
    },
  ];

  if (!unlocked) {
    return (
      <AccessGate
        onUnlock={handleUnlock}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
      />
    );
  }

  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#F3F5F3] text-[#111915] terminal-grid dark:bg-[#070B09] dark:text-[#E0EFE6]">
      <div className="crt-scanlines fixed inset-0 z-0 opacity-30" />

      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 h-[52px] border-b border-[#CDD8D1] bg-white/95 backdrop-blur-md dark:border-[#1C2E24] dark:bg-[#070B09]/95 sm:h-14">
        <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between gap-3 px-3 sm:px-5">
          {/* Brand Title + Live Cursor */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => {
                soundEngine.playKeyTick();
                setActiveTab('FEED');
              }}
              className="flex items-center gap-2 font-mono text-sm font-bold tracking-wider text-emerald-800 whitespace-nowrap shrink-0 dark:text-emerald-400 sm:text-base"
            >
              <Shield className="h-4 w-4 shrink-0" />
              <span>CLASSIFIED_NET</span>
              <span aria-hidden="true" className="terminal-cursor" />
            </button>

            {/* Live LOCAL_NODE Status */}
            <div
              className="hidden items-center gap-1.5 border-l border-[#CDD8D1] pl-3 font-mono text-[11px] text-[#43574B] whitespace-nowrap dark:border-[#1E3327] dark:text-[#84A792] md:flex"
              aria-label="Local node status"
            >
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                LOCAL_NODE:
              </span>
              <span>
                {bridgeSettings.localP2pMesh
                  ? 'ONLINE // PING: 14ms // AES-256'
                  : 'RELAY MODE // AES-256'}
              </span>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={handleToggleMute}
              aria-label={isMuted ? 'Unmute terminal sound effects' : 'Mute terminal sound effects'}
              className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center gap-1.5 border border-[#CDD8D1] bg-[#F5F8F6] px-2.5 font-mono text-[11px] font-semibold text-[#283B30] transition-colors hover:border-emerald-600 dark:border-[#223B2C] dark:bg-[#0B120E] dark:text-emerald-300 dark:hover:border-emerald-400 active:translate-y-[1px]"
            >
              {isMuted ? (
                <VolumeX className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              ) : (
                <Volume2 className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
              )}
              <span className="hidden lg:inline">
                {isMuted ? 'MUTED' : 'SFX ON'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playSecureChime();
                setSettingsOpen(true);
              }}
              aria-label="Open Bridge and Node Settings"
              className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center gap-1.5 border border-[#CDD8D1] bg-[#F5F8F6] px-2.5 font-mono text-[11px] font-semibold text-[#283B30] transition-colors hover:border-emerald-600 dark:border-[#223B2C] dark:bg-[#0B120E] dark:text-emerald-300 dark:hover:border-emerald-400 active:translate-y-[1px]"
            >
              <Server className="h-3.5 w-3.5" />
              <span className="hidden sm:inline whitespace-nowrap">
                BRIDGE / NODE
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playKeyTick();
                setProfileOpen(true);
              }}
              aria-label={`Open agent dossier profile for ${profile.handle}`}
              className="inline-flex min-h-[36px] items-center gap-1.5 border border-emerald-700 bg-emerald-700 px-2.5 font-mono text-[11px] font-semibold text-white transition-colors hover:bg-emerald-800 dark:border-emerald-400/70 dark:bg-emerald-500/15 dark:text-emerald-300 dark:hover:bg-emerald-500/25 active:translate-y-[1px] whitespace-nowrap"
            >
              <User className="h-3.5 w-3.5" />
              <span className="max-w-[92px] truncate sm:max-w-none">
                {profile.handle}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Responsive Shell: Desktop Left Rail + Main Viewport */}
      <div className="relative z-10 mx-auto flex max-w-[1440px]">
        {/* Desktop Left Navigation Rail */}
        <aside className="sticky top-14 hidden h-[calc(100vh-56px)] w-60 shrink-0 flex-col justify-between border-r border-[#CDD8D1] bg-white/85 p-4 backdrop-blur-xs dark:border-[#1C2E24] dark:bg-[#080E0B]/90 md:flex">
          <nav aria-label="Primary desktop navigation" className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    soundEngine.playKeyTick();
                    setActiveTab(item.id);
                  }}
                  aria-current={active ? 'page' : undefined}
                  className={`flex min-h-[44px] w-full items-center justify-between border px-3.5 py-2.5 font-mono text-xs font-semibold tracking-wider transition-all active:translate-y-[1px] ${
                    active
                      ? 'border-emerald-700 bg-emerald-700 text-white dark:border-emerald-400 dark:bg-emerald-500/20 dark:text-emerald-300'
                      : 'border-transparent text-[#43574B] hover:border-[#CDD8D1] hover:bg-[#F5F8F6] hover:text-[#111915] dark:text-[#8CA998] dark:hover:border-[#1E3527] dark:hover:bg-[#0F1914] dark:hover:text-emerald-200'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </span>
                  {item.badge !== undefined && (
                    <span
                      className={`font-mono text-[11px] font-bold ${
                        active
                          ? 'text-white dark:text-amber-300'
                          : 'text-amber-700 dark:text-amber-400'
                      }`}
                    >
                      [{item.badge}]
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Compact Desktop Rail Summary */}
          <div className="space-y-3 border-t border-[#E1E9E4] pt-4 dark:border-[#182920]">
            <div className="font-mono text-[11px] text-[#5D7266] dark:text-[#789684]">
              <div className="font-semibold text-emerald-800 dark:text-emerald-400">
                ACTIVE SYNC STATUS
              </div>
              <div className="mt-1">
                {lobbies.filter((l) => l.status === 'LIVE').length} LIVE WATCH
                LOBBIES
              </div>
              <div>{friends.length} VERIFIED P2P FRIENDS</div>
              <div className="mt-1 text-emerald-700 dark:text-emerald-400">
                REP SCORE: {peerReputation}
              </div>
            </div>
          </div>
        </aside>

        {/* Main Scrollable Content Area */}
        <main className="min-w-0 flex-1 px-3.5 pt-4 pb-20 sm:px-6 sm:pt-6 md:pb-8">
          <div
            key={activeTab}
            className="animate-fade-slide mx-auto max-w-5xl"
          >
              {activeTab === 'FEED' && (
                <FeedView
                  posts={posts}
                  categoryFilter={categoryFilter}
                  tagFilter={tagFilter}
                  searchQuery={feedSearch}
                  currentHandle={profile.handle}
                  friendHandles={friendHandles}
                  sentRequestHandles={sentRequestHandles}
                  onCategoryChange={setCategoryFilter}
                  onTagFilterChange={setTagFilter}
                  onSearchChange={setFeedSearch}
                  onOpenNewDossier={() => setNewDossierOpen(true)}
                  onVote={handleVote}
                  onOpenComments={(post) => setCommentsPostId(post.id)}
                  onOpenShare={(post) => setSharePost(post)}
                  onAddFriend={handleAddFriend}
                  onExpandMedia={setTheaterPreview}
                />
              )}

              {activeTab === 'EXPLORE' && (
                <ExploreView
                  lobbies={lobbies}
                  agents={INITIAL_DISCOVERABLE_AGENTS}
                  friendHandles={friendHandles}
                  sentRequestHandles={sentRequestHandles}
                  onSelectTag={(tag) => {
                    setTagFilter(tag);
                    setCategoryFilter('ALL');
                    setActiveTab('FEED');
                  }}
                  onOpenLobby={(lobbyId) => {
                    setActiveTab('CHANNELS');
                    setChannelSubTab('LOBBIES');
                    setActiveLobbyId(lobbyId);
                  }}
                  onToggleJoinClub={(clubId) => {
                    setLobbies((prev) =>
                      prev.map((l) =>
                        l.id === clubId
                          ? {
                              ...l,
                              joined: !l.joined,
                              viewerCount: l.joined
                                ? Math.max(1, l.viewerCount - 1)
                                : l.viewerCount + 1,
                            }
                          : l
                      )
                    );
                  }}
                  onAddFriend={handleAddFriend}
                />
              )}

              {activeTab === 'CHANNELS' && (
                <ChannelsView
                  subTab={channelSubTab}
                  lobbies={lobbies}
                  friends={friends}
                  activeLobbyId={activeLobbyId}
                  activeFriendId={activeFriendId}
                  currentHandle={profile.handle}
                  friendHandles={friendHandles}
                  sentRequestHandles={sentRequestHandles}
                  onSubTabChange={setChannelSubTab}
                  onSelectLobby={setActiveLobbyId}
                  onSelectFriend={handleSelectFriend}
                  onOpenHostLobby={() => setHostLobbyOpen(true)}
                  onSendLobbyMessage={handleSendLobbyMessage}
                  onSendDmMessage={handleSendDmMessage}
                  onAddFriendByHandle={handleAddFriend}
                  onExpandMedia={setTheaterPreview}
                />
              )}

              {activeTab === 'ALERTS' && (
                <AlertsView
                  requests={friendRequests}
                  alerts={alerts}
                  onAcceptRequest={handleAcceptRequest}
                  onDeclineRequest={handleDeclineRequest}
                  onMarkAllRead={() =>
                    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })))
                  }
                  onNavigateAlert={(tab, targetId) => {
                    if (tab === 'CHANNELS' && targetId) {
                      setActiveTab('CHANNELS');
                      setChannelSubTab('LOBBIES');
                      setActiveLobbyId(targetId);
                    } else if (tab === 'FEED') {
                      setActiveTab('FEED');
                      if (targetId) setCommentsPostId(targetId);
                    }
                  }}
                />
              )}
          </div>
        </main>
      </div>

      {/* Mobile Fixed Bottom 4-Tab Bar (height 56px; combined with 52px header = 108px / 844px = 12.8% < 15%) */}
      <nav
        aria-label="Primary mobile navigation"
        className="fixed right-0 bottom-0 left-0 z-30 grid h-14 grid-cols-4 border-t border-[#CDD8D1] bg-white/95 backdrop-blur-md dark:border-[#1C2E24] dark:bg-[#070B09]/95 md:hidden"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                soundEngine.playKeyTick();
                setActiveTab(item.id);
              }}
              aria-current={active ? 'page' : undefined}
              className={`relative flex flex-col items-center justify-center gap-0.5 font-mono text-[10px] font-semibold transition-colors ${
                active
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-[#5D7266] dark:text-[#789684]'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
              {item.badge !== undefined && (
                <span className="absolute top-1.5 right-3 font-mono text-[10px] font-bold text-amber-600 dark:text-amber-400">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Live Action Confirmation Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="animate-fade-slide pointer-events-none fixed right-3 bottom-16 left-3 z-40 border border-emerald-600 bg-[#0B120E]/95 px-4 py-2.5 font-mono text-xs font-semibold text-emerald-300 shadow-xl backdrop-blur-xs sm:left-auto sm:right-5 md:bottom-5"
        >
          {toast}
        </div>
      )}

      {/* Modals & Drawers */}
      <NewDossierModal
        open={newDossierOpen}
        onClose={() => setNewDossierOpen(false)}
        onCreate={handleCreateDossier}
      />

      <HostLobbyModal
        open={hostLobbyOpen}
        onClose={() => setHostLobbyOpen(false)}
        onCreate={handleCreateLobby}
      />

      <CommentsDrawer
        post={commentsPost}
        onClose={() => setCommentsPostId(null)}
        onAddComment={handleAddComment}
        onExpandMedia={setTheaterPreview}
      />

      <ShareDossierModal
        post={sharePost}
        lobbies={lobbies}
        friends={friends}
        relayDomain={bridgeSettings.customRelayDomain}
        onClose={() => setSharePost(null)}
        onShareToLobby={handleShareToLobby}
        onShareToFriend={handleShareToFriend}
      />

      <ProfileModal
        open={profileOpen}
        profile={profile}
        reputation={peerReputation}
        friendsCount={friends.length}
        userPosts={userPosts}
        onUpdateBio={(bio) => setProfile((prev) => ({ ...prev, bio }))}
        onClose={() => setProfileOpen(false)}
      />

      <SettingsModal
        open={settingsOpen}
        settings={bridgeSettings}
        isDark={isDark}
        onToggleTheme={() => setIsDark((d) => !d)}
        onUpdateSettings={setBridgeSettings}
        onGenerateShortLink={handleGenerateShortLink}
        onRelockGate={handleRelockGate}
        onClose={() => setSettingsOpen(false)}
      />

      <TheaterModal
        preview={theaterPreview}
        onClose={() => setTheaterPreview(null)}
      />
    </div>
  );
}
