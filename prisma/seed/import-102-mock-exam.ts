import 'dotenv/config';
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const readingSetId = 'topik2-102-reading';
const listeningSetId = 'topik2-102-listening';
const setIds = [readingSetId, listeningSetId];

const topikDataDir = join(process.cwd(), 'topik_data');
const sourceAudioDir = join(topikDataDir, '제102회 TOPIK2 듣기파일');
const publicAudioDir = join(process.cwd(), 'test/audio/topik2-102');
const publicAudioPrefix = '/test/audio/topik2-102';

const readingPdfName = '제102회_문제지 TOPIK2_2교시_읽기_탑재용.pdf';
const listeningPdfName = '제102회_문제지_TOPIK2_1교시_듣기 통합_탑재용.pdf';
const answerPdfName = '제102회_정답 및 배점표_TOPIK2_탑재용.pdf';

const readingPdfUrl = `/topik-data/${encodeURIComponent(readingPdfName)}`;
const listeningPdfUrl = `/topik-data/${encodeURIComponent(listeningPdfName)}`;
const answerPdfUrl = `/topik-data/${encodeURIComponent(answerPdfName)}`;
const readingOcrPath = join(
  process.cwd(),
  'content/topik2-102/reading-ocr.txt',
);
const listeningOcrPath = join(
  process.cwd(),
  'content/topik2-102/listening-ocr.txt',
);

const readingAnswers = [
  '1',
  '1',
  '4',
  '2',
  '1',
  '3',
  '2',
  '1',
  '2',
  '4',
  '2',
  '1',
  '1',
  '2',
  '1',
  '2',
  '1',
  '1',
  '1',
  '4',
  '2',
  '3',
  '1',
  '4',
  '2',
  '2',
  '3',
  '4',
  '3',
  '3',
  '4',
  '1',
  '3',
  '4',
  '3',
  '3',
  '4',
  '4',
  '3',
  '2',
  '4',
  '2',
  '1',
  '2',
  '1',
  '3',
  '2',
  '4',
  '4',
  '3',
];

const listeningAnswers = [
  '2',
  '1',
  '3',
  '2',
  '4',
  '3',
  '1',
  '1',
  '4',
  '2',
  '4',
  '2',
  '4',
  '1',
  '3',
  '2',
  '4',
  '4',
  '1',
  '4',
  '2',
  '1',
  '2',
  '3',
  '2',
  '2',
  '3',
  '4',
  '2',
  '3',
  '3',
  '4',
  '1',
  '1',
  '2',
  '3',
  '1',
  '4',
  '4',
  '2',
  '2',
  '3',
  '1',
  '2',
  '3',
  '3',
  '2',
  '1',
  '4',
  '4',
];

function getDatabaseUrl() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  const url = new URL(connectionString);
  if (url.hostname === 'localhost' || url.hostname === '::1') {
    url.hostname = '127.0.0.1';
  }
  if (!url.searchParams.has('allowPublicKeyRetrieval')) {
    url.searchParams.set('allowPublicKeyRetrieval', 'true');
  }

  return url.toString();
}

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(getDatabaseUrl()),
});

function assertFileExists(path: string) {
  if (!existsSync(path)) {
    throw new Error(`Required file not found: ${path}`);
  }
}

function copyListeningAudio() {
  mkdirSync(publicAudioDir, { recursive: true });

  for (let questionNumber = 1; questionNumber <= 50; questionNumber += 1) {
    const sourceName = `2-${questionNumber.toString().padStart(2, '0')}.mp3`;
    const targetName = `listening-q${questionNumber
      .toString()
      .padStart(2, '0')}.mp3`;
    const sourcePath = join(sourceAudioDir, sourceName);
    const targetPath = join(publicAudioDir, targetName);

    assertFileExists(sourcePath);
    copyFileSync(sourcePath, targetPath);
  }
}

async function cleanupExistingData() {
  const sessions = await prisma.exam_sessions.findMany({
    where: { set_id: { in: setIds } },
    select: { id: true },
  });
  const sessionIds = sessions.map((session) => session.id);

  const questions = await prisma.questions.findMany({
    where: { set_id: { in: setIds } },
    select: { id: true, passage_id: true },
  });
  const questionIds = questions.map((question) => question.id);
  const passageIds = questions
    .map((question) => question.passage_id)
    .filter((id): id is string => Boolean(id));

  if (sessionIds.length > 0) {
    await prisma.answers.deleteMany({
      where: { session_id: { in: sessionIds } },
    });
  }

  if (questionIds.length > 0) {
    await prisma.answers.deleteMany({
      where: { question_id: { in: questionIds } },
    });
    await prisma.user_questions.deleteMany({
      where: { question_id: { in: questionIds } },
    });
    await prisma.question_options.deleteMany({
      where: { question_id: { in: questionIds } },
    });
    await prisma.question_media.deleteMany({
      where: { question_id: { in: questionIds } },
    });
    await prisma.explanation_videos.deleteMany({
      where: {
        OR: [{ question_id: { in: questionIds } }, { set_id: { in: setIds } }],
      },
    });
    await prisma.questions.deleteMany({
      where: { id: { in: questionIds } },
    });
  } else {
    await prisma.explanation_videos.deleteMany({
      where: { set_id: { in: setIds } },
    });
  }

  if (sessionIds.length > 0) {
    await prisma.exam_sessions.deleteMany({
      where: { id: { in: sessionIds } },
    });
  }

  await prisma.question_sets.deleteMany({
    where: { id: { in: setIds } },
  });

  if (passageIds.length > 0) {
    await prisma.question_passages.deleteMany({
      where: { id: { in: passageIds } },
    });
  }
}

function cleanOcrLine(line: string) {
  return line
    .replace(/\s+/g, ' ')
    .replace(/^Test o[tf] .*$/i, '')
    .replace(/^Tesk o[tf] .*$/i, '')
    .replace(/^\) TOPIK .*$/i, '')
    .replace(/^O TOPIK .*$/i, '')
    .replace(/^TOPIK 제102회.*$/i, '')
    .replace(/^제102회 한국어능력시험.*$/i, '')
    .trim();
}

function loadOcrLines(path: string) {
  return readFileSync(path, 'utf8')
    .split(/\r?\n/)
    .map(cleanOcrLine)
    .filter((line) => {
      if (!line) return false;
      if (/^PAGES \d+$/.test(line)) return false;
      if (/^---PAGE \d+---$/.test(line)) return false;
      if (/^\d+$/.test(line)) return false;
      return true;
    });
}

function findQuestionStart(
  lines: string[],
  questionNumber: number,
  fromIndex = 0,
) {
  if (questionNumber === 7) {
    const readingSevenIndex = lines
      .slice(fromIndex)
      .findIndex((line) => /^l 전기 절약$/.test(line));
    if (readingSevenIndex >= 0) {
      return fromIndex + readingSevenIndex;
    }
  }

  const questionMarker = new RegExp(`^${questionNumber}\\.\\s*`);
  const relativeIndex = lines
    .slice(fromIndex)
    .findIndex((line) => questionMarker.test(line));

  return relativeIndex < 0 ? -1 : fromIndex + relativeIndex;
}

function findNextQuestionStart(
  lines: string[],
  questionNumber: number,
  fromIndex: number,
) {
  for (
    let nextQuestionNumber = questionNumber + 1;
    nextQuestionNumber <= 50;
    nextQuestionNumber += 1
  ) {
    const nextStart = findQuestionStart(lines, nextQuestionNumber, fromIndex);
    if (nextStart >= 0) return nextStart;
  }

  return -1;
}

function isQuestionStartLine(line: string) {
  return /^\d+\.\s*/.test(line) || /^l 전기 절약$/.test(line);
}

function findInstructionEnd(lines: string[], instructionStart: number) {
  let end = instructionStart + 1;

  while (end < lines.length && !isQuestionStartLine(lines[end])) {
    const line = lines[end];
    if (
      line.startsWith('(') ||
      line.startsWith(')') ||
      line.includes('각 2점')
    ) {
      end += 1;
      continue;
    }

    break;
  }

  return end;
}

function parseQuestionRange(line: string) {
  const match = line.match(/(\d+)\s*~\s*(\d+)/);
  if (!match) return null;

  let start = Number(match[1]);
  let end = Number(match[2]);

  if (start > end && start >= 10 && start % 10 <= end) {
    start %= 10;
  }
  if (end > 50) {
    end = Number(String(end).slice(0, 2));
  }

  if (start < 1 || end < start || start > 50) return null;
  return { start, end: Math.min(end, 50) };
}

function findGroupInstructionStart(
  lines: string[],
  questionNumber: number,
  section: 'reading' | 'listening',
  fromIndex: number,
  questionStart: number,
) {
  for (let index = questionStart - 1; index >= fromIndex; index -= 1) {
    const line = lines[index];
    if (!line.startsWith('※')) continue;

    const range = parseQuestionRange(line);
    if (range && range.start <= questionNumber && questionNumber <= range.end) {
      const firstQuestionStart = findQuestionStart(
        lines,
        range.start,
        index + 1,
      );
      const instructionEnd = findInstructionEnd(lines, index);

      if (
        section === 'listening' &&
        range.start === 1 &&
        range.end === 3 &&
        questionNumber > 1
      ) {
        return {
          instructionStart: index,
          firstQuestionStart: index + 1,
        };
      }

      if (!line.includes('물음에 답하십시오')) {
        return {
          instructionStart: index,
          firstQuestionStart: instructionEnd,
        };
      }

      return {
        instructionStart: index,
        firstQuestionStart:
          firstQuestionStart >= 0 ? firstQuestionStart : questionStart,
      };
    }
  }

  return null;
}

function questionChunk(
  lines: string[],
  questionNumber: number,
  section: 'reading' | 'listening',
) {
  const contentStart =
    section === 'reading'
      ? lines.findIndex((line) => line.includes('읽기 (1번 ~50번)'))
      : 0;
  const fromIndex = contentStart >= 0 ? contentStart : 0;
  let start = findQuestionStart(lines, questionNumber, fromIndex);

  if (start < 0 && section === 'listening' && questionNumber === 1) {
    start = lines.findIndex((line) => line.includes('듣기 통합 (1번 ~ 50번)'));
    if (start >= 0) start += 1;
  }

  if (start < 0) {
    return `${section === 'reading' ? '읽기' : '듣기'} ${questionNumber}번 OCR 원문을 확인하지 못했습니다. PDF 원문을 question_media에서 확인하십시오.`;
  }

  const nextStart = findNextQuestionStart(lines, questionNumber, start + 1);
  let end = nextStart > start ? nextStart : lines.length;
  const nextInstructionIndex = lines
    .slice(start + 1, end)
    .findIndex((line) => line.startsWith('※'));

  if (nextInstructionIndex >= 0) {
    end = start + 1 + nextInstructionIndex;
  }

  const group = findGroupInstructionStart(
    lines,
    questionNumber,
    section,
    fromIndex,
    start,
  );
  const chunkLines =
    group && group.instructionStart < start
      ? [
          ...lines.slice(group.instructionStart, group.firstQuestionStart),
          ...lines.slice(start, end),
        ]
      : lines.slice(start, end);

  return normalizeQuestionChunk(
    chunkLines.join('\n').trim(),
    questionNumber,
    section,
  );
}

function normalizeQuestionChunk(
  chunk: string,
  questionNumber: number,
  section: 'reading' | 'listening',
) {
  let normalized = chunk.replace(/\nl /g, '\n① ');

  if (section === 'reading' && questionNumber === 7) {
    normalized = normalized
      .replace(/^(?:l|①) 전기 절약/, '7.\n① 전기 절약')
      .replace(/\n(?:l|①) 전기 절약/, '\n7.\n① 전기 절약')
      .replace(/\n환경 보호$/, '\n④ 환경 보호');
  }

  return normalized;
}

function normalizeOptionMarkers(text: string) {
  return `\n${text}\n`
    .replace(/①/g, '\n① ')
    .replace(/②/g, '\n② ')
    .replace(/③/g, '\n③ ')
    .replace(/④/g, '\n④ ')
    .replace(/\n\s*[1lI]\s+/g, '\n① ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function textPreview(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}

function manualOptions(
  section: 'reading' | 'listening',
  questionNumber: number,
) {
  if (section === 'listening' && questionNumber >= 1 && questionNumber <= 3) {
    return new Map([
      ['1', '1'],
      ['2', '2'],
      ['3', '3'],
      ['4', '4'],
    ]);
  }

  if (section === 'reading') {
    const optionsByQuestion = new Map<number, [string, string, string, string]>(
      [
        [1, ['온 지', '올 때', '오거나', '오다가']],
        [2, ['변해 간다', '변할 뻔했다', '변한 척했다', '변하면 된다']],
        [3, ['늦는 셈이다', '늦어도 된다', '늦을 리가 없다', '늦을 수도 있다']],
        [
          4,
          [
            '예상한 탓에',
            '예상하는 동안에',
            '예상하기만 하면',
            '예상한 것과 같이',
          ],
        ],
        [5, ['구두', '우산', '자전거', '선풍기']],
        [6, ['은행', '시장', '세탁소', '가구점']],
        [7, ['전기 절약', '건강 관리', '생활 예절', '환경 보호']],
        [8, ['예매 방법', '행사 소개', '등록 문의', '교환 순서']],
      ],
    );
    const options = optionsByQuestion.get(questionNumber);

    if (options) {
      return new Map(
        options.map((content, index) => [(index + 1).toString(), content]),
      );
    }
  }

  return null;
}

function manualPassage(
  section: 'reading' | 'listening',
  questionNumber: number,
) {
  if (section === 'listening') {
    const listeningPassages = new Map<number, string>([
      [
        1,
        [
          '※ [1~3] 다음을 듣고 가장 알맞은 그림 또는 그래프를 고르십시오. (각 2점)',
          '1.',
          '남자: 이 책을 소포로 보내고 싶은데요. 소포 상자 살 수 있지요?',
          '여자: 네. 손님, 상자는 이쪽에서 고르시면 돼요.',
          '남자: 네, 한번 볼게요.',
        ].join('\n'),
      ],
      [
        2,
        [
          '※ [1~3] 다음을 듣고 가장 알맞은 그림 또는 그래프를 고르십시오. (각 2점)',
          '2.',
          '여자: 어, 낚싯대가 움직인다. 물고기 잡은 것 같아.',
          '남자: 그래? 낚싯대 잘 잡고 천천히 당겨서 올려 봐.',
          '여자: 응. 그런데 진짜 무겁다.',
        ].join('\n'),
      ],
      [
        3,
        [
          '※ [1~3] 다음을 듣고 가장 알맞은 그림 또는 그래프를 고르십시오. (각 2점)',
          '3.',
          '남자: 안전한 먹거리에 대한 소비자들의 관심이 높아지면서 최근 1년간',
          '친환경 농산물을 구매한 적이 있다는 응답이 76%로 나타났습니다.',
          '친환경 농산물 구매 이유로는 건강을 위해서가 1위를 차지했으며,',
          "'환경 보호를 위해서', 품질이 좋아서가 그 뒤를 이었습니다.",
        ].join('\n'),
      ],
    ]);

    return listeningPassages.get(questionNumber) ?? null;
  }

  const readingPassages = new Map<number, string>([
    [
      1,
      [
        '※ [1~2] (    )에 들어갈 말로 가장 알맞은 것을 고르십시오. (각 2점)',
        '1. 이 동네로 이사를 (    ) 일 년이 됐다.',
      ].join('\n'),
    ],
    [
      2,
      [
        '※ [1~2] (    )에 들어갈 말로 가장 알맞은 것을 고르십시오. (각 2점)',
        '2. 가을이 되면서 나뭇잎 색이 점점 붉게 (    ).',
      ].join('\n'),
    ],
    [
      3,
      [
        '※ [3~4] 밑줄 친 부분과 의미가 가장 비슷한 것을 고르십시오. (각 2점)',
        '3. 지금 출발하지 않으면 약속 시간에 늦을지도 모른다.',
      ].join('\n'),
    ],
    [
      4,
      [
        '※ [3~4] 밑줄 친 부분과 의미가 가장 비슷한 것을 고르십시오. (각 2점)',
        '4. 전문가들이 예상한 대로 농산물 가격이 떨어지고 있다.',
      ].join('\n'),
    ],
    [
      5,
      [
        '※ [5~8] 다음은 무엇에 대한 글인지 고르십시오. (각 2점)',
        '5.',
        '걸을 때 발이 편하게~',
        '가볍고 디자인도 예뻐요.',
      ].join('\n'),
    ],
    [
      6,
      [
        '※ [5~8] 다음은 무엇에 대한 글인지 고르십시오. (각 2점)',
        '6.',
        '더러워진 옷을 새 옷처럼!',
        '두꺼운 이불도 맡겨 주세요.',
      ].join('\n'),
    ],
    [
      7,
      [
        '※ [5~8] 다음은 무엇에 대한 글인지 고르십시오. (각 2점)',
        '7.',
        '달리기, 지금 바로 시작하세요.',
        '활기찬 내일이 기다립니다.',
      ].join('\n'),
    ],
    [
      8,
      [
        '※ [5~8] 다음은 무엇에 대한 글인지 고르십시오. (각 2점)',
        '8.',
        '1. 공연 날짜, 인원을 선택하고 다음 버튼을 누르세요.',
        '2. 원하는 좌석을 선택한 후 결제하세요.',
      ].join('\n'),
    ],
    [
      9,
      [
        '※ [9~12] 다음 글 또는 그래프의 내용과 같은 것을 고르십시오. (각 2점)',
        '9.',
        '그림책 읽어 주는 자원봉사자 모집',
        '"어린이들에게 꿈과 희망을 선물하세요."',
        '• 자격: 고등학생 또는 대학생 (※ 한국어를 잘하는 외국인 학생도 가능)',
        '• 모집 기간: 11월 10일(월)~11월 21일(금)',
        '• 신청 방법: 인주어린이도서관 홈페이지(www.injulibrary.or.kr)',
        '• 활동 기간: 2025년 12월 1일(월)~2026년 2월 28일(토)',
      ].join('\n'),
    ],
    [
      10,
      [
        '※ [9~12] 다음 글 또는 그래프의 내용과 같은 것을 고르십시오. (각 2점)',
        '10.',
        '여행사를 선택할 때 중요하게 생각하는 것',
        '이용 후기 9%',
        '회사의 규모 16%',
        '기타 2%',
        '가격 48%',
        '여행 상품의 다양성 25%',
        '〈설문 대상: 성인 남녀 1,600명〉',
      ].join('\n'),
    ],
    [
      11,
      [
        '※ [9~12] 다음 글 또는 그래프의 내용과 같은 것을 고르십시오. (각 2점)',
        '11.',
        '지난달 문을 연 우표 박물관이 시민들에게 사랑을 받고 있다. 박물관 내',
        '역사실에서는 우표의 역사를 한눈에 볼 수 있다. 또 어린이 체험실에서는',
        '향기 나는 우표의 향을 맡거나 나무 우표 등을 만져 볼 수 있다. 자신의',
        '사진이 들어간 우표도 직접 만들 수 있다. 편지를 써서 넣으면 일 년 뒤에',
        "받아 볼 수 있는 박물관의 '느린 우체통'도 인기를 끌고 있다.",
      ].join('\n'),
    ],
    [
      12,
      [
        '※ [9~12] 다음 글 또는 그래프의 내용과 같은 것을 고르십시오. (각 2점)',
        '12.',
        '휴일에 산을 오르던 경찰이 등산객을 구조했다. 지난 1일 김민수 경위는',
        '인주산 정상에서 한 여성이 쓰러져 있는 것을 발견했다. 김 경위는 바로',
        '여성의 체온이 떨어지지 않게 겉옷을 벗어서 덮어 주고 119에 신고했다.',
        '이후 김 경위는 구조대 차량이 올 수 있는 산 중턱 대피소까지 여성을 업고',
        '뛰어 내려갔다. 병원으로 이송된 여성은 치료를 받고 건강을 되찾았다.',
      ].join('\n'),
    ],
    [
      13,
      [
        '※ [13~15] 다음을 순서에 맞게 배열한 것을 고르십시오. (각 2점)',
        '13.',
        '(가) 그래서 껍질째 먹기도 편하고 딱딱하지 않아서 식감도 좋다.',
        '(나) 신비 복숭아는 2017년에 한국에 처음 소개된 여름 과일이다.',
        '(다) 다른 복숭아에 비해 이른 시기에 먹을 수 있다는 것도 장점이다.',
        '(라) 껍질이 얇은 복숭아와 속이 부드러운 복숭아의 장점을 결합해 만들었다.',
      ].join('\n'),
    ],
    [
      14,
      [
        '※ [13~15] 다음을 순서에 맞게 배열한 것을 고르십시오. (각 2점)',
        '14.',
        '(가) 아이가 감기에 걸려 밤새 큰 소리로 울었다.',
        '(나) 아주머니는 아이가 많이 아팠냐며 오히려 걱정해 주셨다.',
        '(다) 아침에 아이와 병원에 가려고 집을 나서다 옆집 아주머니를 만났다.',
        '(라) 나는 우는 아이를 달래면서도 울음소리에 이웃들이 깰까 봐 걱정했다.',
      ].join('\n'),
    ],
    [
      15,
      [
        '※ [13~15] 다음을 순서에 맞게 배열한 것을 고르십시오. (각 2점)',
        '15.',
        '(가) 최근 온라인 가구 구매가 늘면서 반품 사례가 많아지고 있다.',
        '(나) 그런데 비싼 반품 비용으로 인해 피해를 보는 소비자가 늘고 있다.',
        '(다) 따라서 소비자는 구매 전에 반품 비용과 조건을 잘 확인해야 한다.',
        '(라) 업체가 까다로운 조건을 내세워 반품을 거절하는 경우까지 발생한다.',
      ].join('\n'),
    ],
    [
      16,
      [
        '※ [16~18] (    )에 들어갈 말로 가장 알맞은 것을 고르십시오. (각 2점)',
        '16.',
        '북극여우는 계절에 따라 털 색을 바꾸는 동물이다. 북극여우의 털은 겨울',
        '에는 눈과 같은 흰색으로, 여름에는 바위나 흙과 비슷한 갈색빛으로 바뀐다.',
        '이러한 털 색깔의 변화로 북극여우는 몸을 숨길 곳이 없는 북극의 특수한 환경',
        '에서도 천적으로부터 자신을 보호하고 사냥할 때 (    ) 수 있다.',
      ].join('\n'),
    ],
    [
      17,
      [
        '※ [16~18] (    )에 들어갈 말로 가장 알맞은 것을 고르십시오. (각 2점)',
        '17.',
        '요즘 연필을 잡고 글씨를 반듯하게 쓰는 것에 어려움을 느끼는 아이가 많다.',
        '어린 나이부터 전자 기기를 장시간 사용한 탓이다. 전자 기기의 화면을 단순히',
        '누르거나 미는 동작을 반복하다 보면 손에 있는 근육을 (    ) 못한다.',
        '그래서 전문가들은 소근육이 발달하는 11세까지 손가락을 움직여서',
        '하는 놀이를 많이 하도록 하는 것이 좋다고 말한다.',
      ].join('\n'),
    ],
    [
      18,
      [
        '※ [16~18] (    )에 들어갈 말로 가장 알맞은 것을 고르십시오. (각 2점)',
        '18.',
        '고인돌은 옛날 청동기 시대의 무덤이다. 고인돌은 받침돌 두 개를 세우고',
        '그 위에 덮개돌을 얹은 형태인데 덮개돌 하나의 무게가 수십 톤에 달하는 것도',
        '있다. 이와 같이 거대한 돌을 운반하고 세우려면 그만큼 많은 사람들의 힘이',
        '필요했다. 그래서 고인돌은 사람들을 불러 모아 무덤 만드는 일을 시킬 수',
        '있을 정도로 (    ) 사람의 무덤이었을 것으로 보인다.',
      ].join('\n'),
    ],
    [
      19,
      [
        '※ [19~20] 다음을 읽고 물음에 답하십시오. (각 2점)',
        '도시의 도로는 대부분 물이 스며들지 않는 아스팔트로 뒤덮여 있다.',
        '그래서 비가 오면 빗물이 지하로 잘 흘러 들어가지 못해 지하수가 부족해',
        '지고 도로가 물에 잠기는 일도 자주 발생한다. 그런데 최근 물이 잘 스며',
        '드는 도로 포장재가 개발되었다. 이 포장재에는 미세한 구멍이 많다. 그래서',
        '빗물이 쉽게 통과해 지하수 자원이 보충된다. (    ) 하수구로 몰리는',
        '빗물의 양이 줄어 도로 침수의 위험도 줄어들게 된다.',
        '19. (    )에 들어갈 말로 가장 알맞은 것을 고르십시오.',
      ].join('\n'),
    ],
    [
      20,
      [
        '※ [19~20] 다음을 읽고 물음에 답하십시오. (각 2점)',
        '도시의 도로는 대부분 물이 스며들지 않는 아스팔트로 뒤덮여 있다.',
        '그래서 비가 오면 빗물이 지하로 잘 흘러 들어가지 못해 지하수가 부족해',
        '지고 도로가 물에 잠기는 일도 자주 발생한다. 그런데 최근 물이 잘 스며',
        '드는 도로 포장재가 개발되었다. 이 포장재에는 미세한 구멍이 많다. 그래서',
        '빗물이 쉽게 통과해 지하수 자원이 보충된다. (    ) 하수구로 몰리는',
        '빗물의 양이 줄어 도로 침수의 위험도 줄어들게 된다.',
        '20. 윗글의 주제로 가장 알맞은 것을 고르십시오.',
      ].join('\n'),
    ],
  ]);

  const passage = readingPassages.get(questionNumber);
  if (passage) return passage;

  return null;
}

function extractOptionContent(
  chunk: string,
  section: 'reading' | 'listening',
  questionNumber: number,
) {
  const manual = manualOptions(section, questionNumber);
  if (manual) return manual;

  const normalized = normalizeOptionMarkers(chunk).replace(
    /^([①②③④])[ \t]*/gm,
    (_marker, optionMarker: string) =>
      `@@${{ '①': '1', '②': '2', '③': '3', '④': '4' }[optionMarker] ?? ''}@@ `,
  );

  const matches = [...normalized.matchAll(/@@([1-4])@@/g)];
  const options = new Map<string, string>();

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const optionNumber = match[1];
    const start = (match.index ?? 0) + match[0].length;
    const end =
      index + 1 < matches.length
        ? (matches[index + 1].index ?? normalized.length)
        : normalized.length;
    const content = normalized
      .slice(start, end)
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => {
        if (!line) return false;
        if (line.includes('고르십시오')) return false;
        if (line.includes('각 2점')) return false;
        if (/^\)/.test(line)) return false;
        return true;
      })
      .join('\n')
      .trim();

    if (!options.has(optionNumber) && content) {
      options.set(optionNumber, textPreview(content, 1000));
    }
  }

  return options;
}

function questionPassageContent(
  chunk: string,
  section: 'reading' | 'listening',
  questionNumber: number,
) {
  const manual = manualPassage(section, questionNumber);
  if (manual) return manual;

  const normalized = normalizeOptionMarkers(chunk);
  const optionNumbers = new Set(['1', '2', '3', '4']);
  const lines = normalized.split('\n');
  const keptLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    const optionMatch = trimmed.match(/^([①②③④])\s*(.*)$/);

    if (optionMatch) {
      const optionNumber =
        { '①': '1', '②': '2', '③': '3', '④': '4' }[optionMatch[1]] ?? '';
      const optionText = optionMatch[2].trim();

      if (optionNumbers.has(optionNumber)) {
        continue;
      }

      if (optionText) keptLines.push(optionText);
      continue;
    }

    keptLines.push(line);
  }

  let content = keptLines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (section === 'reading' && questionNumber === 6) {
    content = content.replace(/^6\.\s*/m, '6.\n');
  }

  if (section === 'reading' && questionNumber >= 16 && questionNumber <= 18) {
    content = content.replace(/^※ \[16~181 \(/, '※ [16~18] (    ');
  }

  if (section === 'listening' && questionNumber === 3) {
    const endPhrase =
      "'환경 보호를 위해서', 품질이 좋아서 가 그 뒤를 이었습니다.";
    const endIndex = content.indexOf(endPhrase);
    if (endIndex >= 0) {
      content = content.slice(0, endIndex + endPhrase.length).trim();
    }
  }

  return content;
}

function optionRows(
  correctAnswer: string,
  chunk: string,
  section: 'reading' | 'listening',
  questionNumber: number,
) {
  const ocrOptions = extractOptionContent(chunk, section, questionNumber);

  return ['1', '2', '3', '4'].map((option) => ({
    option_number: Number(option),
    content: ocrOptions.get(option) ?? option,
    is_correct: option === correctAnswer ? 1 : 0,
  }));
}

function answerExplanation(correctAnswer: string) {
  return `정답은 ${correctAnswer}번입니다.`;
}

async function createReadingSet(now: bigint, readingOcrLines: string[]) {
  await prisma.question_sets.create({
    data: {
      id: readingSetId,
      title: '제102회 TOPIK II 읽기 모의고사',
      section: 'reading',
      level: 4,
      exam_kind: 'mock',
      total_questions: 50,
      duration_seconds: 4200,
      price: 0,
      is_free: 1,
      display_order: 102,
      created_at: now,
      updated_at: now,
    },
  });

  for (let questionNumber = 1; questionNumber <= 50; questionNumber += 1) {
    const questionId = `${readingSetId}-q${questionNumber
      .toString()
      .padStart(2, '0')}`;
    const passageId = `${questionId}-passage`;
    const chunk = questionChunk(readingOcrLines, questionNumber, 'reading');

    await prisma.question_passages.create({
      data: {
        id: passageId,
        title: `제102회 TOPIK II 읽기 ${questionNumber}번`,
        content: questionPassageContent(chunk, 'reading', questionNumber),
        created_at: now,
        updated_at: now,
      },
    });

    await prisma.questions.create({
      data: {
        id: questionId,
        set_id: readingSetId,
        passage_id: passageId,
        section: 'reading',
        question_type: 'multiple_choice',
        question_number: questionNumber,
        level: 4,
        prompt: '',
        correct_answer: readingAnswers[questionNumber - 1],
        explanation: answerExplanation(readingAnswers[questionNumber - 1]),
        difficulty: 3,
        time_limit_seconds: 84,
        is_ai_generated: 0,
        is_downloaded: 0,
        created_at: now,
        updated_at: now,
        question_options: {
          create: optionRows(
            readingAnswers[questionNumber - 1],
            chunk,
            'reading',
            questionNumber,
          ),
        },
        question_media: {
          create: {
            media_type: 'document',
            url: readingPdfUrl,
            transcript: `제102회 TOPIK II 읽기 PDF 원문`,
            sort_order: 1,
            created_at: now,
            updated_at: now,
          },
        },
      },
    });
  }
}

async function createListeningSet(now: bigint, listeningOcrLines: string[]) {
  await prisma.question_sets.create({
    data: {
      id: listeningSetId,
      title: '제102회 TOPIK II 듣기 모의고사',
      section: 'listening',
      level: 4,
      exam_kind: 'mock',
      total_questions: 50,
      duration_seconds: 3600,
      price: 0,
      is_free: 1,
      display_order: 102,
      created_at: now,
      updated_at: now,
    },
  });

  for (let questionNumber = 1; questionNumber <= 50; questionNumber += 1) {
    const questionId = `${listeningSetId}-q${questionNumber
      .toString()
      .padStart(2, '0')}`;
    const passageId = `${questionId}-passage`;
    const audioName = `listening-q${questionNumber
      .toString()
      .padStart(2, '0')}.mp3`;
    const chunk = questionChunk(listeningOcrLines, questionNumber, 'listening');

    await prisma.question_passages.create({
      data: {
        id: passageId,
        title: `제102회 TOPIK II 듣기 ${questionNumber}번`,
        content: questionPassageContent(chunk, 'listening', questionNumber),
        created_at: now,
        updated_at: now,
      },
    });

    await prisma.questions.create({
      data: {
        id: questionId,
        set_id: listeningSetId,
        passage_id: passageId,
        section: 'listening',
        question_type: 'multiple_choice',
        question_number: questionNumber,
        level: 4,
        prompt: '',
        correct_answer: listeningAnswers[questionNumber - 1],
        explanation: answerExplanation(listeningAnswers[questionNumber - 1]),
        difficulty: 3,
        time_limit_seconds: 72,
        is_ai_generated: 0,
        is_downloaded: 0,
        created_at: now,
        updated_at: now,
        question_options: {
          create: optionRows(
            listeningAnswers[questionNumber - 1],
            chunk,
            'listening',
            questionNumber,
          ),
        },
        question_media: {
          create: [
            {
              media_type: 'audio',
              url: `${publicAudioPrefix}/${audioName}`,
              transcript: `제102회 TOPIK II 듣기 ${questionNumber}번 공식 MP3`,
              sort_order: 1,
              created_at: now,
              updated_at: now,
            },
            {
              media_type: 'document',
              url: listeningPdfUrl,
              transcript: `제102회 TOPIK II 듣기 통합 PDF 원문. 정답표: ${answerPdfUrl}`,
              sort_order: 2,
              created_at: now,
              updated_at: now,
            },
          ],
        },
      },
    });
  }
}

async function main() {
  assertFileExists(join(topikDataDir, readingPdfName));
  assertFileExists(join(topikDataDir, listeningPdfName));
  assertFileExists(join(topikDataDir, answerPdfName));
  assertFileExists(readingOcrPath);
  assertFileExists(listeningOcrPath);

  if (readingAnswers.length !== 50 || listeningAnswers.length !== 50) {
    throw new Error('Expected exactly 50 reading and 50 listening answers');
  }

  copyListeningAudio();
  await cleanupExistingData();

  const now = BigInt(Date.now());
  const readingOcrLines = loadOcrLines(readingOcrPath);
  const listeningOcrLines = loadOcrLines(listeningOcrPath);
  await createReadingSet(now, readingOcrLines);
  await createListeningSet(now, listeningOcrLines);

  console.log('102nd TOPIK II mock exam import completed.');
  console.log(
    JSON.stringify(
      {
        reading_set_id: readingSetId,
        listening_set_id: listeningSetId,
        reading_questions: 50,
        listening_questions: 50,
        audio_url_example: `${publicAudioPrefix}/listening-q01.mp3`,
        reading_pdf_url: readingPdfUrl,
        listening_pdf_url: listeningPdfUrl,
      },
      null,
      2,
    ),
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
