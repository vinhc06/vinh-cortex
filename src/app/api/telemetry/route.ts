import { connection } from "next/server";
import { fetchTelemetry, offlineTelemetry, telemetryCacheMs, type TelemetrySnapshot } from "@/lib/telemetry";

let cached: { snapshot: TelemetrySnapshot; refreshAt: number } | undefined;
let previous: TelemetrySnapshot | undefined;
let pending: Promise<TelemetrySnapshot> | undefined;

function localTelemetry(token: string | undefined) {
  if (cached && Date.now() < cached.refreshAt) return Promise.resolve(cached.snapshot);
  pending ??= fetchTelemetry(token)
    .then((snapshot) => {
      previous = snapshot;
      cached = { snapshot, refreshAt: Date.now() + telemetryCacheMs };
      return snapshot;
    })
    .catch(() => {
      const snapshot = offlineTelemetry(previous);
      cached = { snapshot, refreshAt: Date.now() + 60_000 };
      return snapshot;
    })
    .finally(() => { pending = undefined; });
  return pending;
}

async function getTelemetry() {
  const upstream = process.env.NEXT_PUBLIC_AWS_TELEMETRY_URL?.trim();
  if (upstream) {
    try {
      const response = await fetch(upstream, { cache: "no-store", signal: AbortSignal.timeout(5000) });
      if (response.ok) {
        const upstreamSnapshot = await response.json() as TelemetrySnapshot;
        if (typeof upstreamSnapshot?.github?.activeRepos === "number") {
          const { github, fetchedAt, stale } = upstreamSnapshot;
          const snapshot = { github, fetchedAt, stale };
          previous = snapshot;
          return snapshot;
        }
      }
    } catch {
      // Use the local cache or GitHub when the deployed endpoint is unreachable.
    }
  }
  return localTelemetry(process.env.GITHUB_TOKEN?.trim());
}

export async function GET() {
  await connection();
  return Response.json(await getTelemetry(), { headers: { "cache-control": "no-store" } });
}
