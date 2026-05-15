function parseAudioSegments(audioText) {
  const speakerRegex = /(?:\[| \(|)?(여자|남자)(?:\]| \)|)?\s*[:：]?\s*/g;
  const matches = [...audioText.matchAll(speakerRegex)];
  
  if (matches.length === 0) {
    return [{ speaker: 'narrator', text: audioText.trim() }];
  }

  return matches.map((match, index) => {
    const nextMatch = matches[index + 1];
    const textStart = (match.index ?? 0) + match[0].length;
    const textEnd = nextMatch?.index ?? audioText.length;
    
    return {
      speaker: match[1],
      text: audioText.slice(textStart, textEnd).trim(),
    };
  }).filter((segment) => segment.text.length > 0);
}

const test1 = "여자: 회의실이 어디에 있어요? 남자: 이 복도 끝에서 오른쪽으로 가시면 됩니다.";
console.log(JSON.stringify(parseAudioSegments(test1), null, 2));
