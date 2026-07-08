import User from "@/models/User";

// Atomically reserve 1 credit before an AI call. The credit > 0 condition
// makes parallel requests safe: only one can take the last credit.
// Returns the updated user (with the new balance), or null if the user
// doesn't exist or has no credits — caller distinguishes via User.exists.
export function reserveCredit(email) {
  return User.findOneAndUpdate(
    { email, credit: { $gt: 0 } },
    { $inc: { credit: -1 } },
    { returnDocument: "after" }
  );
}

// Give the credit back when the AI call failed after the reservation.
export function refundCredit(userId) {
  return User.updateOne({ _id: userId }, { $inc: { credit: 1 } }).catch((e) =>
    console.error("Credit refund failed:", e)
  );
}
