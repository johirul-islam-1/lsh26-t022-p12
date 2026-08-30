import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { CATEGORIES } from "@/lib/types";

export const runtime = "nodejs";

const MAX_FILE_BYTES = 8 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const receiptSchema = z.object({
  amountBdt: z.number().finite().nonnegative(),
  date: z.string(),
  shop: z.string(),
  category: z.string(),
  confidence: z.number().min(0).max(1),
});

function getErrorStatus(error: unknown): number | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error
  ) {
    const status = (error as { status?: unknown }).status;

    if (typeof status === "number") {
      return status;
    }
  }

  return undefined;
}

function isTransientGeminiError(error: unknown): boolean {
  const status = getErrorStatus(error);

  return (
    status === 408 ||
    status === 429 ||
    (typeof status === "number" && status >= 500)
  );
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    build: "b1-receipt",
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    model: process.env.GEMINI_MODEL ?? "gemini-3.7-flash",
  });
}

export async function POST(request: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      {
        ok: false,
        code: "GEMINI_NOT_CONFIGURED",
        message:
          "Receipt scanning is not configured yet. Add GEMINI_API_KEY to .env.local and restart the dev server.",
      },
      { status: 503 },
    );
  }

  try {
    const formData = await request.formData();
    const receipt = formData.get("receipt");

    if (!(receipt instanceof File)) {
      return NextResponse.json(
        {
          ok: false,
          code: "MISSING_RECEIPT",
          message: "Choose a receipt image first.",
        },
        { status: 400 },
      );
    }

    /*
     * Preserve the File narrowing for nested functions below.
     */
    const receiptFile: File = receipt;

    if (!ALLOWED_TYPES.has(receiptFile.type)) {
      return NextResponse.json(
        {
          ok: false,
          code: "UNSUPPORTED_FILE",
          message: "Use a JPG, PNG or WebP receipt image.",
        },
        { status: 415 },
      );
    }

    if (
      receiptFile.size === 0 ||
      receiptFile.size > MAX_FILE_BYTES
    ) {
      return NextResponse.json(
        {
          ok: false,
          code: "BAD_FILE_SIZE",
          message:
            "Receipt images must be between 1 byte and 8 MB.",
        },
        { status: 413 },
      );
    }

    const bytes = Buffer.from(
      await receiptFile.arrayBuffer(),
    ).toString("base64");

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    const preferredModel =
      process.env.GEMINI_MODEL ?? "gemini-3.7-flash";

    /*
     * Preferred model first.
     * Fall back only when Gemini has temporary availability /
     * quota / server issues.
     */
    const models = Array.from(
      new Set([
        preferredModel,
        "gemini-3.6-flash",
        "gemini-3.5-flash",
      ]),
    );

    const prompt = `Read this bill or receipt image carefully.

Extract:
1. The final amount paid in BDT
2. The transaction date
3. The merchant or shop name
4. The closest expense category

Choose category from this exact list:
${CATEGORIES.join(", ")}

Rules:
- amountBdt must be a number only, without currency text.
- Use 0 only if the final amount is genuinely unreadable.
- Prefer grand total, net payable, total payable, or amount paid.
- Do not confuse subtotal, VAT, discount, cash tendered, change, or balance with the final amount.
- date must use YYYY-MM-DD format.
- If date is unreadable, return an empty string. Never invent a date.
- shop must be a concise merchant or shop name.
- If shop is unreadable, return an empty string.
- category must be exactly one category from the supplied list.
- Use Other when category is uncertain.
- confidence must be a number from 0 to 1 indicating confidence in the core extracted fields.`;

    async function callGemini(model: string) {
      return ai.models.generateContent({
        model,
        contents: [
          {
            inlineData: {
              mimeType: receiptFile.type,
              data: bytes,
            },
          },
          {
            text: prompt,
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              amountBdt: {
                type: "number",
              },
              date: {
                type: "string",
              },
              shop: {
                type: "string",
              },
              category: {
                type: "string",
              },
              confidence: {
                type: "number",
              },
            },
            required: [
              "amountBdt",
              "date",
              "shop",
              "category",
              "confidence",
            ],
          },
        },
      });
    }

    let response:
      | Awaited<ReturnType<typeof callGemini>>
      | null = null;

    let lastError: unknown = null;
    let successfulModel = "";

    for (
      let modelIndex = 0;
      modelIndex < models.length;
      modelIndex += 1
    ) {
      const model = models[modelIndex];

      /*
       * Give our preferred model one retry because a Gemini
       * 503 often clears immediately.
       *
       * Fallback models get one attempt each.
       */
      const attempts = modelIndex === 0 ? 2 : 1;

      for (
        let attempt = 0;
        attempt < attempts;
        attempt += 1
      ) {
        try {
          response = await callGemini(model);
          successfulModel = model;

          console.info(
            `Receipt extraction succeeded with ${model}`,
          );

          break;
        } catch (error) {
          lastError = error;

          const status = getErrorStatus(error);

          console.warn(
            `Receipt extraction attempt failed with ${model} (${attempt + 1}/${attempts}), status=${status ?? "unknown"}`,
          );

          /*
           * Bad request / authentication / malformed input etc.
           * should not be hidden by repeatedly trying models.
           */
          if (!isTransientGeminiError(error)) {
            throw error;
          }

          if (attempt < attempts - 1) {
            await sleep(600 * 2 ** attempt);
          }
        }
      }

      if (response) {
        break;
      }

      /*
       * Small delay before falling back to another model.
       */
      if (modelIndex < models.length - 1) {
        await sleep(400 * 2 ** modelIndex);
      }
    }

    if (!response) {
      const status = getErrorStatus(lastError);

      console.error(
        "All Gemini receipt extraction attempts failed",
        lastError,
      );

      if (
        status === 408 ||
        status === 429 ||
        (typeof status === "number" && status >= 500)
      ) {
        return NextResponse.json(
          {
            ok: false,
            code: "AI_TEMPORARILY_UNAVAILABLE",
            message:
              "Receipt scanning is temporarily busy. Please retry in a moment.",
          },
          { status: 503 },
        );
      }

      throw (
        lastError ??
        new Error("Receipt extraction failed.")
      );
    }

    let decoded: unknown;

    try {
      decoded = JSON.parse(response.text ?? "{}");
    } catch {
      throw new Error(
        "Gemini returned invalid JSON.",
      );
    }

    const parsed = receiptSchema.safeParse(decoded);

    if (!parsed.success) {
      console.error(
        "Unexpected Gemini receipt response",
        parsed.error.flatten(),
      );

      throw new Error(
        "Gemini returned an unexpected receipt shape.",
      );
    }

    const normalizedCategory =
      CATEGORIES.find(
        (category) =>
          category.toLowerCase() ===
          parsed.data.category
            .trim()
            .toLowerCase(),
      ) ?? "Other";

    return NextResponse.json({
      ok: true,
      model: successfulModel,
      receipt: {
        amountBdt: parsed.data.amountBdt,
        date: parsed.data.date.trim(),
        shop: parsed.data.shop.trim(),
        category: normalizedCategory,
        confidence: parsed.data.confidence,
      },
    });
  } catch (error) {
    console.error(
      "Receipt extraction failed",
      error,
    );

    const status = getErrorStatus(error);

    if (status === 401 || status === 403) {
      return NextResponse.json(
        {
          ok: false,
          code: "GEMINI_AUTH_FAILED",
          message:
            "Receipt scanning is temporarily unavailable because the AI service could not authenticate.",
        },
        { status: 503 },
      );
    }

    if (
      status === 408 ||
      status === 429 ||
      (typeof status === "number" && status >= 500)
    ) {
      return NextResponse.json(
        {
          ok: false,
          code: "AI_TEMPORARILY_UNAVAILABLE",
          message:
            "Receipt scanning is temporarily busy. Please retry in a moment.",
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        code: "RECEIPT_EXTRACTION_FAILED",
        message:
          "We couldn't read this receipt. Try a clearer photo or another receipt.",
      },
      { status: 500 },
    );
  }
}