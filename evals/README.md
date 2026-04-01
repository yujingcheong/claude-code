# Evaluation Harness

This repository includes a minimal evaluation harness for platform capability checks.

Run:

```bash
node evals/runner.js
node --test evals/tests/**/*.test.js
node evals/lint.js
node evals/build.js
```

The current baseline verifies required files for:
- persistent memory
- workflow orchestration
- durable task state
- safety/audit logging
- observability tracing
- core new tools

Integration tests now validate:
- live provider connector request behavior (Brevo email, calendar API, Supabase RPC, browser runtime endpoint)
- workflow runtime behavior (dependency ordering, retries, checkpoints, timeouts)
