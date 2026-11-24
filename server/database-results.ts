import type { SQLWrapper } from 'drizzle-orm';

export type DatabaseRows<TRow> = TRow[] & {
  readonly count: number;
  readonly rowCount: number;
  readonly rows: TRow[];
};

export function rowsWithCount<TRow>(result: { rows: TRow[]; rowCount: number | null }): DatabaseRows<TRow> {
  // postgres-js exposes affected-row counts even for UPDATE without RETURNING.
  // Keep metadata out of array serialization and ordinary row comparisons.
  Object.defineProperties(result.rows, {
    count: { value: result.rowCount ?? 0, configurable: true },
    rowCount: { value: result.rowCount ?? 0, configurable: true },
    rows: { value: result.rows, configurable: true },
  });
  return result.rows as DatabaseRows<TRow>;
}

type DatabaseMethods = {
  execute: (...args: any[]) => any;
  transaction: (callback: (tx: any) => Promise<any>, ...args: any[]) => Promise<any>;
};
type Tail<T extends any[]> = T extends [unknown, ...infer Rest] ? Rest : never;
type TransactionOf<T extends DatabaseMethods> = Parameters<Parameters<T['transaction']>[0]>[0];

export type ArrayResultDatabase<T extends DatabaseMethods> = Omit<T, 'execute' | 'transaction'> & {
  execute<TRow extends Record<string, unknown> = Record<string, unknown>>(query: SQLWrapper | string): Promise<DatabaseRows<TRow>>;
  transaction<TResult>(
    callback: (tx: ArrayResultDatabase<TransactionOf<T>>) => Promise<TResult>,
    ...options: Tail<Parameters<T['transaction']>>
  ): Promise<TResult>;
};

const adapted = new WeakSet<object>();

/** Preserve the existing raw-SQL contract on the database and every transaction. */
export function withArrayResults<T extends DatabaseMethods>(database: T): ArrayResultDatabase<T> {
  if (!adapted.has(database)) {
    const execute = database.execute.bind(database);
    const transaction = database.transaction.bind(database);
    database.execute = async (...args: any[]) => rowsWithCount(await execute(...args));
    database.transaction = (callback, ...options) => transaction(
      tx => callback(withArrayResults(tx)),
      ...options,
    );
    adapted.add(database);
  }
  // Leave Drizzle's session internals alone: query builders and count() still
  // need pg's QueryResult. Only the public raw execute() boundary is adapted.
  return database as unknown as ArrayResultDatabase<T>;
}
