import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grain-overlay relative flex min-h-screen flex-col items-center justify-center bg-background px-4">
      {/* Decorative herb SVG — top right */}
      <svg className="pointer-events-none absolute right-4 top-8 h-32 w-32 text-sage-200 opacity-40 sm:h-44 sm:w-44" viewBox="0 0 120 120" fill="none" aria-hidden="true">
        <path d="M60 110 C60 70 30 60 15 30 C35 50 55 45 60 20 C65 45 85 50 105 30 C90 60 60 70 60 110Z" fill="currentColor" opacity="0.3"/>
        <path d="M60 110 C60 80 45 70 30 50" stroke="currentColor" strokeWidth="1" opacity="0.4"/>
        <path d="M60 110 C60 80 75 70 90 50" stroke="currentColor" strokeWidth="1" opacity="0.4"/>
        <path d="M60 110 C60 75 60 60 60 20" stroke="currentColor" strokeWidth="1" opacity="0.4"/>
      </svg>
      {/* Decorative herb SVG — bottom left */}
      <svg className="pointer-events-none absolute bottom-8 left-4 h-24 w-24 text-sage-200 opacity-30 sm:h-36 sm:w-36" viewBox="0 0 100 100" fill="none" aria-hidden="true">
        <path d="M50 90 C50 60 25 50 10 25 C30 40 45 38 50 15 C55 38 70 40 90 25 C75 50 50 60 50 90Z" fill="currentColor" opacity="0.25"/>
      </svg>

      <div className="relative z-[1] mb-8 text-center animate-fade-up">
        <Link href="/" className="font-serif text-3xl font-bold text-warm-700 sm:text-4xl">
          Recipe Lab <span className="text-primary">AI</span>
        </Link>
        <p className="mt-2 text-sm text-warm-500">
          Stop Scrolling. Start Cooking.
        </p>
      </div>
      <div className="relative z-[1] w-full max-w-sm animate-fade-up-delay-1">{children}</div>
    </div>
  );
}
