import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { dbConnect } from "@/lib/mongodb";
import User from "@/models/User";
import Ppts from "@/models/Ppts";

const MAX_SLIDES = 50;
const MAX_SLIDE_LENGTH = 200_000; // chars of HTML per slide

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: "Sign in to save presentations." }, { status: 401 });
    }

    const { title, code } = await req.json();

    if (typeof title !== "string" || !title.trim()) {
      return Response.json({ error: "Title is required." }, { status: 400 });
    }
    if (
      !Array.isArray(code) ||
      code.length === 0 ||
      code.length > MAX_SLIDES ||
      !code.every((s) => typeof s === "string" && s.length <= MAX_SLIDE_LENGTH)
    ) {
      return Response.json({ error: "Invalid slides data." }, { status: 400 });
    }

    await dbConnect();

    const findUser = await User.findOne({ email: session.user.email });
    if (!findUser) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const newPpt = await Ppts.create({
      userid: String(findUser._id),
      titles: title.trim(),
      ppt_History: code,
    });

    findUser.ppt_History.push(newPpt._id);
    await findUser.save();

    return Response.json(
      { message: "PPT saved successfully", id: String(newPpt._id) },
      { status: 200 }
    );
  } catch (error) {
    return Response.json(
      { error: error.message || "Something went wrong." },
      { status: 500 }
    );
  }
}
