import { RecipeInput } from "@/components/recipe-input";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#FAF8F5] px-4">
      <main className="flex w-full max-w-2xl flex-col items-center gap-8">
        <h1 className="text-4xl font-bold tracking-tight text-neutral-700 sm:text-5xl">
          Recipe Lab <span className="text-[#7C9070]">AI</span>
        </h1>

        <RecipeInput />
      </main>
    </div>
  );
}
