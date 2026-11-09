import { DocumentData, DocumentReference, writeBatch } from "firebase/firestore";

import { db } from "@/firebase/config";

export const BATCH_LIMIT = 450;

export interface PendingWrite {
  ref: DocumentReference;
  data?: Record<string, unknown>;
  mode: "set" | "replace" | "update" | "delete";
}

export async function commitWrites(writes: PendingWrite[]): Promise<void> {
  for (let i = 0; i < writes.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    for (const write of writes.slice(i, i + BATCH_LIMIT)) {
      if (write.mode === "delete") {
        batch.delete(write.ref);
      } else if (write.mode === "update") {
        batch.update(write.ref, (write.data ?? {}) as DocumentData);
      } else if (write.mode === "replace") {
        batch.set(write.ref, write.data ?? {});
      } else {
        batch.set(write.ref, write.data ?? {}, { merge: true });
      }
    }
    await batch.commit();
  }
}
