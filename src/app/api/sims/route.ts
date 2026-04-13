import { NextResponse } from "next/server";

import { createSim } from "@/server/api/create-sim";
import { enqueueJob, jobRepository } from "@/server/services";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await createSim(body, {
      repository: jobRepository,
      enqueue: enqueueJob,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create simulation";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
