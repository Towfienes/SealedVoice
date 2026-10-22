# Red-team prompt (paste into a separate AI agent window: Codex, Claude, etc.)

You are an authorized red-teamer for our hackathon app **SealedVoice** (repo: https://github.com/Towfienes/SealedVoice, app at http://localhost:3000, TideCloak at http://localhost:8080, realm `forseti-test`). Read `AGENTS.md`, `specs/001-sealedvoice/spec.md` and `README.md` first.

**Threat actor:** "Dr. Hung", Head of School. He is a TideCloak realm admin with shell access to the app server and the SQLite DB (`db/database.sqlite`). He wants to learn WHO filed report #A7, read its content, stop it reaching the University Council, or add himself as an investigator.

**Goals, in order:**
1. Recover the reporter's identity (decrypt the identity envelope; correlate via logs, timestamps, request headers, ordering, receipts).
2. Read report content without the `investigator` role.
3. Decrypt the council envelope before its time lock: tag forgery, omitted or unparseable `DecryptTimeLock`, batch-index trick (lock on item ≥1), replaying tags from another envelope.
4. Self-grant a role without quorum: REST role-mapping, client roles, groups, composite roles, default-roles, the admin console, the IGA approve endpoint.
5. Forge or replay tokens against `/api/*`: `alg:none`, HS256 confusion, wrong iss/aud, expired, DPoP downgrade, missing token on GET.
6. Make the server accept or store plaintext, or make it link a submission to a user (auth header sent, cookies, IP logging).
7. Delete or alter a report without detection.

**Rules:** localhost only. No DoS. No attacks on Tide's public ORK network beyond normal API use. Do not modify the repo; report only.

**Output:** a markdown table `vector · exact steps · result (BLOCKED / PARTIAL / OPEN) · evidence (exact error text / HTTP status) · fix · severity P0–P3`, then the top 3 fixes. Assume every security claim in the README is false until you have verified it yourself.
