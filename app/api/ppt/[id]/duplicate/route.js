import mongoose from "mongoose";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { dbConnect } from "@/lib/mongodb";
import Ppts from "@/models/Ppts";
import User from "@/models/User";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";

// Copy a deck into the requester's account. Recipients of a shared deck use
// this to get an editable copy (view -> iterate); owners use it as a
// template mechanic. The copy starts private (sharedWith: []).
export async function POST(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: "Sign in to duplicate presentations." }, { status: 401 });
    }

    const rl = rateLimit(`duplicate:${session.user.email}`, { limit: 10 });
    if (!rl.ok) return rateLimitResponse(rl.retryAfterSeconds);

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return Response.json({ error: "Presentation not found." }, { status: 404 });
    }

    await dbConnect();

    const user = await User.findOne({ email: session.user.email }).select("_id");
    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const ppt = await Ppts.findById(id)
      .select("userid titles ppt_History sharedWith")
      .lean();
    if (!ppt) {
      return Response.json({ error: "Presentation not found." }, { status: 404 });
    }

    const myEmail = session.user.email.toLowerCase();
    const isOwner = ppt.userid === String(user._id);
    const isRecipient = ppt.sharedWith?.includes(myEmail);
    if (!isOwner && !isRecipient) {
      return Response.json(
        { error: "You can only duplicate your own decks or decks shared with you." },
        { status: 403 }
      );
    }

    // Legacy decks stored slides nested one level deeper: [[slide, ...]]
    let slides = ppt.ppt_History || [];
    if (slides.length === 1 && Array.isArray(slides[0])) {
      slides = slides[0];
    }
    if (slides.length === 0) {
      return Response.json({ error: "This deck has no slides to duplicate." }, { status: 400 });
    }

    const copy = await Ppts.create({
      userid: String(user._id),
      titles: `${ppt.titles || "untitled"} (copy)`.slice(0, 120),
      ppt_History: slides,
      sharedWith: [],
    });

    await User.updateOne({ _id: user._id }, { $push: { ppt_History: copy._id } });

    return Response.json({
      message: "Deck duplicated to your account.",
      deck: {
        id: String(copy._id),
        title: copy.titles,
        createdAt: copy.createdAt,
        shared: false,
        thumb: slides[0] || null,
      },
    });
  } catch (error) {
    return Response.json(
      { error: error.message || "Something went wrong." },
      { status: 500 }
    );
  }
}
