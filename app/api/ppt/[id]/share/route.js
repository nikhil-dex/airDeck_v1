import mongoose from "mongoose";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { dbConnect } from "@/lib/mongodb";
import Ppts from "@/models/Ppts";
import User from "@/models/User";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Owner only: list who this deck is shared with.
export async function GET(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: "Sign in first." }, { status: 401 });
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return Response.json({ error: "Presentation not found." }, { status: 404 });
    }

    await dbConnect();

    const user = await User.findOne({ email: session.user.email }).select("_id");
    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const ppt = await Ppts.findById(id).select("userid sharedWith");
    if (!ppt) {
      return Response.json({ error: "Presentation not found." }, { status: 404 });
    }
    if (ppt.userid !== String(user._id)) {
      return Response.json({ error: "Only the owner can view sharing." }, { status: 403 });
    }

    return Response.json({ sharedWith: ppt.sharedWith || [] });
  } catch (error) {
    return Response.json(
      { error: error.message || "Something went wrong." },
      { status: 500 }
    );
  }
}

// Stop sharing. Owner passes { email } to revoke someone's access;
// a recipient calls with no body to remove the deck from their own list.
export async function DELETE(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: "Sign in first." }, { status: 401 });
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return Response.json({ error: "Presentation not found." }, { status: 404 });
    }

    await dbConnect();

    const user = await User.findOne({ email: session.user.email }).select("_id");
    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const ppt = await Ppts.findById(id).select("userid sharedWith");
    if (!ppt) {
      return Response.json({ error: "Presentation not found." }, { status: 404 });
    }

    const isOwner = ppt.userid === String(user._id);
    const myEmail = session.user.email.toLowerCase();
    const body = await req.json().catch(() => ({}));

    let targetEmail;
    if (isOwner) {
      targetEmail = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      if (!targetEmail) {
        return Response.json({ error: "Email of the user to unshare is required." }, { status: 400 });
      }
    } else {
      // Recipients may only remove themselves.
      targetEmail = myEmail;
    }

    if (!ppt.sharedWith?.includes(targetEmail)) {
      return Response.json({ error: "This deck is not shared with that user." }, { status: 404 });
    }

    await Ppts.updateOne({ _id: id }, { $pull: { sharedWith: targetEmail } });

    return Response.json({
      message: isOwner
        ? `Stopped sharing with ${targetEmail}.`
        : "Removed from your decks.",
    });
  } catch (error) {
    return Response.json(
      { error: error.message || "Something went wrong." },
      { status: 500 }
    );
  }
}

// Share a deck with another registered user: it appears in their My Decks.
export async function POST(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: "Sign in to share presentations." }, { status: 401 });
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return Response.json({ error: "Presentation not found." }, { status: 404 });
    }

    const { email } = await req.json();
    const targetEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (!EMAIL_PATTERN.test(targetEmail)) {
      return Response.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    if (targetEmail === session.user.email.toLowerCase()) {
      return Response.json({ error: "That's your own email — the deck is already yours." }, { status: 400 });
    }

    await dbConnect();

    const user = await User.findOne({ email: session.user.email }).select("_id");
    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const ppt = await Ppts.findById(id).select("userid sharedWith");
    if (!ppt) {
      return Response.json({ error: "Presentation not found." }, { status: 404 });
    }
    if (ppt.userid !== String(user._id)) {
      return Response.json({ error: "You can only share your own presentations." }, { status: 403 });
    }

    const target = await User.findOne({ email: targetEmail }).select("_id");
    if (!target) {
      return Response.json(
        { error: "No PPTgen user with that email. They need to sign up first." },
        { status: 404 }
      );
    }

    if (ppt.sharedWith?.includes(targetEmail)) {
      return Response.json({ message: `Already shared with ${targetEmail}.` });
    }

    await Ppts.updateOne({ _id: id }, { $addToSet: { sharedWith: targetEmail } });

    return Response.json({ message: `Shared with ${targetEmail}. It now appears in their My Decks.` });
  } catch (error) {
    return Response.json(
      { error: error.message || "Something went wrong." },
      { status: 500 }
    );
  }
}
