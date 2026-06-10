---
'@tradecanvas/chart': patch
---

feat: alert sound + desktop notifications

- New `alertNotifications` widget option fires a sound and/or a desktop
  notification when a price alert triggers (both off by default).
  `sound: true` plays a built-in two-tone Web Audio beep — no asset needed —
  or pass a URL for a custom sound; `desktop: true` uses the Notification API
  and requests permission on first use. Every entry point degrades to a no-op
  in SSR, unsupported browsers, or when permission is denied.
