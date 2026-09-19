const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

test('web maps allow a one-finger pan inside embedded map frames', () => {
  for (const file of ['google-route-map-html.ts', 'ItineraryMap.web.tsx']) {
    const source = readFileSync(join(__dirname, '../../mobile/src/components', file), 'utf8');
    assert.match(source, /gestureHandling:'greedy'/, `${file} should pan with one finger`);
    assert.doesNotMatch(source, /gestureHandling:'cooperative'/, `${file} must not require two fingers`);
  }
});

test('the domestic meetup picker keeps Kakao panning enabled', () => {
  const source = readFileSync(join(__dirname, '../../mobile/src/components/meetup-map-html.ts'), 'utf8');
  assert.match(source, /draggable:true/, 'Kakao meetup maps should pan with one finger');
  assert.match(source, /scrollwheel:true/, 'Kakao meetup maps should allow desktop wheel zoom');
  assert.doesNotMatch(source, /draggable:false/, 'The meetup picker must stay movable');
});
