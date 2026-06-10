import React from "react";
import { Suspense } from "react";

import { SimResultExperience } from "@/ui/sim-result-experience";

export default function SimsPage() {
  return (
    <Suspense fallback={<main className="page-shell"><section className="panel">加载中...</section></main>}>
      <SimResultExperience />
    </Suspense>
  );
}
