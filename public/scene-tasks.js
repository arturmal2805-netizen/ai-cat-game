// The synchronous and cooperative builders execute the exact same scene steps.
// Yield between individual props/loops instead of blocking an island flight.
export function runSceneSteps(steps) {
  let result;
  do result = steps.next();
  while (!result.done);
  return result.value;
}
let sceneChannel;
const sceneTurns = [];
export function yieldSceneTask() {
  if (globalThis.scheduler?.yield) return globalThis.scheduler.yield();
  // Safari clamps nested zero-delay timers to at least 4 ms. A posted task
  // still yields to input/paint without adding that delay hundreds of times.
  if (typeof window !== "undefined" && globalThis.MessageChannel) {
    if (!sceneChannel) {
      sceneChannel = new MessageChannel();
      sceneChannel.port1.onmessage = () => sceneTurns.shift()?.();
    }
    return new Promise((resolve) => {
      sceneTurns.push(resolve);
      sceneChannel.port2.postMessage(0);
    });
  }
  return new Promise((resolve) => setTimeout(resolve, 0));
}

// Resume the selected island at the next slice rather than waiting for an
// unrelated island to finish. Paused iterators retain all their authored work.
export function createSceneScheduler({
  getPriority = () => null,
  canRun = () => true,
  yieldTask = yieldSceneTask,
  budget = 4,
} = {}) {
  const jobs = new Set();
  let running = false;
  async function pump() {
    if (running) return;
    running = true;
    try {
      while (jobs.size) {
        await yieldTask();
        const priority = getPriority(),
          job =
            [...jobs].find((j) => j.priority === priority) ||
            jobs.values().next().value;
        if (!canRun(job.priority)) {
          await new Promise((resolve) => setTimeout(resolve, 50));
          continue;
        }
        try {
          if (job.signal?.aborted)
            throw (
              job.signal.reason || new DOMException("Aborted", "AbortError")
            );
          const start = performance.now();
          let result;
          do result = job.steps.next();
          while (!result.done && performance.now() - start < budget);
          job.onSlice?.(performance.now() - start);
          if (result.done) {
            jobs.delete(job);
            job.resolve(result.value);
          }
        } catch (error) {
          jobs.delete(job);
          job.steps.return();
          job.reject(error);
        }
      }
    } finally {
      running = false;
    }
  }
  return {
    prepare(steps, options = {}) {
      return new Promise((resolve, reject) => {
        jobs.add({ ...options, steps, resolve, reject });
        void pump();
      });
    },
  };
}
export async function prepareSceneSteps(
  steps,
  {
    signal,
    budget = 5,
    yieldTask = yieldSceneTask,
    onSlice,
    scheduler,
    priority,
  } = {},
) {
  if (scheduler) return scheduler.prepare(steps, { signal, onSlice, priority });
  let result;
  try {
    do {
      if (signal?.aborted)
        throw signal.reason || new DOMException("Aborted", "AbortError");
      const start = performance.now();
      do result = steps.next();
      while (!result.done && performance.now() - start < budget);
      onSlice?.(performance.now() - start);
      if (!result.done) await yieldTask();
    } while (!result.done);
    return result.value;
  } catch (error) {
    steps.return();
    throw error;
  }
}

// Preserve edit order, and let the next edit recover after a failed build.
export function queueSceneRefresh(pending, id, work) {
  const next = (pending.get(id) || Promise.resolve())
    .catch(() => {})
    .then(work);
  pending.set(id, next);
  return next;
}
