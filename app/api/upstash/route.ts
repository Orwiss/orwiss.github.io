// app/api/upstash/saveTextData/route.ts
import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

const key = 'textList';

export async function POST(req: Request) {
  try {
    const { value } = await req.json();

    if (!value || typeof value !== 'string') {
      return NextResponse.json({ error: 'value가 필요합니다.' }, { status: 400 });
    }

    const list = (await redis.get<string[]>(key)) || [];

    if (!list.includes(value)) {
      await redis.set(key, [...list, value]);
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false, message: '중복된 텍스트입니다.' });
    }
  } catch (error) {
    return NextResponse.json({ error: '서버 오류', detail: String(error) }, { status: 500 });
  }
}

export async function GET() {
  try {
    const data = await redis.get(key);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: '서버 오류', detail: String(error) }, { status: 500 });
  }
}
