from pathlib import Path
p=Path('lib/social/http.ts');s=p.read_text();s=s.replace('''  if (length > MAX_BYTES) throw new ProviderError("invalid", res.status);
  const text = await res.text();
  if (text.length > MAX_BYTES) throw new ProviderError("invalid", res.status);''','''  if (length > MAX_BYTES) {
    await res.body?.cancel().catch(() => undefined);
    throw new ProviderError("invalid", res.status);
  }
  // Enforce bytes while streaming, even for chunked responses without a length.
  // Checking string.length after res.text() neither limits memory nor UTF-8 bytes.
  const reader = res.body?.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  if (reader) {
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > MAX_BYTES) throw new ProviderError("invalid", res.status);
        chunks.push(value);
      }
    } catch (error) {
      await reader.cancel().catch(() => undefined);
      if (error instanceof ProviderError) throw error;
      throw new ProviderError("unavailable", res.status);
    } finally { reader.releaseLock(); }
  }
  const text = Buffer.concat(chunks).toString("utf8");''');p.write_text(s)
p=Path('lib/data/social.ts');s=p.read_text().replace('eq(socialOauthAttempts.stateHash, sha256(state)), isNull(socialOauthAttempts.consumedAt)', 'eq(socialOauthAttempts.stateHash, sha256(state)), eq(socialOauthAttempts.provider, provider), eq(socialOauthAttempts.sessionHash, sessionId), eq(socialOauthAttempts.userId, userId), isNull(socialOauthAttempts.consumedAt)');p.write_text(s)
p=Path('tests/unit/social-connections.test.ts');s=p.read_text().replace('    // The failed try above consumed it: a replay with the right session fails too.\n    expect(await consumeAttempt("youtube", state, "session-a", agencyA.ownerId)).toEqual({ error: "mismatch" });','    // An unrelated session must not burn the genuine visitor\'s consent attempt.\n    expect(await consumeAttempt("youtube", state, "session-a", agencyA.ownerId)).not.toHaveProperty("error");\n    expect(await consumeAttempt("youtube", state, "session-a", agencyA.ownerId)).toEqual({ error: "mismatch" });').replace('expect((await db.select().from(socialImportItems).where(eq(socialImportItems.agencyId, agencyA.id))).length).toBe(2);','// Private/unembeddable metadata stays out of the selectable records.\n    expect((await db.select().from(socialImportItems).where(eq(socialImportItems.agencyId, agencyA.id))).length).toBe(1);').replace('    expect(grant.version).toBeGreaterThan(0);','    expect(grant.version).toBeGreaterThan(0);\n    expect(refreshes).toBe(1);');p.write_text(s)
