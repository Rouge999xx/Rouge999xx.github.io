const assert = require('node:assert/strict');
const {test} = require('node:test');
const Brain = require('../ragdoll-brain.js');

test('autonomy starts after exactly five seconds and restarts after every interaction', () => {
  const brain = new Brain(1000);
  assert.equal(brain.ready(5999), false);
  assert.equal(brain.ready(6000), true);
  brain.interact(6200);
  assert.equal(brain.ready(11199), false);
  assert.equal(brain.ready(11200), true);
});
test('holding, hiding, pausing, dialogs, and an active adventure block decisions', () => {
  const brain = new Brain();
  for (const option of [{enabled: false}, {held: true}, {hidden: true}, {locked: true}, {busy: true}]) {
    assert.equal(brain.ready(6000, option), false);
  }
  assert.equal(brain.ready(6000), true);
});
test('curiosity avoids recently visited targets and works without targets', () => {
  const brain = new Brain(0, () => 0);
  const targets = [{id: 'project'}, {id: 'button'}, {id: 'badge'}];
  assert.equal(brain.choose(targets, 5000).id, 'project');
  assert.equal(brain.choose(targets, 10000).id, 'button');
  assert.equal(brain.choose(targets, 15000).id, 'badge');
  assert.equal(brain.choose(targets, 20000).id, 'project');
  assert.equal(brain.choose([], 25000), null);
  assert.equal(brain.ready(29999), false);
  assert.equal(brain.ready(30000), true);
});
test('finishing an adventure preserves the last user interaction time', () => {
  const brain = new Brain();
  brain.interact(1000);
  brain.choose([{id: 'project'}], 6000);
  brain.rest(9000);
  assert.equal(brain.lastInteraction, 1000);
  assert.equal(brain.ready(10799), false);
  assert.equal(brain.ready(10800), true);
});
test('Pip alternates types of play instead of repeatedly changing controls', () => {
  const brain = new Brain(0, () => 0);
  const targets = [{id: 'filter1', kind: 'tap'}, {id: 'filter2', kind: 'tap'}, {id: 'card', kind: 'perch'}];
  assert.equal(brain.choose(targets, 5000).id, 'filter1');
  assert.equal(brain.choose(targets, 10000).id, 'card');
  assert.equal(brain.choose(targets, 15000).id, 'filter2');
});
