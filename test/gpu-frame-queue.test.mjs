import { test } from "node:test";
import assert from "node:assert/strict";
import { createGpuFrameQueue } from "../public/gpu-frame-queue.js";

test("a slow GPU cannot queue obsolete camera frames or block input waiting for a fence", () => {
  let serial = 0,
    flushed = 0;
  const signalled = new Set(),
    deleted = [],
    waits = [],
    gl = {
      SYNC_GPU_COMMANDS_COMPLETE: 1,
      TIMEOUT_EXPIRED: 2,
      fenceSync: () => ++serial,
      flush: () => flushed++,
      deleteSync: (s) => deleted.push(s),
      clientWaitSync: (s, flags, timeout) => {
        waits.push([flags, timeout]);
        return signalled.has(s) ? 3 : 2;
      },
    },
    queue = createGpuFrameQueue(gl);
  assert.equal(queue.ready(), true);
  queue.submitted();
  queue.submitted();
  for (let i = 0; i < 300; i++) assert.equal(queue.ready(), false);
  assert.equal(queue.pending, 2);
  assert.equal(serial, 2);
  assert.ok(waits.every(([flags, timeout]) => flags === 0 && timeout === 0));
  signalled.add(1);
  assert.equal(queue.ready(), true);
  assert.deepEqual(deleted, [1]);
  queue.submitted();
  assert.equal(queue.pending, 2);
  signalled.add(2);
  signalled.add(3);
  assert.equal(queue.ready(), true);
  assert.equal(queue.pending, 0);
  queue.submitted();
  queue.clear();
  assert.equal(queue.pending, 0);
  assert.equal(flushed, 4);
  assert.deepEqual(deleted, [1, 2, 3, 4]);
});
test("GPU fence support is optional and failed queries can recover", () => {
  const queue = createGpuFrameQueue({});
  for (let i = 0; i < 10; i++) {
    assert.ok(queue.ready());
    queue.submitted();
  }
  assert.equal(queue.pending, 0);
  queue.clear();
  let deleted = 0;
  const recovering = createGpuFrameQueue({
    TIMEOUT_EXPIRED: 2,
    fenceSync: () => 1,
    flush() {},
    clientWaitSync: () => 4, // WAIT_FAILED after a driver/context transition
    deleteSync: () => deleted++,
  });
  recovering.submitted();
  assert.equal(recovering.ready(), true);
  assert.equal(recovering.pending, 0);
  assert.equal(deleted, 1);
});
