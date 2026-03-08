"use client";

type TrackingPayload = Record<string, string | number | boolean | null | undefined>;
type DataLayerEvent = TrackingPayload & { event: string };

type SiteEventOptions = {
  clarityEvent?: string;
  gaEvent?: string;
  payload?: TrackingPayload;
};

declare global {
  interface Window {
    clarity?: (...args: unknown[]) => void;
    dataLayer?: DataLayerEvent[];
  }
}

const normalizePayload = (payload?: TrackingPayload) =>
  payload
    ? Object.fromEntries(
        Object.entries(payload).filter(([, value]) => value !== undefined),
      )
    : undefined;

export const trackClarityEvent = (name: string, payload?: TrackingPayload) => {
  if (!window.clarity) {
    return;
  }

  if (payload) {
    Object.entries(payload).forEach(([key, value]) => {
      if (value === undefined) {
        return;
      }

      window.clarity?.("set", key, value);
    });
  }

  window.clarity("event", name);
};

export const trackGoogleAnalyticsEvent = (name: string, payload?: TrackingPayload) => {
  window.dataLayer = window.dataLayer ?? [];
  const normalizedPayload = normalizePayload(payload);

  window.dataLayer.push({
    event: name,
    ...(normalizedPayload ?? {}),
  });
};

export const trackSiteEvent = ({ clarityEvent, gaEvent, payload }: SiteEventOptions) => {
  if (clarityEvent) {
    trackClarityEvent(clarityEvent, payload);
  }

  if (gaEvent) {
    trackGoogleAnalyticsEvent(gaEvent, payload);
  }
};
