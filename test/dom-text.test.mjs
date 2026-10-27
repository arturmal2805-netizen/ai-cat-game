import test from 'node:test';
import assert from 'node:assert/strict';
import {setText} from '../public/dom-text.js';

test('unchanged HUD text retains its node, while changed values and empty values still update',()=>{
  let value='42',writes=0;const node={get textContent(){return value;},set textContent(v){value=v;writes++;}};
  for(let i=0;i<100;i++)assert.equal(setText(node,42),false);
  assert.equal(writes,0);assert.equal(setText(node,43),true);assert.equal(value,'43');
  assert.equal(setText(node,null),true);assert.equal(value,'');assert.equal(setText(node,undefined),false);
  assert.equal(setText(node,'<b>кот</b>'),true);assert.equal(value,'<b>кот</b>');assert.equal(writes,3);
  const nested={textContent:'кот',firstChild:{nodeType:1},childNodes:[{}]};
  assert.equal(setText(nested,'кот'),true,'equal descendant text must still retain native textContent flattening');
});
