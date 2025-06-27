import { FirebaseError } from "firebase/app";

export function friendlyFirestoreError(error: unknown): string {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "permission-denied":
        return "You don't have permission to do that.";
      case "unavailable":
        return "You're offline. Changes will sync when you reconnect.";
      case "deadline-exceeded":
        return "The request timed out. Please try again.";
      case "resource-exhausted":
        return "Too many requests. Please wait a moment.";
      case "not-found":
        return "That item no longer exists.";
      case "failed-precondition":
        return "A required Firestore index is still building. Try again shortly.";
    }
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}
