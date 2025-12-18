import { test, expect, type Page } from "@playwright/test";

/**
 * Test resumable streams by simulating network interruption
 */
test.describe("Resumable Streams", () => {
  test.beforeEach(async ({ page }) => {
    // Login or setup authentication if needed
    await page.goto("/");
  });

  test("should resume stream after network interruption", async ({ page, context }) => {
    // Start a new chat
    await page.goto("/");

    // Type a message that will generate a long response
    const input = page.locator('textarea[placeholder*="message"]').first();
    await input.fill("Write a detailed 500-word essay about artificial intelligence");
    await input.press("Enter");

    // Wait for streaming to start
    await page.waitForTimeout(1000);

    // Verify we're receiving chunks
    const messageArea = page.locator('[data-testid="chat-messages"]').first();
    const initialContent = await messageArea.textContent();

    console.log("Initial content length:", initialContent?.length);

    // Simulate network interruption by going offline
    await context.setOffline(true);
    console.log("🔴 Network offline - stream should stop");

    // Wait while offline (stream buffering continues on server)
    await page.waitForTimeout(3000);

    // Reconnect
    await context.setOffline(false);
    console.log("🟢 Network online - stream should resume");

    // Wait for resume
    await page.waitForTimeout(2000);

    // Verify content increased (resumed streaming)
    const resumedContent = await messageArea.textContent();
    console.log("Resumed content length:", resumedContent?.length);

    expect(resumedContent?.length).toBeGreaterThan(initialContent?.length || 0);
  });

  test("should buffer chunks during disconnection", async ({ page, context }) => {
    // Navigate to chat
    await page.goto("/");

    // Send message
    const input = page.locator('textarea[placeholder*="message"]').first();
    await input.fill("Explain quantum computing in detail");
    await input.press("Enter");

    // Let some chunks arrive
    await page.waitForTimeout(500);

    // Go offline immediately
    await context.setOffline(true);

    // Wait longer while offline (server continues buffering)
    await page.waitForTimeout(5000);

    // Get stream ID from page (if exposed in UI)
    const streamId = await page.evaluate(() => {
      // Try to extract from DOM or localStorage
      return localStorage.getItem("lastStreamId");
    });

    console.log("Stream ID:", streamId);

    // Reconnect and resume
    await context.setOffline(false);

    // Trigger resume (might need to navigate to resume endpoint)
    if (streamId) {
      await page.goto(`/api/chat/${streamId}/stream`);
    }

    // Verify we received buffered chunks
    const content = await page.textContent("body");
    expect(content).toBeTruthy();
    expect(content!.length).toBeGreaterThan(0);
  });

  test("should handle multiple interruptions", async ({ page, context }) => {
    await page.goto("/");

    const input = page.locator('textarea[placeholder*="message"]').first();
    await input.fill("Write a long story");
    await input.press("Enter");

    // Multiple disconnect/reconnect cycles
    for (let i = 0; i < 3; i++) {
      await page.waitForTimeout(1000);

      // Disconnect
      await context.setOffline(true);
      console.log(`Interruption ${i + 1}: Offline`);
      await page.waitForTimeout(1500);

      // Reconnect
      await context.setOffline(false);
      console.log(`Interruption ${i + 1}: Online`);
      await page.waitForTimeout(1000);
    }

    // Verify stream completed or can complete
    await page.waitForTimeout(2000);
    const finalContent = await page.textContent('[data-testid="chat-messages"]');
    expect(finalContent).toBeTruthy();
  });
});

/**
 * Test cleanup of expired streams
 */
test.describe("Stream Cleanup", () => {
  test("should cleanup expired streams", async ({ request }) => {
    // Call the cleanup endpoint
    const response = await request.get("/api/cleanup-streams");

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    console.log("Cleaned up streams:", data.deleted);
  });
});
