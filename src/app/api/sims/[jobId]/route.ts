import { NextResponse } from "next/server";

import { getSimById } from "@/server/api/get-sim";
import { jobRepository } from "@/server/services";

export async function GET(
  _request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await context.params;
  const result = await getSimById(jobId, jobRepository);

  if (!result) {
    return NextResponse.json({ error: "Simulation not found" }, { status: 404 });
  }

  return NextResponse.json(result);
}
