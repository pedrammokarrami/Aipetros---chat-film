import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyVote,
  filterDossiers,
  normalizeTags,
  validateDossierInput,
  validateLobbyInput,
  acceptFriendRequestState,
  declineFriendRequestState,
  computePeerReputation,
} from './dossierStore';
import type { DossierPost, Friend, FriendRequest } from '../types';

const samplePost: DossierPost = {
  id: 'p1',
  fileCode: 'FILE #0401',
  title: 'Dune: Part Two Sound Design Analysis',
  body: 'The sandworm seismic rumble uses sub-bass layering.',
  category: 'MOVIE',
  tags: ['#Dune2', '#SciFi'],
  authorHandle: '@KESTREL_7',
  authorCode: 'AG-771',
  createdAt: '12m ago',
  upvotes: 10,
  downvotes: 2,
  userVote: null,
  comments: [],
  classification: 'DECLASSIFIED',
};

test('applyVote toggles upvotes and switches between up and down cleanly', () => {
  const upvoted = applyVote(samplePost, 'up');
  assert.equal(upvoted.upvotes, 11);
  assert.equal(upvoted.downvotes, 2);
  assert.equal(upvoted.userVote, 'up');

  const undone = applyVote(upvoted, 'up');
  assert.equal(undone.upvotes, 10);
  assert.equal(undone.userVote, null);

  const switched = applyVote(upvoted, 'down');
  assert.equal(switched.upvotes, 10);
  assert.equal(switched.downvotes, 3);
  assert.equal(switched.userVote, 'down');
});

test('filterDossiers filters by category, tag, and query', () => {
  const posts: DossierPost[] = [
    samplePost,
    {
      ...samplePost,
      id: 'p2',
      title: 'Attack on Titan Rumbling Storyboard Notes',
      category: 'ANIME',
      tags: ['#AttackOnTitan'],
    },
  ];
  assert.equal(
    filterDossiers(posts, { category: 'ANIME', tag: null, query: '' }).length,
    1
  );
  assert.equal(
    filterDossiers(posts, { category: 'ALL', tag: '#dune2', query: '' }).length,
    1
  );
  assert.equal(
    filterDossiers(posts, { category: 'ALL', tag: null, query: 'storyboard' })
      .length,
    1
  );
});

test('normalizeTags prefixes hashes and deduplicates', () => {
  assert.deepEqual(normalizeTags('Dune2, #Dune2, Severance anime'), [
    '#Dune2',
    '#Severance',
    '#anime',
  ]);
});

test('validateDossierInput and validateLobbyInput reject invalid inputs', () => {
  assert.equal(
    validateDossierInput({ title: 'Hi', body: 'Short', tagsRaw: '' }).valid,
    false
  );
  assert.equal(
    validateDossierInput({
      title: 'Severance Floor Map',
      body: 'Mapped the entire severed floor corridor loop across season 2.',
      tagsRaw: 'Severance',
    }).valid,
    true
  );

  assert.equal(
    validateLobbyInput({ title: 'A', mediaTitle: 'X', streamUrl: 'bad' }).valid,
    false
  );
  assert.equal(
    validateLobbyInput({
      title: 'Midnight Anime Sync',
      mediaTitle: 'Ghost in the Shell',
      streamUrl: 'https://stream.cnet.local/stream/gits-4k.mp4',
    }).valid,
    true
  );
});

test('acceptFriendRequestState and declineFriendRequestState update requests and friends', () => {
  const requests: FriendRequest[] = [
    {
      id: 'req-1',
      handle: '@VEX_ARCHIVE',
      code: 'AG-909',
      note: 'Saw your Severance dossier.',
      mutualCount: 3,
      reputation: 910,
      timestamp: '5m ago',
    },
  ];
  const friends: Friend[] = [];

  const result = acceptFriendRequestState(requests, friends, 'req-1');
  assert.equal(result.requests.length, 0);
  assert.equal(result.friends.length, 1);
  assert.equal(result.friends[0].handle, '@VEX_ARCHIVE');

  const declined = declineFriendRequestState(requests, 'req-1');
  assert.equal(declined.length, 0);
});

test('computePeerReputation sums referrals, posts, and friends deterministically', () => {
  assert.equal(
    computePeerReputation({
      baseReputation: 800,
      referralsCount: 2,
      postsCount: 3,
      friendsCount: 4,
    }),
    935
  );
});
