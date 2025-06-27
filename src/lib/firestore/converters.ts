import {
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions,
  Timestamp,
} from "firebase/firestore";

const DATE_KEYS = ["createdAt", "updatedAt", "deletedAt"] as const;

/**
 * Converts Firestore timestamps into JS Dates on read, and back again on write.
 * Models are expected to expose `id` and the three date keys above.
 */
export function createConverter<T extends { id: string }>(): FirestoreDataConverter<T> {
  return {
    toFirestore(model: T): DocumentData {
      const data: DocumentData = { ...model };
      delete data.id;

      for (const key of DATE_KEYS) {
        const value = data[key];
        if (value instanceof Date) {
          data[key] = Timestamp.fromDate(value);
        } else if (value === undefined) {
          delete data[key];
        }
      }

      return data;
    },
    fromFirestore(
      snapshot: QueryDocumentSnapshot,
      options?: SnapshotOptions
    ): T {
      const data = snapshot.data(options);

      for (const key of DATE_KEYS) {
        const value = data[key];
        if (value && typeof value.toDate === "function") {
          data[key] = value.toDate();
        } else if (value === undefined) {
          data[key] = null;
        }
      }

      return { id: snapshot.id, ...data } as T;
    },
  };
}
