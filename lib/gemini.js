// Shared Gemini API client used by generate-ppt and edit-slide.

export function toErrorMessage(error) {
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

export async function sendRequestToGemini(prompt, { apiKey: apiKeyOverride } = {}) {
  const model = resolveGeminiModel();
  // BYOK: a user-supplied key takes precedence over the platform key.
  const apiKey = (apiKeyOverride || process.env.GEMINI_API_KEY || "").trim();

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not configured. Add it in your environment variables."
    );
  }

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const payload = {
    contents: [
      {
        parts: [{ text: prompt }],
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

      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
      } else {
        throw new Error(formatGeminiApiError(response.status, model, errorBody));
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

// If the model returned nothing because content safety refused the request,
// tell the caller so users get "blocked" instead of a generic failure.
const SAFETY_FINISH_REASONS = new Set([
  "SAFETY",
  "PROHIBITED_CONTENT",
  "BLOCKLIST",
  "SPII",
  "IMAGE_SAFETY",
]);

export function geminiBlockReason(result) {
  if (result?.promptFeedback?.blockReason) {
    return result.promptFeedback.blockReason;
  }
  const finish = result?.candidates?.[0]?.finishReason;
  if (finish && SAFETY_FINISH_REASONS.has(finish)) {
    return finish;
  }
  return null;
}

// Join all text parts of a Gemini response into one trimmed string.
export function geminiText(result) {
  return (
    result?.candidates?.[0]?.content?.parts
      ?.map((p) => p.text || "")
      ?.join("")
      ?.trim() || ""
  );
}
