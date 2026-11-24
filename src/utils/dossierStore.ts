import type {
  DossierPost,
  Friend,
  FriendRequest,
  MediaCategory,
} from '../types';

export function applyVote(
  post: DossierPost,
  direction: 'up' | 'down'
): DossierPost {
  let upvotes = post.upvotes;
  let downvotes = post.downvotes;
  let nextVote: 'up' | 'down' | null = direction;

  if (post.userVote === direction) {
    // Undo vote
    nextVote = null;
    if (direction === 'up') upvotes = Math.max(0, upvotes - 1);
    else downvotes = Math.max(0, downvotes - 1);
  } else {
    // Remove previous opposite vote if present
    if (post.userVote === 'up') upvotes = Math.max(0, upvotes - 1);
    if (post.userVote === 'down') downvotes = Math.max(0, downvotes - 1);
    // Apply new vote
    if (direction === 'up') upvotes += 1;
    else downvotes += 1;
  }

  return {
    ...post,
    upvotes,
    downvotes,
    userVote: nextVote,
  };
}

export function filterDossiers(
  posts: DossierPost[],
  options: {
    category: 'ALL' | MediaCategory;
    tag: string | null;
    query: string;
  }
): DossierPost[] {
  const q = options.query.trim().toLowerCase();
  const normalizedTag = options.tag ? options.tag.toLowerCase() : null;

  return posts.filter((post) => {
    if (options.category !== 'ALL' && post.category !== options.category) {
      return false;
    }
    if (
      normalizedTag &&
      !post.tags.some((t) => t.toLowerCase() === normalizedTag)
    ) {
      return false;
    }
    if (q) {
      const haystack = [
        post.title,
        post.body,
        post.authorHandle,
        post.fileCode,
        ...post.tags,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    }
    return true;
  });
}

export function normalizeTags(raw: string): string[] {
  const parts = raw
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => (s.startsWith('#') ? s : `#${s}`));
  return Array.from(new Set(parts)).slice(0, 5);
}

export function validateDossierInput(input: {
  title: string;
  body: string;
  tagsRaw: string;
}): { valid: boolean; error?: string } {
  if (input.title.trim().length < 4) {
    return {
      valid: false,
      error: 'Dossier title must be at least 4 characters.',
    };
  }
  if (input.body.trim().length < 10) {
    return {
      valid: false,
      error: 'Dossier briefing must contain at least 10 characters.',
    };
  }
  const tags = normalizeTags(input.tagsRaw);
  if (tags.length === 0) {
    return {
      valid: false,
      error: 'Add at least one media tag (e.g. #Dune2 or #Severance).',
    };
  }
  return { valid: true };
}

export function validateLobbyInput(input: {
  title: string;
  mediaTitle: string;
  streamUrl: string;
}): { valid: boolean; error?: string } {
  if (input.title.trim().length < 3) {
    return {
      valid: false,
      error: 'Lobby title must be at least 3 characters.',
    };
  }
  if (input.mediaTitle.trim().length < 2) {
    return {
      valid: false,
      error: 'Specify the movie, series, or anime title.',
    };
  }
  const trimmedUrl = input.streamUrl.trim();
  if (
    !trimmedUrl ||
    (!trimmedUrl.startsWith('http://') &&
      !trimmedUrl.startsWith('https://') &&
      !trimmedUrl.startsWith('/'))
  ) {
    return {
      valid: false,
      error: 'Enter a valid stream or media URL starting with https://',
    };
  }
  return { valid: true };
}

export function acceptFriendRequestState(
  requests: FriendRequest[],
  friends: Friend[],
  requestId: string
): {
  requests: FriendRequest[];
  friends: Friend[];
  accepted: FriendRequest | null;
} {
  const target = requests.find((r) => r.id === requestId);
  if (!target) {
    return { requests, friends, accepted: null };
  }
  const remaining = requests.filter((r) => r.id !== requestId);
  const alreadyFriend = friends.some(
    (f) => f.handle.toLowerCase() === target.handle.toLowerCase()
  );
  if (alreadyFriend) {
    return { requests: remaining, friends, accepted: target };
  }
  const newFriend: Friend = {
    id: `friend-${target.id}`,
    handle: target.handle,
    code: target.code,
    status: 'ONLINE',
    activity: 'CONNECTED // READY FOR SYNC',
    reputation: target.reputation,
    verified: true,
    unreadCount: 1,
    messages: [
      {
        id: `msg-welcome-${target.id}`,
        senderHandle: target.handle,
        senderCode: target.code,
        text: `Encrypted P2P handshake verified. ${target.note}`,
        timestamp: 'JUST NOW',
      },
    ],
  };
  return {
    requests: remaining,
    friends: [newFriend, ...friends],
    accepted: target,
  };
}

export function declineFriendRequestState(
  requests: FriendRequest[],
  requestId: string
): FriendRequest[] {
  return requests.filter((r) => r.id !== requestId);
}

export function computePeerReputation(params: {
  baseReputation: number;
  referralsCount: number;
  postsCount: number;
  friendsCount: number;
}): number {
  return (
    params.baseReputation +
    params.referralsCount * 25 +
    params.postsCount * 15 +
    params.friendsCount * 10
  );
}
