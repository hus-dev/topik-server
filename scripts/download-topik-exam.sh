#!/usr/bin/env bash
# TOPIK II 회차 기출 듣기 파일 준비 헬퍼
#
# topik.go.kr 은 JS 기반이라 자동 다운로드가 어렵습니다.
# 브라우저에서 아래 경로에 직접 다운로드 후, 임포트를 실행하세요.
#
# 사용법:
#   ./scripts/download-topik-exam.sh 83
#
# 준비할 파일 (예: 83회):
#   1) 공식 듣기 오디오: topik_data/제83회 TOPIK2 듣기파일/2-01.mp3 ~ 2-50.mp3
#      (topik.go.kr 기출문제 → 해당 회차 듣기파일 ZIP 압축 해제)
#   2) 문제지 PDF(선택):  topik_data/제83회_문제지...pdf
#   3) 정답 키:          content/topik2-83/answers.json
#      (정답표 PDF를 보고 "listening" 50개를 기입)

set -euo pipefail

ROUND="${1:-}"
if [ -z "$ROUND" ]; then
  echo "사용법: $0 <회차번호>"
  exit 1
fi

AUDIO_DIR="topik_data/제${ROUND}회 TOPIK2 듣기파일"
CONTENT_DIR="content/topik2-${ROUND}"

mkdir -p "$AUDIO_DIR" "$CONTENT_DIR"

if [ ! -f "$CONTENT_DIR/answers.json" ]; then
  cp "content/topik2-example/answers.json" "$CONTENT_DIR/answers.json"
  echo "✅ $CONTENT_DIR/answers.json 템플릿 생성됨 (정답 50개를 채우세요)"
fi

echo ""
echo "📁 준비가 필요한 파일:"
echo "  1) $AUDIO_DIR/2-01.mp3 ~ 2-50.mp3  ← 공식 듣기 오디오"
echo "  2) $CONTENT_DIR/answers.json         ← 정답 키 (채워 넣기)"
echo "  3) topik_data/제${ROUND}회_문제지...pdf (선택)"
echo ""
echo "준비 완료 후 임포트:"
echo "  npm run import:topik-exam -- $ROUND"
