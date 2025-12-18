#!/bin/bash

# Test resumable streams with network interruption simulation
# Usage: ./scripts/test-network-interruption.sh

set -e

echo "🧪 Testing Resumable Streams with Network Interruption"
echo "======================================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="http://localhost:3000"
CHAT_ID="test-$(date +%s)"
STREAM_CHECK_INTERVAL=0.5

echo -e "${YELLOW}Chat ID: $CHAT_ID${NC}\n"

# Check if dev server is running
if ! curl -s "$BASE_URL" > /dev/null; then
  echo -e "${RED}❌ Dev server not running at $BASE_URL${NC}"
  echo "Start it with: pnpm dev"
  exit 1
fi

echo -e "${GREEN}✅ Dev server is running${NC}\n"

# Function to check stream in database
check_stream_db() {
  echo -e "${YELLOW}📊 Checking stream buffer in PostgreSQL...${NC}"

  PGPASSWORD=postgres psql -h localhost -U postgres -d vercel_ai -c "
    SELECT
      id,
      status,
      array_length(chunks::json::text[]::json[], 1) as chunk_count,
      created_at,
      expires_at
    FROM \"Stream\"
    WHERE \"chatId\" = '$CHAT_ID'
    ORDER BY created_at DESC;
  " 2>/dev/null || echo "Could not query database"
}

# Function to start streaming
start_stream() {
  echo -e "${GREEN}▶️  Starting stream...${NC}"

  # Start streaming in background (simulate real client)
  curl -X POST "$BASE_URL/api/chat" \
    -H "Content-Type: application/json" \
    -d "{
      \"id\": \"$CHAT_ID\",
      \"message\": {
        \"id\": \"msg-$(date +%s)\",
        \"role\": \"user\",
        \"parts\": [{\"type\": \"text\", \"text\": \"Write a detailed 500-word essay about quantum computing\"}]
      },
      \"selectedChatModel\": \"claude-sonnet-4\",
      \"selectedVisibilityType\": \"private\"
    }" \
    --no-buffer \
    -s \
    > /tmp/stream-output-1.txt 2>&1 &

  STREAM_PID=$!
  echo -e "Stream PID: $STREAM_PID\n"

  # Let it stream for a bit
  sleep 3

  # Check if chunks are being buffered
  check_stream_db
}

# Function to interrupt stream
interrupt_stream() {
  echo -e "\n${RED}🔌 Interrupting stream (simulating network failure)...${NC}"

  # Kill the curl process
  kill $STREAM_PID 2>/dev/null || echo "Process already dead"

  echo -e "${RED}❌ Connection interrupted!${NC}\n"

  # Wait a bit while server continues
  echo -e "${YELLOW}⏳ Waiting while server continues buffering...${NC}"
  sleep 3

  # Check buffer again
  check_stream_db
}

# Function to resume stream
resume_stream() {
  echo -e "\n${GREEN}🔄 Resuming stream...${NC}"

  curl "$BASE_URL/api/chat/$CHAT_ID/stream" \
    --no-buffer \
    -s \
    > /tmp/stream-output-2.txt &

  RESUME_PID=$!
  echo -e "Resume PID: $RESUME_PID\n"

  # Let it finish
  sleep 5

  # Stop the resume stream
  kill $RESUME_PID 2>/dev/null || echo "Stream completed"
}

# Function to verify results
verify_results() {
  echo -e "\n${YELLOW}🔍 Verifying results...${NC}\n"

  # Check file sizes
  SIZE_1=$(wc -c < /tmp/stream-output-1.txt)
  SIZE_2=$(wc -c < /tmp/stream-output-2.txt)

  echo "Initial stream output: $SIZE_1 bytes"
  echo "Resumed stream output: $SIZE_2 bytes"

  # Check database final state
  check_stream_db

  if [ $SIZE_2 -gt 0 ]; then
    echo -e "\n${GREEN}✅ Resume successful! Received $SIZE_2 bytes after reconnection${NC}"

    # Show sample of resumed content
    echo -e "\n${YELLOW}Sample of resumed content:${NC}"
    head -c 200 /tmp/stream-output-2.txt
    echo -e "\n..."

    return 0
  else
    echo -e "\n${RED}❌ Resume failed! No data received${NC}"
    return 1
  fi
}

# Function to cleanup
cleanup() {
  echo -e "\n${YELLOW}🧹 Cleaning up...${NC}"
  rm -f /tmp/stream-output-*.txt

  # Optionally delete test chat
  # curl -X DELETE "$BASE_URL/api/chat?id=$CHAT_ID" -s > /dev/null

  echo -e "${GREEN}✅ Cleanup complete${NC}"
}

# Main test flow
main() {
  trap cleanup EXIT

  start_stream
  interrupt_stream
  resume_stream
  verify_results

  echo -e "\n${GREEN}═══════════════════════════════════════${NC}"
  echo -e "${GREEN}🎉 Test complete!${NC}"
  echo -e "${GREEN}═══════════════════════════════════════${NC}\n"
}

# Run the test
main
