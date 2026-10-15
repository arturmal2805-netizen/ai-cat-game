// The synchronous and cooperative builders execute the exact same scene steps.
// Yield between individual props/loops instead of blocking an island flight.
export function runSceneSteps(steps) {
  let result;
  do result = steps.next();
  while (!result.done);
  return result.value;
}
export const yieldSceneTask = () =>
  globalThis.scheduler?.yield
    ? globalThis.scheduler.yield()
    : new Promise((resolve) => setTimeout(resolve, 0));
export async function prepareSceneSteps(
  steps,
  { signal, budget = 5, yieldTask = yieldSceneTask, onSlice } = {},
) {
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
