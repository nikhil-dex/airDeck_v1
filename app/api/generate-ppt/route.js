function toErrorMessage(error) {
  if (!error) return "Something went wrong.";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message || "Something went wrong.";
  if (typeof error === "object" && error.message) return String(error.message);
  try {
    return JSON.stringify(error);
  } catch {
    return "Something went wrong.";
  }
}

function formatGeminiApiError(status, model, errorBody) {
  try {
    const parsed = JSON.parse(errorBody);
    const apiMessage = parsed?.error?.message;
    if (apiMessage) {
      return `Gemini API error (${status}) for model "${model}": ${apiMessage}`;
    }
  } catch {
    // errorBody is plain text
  }

  return `Gemini API error (${status}) for model "${model}": ${errorBody}`;
}

export async function POST(req) {
    try {
        const { prompt } = await req.json();
        
        // const updatedPrompt = `dont make ppt [${prompt}] this is the prompt for making ppt but you have to make web pages using html,css,tailwind of n pages given and they should cover the topic of ppt and everything and should look exactly like the pages of ppt and just provide the code use html boiler for each page make them separate`;
    let updatedPrompt = `Convert this prompt into HTML slide pages: [${prompt}].

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

  

Return EXACTLY this format:
[
  "<!DOCTYPE html> ... </html>",
  "<!DOCTYPE html> ... </html>"
]
`
    const result = await sendRequestToGemini(updatedPrompt);

    // Join Gemini parts
    const fullText =
      result?.candidates?.[0]?.content?.parts
        ?.map((p) => p.text || "")
        ?.join("")
        ?.trim() || "";

    if (!fullText) {
      return Response.json({ result: [] });
    }

    // ✅ Parse JSON array safely
    let pages = [];
    try {
      pages = JSON.parse(fullText);
    } catch (err) {
      return Response.json({
        error: "Model returned non-JSON output.",
        raw: fullText,
      });
    }

    return Response.json({ result: pages });
  } catch (error) {
    return Response.json(
      { error: toErrorMessage(error) },
      { status: 500 }
    );
  }
}


/**
 * Sends prompt to Gemini API
 */
const DEPRECATED_GEMINI_MODELS = new Set([
  "gemini-2.5-flash-preview-09-2025",
  "gemini-2.5-flash-preview-09-25",
  "gemini-2.5-flash-preview-05-20",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
]);

function resolveGeminiModel() {
  const configuredModel = process.env.GEMINI_MODEL?.trim();
  const defaultModel = "gemini-2.5-flash";

  if (!configuredModel) {
    return defaultModel;
  }

  if (DEPRECATED_GEMINI_MODELS.has(configuredModel)) {
    console.warn(
      `GEMINI_MODEL "${configuredModel}" is retired. Falling back to ${defaultModel}.`
    );
    return defaultModel;
  }

  return configuredModel;
}

async function sendRequestToGemini(updatedPrompt) {
  const model = resolveGeminiModel();
  const apiKey = process.env.GEMINI_API_KEY?.trim() || "";

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not configured. Add it in Vercel → Settings → Environment Variables."
    );
  }

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const payload = {
    contents: [
      {
        parts: [{ text: updatedPrompt }],
      },
    ],
  };

  const maxRetries = 5;
  let delay = 1000;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        return await response.json();
      }

      const errorBody = await response.text();

      // Retry if failed
      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
      } else {
        throw new Error(
          formatGeminiApiError(response.status, model, errorBody)
        );
      }
    } catch (error) {
      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
      } else {
        throw new Error(toErrorMessage(error));
      }
    }
  }
}
