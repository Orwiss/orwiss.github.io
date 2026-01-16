"use client";

import { useEffect } from "react";
import { initClarity } from "@/lib/clarity";

export default function ClarityProvider() {
  useEffect(() => {
    const clarityId = process.env.NEXT_PUBLIC_CLARITY_ID;
    if (!clarityId) {
      return;
    }

    initClarity(clarityId);
  }, []);

  return null;
}
