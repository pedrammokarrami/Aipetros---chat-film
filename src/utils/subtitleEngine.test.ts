import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatTimecode,
  getActiveSubtitleCue,
  getBuiltInSubtitles,
  isRtlText,
  parseSubtitleFile,
  parseTimestampToSeconds,
} from './subtitleEngine';

test('parseTimestampToSeconds parses SRT and VTT timestamps accurately', () => {
  assert.equal(parseTimestampToSeconds('00:01:05,500'), 65.5);
  assert.equal(parseTimestampToSeconds('01:00:00.250'), 3600.25);
  assert.equal(parseTimestampToSeconds('02:30.000'), 150);
  assert.equal(parseTimestampToSeconds('invalid'), null);
});

test('parseSubtitleFile parses multi-line SRT and WebVTT files and strips HTML tags', () => {
  const srt = `1
00:00:01,000 --> 00:00:04,500
<i>Hello world</i>
Second line

2
00:00:05,000 --> 00:00:09,000
سلام بر دنیای سینما
`;
  const cues = parseSubtitleFile(srt);
  assert.equal(cues.length, 2);
  assert.equal(cues[0].startSec, 1);
  assert.equal(cues[0].endSec, 4.5);
  assert.equal(cues[0].text, 'Hello world\nSecond line');
  assert.equal(cues[1].text, 'سلام بر دنیای سینما');

  const vtt = `WEBVTT

00:10.000 --> 00:14.000 align:center
VTT Cue Line
`;
  const vttCues = parseSubtitleFile(vtt);
  assert.equal(vttCues.length, 1);
  assert.equal(vttCues[0].startSec, 10);
  assert.equal(vttCues[0].text, 'VTT Cue Line');
});

test('getActiveSubtitleCue respects subtitle sync timing offset', () => {
  const cues = [
    { id: '1', startSec: 10, endSec: 15, text: 'First cue' },
    { id: '2', startSec: 20, endSec: 25, text: 'Second cue' },
  ];
  assert.equal(getActiveSubtitleCue(cues, 12, 0)?.text, 'First cue');
  assert.equal(getActiveSubtitleCue(cues, 12, 3), null); // delayed by +3s -> starts at 13s
  assert.equal(getActiveSubtitleCue(cues, 13.5, 3)?.text, 'First cue');
  assert.equal(getActiveSubtitleCue(cues, 18.5, -2)?.text, 'Second cue'); // advanced by -2s
});

test('isRtlText identifies Persian text and formatTimecode formats cleanly', () => {
  assert.equal(isRtlText('سلام دنیا'), true);
  assert.equal(isRtlText('Desert horizon'), false);
  assert.equal(formatTimecode(3665), '01:01:05');
  assert.equal(formatTimecode(125, false), '02:05');
});

test('getBuiltInSubtitles provides full synced Persian and English tracks', () => {
  const bundle = getBuiltInSubtitles('Dune: Part Two — IMAX', 600);
  assert.ok(bundle.fa.length > 50);
  assert.ok(bundle.en.length > 50);
  const activeFa = getActiveSubtitleCue(bundle.fa, 120, 0);
  const activeEn = getActiveSubtitleCue(bundle.en, 120, 0);
  assert.ok(activeFa && isRtlText(activeFa.text));
  assert.ok(activeEn && !isRtlText(activeEn.text));
});
