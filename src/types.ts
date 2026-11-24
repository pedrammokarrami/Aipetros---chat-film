export type MediaCategory = 'MOVIE' | 'SERIES' | 'ANIME';

export type NavTab = 'FEED' | 'EXPLORE' | 'CHANNELS' | 'ALERTS';

export type ChannelSubTab = 'LOBBIES' | 'DMS';

export type InviteChannel = 'EMAIL' | 'SMS' | 'WHATSAPP' | 'TELEGRAM';

export type MediaPreviewKind = 'video' | 'embed' | 'image' | 'link';

export interface MediaPreview {
  url: string;
  kind: MediaPreviewKind;
  title: string;
  domain: string;
  posterUrl?: string;
  duration?: string;
  resolution?: string;
  embedUrl?: string;
}

export interface CommentItem {
  id: string;
  authorHandle: string;
  authorCode: string;
  text: string;
  createdAt: string;
}

export interface DossierPost {
  id: string;
  fileCode: string;
  title: string;
  body: string;
  category: MediaCategory;
  tags: string[];
  authorHandle: string;
  authorCode: string;
  createdAt: string;
  upvotes: number;
  downvotes: number;
  userVote: 'up' | 'down' | null;
  comments: CommentItem[];
  classification: 'DECLASSIFIED' | 'EYES_ONLY' | 'FIELD_BRIEF';
}

export interface ChatMessage {
  id: string;
  senderHandle: string;
  senderCode: string;
  text: string;
  timestamp: string;
  isOwn?: boolean;
  systemNotice?: boolean;
}

export interface LobbyMember {
  handle: string;
  code: string;
  role: 'HOST' | 'AGENT' | 'GUEST';
  status: 'SYNCED' | 'BUFFERING' | 'ACTIVE';
}

export interface WatchLobby {
  id: string;
  kind: 'LOBBY' | 'CLUB';
  code: string;
  title: string;
  mediaTitle: string;
  category: MediaCategory;
  status: 'LIVE' | 'WAITING_ROOM' | 'CLUB_ACTIVE';
  hostHandle: string;
  streamUrl: string;
  posterUrl: string;
  syncTimestamp: string;
  viewerCount: number;
  description: string;
  tags: string[];
  joined: boolean;
  members: LobbyMember[];
  messages: ChatMessage[];
}

export interface Friend {
  id: string;
  handle: string;
  code: string;
  status: 'ONLINE' | 'WATCHING' | 'IN_LOBBY' | 'IDLE';
  activity: string;
  reputation: number;
  verified: boolean;
  messages: ChatMessage[];
  unreadCount: number;
}

export interface DiscoverableAgent {
  id: string;
  handle: string;
  code: string;
  specialty: string;
  reputation: number;
  verified: boolean;
  favoriteTag: string;
}

export interface FriendRequest {
  id: string;
  handle: string;
  code: string;
  note: string;
  mutualCount: number;
  reputation: number;
  timestamp: string;
}

export interface AlertItem {
  id: string;
  type: 'UPVOTE' | 'COMMENT' | 'LOBBY' | 'SYSTEM' | 'SHARE';
  title: string;
  detail: string;
  timestamp: string;
  read: boolean;
  targetTab?: NavTab;
  targetId?: string;
}

export interface AgentProfile {
  handle: string;
  code: string;
  bio: string;
  baseReputation: number;
  referralsCount: number;
  verifiedBadges: string[];
  joinedDate: string;
  watchHours: number;
}

export interface BridgeSettings {
  localP2pMesh: boolean;
  localStreamServer: boolean;
  telegramFailover: boolean;
  zeroStorageRouting: boolean;
  customRelayDomain: string;
  generatedLinks: Array<{
    id: string;
    label: string;
    url: string;
    createdAt: string;
  }>;
}
