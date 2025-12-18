import "server-only";

import {
  appendStreamChunk,
  completeStream,
  getStreamState,
} from "./db/queries";

/**
 * PostgreSQL-based stream context for resumable streams.
 * Replaces Redis-based resumable-stream library with PostgreSQL buffering.
 */
export class PostgresStreamContext {
  /**
   * Create a resumable stream that buffers chunks in PostgreSQL.
   * @param streamId - Unique identifier for the stream
   * @param streamFactory - Function that creates the stream (SSE format)
   * @returns ReadableStream that can be resumed
   */
  async resumableStream(
    streamId: string,
    streamFactory: () => ReadableStream<string>
  ): Promise<ReadableStream<string>> {
    const streamState = await getStreamState({ streamId });

    // If stream doesn't exist or is completed, create a new one
    if (!streamState || streamState.status === "completed") {
      return this.createNewStream(streamId, streamFactory);
    }

    // Stream exists and is active - return buffered stream
    return this.createBufferedStream(streamId, streamState.chunks);
  }

  /**
   * Create a new stream and buffer chunks to PostgreSQL as they arrive.
   */
  private createNewStream(
    streamId: string,
    streamFactory: () => ReadableStream<string>
  ): ReadableStream<string> {
    const sourceStream = streamFactory();
    const reader = sourceStream.getReader();

    return new ReadableStream<string>({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              await completeStream({ streamId });
              controller.close();
              break;
            }

            // Buffer chunk to PostgreSQL (SSE format string)
            await appendStreamChunk({ streamId, chunk: value });

            // Forward chunk to client
            controller.enqueue(value);
          }
        } catch (error) {
          await completeStream({ streamId });
          controller.error(error);
        }
      },
      cancel() {
        reader.cancel();
      },
    });
  }

  /**
   * Create a stream from buffered chunks in PostgreSQL.
   */
  private createBufferedStream(
    streamId: string,
    bufferedChunks: string[]
  ): ReadableStream<string> {
    let chunkIndex = 0;
    const self = this;

    return new ReadableStream<string>({
      async start(controller) {
        try {
          // First, send all buffered chunks
          for (const chunk of bufferedChunks) {
            controller.enqueue(chunk);
            chunkIndex++;
          }

          // Then poll for new chunks until stream is complete
          await self.pollForNewChunks(streamId, chunkIndex, controller);
        } catch (error) {
          controller.error(error);
        }
      },
    });
  }

  /**
   * Poll PostgreSQL for new chunks until stream is complete.
   */
  private async pollForNewChunks(
    streamId: string,
    startIndex: number,
    controller: ReadableStreamDefaultController<string>
  ): Promise<void> {
    let currentIndex = startIndex;
    const pollInterval = 200; // Poll every 200ms
    const maxPollTime = 60000; // Stop polling after 60 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < maxPollTime) {
      const streamState = await getStreamState({ streamId });

      if (!streamState) {
        // Stream was deleted or expired
        controller.close();
        return;
      }

      // Send any new chunks
      const chunks = streamState.chunks || [];
      while (currentIndex < chunks.length) {
        controller.enqueue(chunks[currentIndex]);
        currentIndex++;
      }

      // Check if stream is complete
      if (streamState.status === "completed") {
        controller.close();
        return;
      }

      // Wait before polling again
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    // Timeout reached - close the stream
    controller.close();
  }
}

/**
 * Create a PostgreSQL-based stream context.
 * This replaces the Redis-based createResumableStreamContext.
 */
export function createPostgresStreamContext(): PostgresStreamContext {
  return new PostgresStreamContext();
}
