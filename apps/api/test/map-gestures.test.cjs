const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

test('web maps allow a one-finger pan inside embedded map frames', () => {
  for (const file of ['google-route-map-html.ts', 'meetup-map-html.ts', 'ItineraryMap.web.tsx']) {
    const source = readFileSync(join(__dirname, '../../mobile/src/components', file), 'utf8');
    assert.match(source, /gestureHandling:'greedy'/, `${file} should pan with one finger`);
    assert.doesNotMatch(source, /gestureHandling:'cooperative'/, `${file} must not require two fingers`);
  }
});
