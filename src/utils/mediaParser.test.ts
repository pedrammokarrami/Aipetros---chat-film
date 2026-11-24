import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractUrlsFromText,
  parseMediaPreview,
  extractMediaPreviews,
  generateBrandedShortLink,
} from './mediaParser';

test('extractUrlsFromText extracts deduplicated URLs and strips trailing punctuation', () => {
  const text =
    'Check the frame at https://stream.cnet.local/stream/dune2-imax.m3u8, and also /src/assets/images/poster_desert_planet_1795523608384.jpg! Repeat https://stream.cnet.local/stream/dune2-imax.m3u8.';
  const urls = extractUrlsFromText(text);
  assert.deepEqual(urls, [
    'https://stream.cnet.local/stream/dune2-imax.m3u8',
    '/src/assets/images/poster_desert_planet_1795523608384.jpg',
  ]);
});

test('parseMediaPreview classifies video, youtube embed, image, and generic encrypted links', () => {
  const video = parseMediaPreview('https://stream.cnet.local/stream/dune2-70mm.mp4');
  assert.equal(video.kind, 'video');
  assert.equal(video.domain, 'stream.cnet.local');
  assert.ok(video.posterUrl);

  const yt = parseMediaPreview('https://youtu.be/dQw4w9WgXcQ');
  assert.equal(yt.kind, 'embed');
  assert.equal(yt.embedUrl, 'https://www.youtube.com/embed/dQw4w9WgXcQ');

  const img = parseMediaPreview('/src/assets/images/poster_corridor_office_1795523607600.jpg');
  assert.equal(img.kind, 'image');
  assert.equal(img.domain, 'LOCAL_ARCHIVE');

  const link = parseMediaPreview('https://cnet.relay/doc-x91a2b');
  assert.equal(link.kind, 'link');
  assert.equal(link.domain, 'cnet.relay');
});

test('extractMediaPreviews parses multiple links from a chat message', () => {
  const previews = extractMediaPreviews(
    'Watch live: https://stream.cnet.local/stream/aot-final.m3u8 and notes at https://archive.example.org/notes'
  );
  assert.equal(previews.length, 2);
  assert.equal(previews[0].kind, 'video');
  assert.equal(previews[1].kind, 'link');
});

test('generateBrandedShortLink formats branded short URL deterministically when seeded', () => {
  const url = generateBrandedShortLink('telegram', 'https://cnet.relay/', 'abc123');
  assert.equal(url, 'https://cnet.relay/tg-abc123');
});
