"use client";

import { type AnchorHTMLAttributes, type ReactNode } from "react";
import { useNavigate } from "./Transition";

// Replacement for next/link that routes through the page-transition
// orchestrator instead of a raw router.push. Plain anchor markup means
// new-tab/cmd-click/middle-click still work natively — we only
// intercept the standard same-tab left-click.
type Props = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children: ReactNode;
};

export function SmoothLink({ href, onClick, children, ...rest }: Props) {
  const navigate = useNavigate();
  return (
    <a
      href={href}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        // Let modifier-clicks fall through to the browser's native
        // "open in new tab/window" behaviour.
        if (
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          event.button !== 0
        ) {
          return;
        }
        event.preventDefault();
        navigate(href);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}
