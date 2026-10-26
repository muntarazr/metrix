#!/usr/bin/env bash
# ==============================================================================
# METRIX - Day 1: تجربة وفحص حزمة الـ HTTP في التيرمينال (للطالب: منتظر)
# ==============================================================================

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
PURPLE='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${BOLD}${CYAN}================================================================${NC}"
echo -e "${BOLD}${CYAN}   METRIX — تجربة ورؤية حزمة الـ HTTP الحقيقية (اليوم 1)       ${NC}"
echo -e "${BOLD}${CYAN}   المستوى: مبتدئ من الصفر المطلق | الطالب: منتظر                ${NC}"
echo -e "${BOLD}${CYAN}================================================================${NC}"
echo ""
echo -e "${YELLOW}📡 جاري إرسال الطلب النصي إلى السيرفر (Verbose Mode -v) ...${NC}"
echo ""

TMP_TRACE=$(mktemp)

curl -v -s -X POST "https://httpbin.org/post" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test_token_123" \
  -d '{"student": "Muntazar", "day": 1}' \
  2> "$TMP_TRACE" > /tmp/metrix_response.json

echo -e "${BOLD}1. كيف تقرأ ما حدث على الشاشة سطراً بسطر؟${NC}"
echo -e "${YELLOW}----------------------------------------------------------------${NC}"

while IFS= read -r line; do
  if [[ "$line" =~ ^\>\ (.*) ]]; then
    # Outgoing request
    echo -e "${CYAN}${BOLD}[أرسله جهازك >]${NC} ${CYAN}${BASH_REMATCH[1]}${NC}"
  elif [[ "$line" =~ ^\<\ (.*) ]]; then
    # Incoming response
    echo -e "${GREEN}${BOLD}[رد السيرفر <]${NC} ${GREEN}${BASH_REMATCH[1]}${NC}"
  elif [[ "$line" =~ ^\*\ (.*) ]]; then
    # Connection / TLS handshake
    echo -e "${PURPLE}[سلك الاتصال *]${NC} ${BASH_REMATCH[1]}"
  fi
done < "$TMP_TRACE"

echo ""
echo -e "${YELLOW}----------------------------------------------------------------${NC}"
echo -e "${BOLD}2. البيانات التي فهمها السيرفر ورجعها لك للتأكيد (Response Body):${NC}"
echo -e "${GREEN}"
cat /tmp/metrix_response.json
echo -e "${NC}"

echo -e "${BOLD}${CYAN}================================================================${NC}"
echo -e "${GREEN}✔ عاشت إيدك يا منتظر! شفت بعينك كيف انتقل النص ورجع من السيرفر.${NC}"
echo -e "الآن أنت جاهز 100% لليوم 2 وربط الـ Webhooks في n8n!"
echo -e "${BOLD}${CYAN}================================================================${NC}"

rm -f "$TMP_TRACE" /tmp/metrix_response.json
