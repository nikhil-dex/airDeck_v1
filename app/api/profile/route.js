import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { dbConnect } from "@/lib/mongodb";
import User from "@/models/User";

const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,20}$/;

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: "Sign in to view your profile." }, { status: 401 });
    }

    await dbConnect();

    const user = await User.findOne({ email: session.user.email })
      .select("name username email credit usernameChanged createdAt")
      .lean();
    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    return Response.json({
      name: user.name,
      username: user.username,
      email: user.email,
      credit: user.credit ?? 0,
      usernameChanged: Boolean(user.usernameChanged),
      createdAt: user.createdAt,
    });
  } catch (error) {
    return Response.json(
      { error: error.message || "Something went wrong." },
      { status: 500 }
    );
  }
}

export async function PATCH(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: "Sign in to update your profile." }, { status: 401 });
    }

    const { username } = await req.json();

    if (typeof username !== "string" || !USERNAME_PATTERN.test(username.trim())) {
      return Response.json(
        { error: "Username must be 3-20 characters: letters, numbers, dots, dashes or underscores." },
        { status: 400 }
      );
    }

    await dbConnect();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    if (user.usernameChanged) {
      return Response.json(
        { error: "You have already used your one-time username change." },
        { status: 403 }
      );
    }

    const newUsername = username.trim();
    if (newUsername === user.username) {
      return Response.json(
        { error: "That is already your username." },
        { status: 400 }
      );
    }

    const taken = await User.findOne({ username: newUsername }).select("_id");
    if (taken) {
      return Response.json({ error: "Username already taken." }, { status: 409 });
    }

    user.username = newUsername;
    user.usernameChanged = true;

    try {
      await user.save();
    } catch (err) {
      // Unique index race: someone claimed the name between check and save.
      if (err?.code === 11000) {
        return Response.json({ error: "Username already taken." }, { status: 409 });
      }
      throw err;
    }

    return Response.json({
      message: "Username updated. This was your one-time change.",
      username: user.username,
      usernameChanged: true,
    });
  } catch (error) {
    return Response.json(
      { error: error.message || "Something went wrong." },
      { status: 500 }
    );
  }
}
