# QalaQauip Security Specification (Phase 0)

## 1. Data Invariants
1. **Identity Integrity**: Every user-authored record (`users`, `citizenReports`, `incidents`, `visionDetections`, `aiAnalysis`, `partnershipRequests`, `auditLogs`) MUST carry an owner/actor UID matching `request.auth.uid` on creation.
2. **No Self-Assigned Roles**: A user creating or updating `/users/{userId}` cannot set or escalate `role` beyond `'citizen'` unless authenticated as a trusted platform admin.
3. **PII Isolation**: User email and phone are stored in `/users/{userId}/private/{docId}`, readable and writable only by the owning UID or verified platform admin.
4. **Strict Schema & Size Bounds**: Every write validates required + allowed keys (`hasAll` + `hasOnly` on create, `affectedKeys().hasOnly` on update) and enforces string length limits to block shadow fields and resource poisoning.
5. **Temporal Integrity**: `createdAt` and `updatedAt` fields are verified against server `request.time`; `createdAt` and `reporterUid`/`uid` are immutable after creation.
6. **Terminal State Locking**: Once an `Incident` reaches `status == 'closed'` or a `WorkOrder` reaches `status == 'completed'`, non-admin clients cannot reopen or mutate it.
7. **City Tenant Isolation**: Records include `cityId` (`shymkent`, `astana`, `almaty`), and `allow list` rules evaluate `resource.data` directly without `get()`/`exists()` lookups.

## 2. "Dirty Dozen" Adversarial Payloads (Expected: `PERMISSION_DENIED`)
1. **Role Escalation on Registration**: `POST /users/u1` with `{ uid: "u1", role: "platform_admin", ... }` by non-admin.
2. **Role Escalation on Update**: `PATCH /users/u1` changing `role` from `"citizen"` to `"city_admin"`.
3. **UID Spoofing**: `POST /citizenReports/r1` with `reporterUid: "other_user"`.
4. **Shadow Field Injection**: `POST /incidents/i1` including undocumented field `isVerifiedByGov: true`.
5. **ID Poisoning**: `POST /incidents/<200-char-invalid-id!@#>` violating `isValidId()`.
6. **Oversized String Poisoning**: `POST /citizenReports/r2` with 5000-char `description`.
7. **Timestamp Forgery**: `POST /incidents/i2` with client-backdated `createdAt`.
8. **Immutable Field Mutation**: `PATCH /incidents/i1` changing `reporterUid` or `createdAt`.
9. **Terminal State Reopening**: `PATCH /incidents/closed_inc` changing `status` from `"closed"` to `"in_progress"` by non-admin.
10. **Cross-User PII Read**: `GET /users/victim_uid/private/info` by `attacker_uid`.
11. **Unverified Email Write**: Write attempt when `request.auth.token.email_verified == false`.
12. **Audit Log Tampering**: `PATCH` or `DELETE` on `/auditLogs/log_1` by any non-admin user.
