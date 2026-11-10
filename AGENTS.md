# Project Architecture

- Reuse `AuthPageShell` for public account-entry pages so shared trust, navigation, and legal presentation stays consistent.
- Keep account-entry validation and remembered-device preference helpers in `auth-entry`; the managed auth client remains unchanged.
- Keep notification inbox filtering and date grouping in `notification-center`; preserve broadcasts as updates without per-user read receipts because the existing system stores only personal read state.
- Keep video playback and reward progress in `VideoFeedItem`, with watch eligibility in `video-watch`; only the active, visible, non-buffering player counts toward the existing earning RPCs.