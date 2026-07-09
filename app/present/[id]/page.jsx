import mongoose from "mongoose";
import { dbConnect } from "@/lib/mongodb";
import Ppts from "@/models/Ppts";
import PresentClient from "./PresentClient";

// Server wrapper so shared /present/ links unfurl with a real title,
// description and branded OG image in WhatsApp/Slack/Discord.
// (The viewer itself is the PresentClient client component.)

async function getDeckTitle(id) {
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    await dbConnect();
    const ppt = await Ppts.findById(id).select("titles").lean();
    return ppt?.titles || null;
  } catch {
    return null; // metadata must never break the page
  }
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const deckTitle = await getDeckTitle(id);

  const title = deckTitle ? `${deckTitle} — PPTgen` : "Presentation — PPTgen";
  const description = deckTitle
    ? `Watch "${deckTitle}" — a live AI-designed presentation with animations that PowerPoint can't do. Built with PPTgen.`
    : "A live AI-designed presentation, built with PPTgen.";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "PPTgen",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default function PresentPage() {
  return <PresentClient />;
}
