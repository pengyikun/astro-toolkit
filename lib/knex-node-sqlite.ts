// Knex dialect that uses Node.js's built-in `node:sqlite` module
// instead of the `better-sqlite3` native addon.
//
// Why: `better-sqlite3` pins its `engines.node` field to specific Node major
// versions because it ships prebuilt N-API binaries per ABI. New Node majors
// (e.g. 26) are unsupported until the maintainer publishes new prebuilds.
// `node:sqlite` is built into Node ≥22.5 (stable in 24+), so it tracks the
// runtime automatically and never has an ABI mismatch.
//
// This client extends Knex's `better-sqlite3` dialect (which already extends
// the `sqlite3` dialect that contains the SQLite-specific schema/query
// compilers). We only override the four methods that touch the underlying
// driver: `_driver`, `acquireRawConnection`, `destroyRawConnection`, `_query`.
//
// API parity vs `better-sqlite3` we rely on:
//   - `db.prepare(sql)` returns a synchronous statement
//   - `statement.run(...params)` returns `{ changes, lastInsertRowid }`
//   - `statement.all(...params)` returns an array of row objects
//   - `db.close()` closes the connection
// `node:sqlite` matches all of these, with two notable differences handled
// here: (1) statements have no `reader` property, so we detect "this query
// returns rows" from the SQL text; (2) bindings must be spread as positional
// arguments rather than passed as a single array.

import { DatabaseSync, type StatementSync } from 'node:sqlite';

const Client_BetterSQLite3 = require('knex/lib/dialects/better-sqlite3');

interface QueryObject {
  sql: string;
  bindings?: unknown[];
  response?: unknown;
  context?: { lastID: number | bigint; changes: number };
}

interface ConnectionSettings {
  filename: string;
  options?: {
    readOnly?: boolean;
    enableForeignKeyConstraints?: boolean;
    enableDoubleQuotedStringLiterals?: boolean;
  };
}

// Returns true when the SQL is expected to produce a result set
// (SELECT, PRAGMA, WITH … SELECT, or any statement using RETURNING).
function isReaderQuery(sql: string): boolean {
  const trimmed = sql.replace(/^\s*(?:\/\*[\s\S]*?\*\/|--[^\n]*\n)\s*/g, '').trimStart();
  if (/^(select|pragma|with|explain)\b/i.test(trimmed)) return true;
  if (/\breturning\b/i.test(trimmed)) return true;
  return false;
}

class Client_NodeSQLite extends Client_BetterSQLite3 {
  // Knex calls `this._driver()` once and caches the result on `this.driver`.
  // We never use it (we call DatabaseSync directly), but we must return
  // something non-throwing so the lazy getter doesn't blow up.
  _driver() {
    return { DatabaseSync };
  }

  async acquireRawConnection(): Promise<DatabaseSync> {
    const settings = this.connectionSettings as ConnectionSettings;
    const options = settings.options || {};
    return new DatabaseSync(settings.filename, {
      readOnly: !!options.readOnly,
      enableForeignKeyConstraints: options.enableForeignKeyConstraints ?? true,
      enableDoubleQuotedStringLiterals: options.enableDoubleQuotedStringLiterals ?? false,
    });
  }

  async destroyRawConnection(connection: DatabaseSync): Promise<void> {
    connection.close();
  }

  async _query(connection: DatabaseSync, obj: QueryObject): Promise<QueryObject> {
    if (!obj.sql) throw new Error('The query is empty');
    if (!connection) throw new Error('No connection provided');

    const statement: StatementSync = connection.prepare(obj.sql);
    const bindings = this._formatBindings(obj.bindings);

    if (isReaderQuery(obj.sql)) {
      // node:sqlite spreads bindings as positional args (unlike better-sqlite3
      // which accepts an array). Empty bindings → no args.
      const rows = bindings.length ? statement.all(...bindings) : statement.all();
      // node:sqlite returns rows whose prototype is `null`. React Server
      // Components refuse to serialize null-prototype objects to client
      // components ("Only plain objects … can be passed …"). Re-wrap each
      // row into a plain object so downstream consumers — including server
      // actions that return rows to client components — work correctly.
      obj.response = (rows as Array<Record<string, unknown>>).map((row) => ({ ...row }));
      return obj;
    }

    const result = bindings.length ? statement.run(...bindings) : statement.run();
    obj.response = result;
    obj.context = {
      lastID: result.lastInsertRowid,
      changes: Number(result.changes),
    };
    return obj;
  }

  // Convert JS values into types accepted by node:sqlite's bind layer.
  // node:sqlite only accepts: number, bigint, string, boolean, null,
  // Buffer/Uint8Array. We mirror better-sqlite3's coercions for portability:
  // Dates become millisecond timestamps and booleans become 0/1 (so they
  // round-trip through INTEGER columns the same way Knex users expect).
  _formatBindings(bindings: unknown[] | undefined): Array<number | bigint | string | null | Uint8Array> {
    if (!bindings) return [];
    return bindings.map((binding) => {
      if (binding === undefined) return null;
      if (binding === null) return null;
      if (binding instanceof Date) return binding.valueOf();
      if (typeof binding === 'boolean') return binding ? 1 : 0;
      if (typeof binding === 'number' || typeof binding === 'bigint' || typeof binding === 'string') {
        return binding;
      }
      if (binding instanceof Uint8Array) return binding;
      // Fallback: stringify objects/arrays. Knex sometimes hands us things
      // already serialized by the user, so this is a safety net.
      return String(binding);
    });
  }
}

Object.assign(Client_NodeSQLite.prototype, {
  driverName: 'node-sqlite',
});

export default Client_NodeSQLite;
