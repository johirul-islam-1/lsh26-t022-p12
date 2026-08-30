import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  // Referencing the SDK here intentionally makes Build 0 verify that the package
  // resolves correctly without making a paid/external API call.
  void GoogleGenAI;
  return NextResponse.json({
    ok: true,
    build: "b0-skeleton",
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
  });
}

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      code: "BUILD_0_ONLY",
      message: "Receipt extraction is intentionally enabled in Build 1, after the foundation deploy is verified.",
    },
    { status: 501 },
  );
}
