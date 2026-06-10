"use client";

import type { FightStyle, SimulationOptions } from "@/shared/sim-types";

export type LocalSimHistoryRecord = {
  id: string;
  jobType: "dps" | "top_gear";
  createdAt: string;
  updatedAt: string;
  simcVersionSha: string | null;
  input: {
    simcProfile: string;
    fightStyle: FightStyle;
    numEnemies: number;
    simulationOptions: SimulationOptions;
  };
  resultSummary: {
    meanDps: number;
    errorMargin: number;
  } | null;
  topGear:
    | {
        config: {
          comboLimit: number;
          selectedTrinkets?: string[];
        };
        result: {
          combos: Array<{
            trinket1: string;
            trinket2: string;
            meanDps: number;
            errorMargin: number;
          }>;
          bestIndex: number;
        };
      }
    | null;
  rawOutput: string | null;
  resultJson: string | null;
};

const DB_NAME = "raidbot-like-local";
const DB_VERSION = 1;
const STORE_NAME = "sim_history";

function openLocalHistoryDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: "id",
        });
        store.createIndex("createdAt", "createdAt");
        store.createIndex("jobType", "jobType");
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("打开本地历史数据库失败"));
  });
}

function runStoreTransaction<T>(
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T> | void,
) {
  return new Promise<T | void>((resolve, reject) => {
    void openLocalHistoryDb()
      .then((db) => {
        const transaction = db.transaction(STORE_NAME, mode);
        const store = transaction.objectStore(STORE_NAME);
        const request = callback(store);

        if (request) {
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error ?? new Error("本地历史操作失败"));
        } else {
          transaction.oncomplete = () => resolve();
        }

        transaction.onerror = () => reject(transaction.error ?? new Error("本地历史事务失败"));
        transaction.oncomplete = () => {
          db.close();
        };
      })
      .catch(reject);
  });
}

export async function saveLocalSimHistory(record: LocalSimHistoryRecord) {
  await runStoreTransaction("readwrite", (store) => store.put(record));
}

export async function getLocalSimHistory(id: string) {
  return (await runStoreTransaction("readonly", (store) =>
    store.get(id),
  )) as LocalSimHistoryRecord | undefined;
}

export async function listLocalSimHistory(limit = 20) {
  const db = await openLocalHistoryDb();

  return new Promise<LocalSimHistoryRecord[]>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const index = transaction.objectStore(STORE_NAME).index("createdAt");
    const records: LocalSimHistoryRecord[] = [];
    const request = index.openCursor(null, "prev");

    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor || records.length >= limit) {
        resolve(records);
        db.close();
        return;
      }

      records.push(cursor.value as LocalSimHistoryRecord);
      cursor.continue();
    };

    request.onerror = () => {
      reject(request.error ?? new Error("读取本地历史失败"));
      db.close();
    };
  });
}

export async function deleteLocalSimHistory(id: string) {
  await runStoreTransaction("readwrite", (store) => store.delete(id));
}
