import { auth } from "@/app/(auth)/auth";
import { cleanupExpiredStreams } from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";

/**
 * Cleanup expired streams from the database.
 * This endpoint should be called periodically (e.g., via cron job).
 *
 * For Vercel, you can set up a cron job in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cleanup-streams",
 *     "schedule": "0 * * * *"
 *   }]
 * }
 */
export async function GET(request: Request) {
  try {
    // Optional: Add authentication check if you want to restrict access
    // const session = await auth();
    // if (!session?.user) {
    //   return new ChatSDKError("unauthorized:chat").toResponse();
    // }

    // Optional: Verify cron secret for Vercel Cron Jobs
    const authHeader = request.headers.get("authorization");
    if (process.env.CRON_SECRET) {
      if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response("Unauthorized", { status: 401 });
      }
    }

    const result = await cleanupExpiredStreams();

    return Response.json(
      {
        success: true,
        message: "Expired streams cleaned up successfully",
        deleted: result.count || 0,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to cleanup expired streams:", error);
    return Response.json(
      {
        success: false,
        error: "Failed to cleanup expired streams",
      },
      { status: 500 }
    );
  }
}
