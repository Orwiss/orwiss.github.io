import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { noStoreHeaders } from "@/lib/http";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const key = "textList";

function createRedisClient() {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    throw new Error("Upstash Redis is not configured.");
  }

  return new Redis({ url, token });
}

export async function POST(req: Request) {
  try {
    const redis = createRedisClient();
    const { value } = await req.json();

    if (!value || typeof value !== "string") {
      return NextResponse.json(
        { error: "A non-empty string value is required." },
        { status: 400, headers: noStoreHeaders }
      );
    }

    const list = (await redis.get<string[]>(key)) || [];

    if (!list.includes(value)) {
      await redis.set(key, [...list, value]);
      return NextResponse.json({ success: true }, { headers: noStoreHeaders });
    }

    return NextResponse.json(
      { success: false, message: "The provided value already exists." },
      { headers: noStoreHeaders }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Server error", detail: String(error) },
      { status: 500, headers: noStoreHeaders }
    );
  }
}

export async function GET() {
  try {
    const redis = createRedisClient();
    const data = await redis.get(key);
    return NextResponse.json({ data }, { headers: noStoreHeaders });
  } catch (error) {
    return NextResponse.json(
      { error: "Server error", detail: String(error) },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
