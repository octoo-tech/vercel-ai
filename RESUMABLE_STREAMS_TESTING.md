# Testing Resumable Streams

This guide covers multiple methods to test the PostgreSQL-based resumable stream functionality.

## Prerequisites

```bash
# Ensure dev server is running
pnpm dev

# Ensure PostgreSQL is running
docker ps | grep vercel-ai-postgres
```

---

## Method 1: Browser DevTools (Quickest)

### Steps:
1. Open http://localhost:3000 in Chrome/Edge
2. Open DevTools (F12) → **Network** tab
3. Start a chat: "Write a detailed 500-word essay about space"
4. While streaming, check **Offline** or select **Slow 3G**
5. Wait 3-5 seconds (stream stops)
6. Uncheck **Offline** to reconnect
7. Stream should resume automatically

### What to observe:
- ✅ Chat continues from where it stopped
- ✅ No duplicate content
- ✅ Smooth transition after reconnection

### DevTools Screenshot:
```
Network Tab → Throttling Dropdown → Offline
                                   ↓
              Stream interrupts → Reconnect
                                   ↓
              Stream resumes from last chunk
```

---

## Method 2: JavaScript Console Interruption

### Steps:
1. Start a chat with a long response
2. Open Console (F12)
3. While streaming, run:
   ```javascript
   window.stop(); // Stops all network requests
   ```
4. Reload the page or navigate back to the chat
5. Verify the response is complete with all buffered chunks

---

## Method 3: Automated Playwright Tests

### Run all resumable stream tests:
```bash
# Install Playwright browsers (first time only)
pnpm exec playwright install

# Run tests in headed mode (see browser)
pnpm exec playwright test resumable-stream.spec.ts --headed

# Run with debugging
pnpm exec playwright test resumable-stream.spec.ts --debug

# Run specific test
pnpm exec playwright test -g "should resume stream after network interruption"
```

### Test coverage:
- ✅ Single interruption and resume
- ✅ Multiple interruptions
- ✅ Buffering during offline period
- ✅ Stream cleanup endpoint

### View test results:
```bash
pnpm exec playwright show-report
```

---

## Method 4: Shell Script Test (Linux/Mac)

### Run automated interruption test:
```bash
./scripts/test-network-interruption.sh
```

### What it does:
1. ▶️  Starts a chat stream
2. 📊 Checks PostgreSQL for buffered chunks
3. 🔌 Interrupts the connection (kills curl)
4. ⏳ Waits while server continues buffering
5. 🔄 Resumes the stream
6. ✅ Verifies data was received after resume

### Sample output:
```
🧪 Testing Resumable Streams with Network Interruption
=======================================================
Chat ID: test-1234567890

✅ Dev server is running

▶️  Starting stream...
Stream PID: 12345

📊 Checking stream buffer in PostgreSQL...
 id    | status | chunk_count | created_at | expires_at
-------+--------+-------------+------------+------------
 uuid1 | active |          15 | 2024-...   | 2024-...

🔌 Interrupting stream (simulating network failure)...
❌ Connection interrupted!

⏳ Waiting while server continues buffering...

🔄 Resuming stream...
Resume PID: 12346

🔍 Verifying results...
Initial stream output: 2453 bytes
Resumed stream output: 8921 bytes

✅ Resume successful! Received 8921 bytes after reconnection
```

---

## Method 5: Direct PostgreSQL Inspection

### Monitor stream buffer in real-time:
```bash
tsx scripts/test-stream-buffer.ts
```

### Sample output:
```
🧪 Testing Stream Buffer in PostgreSQL
========================================

📊 Active Streams:
┌─────────┬──────────────────┬──────────┬─────────────┬──────────────┐
│ (index) │        id        │  status  │ chunk_count │  createdAt   │
├─────────┼──────────────────┼──────────┼─────────────┼──────────────┤
│    0    │ 'uuid-abc-123'   │ 'active' │      23     │ 2024-...     │
└─────────┴──────────────────┴──────────┴─────────────┴──────────────┘

✅ Completed Streams:
┌─────────┬──────────────────┬────────────┬─────────────┬──────────────┐
│ (index) │        id        │   status   │ chunk_count │  createdAt   │
├─────────┼──────────────────┼────────────┼─────────────┼──────────────┤
│    0    │ 'uuid-def-456'   │ 'completed'│      47     │ 2024-...     │
└─────────┴──────────────────┴────────────┴─────────────┴──────────────┘

📈 Statistics:
┌─────────┬────────────┬───────┬──────────────┬────────────┐
│ (index) │   status   │ count │ total_chunks │ avg_chunks │
├─────────┼────────────┼───────┼──────────────┼────────────┤
│    0    │  'active'  │   3   │      68      │    22.7    │
│    1    │'completed' │  12   │     456      │    38.0    │
└─────────┴────────────┴───────┴──────────────┴────────────┘
```

### Query streams manually:
```bash
# Connect to PostgreSQL
PGPASSWORD=postgres psql -h localhost -U postgres -d vercel_ai

# Query streams
SELECT
  id,
  status,
  array_length(chunks::json::text[]::json[], 1) as chunk_count,
  "createdAt",
  "expiresAt"
FROM "Stream"
ORDER BY "createdAt" DESC
LIMIT 10;
```

---

## Method 6: cURL Manual Testing

### Terminal 1: Start stream and capture PID
```bash
CHAT_ID="test-$(date +%s)"
echo "Chat ID: $CHAT_ID"

curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d "{
    \"id\": \"$CHAT_ID\",
    \"message\": {
      \"id\": \"msg-1\",
      \"role\": \"user\",
      \"parts\": [{\"type\": \"text\", \"text\": \"Explain quantum entanglement\"}]
    },
    \"selectedChatModel\": \"claude-sonnet-4\",
    \"selectedVisibilityType\": \"private\"
  }" \
  --no-buffer &

STREAM_PID=$!
echo "Stream PID: $STREAM_PID"
```

### Terminal 2: Monitor database
```bash
watch -n 1 "PGPASSWORD=postgres psql -h localhost -U postgres -d vercel_ai -c \"SELECT id, status, array_length(chunks::json::text[]::json[], 1) as chunks FROM \\\"Stream\\\" ORDER BY \\\"createdAt\\\" DESC LIMIT 5;\""
```

### Terminal 1: Interrupt stream
```bash
# Wait 2-3 seconds, then:
kill $STREAM_PID
echo "Stream interrupted!"
```

### Terminal 3: Resume stream
```bash
curl http://localhost:3000/api/chat/$CHAT_ID/stream \
  --no-buffer
```

---

## Method 7: Production Testing (Vercel)

### Steps:
1. Deploy to Vercel: `vercel deploy`
2. Open deployed URL in mobile browser
3. Start a chat
4. Put phone in airplane mode mid-stream
5. Wait 5-10 seconds
6. Disable airplane mode
7. Verify stream resumes

### Mobile network simulation:
- Airplane mode = total disconnection
- Switch between WiFi/Cellular = IP change
- Poor signal areas = intermittent drops

---

## Expected Behaviors

### ✅ Successful Resume:
- Client receives all buffered chunks immediately
- New chunks continue streaming
- No duplicate content
- No missing content
- Smooth user experience

### ⚠️ Edge Cases to Test:
1. **Stream expires (>24h old)** → Should return empty or last message
2. **Multiple clients resume same stream** → Each gets full buffer
3. **Resume before stream starts** → Should wait for chunks
4. **Resume after stream completes** → Should get all chunks immediately

---

## Debugging Tips

### Check stream exists in DB:
```sql
SELECT * FROM "Stream" WHERE "chatId" = 'your-chat-id';
```

### Check chunk count:
```sql
SELECT
  id,
  array_length(chunks::json::text[]::json[], 1) as chunk_count
FROM "Stream"
WHERE id = 'your-stream-id';
```

### View raw chunks:
```sql
SELECT chunks FROM "Stream" WHERE id = 'your-stream-id';
```

### Monitor logs:
```bash
# Watch Next.js logs for stream activity
tail -f .next/trace
```

---

## Performance Testing

### Measure polling latency:
```bash
# Time resume latency
time curl -s http://localhost:3000/api/chat/YOUR_CHAT_ID/stream > /dev/null
```

### Load test with multiple interruptions:
```bash
for i in {1..10}; do
  echo "Test $i"
  ./scripts/test-network-interruption.sh
  sleep 5
done
```

### Check database performance:
```sql
-- Query execution time
EXPLAIN ANALYZE
SELECT chunks FROM "Stream" WHERE id = 'stream-id';

-- Index usage
SELECT indexname, idx_scan
FROM pg_stat_user_indexes
WHERE tablename = 'Stream';
```

---

## Troubleshooting

### Stream not resuming?
1. Check `Stream` table exists: `\dt Stream` in psql
2. Verify migration ran: `SELECT * FROM drizzle.__drizzle_migrations;`
3. Check stream status: `SELECT status FROM "Stream" WHERE id = 'stream-id';`
4. Verify chunks are being written: `SELECT array_length(chunks, 1) FROM "Stream";`

### Chunks not buffering?
1. Check `appendStreamChunk` is being called (add console.log)
2. Verify PostgreSQL connection string in `.env`
3. Check for errors in Next.js console
4. Verify stream context is initialized: console.log in route

### Resume returns empty?
1. Check stream hasn't expired: `SELECT "expiresAt" FROM "Stream";`
2. Verify stream ID matches: compare client vs database
3. Check `getStreamState` returns data
4. Verify polling logic in `PostgresStreamContext`

---

## Success Metrics

Track these metrics to validate the implementation:

- **Resume Success Rate**: % of resumes that successfully deliver chunks
- **Average Resume Latency**: Time from reconnect to first chunk
- **Buffer Size**: Average number of chunks buffered per stream
- **Cleanup Efficiency**: % of expired streams removed hourly
- **Database Load**: Query time for `getStreamState` and `appendStreamChunk`

---

## Next Steps

After successful testing:
1. ✅ Test in staging environment
2. ✅ Monitor production metrics
3. ✅ Set up alerts for failed resumes
4. ✅ Document user-facing behavior
5. ✅ Train support team on expected behavior
