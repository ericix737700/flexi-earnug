

## Fix MarzPay API Authentication

### Problem
The current setup stores `MARZPAY_API_KEY` as a single secret, but MarzPay requires HTTP Basic Auth with credentials formatted as `base64(apikey:apisecret)`. We need to store both the API Key and API Secret separately, then compute the base64 encoding in the edge functions.

### Plan

**Step 1: Store two separate secrets**
- Add `MARZPAY_API_SECRET` as a new secret (value: `JECHiVMg3TYePg9bgdA2jWrMvvnvLNv9` — already provided)
- Update `MARZPAY_API_KEY` with just the API Key value (user needs to provide this)

**Step 2: Update all 3 edge functions to compute Basic Auth correctly**

In `marzpay-collect/index.ts` and `marzpay-send/index.ts`, change the auth header construction from:
```typescript
Authorization: `Basic ${MARZPAY_API_KEY}`
```
to:
```typescript
const apiKey = Deno.env.get("MARZPAY_API_KEY");
const apiSecret = Deno.env.get("MARZPAY_API_SECRET");
const credentials = btoa(`${apiKey}:${apiSecret}`);
// Then use: Authorization: `Basic ${credentials}`
```

**Step 3: Request the API Key from user**
- Use the `add_secret` tool to ask for the MarzPay API Key (the username/key from their dashboard — separate from the secret they already shared)

### Files to modify
- `supabase/functions/marzpay-collect/index.ts` — update auth header
- `supabase/functions/marzpay-send/index.ts` — update auth header
- No changes needed to `marzpay-webhook/index.ts` (it receives callbacks, doesn't call MarzPay API)

