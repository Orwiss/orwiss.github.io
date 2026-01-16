"use client";

type ClarityPayload = Record<string, string | number | boolean | null>;

type ClarityModule = {
  default?: ClarityClient;
  start?: (options: { projectId: string }) => void;
  set?: (key: string, value: string | number | boolean | null) => void;
  event?: (name: string) => void;
};

type ClarityClient = {
  start?: (options: { projectId: string }) => void;
  set?: (key: string, value: string | number | boolean | null) => void;
  event?: (name: string) => void;
};

declare global {
  interface Window {
    clarity?: (...args: unknown[]) => void;
  }
}

let clarityClient: ClarityClient | null = null;

const resolveClient = (module: ClarityModule): ClarityClient => {
  if (module.default) {
    return module.default;
  }

  return module;
};

export const initClarity = async (projectId: string) => {
  if (clarityClient) {
    return;
  }

  try {
    const module = (await import("@microsoft/clarity")) as ClarityModule;
    const client = resolveClient(module);

    if (client.start) {
      client.start({ projectId });
      clarityClient = client;
      return;
    }
  } catch {
    // fallback to window clarity when the package is unavailable
  }

  if (window.clarity) {
    window.clarity("start", { projectId });
  }
};

export const trackClarityEvent = (name: string, payload?: ClarityPayload) => {
  const eventTarget = clarityClient;

  if (!eventTarget && !window.clarity) {
    return;
  }

  if (payload) {
    Object.entries(payload).forEach(([key, value]) => {
      if (eventTarget?.set) {
        eventTarget.set(key, value);
      } else {
        window.clarity?.("set", key, value);
      }
    });
  }

  if (eventTarget?.event) {
    eventTarget.event(name);
  } else {
    window.clarity?.("event", name);
  }
};
