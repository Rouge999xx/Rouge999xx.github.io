const assert = require('node:assert/strict');
const { test } = require('node:test');
const Ragdoll = require('../ragdoll-physics.js');

for (const scale of [.9, 1.22]) {
  test(`ragdoll remains attached and recovers after interactions at scale ${scale}`, () => {
    const body = new Ragdoll(200, 600, scale);
    const pose = (x, t, action = 'idle') => Ragdoll.pose(x, 600, scale, t, action);
    const finite = () => body.points.forEach(p => assert(p.pos.every(Number.isFinite)));
    const upright = () => assert(body.points[0].pos[1] < 600 - 140 * scale);
    for (let i = 0; i < 600; i++) body.step({floor: 600, width: 900, pose: pose(200, i / 60), strength: .15});
    finite(); upright();
    const initialY = body.points[0].pos[1];
    body.impulse(4, -12);
    for (let i = 0; i < 10; i++) body.step({floor: 600, width: 900});
    assert(body.points[0].pos[1] < initialY - 40, 'an upward impulse lifts the body');
    for (let i = 0; i < 300; i++) body.step({floor: 600, width: 900});
    finite();
    body.points.forEach(p => assert(p.pos[1] <= 600 && p.pos[0] >= 0 && p.pos[0] <= 900));
    for (let i = 0; i < 240; i++) body.step({floor: 600, width: 900, pose: pose(300, i / 60), strength: .15});
    upright();
    assert(Math.abs(body.points[0].pos[0] - 300) < 15, 'recovers at the new location');
    for (let i = 0; i < 120; i++) body.step({floor: 600, width: 900, grab: {index: 6, target: [350, 200, 0]}});
    assert(Math.hypot(body.points[6].pos[0] - 350, body.points[6].pos[1] - 200) < 1);
    for (const link of body.links) {
      const a = body.points[link.a].pos, b = body.points[link.b].pos;
      const length = Math.hypot(...a.map((v, i) => v - b[i]));
      assert(Math.abs(length - link.length) < link.length * .12, 'joints stay connected during a pickup');
    }
    for (const action of ['walk', 'wave', 'dance', 'sit', 'follow']) {
      for (let i = 0; i < 180; i++) body.step({floor: 600, width: 900, pose: pose(300, i / 60, action), strength: .15});
      finite();
    }
  });
}
