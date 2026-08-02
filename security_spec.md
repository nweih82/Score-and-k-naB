# Firebase Security Specification

## Data Invariants
1. A user document at `/users/{userId}` can only be read or written by the authenticated user whose `request.auth.uid == userId`.
2. All subcollections under `/users/{userId}/` (`players`, `gameHistory`, `savedGames`) are strictly owned by `{userId}`. `request.auth.uid` MUST equal `{userId}`.
3. Incoming document `userId` field MUST match `request.auth.uid`.
4. Document IDs must be valid alphanumeric string identifiers matching `^[a-zA-Z0-9_\-]+$`.
5. Data types and limits (`maxLength`) must be strictly enforced.

## The "Dirty Dozen" Payloads (Threat Vectors)
1. **Unauthenticated Read/Write**: Attempting to read or write `/users/{userId}/players/{playerId}` without being logged in.
2. **Cross-User Tampering**: User A (`uid_123`) attempting to write to `/users/uid_456/players/p1`.
3. **Identity Spoofing**: User A creating a player document with `userId: 'uid_456'` under their own path.
4. **ID Poisoning / Oversized ID**: Attempting to create a document with a 2KB junk character ID.
5. **Ghost Field / Shadow Update**: Attempting to write unexpected fields (`isAdmin: true`, `role: 'god'`) into player or profile documents.
6. **Oversized String Injection**: Injecting a 500,000 character string into player `name` field.
7. **Invalid Enum Injection**: Saving a game with `gameType: 'poker'` when only `farkle`, `yahtzee`, `dominoes` are valid.
8. **Null / Type Mismatch**: Passing a number for `name` or string for `scores`.
9. **Email Spoofing**: Spoofing email token without `email_verified == true`.
10. **Modification of Immutable Fields**: Changing `userId` on document update.
11. **PII Exposure**: Reading another user's profile document or subcollections.
12. **Blanket Query Scraping**: Running a collection group query or list without filtering by owner `userId`.
