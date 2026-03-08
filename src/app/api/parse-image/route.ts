import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { extractRecipeFromImages } from "@/lib/ai/gemini";

const ACCEPTED_MIME = new Set(["image/jpeg", "image/png", "image/heic", "image/webp"]);
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart form data" }, { status: 400 });
  }

  const rawImages: { data: string; mimeType: string }[] = [];

  for (const key of ["page1", "page2"]) {
    const file = formData.get(key);
    if (!file || !(file instanceof File)) continue;

    if (!ACCEPTED_MIME.has(file.type)) {
      return NextResponse.json(
        { error: `${key}: unsupported file type "${file.type}". Use JPEG, PNG, HEIC, or WebP.` },
        { status: 400 }
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `${key}: file exceeds 10 MB limit.` },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();
    const data = Buffer.from(buffer).toString("base64");
    rawImages.push({ data, mimeType: file.type });
  }

  if (rawImages.length === 0) {
    return NextResponse.json({ error: "At least one image is required." }, { status: 400 });
  }

  try {
    const recipe = await extractRecipeFromImages(rawImages);

    if (
      !recipe.title ||
      !Array.isArray(recipe.ingredients) ||
      recipe.ingredients.length === 0 ||
      !Array.isArray(recipe.instructions) ||
      recipe.instructions.length === 0
    ) {
      return NextResponse.json(
        { success: false, error: "Could not extract a recipe from this image. Try a clearer photo of the recipe page." },
        { status: 422 }
      );
    }

    return NextResponse.json({ success: true, recipe });
  } catch (err) {
    console.error("parse-image error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to extract recipe. Please try again." },
      { status: 500 }
    );
  }
}
