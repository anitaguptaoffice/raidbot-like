import React from "react";
import { SimResultExperience } from "@/ui/sim-result-experience";

export default async function SimResultPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;

  return <SimResultExperience jobId={jobId} />;
}
