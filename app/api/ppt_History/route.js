import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { dbConnect } from "@/lib/mongodb";
import User from "@/models/User";
import Ppts from "@/models/Ppts";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: "Sign in to view your presentations." }, { status: 401 });
    }

    await dbConnect();

    const user = await User.findOne({ email: session.user.email }).select("_id");
    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const myEmail = session.user.email.toLowerCase();

    const [own, sharedWithMe] = await Promise.all([
      Ppts.find({ userid: String(user._id) })
        .select("titles createdAt")
        .sort({ createdAt: -1 })
        .lean(),
      Ppts.find({ sharedWith: myEmail })
        .select("titles createdAt userid")
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    // Resolve owner names for shared decks so the UI can say who shared them.
    const ownerIds = [...new Set(sharedWithMe.map((p) => p.userid))].filter((v) =>
      /^[a-f\d]{24}$/i.test(v)
    );
    const owners = await User.find({ _id: { $in: ownerIds } }).select("name email").lean();
    const ownerById = Object.fromEntries(owners.map((o) => [String(o._id), o.name || o.email]));

    const result = [
      ...own.map((p) => ({
        id: String(p._id),
        title: p.titles,
        createdAt: p.createdAt,
        shared: false,
      })),
      ...sharedWithMe.map((p) => ({
        id: String(p._id),
        title: p.titles,
        createdAt: p.createdAt,
        shared: true,
        owner: ownerById[p.userid] || "another user",
      })),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return Response.json({ result });
  } catch (error) {
    return Response.json(
      { error: error.message || "Something went wrong." },
      { status: 500 }
    );
  }
}
