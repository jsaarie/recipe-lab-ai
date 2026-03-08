import { Suspense } from "react";
import { HomePage } from "@/components/home-page";

export default function Page() {
  return (
    <Suspense>
      <HomePage />
    </Suspense>
  );
}
