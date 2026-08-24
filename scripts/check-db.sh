#!/usr/bin/env bash
# Verifies the live Supabase schema against what the app needs.
# Usage: ./scripts/check-db.sh      (reads .env.local)
set -uo pipefail
cd "$(dirname "$0")/.."

URL=$(grep '^NEXT_PUBLIC_SUPABASE_URL=' .env.local | cut -d= -f2-)
KEY=$(grep '^NEXT_PUBLIC_SUPABASE_ANON_KEY=' .env.local | cut -d= -f2-)
fail=0

echo "== tables =="
for t in goals sub_layers task_checkins daily_logs daily_focus_answers \
         goal_reminders challenge_rooms challenge_participants; do
  body=$(curl -s -m 10 -H "apikey: $KEY" -H "Authorization: Bearer $KEY" \
         "$URL/rest/v1/$t?select=*&limit=1")
  case "$body" in
    '['*)          printf "  ok      %s\n" "$t" ;;
    *42P17*)       printf "  FAIL    %s — RLS recursion, run supabase/setup.sql\n" "$t"; fail=1 ;;
    *PGRST205*)    printf "  FAIL    %s — table missing — run supabase/setup.sql\n" "$t"; fail=1 ;;
    *)             printf "  FAIL    %s — %s\n" "$t" "$(echo "$body" | head -c 90)"; fail=1 ;;
  esac
done

echo "== rpc functions =="
# Each must be probed with its REAL argument names: PostgREST answers PGRST202
# for a wrong signature too, so a no-arg call reports a live function as missing.
NIL='"00000000-0000-0000-0000-000000000000"'
probe_rpc() {
  local fn="$1" args="$2"
  local body
  body=$(curl -s -m 10 -X POST -H "apikey: $KEY" -H "Authorization: Bearer $KEY" \
         -H "Content-Type: application/json" -d "$args" "$URL/rest/v1/rpc/$fn")
  case "$body" in
    *PGRST202*) printf "  FAIL    %s — missing — run supabase/setup.sql\n" "$fn"; fail=1 ;;
    *)          printf "  ok      %s\n" "$fn" ;;
  esac
}
probe_rpc increment_goal_points  "{\"goal_uuid\":$NIL,\"points_to_add\":0}"
probe_rpc record_goal_milestone  "{\"p_goal_id\":$NIL,\"p_user_input\":\"\",\"p_ai_score\":0,\"p_ai_feedback\":\"\",\"p_breakdown\":{}}"
probe_rpc delete_goal_milestone  "{\"p_goal_id\":$NIL,\"p_log_id\":$NIL}"
probe_rpc create_goal_challenge  "{\"p_goal_id\":$NIL,\"p_display_name\":\"\",\"p_avatar_url\":null}"
probe_rpc join_goal_challenge    "{\"p_invite_code\":\"\",\"p_goal_id\":$NIL,\"p_display_name\":\"\",\"p_avatar_url\":null}"
probe_rpc end_goal_challenge     "{\"p_challenge_id\":$NIL}"

echo "== rpc contracts =="
# record_goal_milestone must answer with an OBJECT ({"log_id":...}); if it is
# declared RETURNS TABLE, PostgREST sends [ {...} ] and the route silently
# loses the id. An unauthenticated call raises before returning, so we assert
# on the error code instead: the corrected function reaches its ownership
# check and raises goal_not_found_or_access_denied.
body=$(curl -s -m 10 -X POST -H "apikey: $KEY" -H "Authorization: Bearer $KEY" \
       -H "Content-Type: application/json" \
       -d "{\"p_goal_id\":$NIL,\"p_user_input\":\"\",\"p_ai_score\":0,\"p_ai_feedback\":\"\",\"p_breakdown\":{}}" \
       "$URL/rest/v1/rpc/record_goal_milestone")
case "$body" in
  *goal_not_found_or_access_denied*) printf "  ok      record_goal_milestone error codes\n" ;;
  *goal_not_owned*) printf "  FAIL    record_goal_milestone — stale 0003, run supabase/setup.sql\n"; fail=1 ;;
  *)               printf "  ?       record_goal_milestone — %s\n" "$(echo "$body" | head -c 70)" ;;
esac

body=$(curl -s -m 10 -X POST -H "apikey: $KEY" -H "Authorization: Bearer $KEY" \
       -H "Content-Type: application/json" -d "{\"p_goal_id\":$NIL,\"p_log_id\":$NIL}" \
       "$URL/rest/v1/rpc/delete_goal_milestone")
case "$body" in
  *goal_not_found_or_access_denied*) printf "  ok      delete_goal_milestone error codes\n" ;;
  *goal_not_owned*) printf "  FAIL    delete_goal_milestone — stale 0003, run supabase/setup.sql\n"; fail=1 ;;
  *)               printf "  ?       delete_goal_milestone — %s\n" "$(echo "$body" | head -c 70)" ;;
esac

echo "== rls helpers (0005) =="
body=$(curl -s -m 10 -X POST -H "apikey: $KEY" -H "Authorization: Bearer $KEY" \
       -H "Content-Type: application/json" -d '{}' "$URL/rest/v1/rpc/my_challenge_ids")
case "$body" in
  *PGRST202*) printf "  FAIL    my_challenge_ids — run supabase/setup.sql\n"; fail=1 ;;
  *)          printf "  ok      my_challenge_ids\n" ;;
esac

echo "== 0006 adaptive columns =="
# Selecting a missing column returns 42703; an empty array means it is there.
probe_column() {
  local table="$1" column="$2"
  local body
  body=$(curl -s -m 10 -H "apikey: $KEY" -H "Authorization: Bearer $KEY" \
         "$URL/rest/v1/$table?select=$column&limit=1")
  case "$body" in
    '['*)      printf "  ok      %s.%s\n" "$table" "$column" ;;
    *42703*)   printf "  FAIL    %s.%s — missing — run supabase/migrations/0006_adaptive.sql\n" "$table" "$column"; fail=1 ;;
    *)         printf "  ?       %s.%s — %s\n" "$table" "$column" "$(echo "$body" | head -c 70)" ;;
  esac
}
probe_column goals         streak_freezes
probe_column sub_layers    mini_version
probe_column task_checkins skip_reason
probe_column task_checkins completed_mode

body=$(curl -s -m 10 -H "apikey: $KEY" -H "Authorization: Bearer $KEY" \
       "$URL/rest/v1/weekly_reviews?select=*&limit=1")
case "$body" in
  '['*)       printf "  ok      weekly_reviews\n" ;;
  *PGRST205*) printf "  FAIL    weekly_reviews — table missing — run supabase/migrations/0006_adaptive.sql\n"; fail=1 ;;
  *)          printf "  FAIL    weekly_reviews — %s\n" "$(echo "$body" | head -c 90)"; fail=1 ;;
esac

echo "== storage buckets =="
for b in avatars milestones; do
  body=$(curl -s -m 10 "$URL/storage/v1/object/public/$b/__probe__")
  case "$body" in
    *NoSuchKey*)    printf "  ok      %s\n" "$b" ;;
    *NoSuchBucket*) printf "  FAIL    %s — missing — run supabase/setup.sql\n" "$b"; fail=1 ;;
    *)              printf "  ?       %s — %s\n" "$b" "$(echo "$body" | head -c 70)" ;;
  esac
done

echo
if [ "$fail" -eq 0 ]; then echo "ALL CHECKS PASSED"; else echo "PROBLEMS FOUND (see FAIL above)"; fi
exit $fail
