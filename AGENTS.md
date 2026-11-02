# Project Architecture

- Reuse `AuthPageShell` for public account-entry pages so shared trust, navigation, and legal presentation stays consistent.
- Keep account-entry validation and remembered-device preference helpers in `auth-entry`; the managed auth client remains unchanged.