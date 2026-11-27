import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { fetchTelemetry, offlineTelemetry, telemetryCacheMs, type TelemetrySnapshot } from "../../src/lib/telemetry";

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const staleRetentionSeconds = 7 * 24 * 60 * 60;

async function getSnapshot(): Promise<TelemetrySnapshot> {
  const table = process.env.TELEMETRY_TABLE_NAME;
  const token = process.env.GITHUB_TOKEN?.trim();
  const pk = `telemetry#vinhc06#v2#${token ? "authenticated" : "public"}`;
  let previous: TelemetrySnapshot | undefined;
  if (table) {
    try {
      const { Item } = await db.send(new GetCommand({ TableName: table, Key: { pk } }), {
        abortSignal: AbortSignal.timeout(2000),
      });
      const snapshot = Item?.snapshot as TelemetrySnapshot | undefined;
      if (snapshot?.github && snapshot.fetchedAt && Item && Item.expiresAt > Date.now() / 1000) {
        previous = snapshot;
        if (Date.now() - Date.parse(snapshot.fetchedAt) < telemetryCacheMs) return snapshot;
      }
    } catch (error) {
      console.warn("Telemetry cache read failed", error);
    }
  }

  let snapshot: TelemetrySnapshot;
  try {
    snapshot = await fetchTelemetry(token);
  } catch {
    return offlineTelemetry(previous);
  }

  if (table) {
    try {
      await db.send(new PutCommand({
        TableName: table,
        Item: { pk, snapshot, expiresAt: Math.floor(Date.now() / 1000) + staleRetentionSeconds },
      }), { abortSignal: AbortSignal.timeout(2000) });
    } catch (error) {
      console.warn("Telemetry cache write failed", error);
    }
  }
  return snapshot;
}

export async function handler(event?: { requestContext?: { http?: { method?: string } } }) {
  const method = event?.requestContext?.http?.method;
  if (method && method !== "GET") {
    return { statusCode: 405, headers: { allow: "GET" }, body: "" };
  }
  const { github, fetchedAt, stale } = await getSnapshot();
  return {
    statusCode: 200,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
    body: JSON.stringify({ github, fetchedAt, stale }),
  };
}
