import { NextRequest, NextResponse } from "next/server";
import type { RabbyResponse } from "@/lib/rabbyTypes";
import { extractActiveLPPositions } from "@/lib/activeLp";

const RABBY_BASE_URL =
  "https://api.rabby.io/v1/user/complex_protocol_list";

function isValidEvmAddress(addr: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(addr);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json(
      { error: "Missing ?address= parameter" },
      { status: 400 }
    );
  }

  if (!isValidEvmAddress(address)) {
    return NextResponse.json(
      { error: "Invalid EVM address format" },
      { status: 400 }
    );
  }

  try {
    const url = `${RABBY_BASE_URL}?id=${address}`;
    console.log("Calling Rabby:", url);

    const rabbyRes = await fetch(url, {
      method: "GET",
      cache: "no-store",
      // Make this look like your working browser request
      headers: {
        // copy your own UA (from the header dump)
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",

        // use the same Accept that you saw working
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",

        "Accept-Language": "en-US,en;q=0.6",
        "Cache-Control": "max-age=0",
        "Upgrade-Insecure-Requests": "1",

        // optional: send sec-ch-* as plain headers; some WAFs check only presence
        "sec-ch-ua":
          '"Chromium";v="142", "Brave";v="142", "Not_A Brand";v="99"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "none",
        "sec-fetch-user": "?1",
        "sec-gpc": "1",
      },
    });

    if (!rabbyRes.ok) {
      const text = await rabbyRes.text().catch(() => "");
      console.error(
        "Rabby error:",
        rabbyRes.status,
        rabbyRes.statusText,
        text.slice(0, 200)
      );

      return NextResponse.json(
        {
          error: `Rabby error ${rabbyRes.status} ${rabbyRes.statusText}`,
          body: text.slice(0, 200),
        },
        { status: 502 }
      );
    }

    const data = (await rabbyRes.json()) as RabbyResponse;
    const positions = extractActiveLPPositions(data);
    return NextResponse.json({ address, positions });
  } catch (err: any) {
    console.error("Error fetching from Rabby:", err);
    return NextResponse.json(
      { error: "Internal error contacting Rabby", detail: String(err) },
      { status: 500 }
    );
  }
}
