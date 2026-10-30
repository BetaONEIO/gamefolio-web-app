/**
 * Serialises asynchronous work for the same key while allowing unrelated keys
 * to proceed concurrently. Entries are removed once the last queued task exits.
 *
 * This is process-local. Deployments with multiple API replicas should replace
 * it with a distributed lock or route custodial-wallet writes to one worker.
 */
export function createKeyedSerialExecutor() {
  const tails = new Map<string, Promise<void>>();

  return async function runSerially<T>(key: string, task: () => Promise<T>): Promise<T> {
    const normalizedKey = key.toLowerCase();
    const previous = tails.get(normalizedKey) ?? Promise.resolve();

    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    const tail = previous.catch(() => undefined).then(() => current);
    tails.set(normalizedKey, tail);

    await previous.catch(() => undefined);
    try {
      return await task();
    } finally {
      release();
      if (tails.get(normalizedKey) === tail) tails.delete(normalizedKey);
    }
  };
}
