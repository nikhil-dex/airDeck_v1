import mongoose from "mongoose";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { dbConnect } from "@/lib/mongodb";
import Ppts from "@/models/Ppts";
import User from "@/models/User";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";

// Public by link: anyone with a deck's URL can view it (like an unlisted video).
export async function GET(req, { params }) {
  try {
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return Response.json({ error: "Presentation not found." }, { status: 404 });
    }

    await dbConnect();

    const ppt = await Ppts.findById(id).select("titles ppt_History createdAt").lean();
    if (!ppt) {
      return Response.json({ error: "Presentation not found." }, { status: 404 });
    }

    // Older documents stored slides wrapped in an extra array: [[slide, slide]]
    let slides = ppt.ppt_History || [];
    if (slides.length === 1 && Array.isArray(slides[0])) {
      slides = slides[0];
    }

    return Response.json({
      id: String(ppt._id),
      title: ppt.titles,
      slides,
      createdAt: ppt.createdAt,
    });
  } catch (error) {
    return Response.json(
      { error: error.message || "Something went wrong." },
      { status: 500 }
    );
  }
}

const MAX_SLIDES = 50;
const MAX_SLIDE_LENGTH = 200_000; // chars of HTML per slide

// Update a deck's title and/or slides (used by rename and by re-editing a
// saved deck). The deck keeps its id, so existing share links stay valid.
export async function PATCH(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: "Sign in to update presentations." }, { status: 401 });
    }

    const rl = rateLimit(`update:${session.user.email}`, { limit: 30 });
    if (!rl.ok) return rateLimitResponse(rl.retryAfterSeconds);

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return Response.json({ error: "Presentation not found." }, { status: 404 });
    }

    const { title, code } = await req.json();

    const updates = {};

    if (title !== undefined) {
      const newTitle = typeof title === "string" ? title.trim() : "";
      if (!newTitle || newTitle.length > 120) {
        return Response.json({ error: "Title must be 1-120 characters." }, { status: 400 });
      }
      updates.titles = newTitle;
    }

    if (code !== undefined) {
      if (
        !Array.isArray(code) ||
        code.length === 0 ||
        code.length > MAX_SLIDES ||
        !code.every((s) => typeof s === "string" && s.length <= MAX_SLIDE_LENGTH)
      ) {
        return Response.json({ error: "Invalid slides data." }, { status: 400 });
      }
      updates.ppt_History = code;
    }

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: "Nothing to update." }, { status: 400 });
    }

    await dbConnect();

    const user = await User.findOne({ email: session.user.email }).select("_id");
    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const ppt = await Ppts.findById(id).select("userid");
    if (!ppt) {
      return Response.json({ error: "Presentation not found." }, { status: 404 });
    }

    if (ppt.userid !== String(user._id)) {
      return Response.json({ error: "You can only update your own presentations." }, { status: 403 });
    }

    await Ppts.updateOne({ _id: id }, updates);

    return Response.json({
      message: updates.ppt_History ? "Presentation updated." : "Presentation renamed.",
      title: updates.titles,
    });
  } catch (error) {
    return Response.json(
      { error: error.message || "Something went wrong." },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: "Sign in to delete presentations." }, { status: 401 });
    }

    const rl = rateLimit(`delete:${session.user.email}`, { limit: 30 });
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

    const ppt = await Ppts.findById(id).select("userid");
    if (!ppt) {
      return Response.json({ error: "Presentation not found." }, { status: 404 });
    }

    // Only the owner may delete — the deck being public-by-link doesn't
    // mean anyone with the URL can destroy it.
    if (ppt.userid !== String(user._id)) {
      return Response.json({ error: "You can only delete your own presentations." }, { status: 403 });
    }

    await Ppts.deleteOne({ _id: id });
    await User.updateOne({ _id: user._id }, { $pull: { ppt_History: ppt._id } });

    return Response.json({ message: "Presentation deleted." });
  } catch (error) {
    return Response.json(
      { error: error.message || "Something went wrong." },
      { status: 500 }
    );
  }
}
