import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { dbConnect } from "@/lib/mongodb";
import User from "@/models/User";
import { reserveCredit, refundCredit } from "@/lib/credits";
import { sendRequestToGemini, geminiText, geminiBlockReason, toErrorMessage } from "@/lib/gemini";

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

    const user = await reserveCredit(session.user.email);
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

    let result;
    try {
      result = await sendRequestToGemini(prompt);
    } catch (err) {
      await refundCredit(user._id);
      throw err;
    }

    const html = extractHtml(geminiText(result));

    if (!html || !/^<!DOCTYPE html/i.test(html) || !/<\/html>\s*$/i.test(html) || html.length > MAX_SLIDE_LENGTH) {
      await refundCredit(user._id);
      if (geminiBlockReason(result)) {
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

    return Response.json({ result: html, credit: user.credit });
  } catch (error) {
    return Response.json(
      { error: toErrorMessage(error) },
      { status: 500 }
    );
  }
}
