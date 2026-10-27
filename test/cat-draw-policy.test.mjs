import test from 'node:test';
import assert from 'node:assert/strict';
import {catDrawMode} from '../public/cat-draw-policy.js';

test('ordinary play and existing native diagnostic links use the player-verified individual renderer',()=>{
  for(const search of ['', '?update=release', '?profile=1', '?profile=1&catDraw=native', '?catDraw=shared'])
    assert.equal(catDrawMode(search),'individual');
  assert.equal(catDrawMode('?profile=1&catDraw=shared'),'automatic');
});
