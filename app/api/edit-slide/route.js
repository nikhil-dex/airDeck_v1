import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { dbConnect } from "@/lib/mongodb";
import User from "@/models/User";
import { reserveCredit, refundCredit } from "@/lib/credits";
import { llmComplete } from "@/lib/llm";
import { toErrorMessage } from "@/lib/gemini";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit";

const MAX_SLIDE_LENGTH = 200_000;
const MAX_INSTRUCTION_LENGTH = 500;

// Models sometimes wrap output in markdown fences despite instructions.
function extractHtml(text) {
  let html = text.trim();
  const fenced = html.match(/^```(?:html)?\s*([\s\S]*?)\s*```$/);
  if (fenced) html = fenced[1].trim();

  const start = html.search(/<!DOCTYPE html/i);
  if (start > 0) html = html.slice(start);

  return html;
}

// AI-edit a single slide: takes the slide's current HTML plus an
// instruction, returns the full updated HTML. Costs 1 credit,
// refunded if the model fails to produce a usable slide.
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return Response.json({ error: "Sign in to use AI editing." }, { status: 401 });
    }

    // Credits already meter platform-key usage; this also bounds BYOK calls.
    const rl = rateLimit(`ai-edit:${session.user.email}`, { limit: 20 });
    if (!rl.ok) return rateLimitResponse(rl.retryAfterSeconds);

    const { slideHtml, instruction } = await req.json();

    if (typeof slideHtml !== "string" || !slideHtml.trim() || slideHtml.length > MAX_SLIDE_LENGTH) {
      return Response.json({ error: "Invalid slide data." }, { status: 400 });
    }
    const cleanInstruction = typeof instruction === "string" ? instruction.trim() : "";
    if (!cleanInstruction || cleanInstruction.length > MAX_INSTRUCTION_LENGTH) {
      return Response.json(
        { error: `Instruction is required (max ${MAX_INSTRUCTION_LENGTH} characters).` },
        { status: 400 }
      );
    }

    await dbConnect();

    // BYOK: with the user's own Gemini key, no credits are touched.
    const userKey = req.headers.get("x-gemini-key")?.trim() || "";
    const usingByok = Boolean(userKey);

    let user;
    if (usingByok) {
      user = await User.findOne({ email: session.user.email }).select("_id");
      if (!user) {
        return Response.json({ error: "User not found." }, { status: 404 });
      }
    } else {
      user = await reserveCredit(session.user.email);
      if (!user) {
        const exists = await User.exists({ email: session.user.email });
        if (!exists) {
          return Response.json({ error: "User not found." }, { status: 404 });
        }
        return Response.json(
          { error: "You're out of credits. Each AI edit costs 1 credit." },
          { status: 402 }
        );
      }
    }

    const refund = () => (usingByok ? null : refundCredit(user._id));

    const prompt = `You are editing ONE slide of an HTML presentation.

Apply this instruction to the slide: [${cleanInstruction}]

Current slide HTML:
${slideHtml}

Rules:
1. Return ONLY the complete updated HTML file, starting with <!DOCTYPE html>.
2. Keep the fixed 1920x1080 canvas: the root container must stay exactly width:1920px, height:1080px with overflow:hidden.
3. All content must fit fully inside the canvas — no overflow.
4. USE ONLY CSS. NO Tailwind CDN, NO external resources.
5. Preserve everything the instruction does not ask to change (content, styles, animations).
6. NO explanations. NO markdown. NO backticks. Nothing outside the HTML file.`;

    let text, blockReason;
    try {
      ({ text, blockReason } = await llmComplete(prompt, {
        apiKey: userKey || undefined,
      }));
    } catch (err) {
      await refund();
      throw err;
    }

    const html = extractHtml(text);

    if (!html || !/^<!DOCTYPE html/i.test(html) || !/<\/html>\s*$/i.test(html) || html.length > MAX_SLIDE_LENGTH) {
      await refund();
      if (blockReason) {
        return Response.json(
          { error: "This edit was blocked by content safety filters. Please rephrase the instruction. Your credit was not used." },
          { status: 400 }
        );
      }
      return Response.json(
        { error: "The model returned an unusable slide. Your credit was not used." },
        { status: 502 }
      );
    }

    return Response.json({
      result: html,
      credit: usingByok ? null : user.credit,
      byok: usingByok,
    });
  } catch (error) {
    return Response.json(
      { error: toErrorMessage(error) },
      { status: 500 }
    );
  }
}
