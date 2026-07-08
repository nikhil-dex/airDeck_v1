import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { dbConnect } from "@/lib/mongodb";
import User from "@/models/User";
import { reserveCredit, refundCredit } from "@/lib/credits";
import { sendRequestToGemini, geminiText, geminiBlockReason, toErrorMessage } from "@/lib/gemini";

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: "Sign in to generate presentations." }, { status: 401 });
    }

    const { prompt } = await req.json();
    if (typeof prompt !== "string" || !prompt.trim()) {
      return Response.json({ error: "Prompt is required." }, { status: 400 });
    }

    await dbConnect();

    const user = await reserveCredit(session.user.email);
    if (!user) {
      const exists = await User.exists({ email: session.user.email });
      if (!exists) {
        return Response.json({ error: "User not found." }, { status: 404 });
      }
      return Response.json(
        { error: "You're out of credits. Each generation costs 1 credit." },
        { status: 402 }
      );
    }

    const updatedPrompt = `Convert this prompt into HTML slide pages: [${prompt}].

Rules:
1. Return output ONLY as a JSON array.
2. Each array element must contain one full HTML file.
3. Each HTML file must start with: <!DOCTYPE html>
4. NO explanations.
5. NO markdown.
6. NO backticks.
7. NO text outside the JSON array.
8. DO NOT include Tailwind CDN.
9. USE ONLY CSS ON EACH PAGE
10. Design every slide on a fixed 1920x1080 canvas: the root container must be exactly width:1920px, height:1080px with overflow:hidden, and all layout/font sizes based on that canvas.
11. ALL content must fit fully inside the 1920x1080 canvas with at least 80px from every edge. Budget vertical space: title + margins + content combined must never exceed 1080px. Prefer smaller fonts over overflow.
12. NEVER use white-space: nowrap on sentence-length text. If you use a typewriter/typing effect, the full line must fit the canvas width at its font size.
13. Do not position content partially outside its container (e.g. large negative margins or offsets that push elements past the canvas edge).

Return EXACTLY this format:
[
  "<!DOCTYPE html> ... </html>",
  "<!DOCTYPE html> ... </html>"
]
`;

    let result;
    try {
      result = await sendRequestToGemini(updatedPrompt);
    } catch (err) {
      await refundCredit(user._id);
      throw err;
    }

    const fullText = geminiText(result);

    if (!fullText) {
      await refundCredit(user._id);
      if (geminiBlockReason(result)) {
        return Response.json(
          { error: "Your prompt was blocked by content safety filters. Please rephrase it. Your credit was not used." },
          { status: 400 }
        );
      }
      return Response.json(
        { error: "The model returned no slides. Your credit was not used." },
        { status: 502 }
      );
    }

    let pages = [];
    try {
      pages = JSON.parse(fullText);
    } catch {
      await refundCredit(user._id);
      return Response.json({
        error: "Model returned non-JSON output. Your credit was not used.",
        raw: fullText,
      });
    }

    if (!Array.isArray(pages) || pages.length === 0) {
      await refundCredit(user._id);
      return Response.json(
        { error: "The model returned no slides. Your credit was not used." },
        { status: 502 }
      );
    }

    return Response.json({ result: pages, credit: user.credit });
  } catch (error) {
    return Response.json(
      { error: toErrorMessage(error) },
      { status: 500 }
    );
  }
}
