"use client";

type ClarityPayload = Record<string, string | number | boolean | null>;

declare global {
  interface Window {
    clarity?: (...args: unknown[]) => void;
  }
}

export const trackClarityEvent = (name: string, payload?: ClarityPayload) => {
  if (!window.clarity) {
    return;
  }

  if (payload) {
    Object.entries(payload).forEach(([key, value]) => {
      window.clarity?.("set", key, value);
    });
  }

  window.clarity("event", name);
};
