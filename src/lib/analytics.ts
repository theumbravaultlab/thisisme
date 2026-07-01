// Lightweight, privacy-respecting event hook. No PII, no third party by
// default — swap the body for PostHog/Plausible/etc. when you pick a provider.
// Usage: track("profile_edit", { field: "age" })

type Props = Record<string, string | number | boolean | null | undefined>;

export function track(event: string, props: Props = {}): void {
  if (typeof window === "undefined") return;
  // Plug your analytics provider here, e.g.:
  //   window.posthog?.capture(event, props)
  //   window.plausible?.(event, { props })
  if (process.env.NODE_ENV !== "production") {
    console.debug("[track]", event, props);
  }
}
