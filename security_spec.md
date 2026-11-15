# Firestore Security Specification (Lest We Forget)

## 1. Data Invariants

1. **Strict Email Allowlist Gate**: Only authenticated users with `email_verified == true` and `email.lower()` matching `alan.rodmell@gmail.com` or `jlmclaren84@gmail.com` may read or write any document in `/vaults/couple_vault`.
2. **Master Gate Relational Sync**: A `GratitudeEntry` at `/vaults/{vaultId}/entries/{entryId}` cannot be created, read individually, updated, or deleted unless `vaultId == 'couple_vault'` and the parent `/vaults/couple_vault` document exists.
3. **Strict Entry Boundaries**: Every `GratitudeEntry` `text` MUST be a non-empty string between 1 and 500 characters (`text.size() >= 1 && text.size() <= 500`), `perspective` MUST be `'from_me'` or `'from_her'`, `tagStyle` MUST be `'white'` or `'kraft'`, `entryDate` MUST match `YYYY-MM-DD`, and `tags` MUST be a list of at most 8 strings (each 1–24 chars).
4. **Immutable Identity & Temporal Integrity**: `id`, `vaultId`, `authorUid`, and `createdAt` are immutable after creation. `authorUid` must equal `request.auth.uid` on creation. `createdAt` must equal `request.time` on creation, and `updatedAt` must equal `request.time` on both creation and updates.
5. **Zero Shadow Fields**: Document creation strictly validates `hasAll` and `hasOnly` key sets; updates use action-based `affectedKeys().hasOnly(...)` allowlists.
6. **Zero Query Delegation**: `allow list` on `/vaults/{vaultId}/entries` explicitly enforces `isAllowedCoupleMember()` and `resource.data.vaultId == 'couple_vault'` without `get()`/`exists()` calls.
7. **Per-Member Read State Isolation**: Each allowlisted member's `lastSeenMs` cursor and optional `recentDrawIds` shuffle history (bounded to at most 50 entry IDs) live at `/vaults/couple_vault/members/{memberId}` where `memberId == request.auth.uid`, contain zero PII (only `uid`, `vaultId`, `lastSeenMs`, optional `recentDrawIds`, and `updatedAt`), and are readable/writable only by that specific authenticated member.

## 2. The "Dirty Dozen" Adversarial Payloads

All 12 payloads below must evaluate to `PERMISSION_DENIED`:

1. **Unauthenticated Read/Write**: `request.auth == null` attempting to read or write `/vaults/couple_vault/entries/tag-1`.
2. **Unverified Email Spoofing**: `request.auth.token.email == 'alan.rodmell@gmail.com'`, `request.auth.token.email_verified == false` attempting any read or write.
3. **Unauthorized Email Access**: Authenticated verified user `stranger@gmail.com` attempting to read, list, create, update, or delete `/vaults/couple_vault/entries`.
4. **Wrong Vault Path**: Allowlisted member attempting to access `/vaults/other_vault` instead of `couple_vault`.
5. **Ghost / Shadow Field Injection on Create**: Allowlisted member creating an entry with an extra field `{ ..., isAdmin: true }`.
6. **Shadow Update on Existing Entry**: Allowlisted member updating an entry with `{ text: 'updated', updatedAt: serverTime, shadowField: 'bad' }`.
7. **Oversized Text Payload (>500 chars)**: Allowlisted member creating or updating an entry with `text` of length 501.
8. **Invalid Enum Value**: Creating an entry with `perspective: 'from_stranger'` or `tagStyle: 'neon_pink'`.
9. **ID Poisoning**: Creating or getting `/vaults/couple_vault/entries/bad$id..slashes` or a 200-char ID.
10. **AuthorUid Spoofing**: Allowlisted member creating `/vaults/couple_vault/entries/tag-1` with `authorUid: 'someone_else'`.
11. **Immutable Field Tampering**: Updating `createdAt`, `authorUid`, `vaultId`, or `id` on an existing entry.
12. **Client-Forged Timestamp / Unbounded Tags**: Creating an entry with a backdated `createdAt` or 9 tags (`tags.size() == 9`).
