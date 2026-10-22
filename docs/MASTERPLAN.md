# MASTERPLAN: SealedVoice (C2, Tide UNLOCKED)

> Deadline nộp form: **18:00 hôm nay (22/10)**. Lập lúc 13:10. Feature freeze **15:45**. Form gửi trước **17:40**.

## Context
Team đã chốt C2 là **SealedVoice**: kênh tố cáo trong trường đại học, nơi danh tính người tố cáo **đã xác minh nhưng bị niêm phong**.

- **Insight:** Luật Tố cáo 2018 bắt đơn phải có tên, đơn nặc danh không được thụ lý. Người bị tố thường lại chính là admin.
- **Cần nộp:** repo GitHub **public** gồm app chạy được với TideCloak thật, README (5 mục, ≤300 từ, có badge, Setup tách riêng) và `Video.mp4` (≤2:00, <100MB).
- **Chấm điểm:** Vision 25 · Trust 20 · Value 20 · Why Tide 20 · Prototype 15. FAQ cấm làm "security tool / login demo".
- **Nhân sự:** bạn và mình (Opus, điều phối), 2 phiên Sonnet chạy trên 2 worktree ở máy này, và bạn **khanhle1406** dùng Codex trên máy riêng, làm trên branch riêng, có quyền push và merge.

## 1. Sản phẩm (spec tóm tắt)
**Nhân vật** (UI tiếng Anh, tên tiếng Việt):
- Mai: `student`, người tố cáo.
- TS. Hùng: trưởng khoa, admin #1, nhân vật insider.
- Inspector Lan: `investigator`, admin #2.
- Guardian Minh: `identity-guardian`, admin #3, chuyên viên độc lập.
- Council: `council`, Hội đồng trường.

**Ba phong bì cho mỗi đơn.** Mỗi phong bì là **một lệnh `doEncrypt` riêng**, vì contract chỉ kiểm tra tag của phần tử đầu tiên trong lô.

| Phong bì | Policy | Decrypt role | Tag |
|---|---|---|---|
| Content + evidence | `P-investigator` | `investigator` | `sv:content` |
| Identity | `P-guardian` | `identity-guardian` | `sv:identity` |
| Escalation copy | `P-council` | `council` | `sv:council`, `DecryptTimeLock:{now+180s}` (demo) |

`EncryptionRealmRole = student` ở cả 3 policy. Nghĩa là **ORK kiểm tra người gửi là sinh viên thật**, còn API `/api/reports` POST **không cần token**, nên server không bao giờ biết ai gửi.

**Bốn cảnh "insider bị chặn"** (đều thật):
1. Mở DB thì chỉ thấy ciphertext.
2. "Reveal reporter" thì ORK từ chối vì sai role.
3. Tự cấp `investigator` thì nhận **202 PENDING**, cần 2/3 admin.
4. Ém đơn vô ích: Council bị time-lock trước hạn, đến hạn thì mở được.

**Ngoài phạm vi MVP** (chỉ làm nếu còn giờ): hộp thư 2 chiều qua bí danh `#A7`.

**Giới hạn ghi trong README:**
- văn phong có thể làm lộ người viết;
- Tide chặn đọc, không chặn xoá (sinh viên giữ biên nhận);
- metadata/IP không được che;
- mạng ORK staging t=3/n=5.

## 2. Cấu trúc repo mới `Towfienes/SealedVoice` (public)
App đặt ở root, copy từ `forseti-crypto-quickstart/template-ts-app`.
```
SealedVoice/
  README.md  AGENTS.md  CLAUDE.md(@AGENTS.md)  .mcp.json(tide-pack)  .gitignore  .gitattributes
  specs/001-sealedvoice/{spec.md, plan.md, tasks.md}   # spec-kit gọn, mỗi file ≤2 trang
  docs/{MASTERPLAN.md, TRUST-MODEL.md, ATTACK-VECTORS.md, DEMO_SCRIPT.md, SOTA.md, RED-TEAM-PROMPT.md, architecture.svg}
  app/  (/, /report, /receipt, /investigator, /guardian, /council, /dean, /how-it-works, api/*)
  components/ hooks/  lib/{vault/{types.ts,mock.ts,tide.ts}, reports/, policies/, verifyToken.ts, forsetiContract.ts}
  init/{realm.json, start.sh, tcinit.sh}   scripts/{security-tests.sh, wordcount.sh, invite-user.sh, reset-demo.sh}
  tests/ (node --test)   e2e/ (Playwright, chạy ở mock mode)   .github/workflows/build.yml
```
**Seam để chạy song song:** `lib/vault/types.ts` định nghĩa `sealReport()`, `openEnvelope(kind)`, `requestRole()`. Có hai cài đặt:
- `mock.ts`: dữ liệu giả, `NEXT_PUBLIC_VAULT=mock`;
- `tide.ts`: TideCloak thật.

UI chỉ gọi interface, nhờ vậy WT-B và Codex làm được mà **không cần Tide chạy**.

## 3. Tái sử dụng (đã khảo sát)
- **Template Forseti, giữ nguyên:** `components/AuthProvider.tsx` (`doEncrypt`/`doDecrypt`/`approveTideRequests`/`executeTideRequest`), `hooks/useAuth.ts`, `lib/tidecloakConfig.ts`, `lib/adminPolicy.ts`, `lib/tideSerialization.ts`, `init/*.sh`, `app/auth/redirect`, `public/silent-check-sso.html`.
- **Template Forseti, cần sửa:**
  - `lib/database/policyDb.ts:98` đang lưu policy theo `modelIds[0]`, nên mỗi lần commit **ghi đè** policy trước. Phải đổi sang key theo **label** (`investigator|guardian|council`).
  - `app/api/policies/route.ts`: bỏ `DELETE` không cần xác thực.
  - `app/home/page.tsx:725-934`: tách logic create/approve/commit và encrypt/decrypt ra `lib/policies/flow.ts`, bỏ phần UI demo.
- **Contract:** dùng **`c2/contracts/SealedBidPolicy.cs`** (fail-closed) và đổi tên domain. Thêm `[PolicyParam] RequireTimeLock` (int 0/1) để chỉ `P-council` bắt buộc time-lock. Contract gốc lọt cửa khi role null hoặc time-lock không parse được.
- **Từ `c2/`:**
  - `lib/verifyToken.ts` và 26 test: dùng nguyên, đổi fixture role.
  - `app/api/committee/open/route.ts`: mẫu "server trả về ciphertext, ORK quyết định".
  - `scripts/security-tests.sh`: đổi biến token và đường dẫn.
  - `docs/TRUST-MODEL.md`, `docs/ATTACK-VECTORS.md`: viết lại cho domain mới.
- **QEA 202:** làm theo cách `init/tcinit.sh` đang gọi: `POST /admin/realms/{realm}/users/{id}/role-mappings/realm` trả **202 PENDING**. Inbox nằm ở `/iga/change-requests?status=PENDING`.
- **Repo team cũ:** `AGENTS.md` (DoD, quy ước git), `scripts/wordcount.sh`, `.github/workflows/build.yml` (Node 22, build, kiểm tra Video <100MB), `.gitignore`. CI cần thêm `node --test --experimental-strip-types`.

## 4. Chia việc và worktree

| Luồng | Ai, ở đâu | Branch | Sở hữu file | Skill / MCP |
|---|---|---|---|---|
| **Lead** | Mình (Opus) + bạn | `main` | bootstrap, `lib/vault/types.ts`, specs, AGENTS.md, merge, cài Tide, tích hợp | decision-making, git-workflow, github-ops, jev-review-triage, verification-before-completion |
| **WT-A Tide/API** | Sonnet, `../sv-wt/tide` | `feat/tide-core` | contract, `lib/policies/*`, `lib/vault/tide.ts`, `api/reports`, `api/admin/grant-role`, DB `reports`, `init/realm.json`, `scripts/invite-user.sh`, `scripts/security-tests.sh` | tide-pack MCP, security-review, tdd-workflow, backend-patterns |
| **WT-B UI** | Sonnet, `../sv-wt/ui` | `feat/ui` | `app/**/page.tsx` (trừ api), `components/ui/*`, `lib/vault/mock.ts`, `/how-it-works`, `globals.css` | ui-ux-pro-max → frontend-design → impeccable, react-patterns, accessibility |
| **Codex** | khanhle1406, máy riêng | `docs/codex` | README overview + Setup, `docs/*`, `DEMO_SCRIPT.md`, `tests/*` (đổi fixture), `e2e/*` (mock mode), seed data, chạy red team | (Codex) dùng prompt trong `docs/RED-TEAM-PROMPT.md` |

**Quy tắc:**
- Mỗi luồng chỉ sửa file của mình. Đụng file người khác thì nhắn Lead.
- Commit theo conventional commits, PR vào `main`, squash merge.
- khanhle1406 được thêm làm collaborator `maintain`, tự merge PR của mình được.
- Sau 17:40 không push gì nữa.
- **Tiết kiệm quota:** Sonnet chỉ chạy ở WT-A và WT-B. Review dùng subagent `code-reviewer`/`security-auditor` **1 lần ở mỗi gate**, không chạy liên tục.

## 5. Timeline và gate
| Giờ | Lead | WT-A | WT-B | Codex |
|---|---|---|---|---|
| 13:15–13:40 | **Phase 0:** tạo repo, copy template, `types.ts`, specs, AGENTS.md, push, thêm collaborator, tạo 2 worktree, gửi prompt | — | — | clone, đọc spec |
| 13:40–14:30 | Cài Tide trên máy này: init realm (license = gmail của bạn), **bạn và bạn kia tạo 5 tài khoản Tide** (mỗi người một Chrome profile), gán role **trước** | contract fail-closed, multi-policy store, flow.ts, tạo/duyệt/commit 3 policy | UI 7 trang chạy mock | README nháp, DEMO_SCRIPT, TRUST-MODEL, fixture test |
| **14:30 Gate 1** | Thêm admin #2 và #3 (multiAdmin, ngưỡng 2), ghép `tide.ts` vào UI, demo end-to-end lần 1 | api reports, grant-role 202 | sửa theo tích hợp | e2e mock xanh |
| 14:30–15:30 | tích hợp, sửa lỗi | time-lock cho council, security-tests | `impeccable` audit ở 390/768/1440 | **red team** chạy trên app, báo lỗi |
| **15:30 Gate 2** | review: `code-reviewer` + `security-auditor` + ponytail-review, sửa P0 | sửa | sửa | — |
| **15:45 FREEZE** | quay video từng cảnh (OBS, mỗi nhân vật một Chrome profile) | — | — | viết lời thoại |
| 16:45–17:15 | dựng video, nén bằng ffmpeg | — | — | **clone sạch trên máy mình**, chạy theo README, `wordcount.sh` |
| 17:15–17:40 | tag `v1.0-submission`, kiểm tra repo public, Video phát được, **nộp form** `RMIT_<campus>_Fprinciples_C2` | — | — | — |

**Phương án dự phòng:** nếu time-lock lỗi quá 20 phút thì bỏ phong bì council, lõi vẫn đủ nộp. Nếu Forseti/staging lỗi quá 45 phút thì chuyển sang `_tide_<tag>` E2EE cộng QEA thật, và ghi "mocked" cho phần nào là giả.

## 6. Spec-kit gọn (`specs/001-sealedvoice/`)
- **spec.md:**
  - 5 user story (Mai nộp đơn · Lan điều tra · Minh xác minh · Hùng bị chặn x3 · Council mở đúng hạn);
  - mỗi story 2–3 acceptance criteria dạng Given/When/Then;
  - non-goals.
- **plan.md:** mục 1–3 của file này (kiến trúc, seam, tái sử dụng, rủi ro).
- **tasks.md:** khoảng 25 task, định dạng `T01 [WT-A] [P] mô tả · file · DoD`, gom theo gate. `[P]` = chạy song song được.

Viết trong 15 phút ở Phase 0. Không dùng CLI `specify`.

## 7. Harness test (kịch bản test)
- **Unit** (`node --test`):
  - 26 test verifyToken;
  - `reports` API: POST không token được chấp nhận, POST có field plaintext (`"content":`) thì 400, GET list cần role `investigator`, không bao giờ trả plaintext;
  - policy store: commit 3 policy thì cả 3 cùng tồn tại.
- **E2E Playwright** (mock mode): Mai nộp đơn → biên nhận; Lan thấy nội dung, không thấy danh tính; Dean console hiện 3 lần bị chặn; Council trước và sau hạn.
- **Black-box** (`scripts/security-tests.sh`, app thật): forged/alg-none/expired token → 401; plaintext trong DB → FAIL; tự cấp role → 202.
- **Checklist demo thật:** 4 cảnh insider, mỗi cảnh chụp nguyên văn lỗi của ORK.
- **CI:** build, `node --test`, kiểm tra Video <100MB. Chạy `wordcount.sh` trước khi nộp.

## 8. SOTA để định vị (đưa vào `docs/SOTA.md` và Vision)
| Hệ thống | Giải quyết | SealedVoice khác ở |
|---|---|---|
| CoverDrop (PETS 2022, The Guardian đưa vào app 2025) | ẩn việc *liên lạc* với nhà báo (cover traffic, TEE) | ta giải bài *danh tính đã xác minh nhưng niêm phong* trong một tổ chức |
| Callisto (COMPASS 2018, triển khai 2023) | escrow + matching: chỉ mở khi có ≥2 người tố cùng một đối tượng | ta không cần matching. Đây là ý mở rộng tương lai ("Cùng tố") |
| WhoToo (PoPETs 2019), AWARE (ePrint 2026/1046) | mở báo cáo khi đủ ngưỡng hội đồng (crypto tự xây) | ta dùng **IAM có sẵn, tương thích Keycloak**, nên triển khai được ngay cho trường học |
| Tide Nested Shamir ("unobtainable secrets"), FROST RFC 9591 | khoá không tồn tại ở một nơi, ký ngưỡng | nền tảng cho câu "không có chìa tổng để ép IT" |

## 9. Prompt red team (lưu ở `docs/RED-TEAM-PROMPT.md`, đưa cho Codex hoặc một cửa sổ AI khác)
> You are an authorized red-teamer for our hackathon app SealedVoice (repo: <url>, running at http://localhost:3000, TideCloak at :8080, realm `forseti-test`). Threat actor: "Dr. Hung", Head of School, a TideCloak realm admin with shell access to the app server and the SQLite DB, who wants to learn WHO filed report #A7, read its content, stop it reaching the Council, or add himself as investigator. Goals, in order: (1) recover the reporter identity; (2) read content without the `investigator` role; (3) decrypt the council envelope before its time lock (tag forgery, unparseable epoch, batch-index trick, replaying tags); (4) self-grant a role without quorum (REST role-mapping, client roles, groups, composite roles, default-roles); (5) forge or replay tokens against `/api/*` (alg none, wrong iss/aud, expired, DPoP downgrade); (6) learn identity from metadata (timestamps, server logs, request headers, ordering); (7) delete or alter a report undetected. Rules: test only localhost; no DoS; no attacks on Tide's public ORK network beyond normal API use. Output a table: vector · steps · result (BLOCKED / PARTIAL / OPEN) · evidence (exact error text) · fix · severity P0–P3. Be adversarial and specific. Assume the README's security claims are false until you have verified them.

## 10. Verification (Definition of Done)
- [ ] Clone sạch → làm theo README Setup → login → Mai nộp đơn → Lan đọc → 4 cảnh Hùng bị chặn chạy thật.
- [ ] `npm run build` và `node --test` xanh. `security-tests.sh` không có FAIL. `git log -p` không có secret (không commit `tidecloak.json`, `admin-policy.b64`, `*.db`).
- [ ] README: badge, 1 câu, 5 mục ≤300 từ (`wordcount.sh`), Setup, link Video. Video ≤2:00, <100MB, phát được trên GitHub, repo public.
- [ ] Rendered UI kiểm bằng Playwright ở 390/768/1440. Phản hồi của red team đã được xử lý hoặc ghi vào README Limits.
- [ ] Form nộp lúc 17:40 kèm tag `v1.0-submission`. Sau đó không push nữa.

## Bước đầu tiên khi được duyệt (Phase 0, mình làm)
1. `gh repo create Towfienes/SealedVoice --public`, copy template-ts-app (bỏ `keycloakdb.*`, `node_modules`) và các file tái sử dụng ở mục 3. Viết AGENTS.md, specs, docs/MASTERPLAN.md, `lib/vault/types.ts` + `mock.ts` tối thiểu. Push `main`.
2. `gh api -X PUT repos/Towfienes/SealedVoice/collaborators/khanhle1406 -f permission=maintain`.
3. `git worktree add ../sv-wt/tide -b feat/tide-core` và `../sv-wt/ui -b feat/ui`. Viết sẵn prompt cho mỗi phiên Sonnet (`claude --model sonnet` trong từng thư mục) và tin nhắn giao việc cho Codex.
4. Dừng container `mytidecloak` cũ, chạy lại init trong repo mới. Bạn bấm link đăng ký và tạo tài khoản.
