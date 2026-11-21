# Security and Human Approval Rules

## Secret handling

Frontend environment variables are bundled into browser assets. Only use the documented Flagsmith client environment key there.

Never place these in `VITE_*`:
- Flagsmith server/admin key
- CLI credential or token
- LLM provider API key
- Database service-role key

Keep `.env.local` ignored. Commit only `.env.example` placeholders. Never paste secret values into prompts, screenshots, logs or GitHub issues.

## LLM safety

- Validate model output against a strict schema.
- Treat all model output as untrusted.
- Never execute arbitrary model-generated shell.
- Allowlist supported Flagsmith operations.
- Backend only for provider API calls.
- Add rate limits and error redaction.
- Keep deterministic fallback when no LLM key exists.

## Approval gates

Separate human confirmation is required for:
1. Create/update flag, metric or experiment.
2. Start/stop experiment.
3. Change traffic allocation.
4. Roll out a winner.
5. Send synthetic traffic to a shared environment.

Show the target project/environment and exact intended change before confirmation.

## Identity and privacy

- Use a random stable anonymous identity or internal non-PII ID.
- Never use email or phone as the experiment identity.
- Reuse the same identity for exposure and conversion.
- Avoid collecting personal data unless necessary and disclosed.
