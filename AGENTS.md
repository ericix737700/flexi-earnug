# Project Architecture

- Reuse `AuthPageShell` for public account-entry pages so shared trust, navigation, and legal presentation stays consistent.
- Keep account-entry validation and remembered-device preference helpers in `auth-entry`; the managed auth client remains unchanged.
- Keep notification inbox filtering and date grouping in `notification-center`; preserve broadcasts as updates without per-user read receipts because the existing system stores only personal read state.