"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  onClose: () => void;
}

interface PhotoSlot {
  file: File;
  preview: string;
}

const ACCEPTED = ["image/jpeg", "image/png", "image/heic", "image/webp"];
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

function validateFile(file: File): string | null {
  if (!ACCEPTED.includes(file.type)) return "Only JPEG, PNG, HEIC, or WebP images are accepted.";
  if (file.size > MAX_BYTES) return "Image must be under 10 MB.";
  return null;
}

export function CookbookUpload({ onClose }: Props) {
  const router = useRouter();
  const input1Ref = useRef<HTMLInputElement>(null);
  const input2Ref = useRef<HTMLInputElement>(null);

  const [photo1, setPhoto1] = useState<PhotoSlot | null>(null);
  const [photo2, setPhoto2] = useState<PhotoSlot | null>(null);
  const [showPage2, setShowPage2] = useState(false);
  const [fileError, setFileError] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState("");

  function handleFileSelect(
    e: React.ChangeEvent<HTMLInputElement>,
    slot: 1 | 2
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateFile(file);
    if (err) {
      setFileError(err);
      e.target.value = "";
      return;
    }
    setFileError("");
    const preview = URL.createObjectURL(file);
    if (slot === 1) setPhoto1({ file, preview });
    else setPhoto2({ file, preview });
  }

  function removePhoto(slot: 1 | 2) {
    if (slot === 1) {
      if (photo1) URL.revokeObjectURL(photo1.preview);
      setPhoto1(null);
      if (input1Ref.current) input1Ref.current.value = "";
    } else {
      if (photo2) URL.revokeObjectURL(photo2.preview);
      setPhoto2(null);
      if (input2Ref.current) input2Ref.current.value = "";
      setShowPage2(false);
    }
  }

  async function handleExtract() {
    if (!photo1) return;
    setExtractError("");
    setExtracting(true);

    const form = new FormData();
    form.append("page1", photo1.file);
    if (photo2) form.append("page2", photo2.file);

    try {
      const res = await fetch("/api/parse-image", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setExtractError(data.error ?? "Could not extract a recipe from this image.");
        setExtracting(false);
        return;
      }
      sessionStorage.setItem("digitizedRecipe", JSON.stringify(data.recipe));
      router.push("/?digitized=1");
    } catch {
      setExtractError("Something went wrong. Please try again.");
      setExtracting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-t-2xl bg-white px-5 py-6 shadow-xl sm:rounded-2xl">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-warm-800">Add from Cookbook</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-warm-400 hover:bg-warm-100 hover:text-warm-600"
            aria-label="Close"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {/* Page 1 */}
          <div>
            <p className="mb-2 text-sm font-medium text-warm-600">Page 1</p>
            {photo1 ? (
              <div className="relative overflow-hidden rounded-xl border border-warm-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo1.preview}
                  alt="Page 1 preview"
                  className="h-40 w-full object-cover"
                />
                <button
                  onClick={() => removePhoto(1)}
                  className="absolute right-2 top-2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 cursor-pointer"
                  aria-label="Retake page 1"
                >
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
                </button>
                <span className="absolute bottom-2 left-2 rounded bg-black/50 px-1.5 py-0.5 text-xs text-white">
                  Tap × to retake
                </span>
              </div>
            ) : (
              <label className="flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-warm-300 bg-warm-50 text-warm-500 transition hover:border-primary hover:text-primary">
                <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                </svg>
                <span className="text-sm font-medium">Photograph a cookbook page</span>
                <span className="text-xs text-warm-400">JPEG, PNG, HEIC, WebP · max 10 MB</span>
                <input
                  ref={input1Ref}
                  type="file"
                  accept="image/jpeg,image/png,image/heic,image/webp"
                  capture="environment"
                  className="sr-only"
                  onChange={(e) => handleFileSelect(e, 1)}
                />
              </label>
            )}
          </div>

          {/* Page 2 */}
          {photo1 && !showPage2 && !photo2 && (
            <button
              onClick={() => setShowPage2(true)}
              className="text-sm text-primary hover:underline"
            >
              + Add another page
            </button>
          )}

          {(showPage2 || photo2) && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium text-warm-600">Page 2 (optional)</p>
                {!photo2 && (
                  <button
                    onClick={() => setShowPage2(false)}
                    className="text-xs text-warm-400 hover:text-warm-600"
                  >
                    Remove
                  </button>
                )}
              </div>
              {photo2 ? (
                <div className="relative overflow-hidden rounded-xl border border-warm-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo2.preview}
                    alt="Page 2 preview"
                    className="h-40 w-full object-cover"
                  />
                  <button
                    onClick={() => removePhoto(2)}
                    className="absolute right-2 top-2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 cursor-pointer"
                    aria-label="Remove page 2"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                    </svg>
                  </button>
                </div>
              ) : (
                <label className="flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-warm-300 bg-warm-50 text-warm-500 transition hover:border-primary hover:text-primary">
                  <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                  </svg>
                  <span className="text-sm font-medium">Photograph page 2</span>
                  <input
                    ref={input2Ref}
                    type="file"
                    accept="image/jpeg,image/png,image/heic,image/webp"
                    capture="environment"
                    className="sr-only"
                    onChange={(e) => handleFileSelect(e, 2)}
                  />
                </label>
              )}
            </div>
          )}

          {/* Errors */}
          {(fileError || extractError) && (
            <p className="text-sm text-red-500">{fileError || extractError}</p>
          )}

          {/* Actions */}
          <button
            onClick={handleExtract}
            disabled={!photo1 || extracting}
            className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white transition hover:bg-sage-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {extracting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Extracting recipe…
              </span>
            ) : (
              "Extract Recipe"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
