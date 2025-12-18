/**
 * Test script to verify stream buffering to PostgreSQL
 * Run with: tsx scripts/test-stream-buffer.ts
 */

import "dotenv/config";
import postgres from "postgres";

const sql = postgres(process.env.POSTGRES_URL!);

interface StreamRow {
  id: string;
  chatId: string;
  status: string;
  chunks: string[];
  createdAt: Date;
  expiresAt: Date;
  lastChunkAt: Date | null;
}

async function testStreamBuffer() {
  console.log("🧪 Testing Stream Buffer in PostgreSQL\n");
  console.log("========================================\n");

  try {
    // 1. Query all active streams
    console.log("📊 Active Streams:");
    const activeStreams = await sql<StreamRow[]>`
      SELECT
        id,
        "chatId",
        status,
        array_length(chunks::json::text[]::json[], 1) as chunk_count,
        "createdAt",
        "expiresAt",
        "lastChunkAt"
      FROM "Stream"
      WHERE status = 'active'
      ORDER BY "createdAt" DESC
      LIMIT 10
    `;

    if (activeStreams.length === 0) {
      console.log("  No active streams found.\n");
    } else {
      console.table(activeStreams);
    }

    // 2. Query completed streams
    console.log("\n✅ Completed Streams:");
    const completedStreams = await sql<StreamRow[]>`
      SELECT
        id,
        "chatId",
        status,
        array_length(chunks::json::text[]::json[], 1) as chunk_count,
        "createdAt",
        "expiresAt",
        "lastChunkAt"
      FROM "Stream"
      WHERE status = 'completed'
      ORDER BY "createdAt" DESC
      LIMIT 10
    `;

    if (completedStreams.length === 0) {
      console.log("  No completed streams found.\n");
    } else {
      console.table(completedStreams);
    }

    // 3. Query expired streams
    console.log("\n⏰ Expired Streams (ready for cleanup):");
    const expiredStreams = await sql<StreamRow[]>`
      SELECT
        id,
        "chatId",
        status,
        array_length(chunks::json::text[]::json[], 1) as chunk_count,
        "createdAt",
        "expiresAt"
      FROM "Stream"
      WHERE "expiresAt" < NOW()
      ORDER BY "createdAt" DESC
      LIMIT 10
    `;

    if (expiredStreams.length === 0) {
      console.log("  No expired streams found.\n");
    } else {
      console.table(expiredStreams);
    }

    // 4. Show statistics
    console.log("\n📈 Statistics:");
    const stats = await sql`
      SELECT
        status,
        COUNT(*) as count,
        SUM(array_length(chunks::json::text[]::json[], 1)) as total_chunks,
        AVG(array_length(chunks::json::text[]::json[], 1)) as avg_chunks
      FROM "Stream"
      GROUP BY status
    `;
    console.table(stats);

    // 5. Sample chunk data from most recent stream
    console.log("\n🔍 Sample Chunk Data (most recent stream):");
    const recentStream = await sql<StreamRow[]>`
      SELECT
        id,
        "chatId",
        status,
        chunks,
        "createdAt"
      FROM "Stream"
      ORDER BY "createdAt" DESC
      LIMIT 1
    `;

    if (recentStream.length > 0) {
      const stream = recentStream[0];
      console.log(`  Stream ID: ${stream.id}`);
      console.log(`  Chat ID: ${stream.chatId}`);
      console.log(`  Status: ${stream.status}`);
      console.log(`  Chunks: ${stream.chunks.length}`);

      if (stream.chunks.length > 0) {
        console.log(`\n  First chunk preview:`);
        console.log(`  ${stream.chunks[0].substring(0, 100)}...`);

        if (stream.chunks.length > 1) {
          console.log(`\n  Last chunk preview:`);
          console.log(
            `  ${stream.chunks[stream.chunks.length - 1].substring(0, 100)}...`
          );
        }
      }
    } else {
      console.log("  No streams found in database.\n");
    }

    // 6. Test cleanup functionality
    console.log("\n\n🧹 Testing Cleanup Functionality:");
    const cleanupResult = await sql`
      DELETE FROM "Stream"
      WHERE "expiresAt" < NOW()
      RETURNING id
    `;
    console.log(`  Cleaned up ${cleanupResult.length} expired streams\n`);

    console.log("\n========================================");
    console.log("✅ Test Complete!\n");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await sql.end();
  }
}

// Run the test
testStreamBuffer();
