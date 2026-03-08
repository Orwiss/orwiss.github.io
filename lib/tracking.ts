"use client";

type TrackingPayload = Record<string, string | number | boolean | null | undefined>;

type SiteEventOptions = {
  clarityEvent?: string;
  gaEvent?: string;
  payload?: TrackingPayload;
};

declare global {
  interface Window {
    clarity?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

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
  if (!window.gtag) {
    return;
  }

  const normalizedPayload =
    payload &&
    Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));

  if (normalizedPayload) {
    window.gtag("event", name, normalizedPayload);
    return;
  }

  window.gtag("event", name);
};

export const trackSiteEvent = ({ clarityEvent, gaEvent, payload }: SiteEventOptions) => {
  if (clarityEvent) {
    trackClarityEvent(clarityEvent, payload);
  }

  if (gaEvent) {
    trackGoogleAnalyticsEvent(gaEvent, payload);
  }
};
