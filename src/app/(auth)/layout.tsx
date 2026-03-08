export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#FAF8F5] px-4">
      <div className="mb-8 text-center">
        <span className="text-2xl font-bold text-neutral-700">
          Recipe Lab <span className="text-[#7C9070]">AI</span>
        </span>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
