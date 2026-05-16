import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import * as bcrypt from 'bcrypt';
import { execFileSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';

const audioDir = join(process.cwd(), 'test/audio/listening');
const audioUrlPrefix = '/test/audio/listening';
const audioSampleRate = 22050;
const audioChannels = 1;
const audioBitsPerSample = 16;
const femaleVoice = 'Yuna';
const maleVoice = 'Eddy'; // Reed 대신 Eddy 사용
const narratorVoice = 'Yuna';

function ensureAudioDir() {
  if (!existsSync(audioDir)) {
    mkdirSync(audioDir, { recursive: true });
  }
}

function parseAudioSegments(audioText: string) {
  // 다양한 화자 표시 형식 지원: "남자:", "여자:", "[남자]", "(여자)", "남자 : " 등
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

function voiceForSpeaker(speaker: string, questionNumber: number = 1) {
  if (speaker === '남자') return maleVoice;
  if (speaker === '여자') return femaleVoice;
  // 나레이터인 경우 홀수 문제는 여자, 짝수 문제는 남자 음성으로 다양화
  return questionNumber % 2 === 0 ? maleVoice : femaleVoice;
}

function readWavData(filePath: string) {
  const wav = readFileSync(filePath);
  const dataOffset = wav.indexOf(Buffer.from('data'));
  if (dataOffset < 0) throw new Error(`WAV data chunk not found: ${filePath}`);
  const dataSize = wav.readUInt32LE(dataOffset + 4);
  return wav.subarray(dataOffset + 8, dataOffset + 8 + dataSize);
}

function createSilence(milliseconds: number) {
  const bytesPerSample = audioBitsPerSample / 8;
  const sampleCount = Math.floor((audioSampleRate * milliseconds) / 1000);
  return Buffer.alloc(sampleCount * audioChannels * bytesPerSample);
}

function writePcmWav(filePath: string, pcmData: Buffer) {
  const bytesPerSample = audioBitsPerSample / 8;
  const byteRate = audioSampleRate * audioChannels * bytesPerSample;
  const blockAlign = audioChannels * bytesPerSample;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcmData.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(audioChannels, 22);
  header.writeUInt32LE(audioSampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(audioBitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcmData.length, 40);
  writeFileSync(filePath, Buffer.concat([header, pcmData]));
}

function generateAudioFile(setId: string, questionNumber: number, audioText: string) {
  ensureAudioDir();
  const fileName = `seed-${setId}-q${String(questionNumber).padStart(2, '0')}.wav`;
  const filePath = join(audioDir, fileName);
  
  // 이미 파일이 존재하면 생성을 건너뜀 (시간 단축)
  if (existsSync(filePath)) {
    return `${audioUrlPrefix}/${fileName}`;
  }

  const segments = parseAudioSegments(audioText);
  const pcmParts: Buffer[] = [createSilence(450)];

  for (const [index, segment] of segments.entries()) {
    const tempAiffPath = join(audioDir, `temp-${setId}-${questionNumber}-${index}.aiff`);
    const tempWavPath = join(audioDir, `temp-${setId}-${questionNumber}-${index}.wav`);
    
    // TOPIK 시험 속도(약 140-150)에 맞춰 속도 조절
    execFileSync('say', ['-v', voiceForSpeaker(segment.speaker, questionNumber), '-r', '140', '-o', tempAiffPath, segment.text]);
    execFileSync('afconvert', ['-f', 'WAVE', '-d', 'LEI16@22050', tempAiffPath, tempWavPath]);
    
    pcmParts.push(readWavData(tempWavPath));
    pcmParts.push(createSilence(index === segments.length - 1 ? 350 : 800)); // 대화 간격 조절
    
    unlinkSync(tempAiffPath);
    unlinkSync(tempWavPath);
  }
  writePcmWav(filePath, Buffer.concat(pcmParts));
  return `${audioUrlPrefix}/${fileName}`;
}

type SeedSet = {
  id: string;
  title: string;
  section: 'reading' | 'listening';
  level: number;
  exam_kind: 'mock' | 'type';
  total_questions: number;
  duration_seconds: number;
  price: number;
  is_free: number;
  display_order: number;
};

type SeedPassage = {
  id: string;
  title: string;
  content: string;
  translation: string;
  created_at: bigint;
  updated_at: bigint;
};

type SeedQuestion = {
  id: string;
  set_id: string;
  passage_id: string | null;
  section: 'reading' | 'listening';
  question_type: string;
  question_number: number;
  level: number;
  prompt: string;
  correct_answer: string;
  explanation: string;
  ai_explanation: string;
  difficulty: number;
  time_limit_seconds: number;
  is_ai_generated: number;
  is_downloaded: number;
  created_at: bigint;
  updated_at: bigint;
};

type SeedOption = {
  id: string;
  question_id: string;
  option_number: number;
  content: string;
  is_correct: number;
};

type SeedMedia = {
  id: string;
  question_id: string;
  media_type: string;
  url: string;
  duration_seconds: number;
  transcript: string;
  sort_order: number;
  created_at: bigint;
  updated_at: bigint;
};

type SeedExplanationVideo = {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string | null;
  video_url: string;
  question_id: string | null;
  set_id: string | null;
  section: 'reading' | 'listening' | 'writing' | null;
  level: number | null;
  is_recommended: number;
  display_order: number;
  created_at: bigint;
  updated_at: bigint;
};

function getDatabaseUrl() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  const url = new URL(connectionString);

  if (url.protocol === 'mysql:') {
    url.protocol = 'mariadb:';
  }

  if (
    url.hostname === 'localhost' ||
    url.hostname === '::1' ||
    url.hostname === '[::1]'
  ) {
    url.hostname = '127.0.0.1';
  }

  if (!url.searchParams.has('allowPublicKeyRetrieval')) {
    url.searchParams.set('allowPublicKeyRetrieval', 'true');
  }

  return url.toString();
}

function createPrismaClient() {
  return new PrismaClient({
    adapter: new PrismaMariaDb(getDatabaseUrl()),
  });
}

function timestamp(base: bigint, offset: number) {
  return base + BigInt(offset);
}

function buildOptions(question: SeedQuestion): SeedOption[] {
  const correctNumber = Number(question.correct_answer);

  return Array.from({ length: 4 }, (_, index) => {
    const optionNumber = index + 1;
    return {
      id: `${question.id}-o${optionNumber}`,
      question_id: question.id,
      option_number: optionNumber,
      content: `보기 ${optionNumber}`,
      is_correct: optionNumber === correctNumber ? 1 : 0,
    };
  });
}

function readJsonFile(fileName: string) {
  const filePath = join(process.cwd(), 'content', fileName);
  if (!existsSync(filePath)) return null;
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

async function buildQuestionsFromContent(
  set: SeedSet,
  baseTime: bigint,
): Promise<{ questions: SeedQuestion[]; options: SeedOption[]; media: SeedMedia[]; passages: SeedPassage[] }> {
  const questions: SeedQuestion[] = [];
  const options: SeedOption[] = [];
  const media: SeedMedia[] = [];
  const passages: SeedPassage[] = [];

  const contentFile = set.section === 'listening' 
    ? 'topik2-listening-practice-1.json' 
    : 'topik2-reading-practice-1.json';
  const content = readJsonFile(contentFile);

  // JSON 데이터가 있고 급수가 맞으면 해당 데이터 사용, 아니면 고품질 샘플 생성
  let sourceQuestions = content?.questions?.filter((q: any) => q.level === set.level) || [];

  // 6급 등 데이터가 없는 경우를 위한 고품질 실제 기출 변형 데이터 (검색 결과 반영)
  if (sourceQuestions.length === 0) {
    if (set.level === 6 && set.section === 'listening') {
      sourceQuestions = [
        {
          question_number: 41,
          level: 6,
          question_type: 'multiple_choice',
          prompt: '다음을 듣고 물음에 답하십시오. 이 강연의 중심 내용으로 가장 알맞은 것을 고르십시오.',
          audio_text: '여자: 과거의 제조업이 단순히 제품을 생산하고 판매하는 데 그쳤다면, 최근의 제조업은 서비스와의 결합을 통해 새로운 가치를 창출하고 있습니다. 예를 들어, 가전제품 기업이 제품 판매 후 유지보수와 관리 서비스를 구독 형태로 제공함으로써 고객과의 접점을 늘리고 안정적인 수익 구조를 확보하는 식이죠. 이러한 제조업의 서비스화는 기업에게는 지속 가능한 성장을, 소비자에게는 최적화된 경험을 제공하며 산업의 패러다임을 바꾸고 있습니다.',
          options: ['제품의 품질은 부품의 질에 의해 결정된다.', '제조업은 일자리 창출에 크게 기여하고 있다.', '제조업은 서비스와의 결합을 통해 진화하고 있다.', '제품에 대한 고객의 의견을 실시간으로 반영해야 한다.'],
          correct_answer: '3',
          explanation: '제조업이 서비스와 결합하여 새로운 가치를 창출하고 진화하고 있다는 것이 핵심 내용입니다.',
          difficulty: 5,
          time_limit_seconds: 120
        },
        {
          question_number: 42,
          level: 6,
          question_type: 'multiple_choice',
          prompt: '들은 내용과 같은 것을 고르십시오.',
          audio_text: '여자: 과거의 제조업이 단순히 제품을 생산하고 판매하는 데 그쳤다면, 최근의 제조업은 서비스와의 결합을 통해 새로운 가치를 창출하고 있습니다. (중략)',
          options: ['제조업의 서비스화는 기업의 수익성을 악화시킨다.', '과거의 제조업은 제품 판매 이후의 관리에 집중했다.', '구독 서비스는 제조업에서 활용하기 어려운 방식이다.', '서비스 결합형 제조업은 소비자에게 새로운 경험을 제공한다.'],
          correct_answer: '4',
          explanation: '마지막 문장에서 소비자에게 최적화된 경험을 제공한다고 명시되어 있습니다.',
          difficulty: 5,
          time_limit_seconds: 120
        }
      ];
    } else if (set.level === 6 && set.section === 'reading') {
      const passageId = `${set.id}-p-lvl6-1`;
      passages.push({
        id: passageId,
        title: '대학 축제의 상업화와 본연의 가치',
        content: '최근 대학 축제에 유명 가수를 초청하는 비용이 치솟으면서 대학 본연의 가치가 훼손되고 있다는 비판이 제기되고 있다. 축제의 화려함 뒤에는 학생들의 자치 활동 예산 삭감이라는 그늘이 존재한다. 물론 유명 가수의 공연이 학교 홍보와 학생들의 만족도 제고에 기여하는 측면은 부정할 수 없다. 그러나 축제의 주인공이어야 할 학생들이 관객으로 전락하고, 학문적 교류와 공동체 의식 함양이라는 축제의 본질이 뒷전으로 밀려나는 현상은 경계해야 한다. 대학 축제는 단순한 소비의 장이 아니라, 학생들의 창의성이 발현되는 문화의 장으로 거듭나야 한다.',
        translation: 'Recently, criticism has been raised that the essential values of universities are being damaged as the cost of inviting famous singers to university festivals soars.',
        created_at: baseTime,
        updated_at: baseTime
      });

      sourceQuestions = [
        {
          question_number: 44,
          level: 6,
          question_type: 'multiple_choice',
          prompt: '다음 문장이 들어가기에 가장 알맞은 곳을 고르십시오. [ 문장: 이러한 상업화 경향은 대학이 지향해야 할 교육적 가치와 상충될 수밖에 없다. ]',
          options: ['㉠ (비판이 제기되고 있다 뒤)', '㉡ (그늘이 존재한다 뒤)', '㉢ (측면은 부정할 수 없다 뒤)', '㉣ (경계해야 한다 뒤)'],
          correct_answer: '3',
          explanation: '유명 가수 공연의 긍정적 측면을 언급한 뒤, 상업화의 문제점과 교육적 가치의 상충을 지적하며 경고하는 흐름이 자연스럽습니다.',
          difficulty: 5,
          time_limit_seconds: 120,
          passage_id: passageId
        },
        {
          question_number: 45,
          level: 6,
          question_type: 'multiple_choice',
          prompt: '이 글의 주제로 가장 알맞은 것을 고르십시오.',
          options: ['대학 축제는 지역 사회와의 연계를 강화해야 한다.', '유명 가수 초청은 대학 홍보를 위해 반드시 필요하다.', '대학 축제는 상업성에서 벗어나 본연의 가치를 회복해야 한다.', '학생들의 만족도를 높이기 위해 축제 예산을 증액해야 한다.'],
          correct_answer: '3',
          explanation: '축제가 상업성에 치우치지 말고 대학 본연의 가치와 학생들의 창의성을 살리는 장이 되어야 한다는 것이 주제입니다.',
          difficulty: 5,
          time_limit_seconds: 120,
          passage_id: passageId
        }
      ];
    }
  }

  // 데이터가 여전히 부족하면 최소한의 기본 샘플이라도 생성
  if (sourceQuestions.length === 0) {
    sourceQuestions = [
      {
        question_number: 1,
        level: set.level,
        question_type: 'multiple_choice',
        prompt: '다음 글의 내용과 같은 것을 고르십시오.',
        audio_text: '남자: 어제 새로 개장한 도서관에 가 봤어요? 여자: 네, 시설도 깨끗하고 책도 많아서 정말 좋더라고요.',
        options: ['남자는 어제 도서관에 갔다.', '여자는 도서관 시설이 마음에 들었다.', '도서관에는 읽을 책이 별로 없다.', '두 사람은 오늘 도서관에서 만날 것이다.'],
        correct_answer: '2',
        explanation: '여자가 시설이 깨끗하고 좋았다고 언급했습니다.',
        difficulty: 3,
        time_limit_seconds: 60
      }
    ];
  }

  // 정확히 total_questions 수만큼 문항을 생성 (부족하면 순환하며 채움)
  for (let index = 0; index < set.total_questions; index++) {
    const q = sourceQuestions[index % sourceQuestions.length];
    const questionNumber = index + 1;
    const questionId = `${set.id}-q${questionNumber}`;
    let passageId = q.passage_id || null;

    // 지문(Passage) 생성 로직 고도화
    // 1. passage 필드가 직접 있는 경우
    // 2. passage가 없지만 question_text가 있는 경우 (단문/순서맞추기 유형 대응)
    const passageContent = q.passage || q.question_text;
    
    if (passageContent && !passageId) {
      passageId = `${questionId}-p`;
      passages.push({
        id: passageId,
        title: `${set.title} - Question ${questionNumber} Passage`,
        content: passageContent,
        translation: '',
        created_at: timestamp(baseTime, index * 1000),
        updated_at: timestamp(baseTime, index * 1000),
      });
    }
    
    questions.push({
      id: questionId,
      set_id: set.id,
      passage_id: passageId,
      section: set.section as any,
      question_type: q.question_type || 'multiple_choice',
      question_number: questionNumber,
      level: q.level || set.level,
      prompt: q.prompt,
      correct_answer: q.correct_answer,
      explanation: q.explanation || `정답은 ${q.correct_answer}번입니다.`,
      ai_explanation: q.explanation || '',
      difficulty: q.difficulty || set.level,
      time_limit_seconds: q.time_limit_seconds || 60,
      is_ai_generated: 0,
      is_downloaded: 0,
      created_at: timestamp(baseTime, index * 1000),
      updated_at: timestamp(baseTime, index * 1000),
    });

    // 실제 옵션(보기) 추가
    q.options.forEach((content: string, optIdx: number) => {
      options.push({
        id: `${questionId}-o${optIdx + 1}`,
        question_id: questionId,
        option_number: optIdx + 1,
        content: content,
        is_correct: String(optIdx + 1) === String(q.correct_answer) ? 1 : 0,
      });
    });

    // 듣기인 경우 오디오 생성
    if (set.section === 'listening' && q.audio_text) {
      const audioUrl = generateAudioFile(set.id, questionNumber, q.audio_text);
      media.push({
        id: `${set.id}-m${index + 1}`,
        question_id: questionId,
        media_type: 'audio',
        url: audioUrl,
        duration_seconds: q.time_limit_seconds || 30,
        transcript: q.audio_text,
        sort_order: 1,
        created_at: timestamp(baseTime, index * 1000),
        updated_at: timestamp(baseTime, index * 1000),
      });
    }
  }

  return { questions, options, media, passages };
}

async function ensureSeedUser(params: {
  prisma: PrismaClient;
  email: string;
  provider_id: string;
  nickname: string;
  role: 'user' | 'admin';
  password: string;
}) {
  const { prisma, email, provider_id, nickname, role, password } = params;
  const now = BigInt(Date.now());
  const password_hash = await bcrypt.hash(password, 10);

  const existing = await prisma.users.findFirst({
    where: {
      provider: 'local',
      provider_id,
    },
  });

  if (existing) {
    return prisma.users.update({
      where: { id: existing.id },
      data: {
        email,
        nickname,
        role,
        password_hash,
        updated_at: now,
      },
    });
  }

  return prisma.users.create({
    data: {
      email,
      password_hash,
      provider: 'local',
      provider_id,
      nickname,
      role,
      target_level: 3,
      language_code: 'ko',
      timezone: 'Asia/Seoul',
      timer_mode: 'countdown',
      created_at: now,
      updated_at: now,
    },
  });
}

async function main() {
  const prisma = createPrismaClient();
  const baseTime = BigInt(Date.now());

  const sets: SeedSet[] = [
    {
      id: 'rm1',
      title: '모의고사 1',
      section: 'reading',
      level: 3,
      exam_kind: 'mock',
      total_questions: 50,
      duration_seconds: 4200,
      price: 0,
      is_free: 1,
      display_order: 1,
    },
    {
      id: 'rm2',
      title: '모의고사 2',
      section: 'reading',
      level: 4,
      exam_kind: 'mock',
      total_questions: 50,
      duration_seconds: 4200,
      price: 50,
      is_free: 0,
      display_order: 2,
    },
    {
      id: 'rt12',
      title: '1-2번',
      section: 'reading',
      level: 3,
      exam_kind: 'type',
      total_questions: 30,
      duration_seconds: 1800,
      price: 0,
      is_free: 1,
      display_order: 1,
    },
    {
      id: 'rt34',
      title: '3-4번',
      section: 'reading',
      level: 4,
      exam_kind: 'type',
      total_questions: 30,
      duration_seconds: 1800,
      price: 30,
      is_free: 0,
      display_order: 2,
    },
    {
      id: 'rt58',
      title: '5-8번',
      section: 'reading',
      level: 5,
      exam_kind: 'type',
      total_questions: 30,
      duration_seconds: 2400,
      price: 30,
      is_free: 0,
      display_order: 3,
    },
    {
      id: 'rt910',
      title: '9-10번',
      section: 'reading',
      level: 6,
      exam_kind: 'type',
      total_questions: 30,
      duration_seconds: 2400,
      price: 30,
      is_free: 0,
      display_order: 4,
    },
    {
      id: 'lm1',
      title: '모의고사 1',
      section: 'listening',
      level: 3,
      exam_kind: 'mock',
      total_questions: 50,
      duration_seconds: 4200,
      price: 0,
      is_free: 1,
      display_order: 1,
    },
    {
      id: 'lm2',
      title: '모의고사 2',
      section: 'listening',
      level: 4,
      exam_kind: 'mock',
      total_questions: 50,
      duration_seconds: 4200,
      price: 50,
      is_free: 0,
      display_order: 2,
    },
    {
      id: 'lt12',
      title: '1-2번',
      section: 'listening',
      level: 3,
      exam_kind: 'type',
      total_questions: 30,
      duration_seconds: 1800,
      price: 30,
      is_free: 0,
      display_order: 1,
    },
    {
      id: 'lt34',
      title: '3-4번',
      section: 'listening',
      level: 4,
      exam_kind: 'type',
      total_questions: 30,
      duration_seconds: 1800,
      price: 30,
      is_free: 0,
      display_order: 2,
    },
    {
      id: 'lt58',
      title: '5-8번',
      section: 'listening',
      level: 5,
      exam_kind: 'type',
      total_questions: 30,
      duration_seconds: 2400,
      price: 30,
      is_free: 0,
      display_order: 3,
    },
    {
      id: 'lt910',
      title: '9-10번',
      section: 'listening',
      level: 6,
      exam_kind: 'type',
      total_questions: 30,
      duration_seconds: 2400,
      price: 30,
      is_free: 0,
      display_order: 4,
    },
  ];

  try {
    await prisma.user_questions.deleteMany();
    await prisma.answers.deleteMany();
    await prisma.exam_sessions.deleteMany();
    await prisma.user_downloads.deleteMany();
    await prisma.user_vocabulary.deleteMany();
    await prisma.user_grammar_items.deleteMany();
    await prisma.explanation_videos.deleteMany();
    await prisma.question_media.deleteMany();
    await prisma.question_options.deleteMany();
    await prisma.questions.deleteMany();
    await prisma.question_passages.deleteMany();
    await prisma.question_sets.deleteMany();
    await prisma.vocabulary.deleteMany();
    await prisma.grammar_items.deleteMany();
    await prisma.topik_exam_schedules.deleteMany();

    await ensureSeedUser({
      prisma,
      email: 'mock-admin@topik.local',
      provider_id: 'mock-seed-admin',
      nickname: 'Mock Admin',
      role: 'admin',
      password: 'Admin1234!',
    });

    const user = await ensureSeedUser({
      prisma,
      email: 'mock-user@topik.local',
      provider_id: 'mock-seed-user',
      nickname: 'Mock User',
      role: 'user',
      password: 'User1234!',
    });

    await prisma.question_sets.createMany({
      data: sets.map((set) => ({
        id: set.id,
        title: set.title,
        section: set.section,
        level: set.level,
        exam_kind: set.exam_kind,
        total_questions: set.total_questions,
        duration_seconds: set.duration_seconds,
        price: set.price,
        is_free: set.is_free,
        display_order: set.display_order,
        created_at: timestamp(baseTime, set.display_order * 1000),
        updated_at: timestamp(baseTime, set.display_order * 1000),
      })),
    });

    const passages: SeedPassage[] = [];
    const questions: SeedQuestion[] = [];
    const options: SeedOption[] = [];
    const media: SeedMedia[] = [];

    for (const set of sets) {
      const result = await buildQuestionsFromContent(set, baseTime);
      passages.push(...result.passages);
      questions.push(...result.questions);
      options.push(...result.options);
      media.push(...result.media);
    }

    await prisma.question_passages.createMany({
      data: passages,
    });

    await prisma.questions.createMany({
      data: questions,
    });

    await prisma.question_options.createMany({
      data: options,
    });

    await prisma.question_media.createMany({
      data: media,
    });

    const explanationVideos: SeedExplanationVideo[] = [
      {
        id: 'video-rm1-q1',
        title: 'How to solve Reading Question 1',
        description: 'Step-by-step explanation for the first reading question.',
        thumbnail_url: 'https://cdn.topik.local/explanations/rm1-q1.jpg',
        video_url: 'https://cdn.topik.local/explanations/rm1-q1.mp4',
        question_id: 'rm1-q1',
        set_id: null,
        section: 'reading',
        level: 3,
        is_recommended: 1,
        display_order: 1,
        created_at: timestamp(baseTime, 72_000),
        updated_at: timestamp(baseTime, 72_000),
      },
      {
        id: 'video-rm1-set',
        title: 'Reading Mock Exam 1 overview',
        description: 'Full explanation video for the entire reading mock exam.',
        thumbnail_url: 'https://cdn.topik.local/explanations/rm1-set.jpg',
        video_url: 'https://cdn.topik.local/explanations/rm1-set.mp4',
        question_id: null,
        set_id: 'rm1',
        section: 'reading',
        level: 3,
        is_recommended: 1,
        display_order: 2,
        created_at: timestamp(baseTime, 73_000),
        updated_at: timestamp(baseTime, 73_000),
      },
      {
        id: 'video-lm1-q1',
        title: 'How to solve Listening Question 1',
        description: 'A short explanation for the first listening question.',
        thumbnail_url: 'https://cdn.topik.local/explanations/lm1-q1.jpg',
        video_url: 'https://cdn.topik.local/explanations/lm1-q1.mp4',
        question_id: 'lm1-q1',
        set_id: null,
        section: 'listening',
        level: 3,
        is_recommended: 0,
        display_order: 1,
        created_at: timestamp(baseTime, 74_000),
        updated_at: timestamp(baseTime, 74_000),
      },
      {
        id: 'video-lm1-set',
        title: 'Listening Mock Exam 1 overview',
        description: 'Full explanation video for the listening mock exam.',
        thumbnail_url: 'https://cdn.topik.local/explanations/lm1-set.jpg',
        video_url: 'https://cdn.topik.local/explanations/lm1-set.mp4',
        question_id: null,
        set_id: 'lm1',
        section: 'listening',
        level: 3,
        is_recommended: 0,
        display_order: 2,
        created_at: timestamp(baseTime, 75_000),
        updated_at: timestamp(baseTime, 75_000),
      },
    ];

    await prisma.explanation_videos.createMany({
      data: explanationVideos,
    });

    await prisma.topik_exam_schedules.createMany({
      data: [
        {
          id: 'topik-schedule-107',
          exam_name: 'TOPIK Exam No. 107',
          exam_date: timestamp(baseTime, 90 * 24 * 60 * 60 * 1000),
          registration_start_at: timestamp(baseTime, 60 * 24 * 60 * 60 * 1000),
          registration_end_at: timestamp(baseTime, 66 * 24 * 60 * 60 * 1000),
          result_date: timestamp(baseTime, 120 * 24 * 60 * 60 * 1000),
          location: 'Korea / Overseas',
          fee: 55000,
          registration_url: 'https://www.topik.go.kr/',
          is_active: 1,
          display_order: 1,
          created_at: timestamp(baseTime, 70_000),
          updated_at: timestamp(baseTime, 70_000),
        },
        {
          id: 'topik-schedule-108',
          exam_name: 'TOPIK Exam No. 108',
          exam_date: timestamp(baseTime, 180 * 24 * 60 * 60 * 1000),
          registration_start_at: timestamp(baseTime, 150 * 24 * 60 * 60 * 1000),
          registration_end_at: timestamp(baseTime, 156 * 24 * 60 * 60 * 1000),
          result_date: timestamp(baseTime, 210 * 24 * 60 * 60 * 1000),
          location: 'Korea / Overseas',
          fee: 55000,
          registration_url: 'https://www.topik.go.kr/',
          is_active: 1,
          display_order: 2,
          created_at: timestamp(baseTime, 71_000),
          updated_at: timestamp(baseTime, 71_000),
        },
      ],
    });

    const vocabularyItems = [
      {
        id: 'vocab-1',
        word: '학교',
        meaning_ko: '학교',
        meaning_user_lang: 'school',
        level: 3,
        tts_url: null,
        is_downloaded: 0,
        updated_at: timestamp(baseTime, 60_000),
      },
      {
        id: 'vocab-2',
        word: '도서관',
        meaning_ko: '도서관',
        meaning_user_lang: 'library',
        level: 4,
        tts_url: null,
        is_downloaded: 0,
        updated_at: timestamp(baseTime, 61_000),
      },
    ];

    const grammarItems = [
      {
        id: 'grammar-1',
        pattern: '-아/어 보다',
        description: '경험을 표현할 때 사용하는 문법입니다.',
        examples_json: ['한국에 가 봤어요.'],
        tags_json: ['experience', 'verb'],
        is_downloaded: 0,
        updated_at: timestamp(baseTime, 62_000),
      },
      {
        id: 'grammar-2',
        pattern: '-기 때문에',
        description: '이유를 설명할 때 사용하는 문법입니다.',
        examples_json: ['비가 오기 때문에 집에 있었어요.'],
        tags_json: ['reason', 'cause'],
        is_downloaded: 0,
        updated_at: timestamp(baseTime, 63_000),
      },
    ];

    await prisma.vocabulary.createMany({
      data: vocabularyItems.map((item) => ({
        ...item,
      })),
    });

    await prisma.grammar_items.createMany({
      data: grammarItems.map((item) => ({
        ...item,
      })),
    });

    const activeSet = sets.find((set) => set.id === 'rm1');
    if (!activeSet) {
      throw new Error('Active mock exam seed set was not found');
    }

    const activeQuestions = await prisma.questions.findMany({
      where: { set_id: activeSet.id },
      orderBy: { question_number: 'asc' },
    });

    const sessionStartedAt = timestamp(baseTime, -42_000);
    const session = await prisma.exam_sessions.create({
      data: {
        user_id: user.id,
        mode: 'mock',
        section: activeSet.section,
        set_id: activeSet.id,
        total_questions: activeSet.total_questions,
        current_index: 4,
        remaining_seconds: 4158,
        status: 'in_progress',
        started_at: sessionStartedAt,
      },
    });

    await prisma.answers.createMany({
      data: activeQuestions.map((question, index) => {
        const answered = index < 4;
        const selectedAnswer = answered ? String((index % 4) + 1) : null;
        const isCorrect = answered
          ? selectedAnswer === question.correct_answer
            ? 1
            : 0
          : null;

        return {
          session_id: session.id,
          question_id: question.id,
          selected_answer: selectedAnswer,
          text_answer: null,
          is_correct: isCorrect,
          spent_seconds: answered ? 11 + index : 0,
          bookmarked: 0,
          updated_at: timestamp(baseTime, 50_000 + index * 1000),
        };
      }),
    });

    await prisma.user_downloads.createMany({
      data: [
        {
          user_id: user.id,
          entity_type: 'question',
          entity_id: activeQuestions[0].id,
          status: 'downloaded',
          created_at: timestamp(baseTime, 80_000),
          updated_at: timestamp(baseTime, 80_000),
        },
        {
          user_id: user.id,
          entity_type: 'vocabulary',
          entity_id: 'vocab-1',
          status: 'pending',
          created_at: timestamp(baseTime, 81_000),
          updated_at: timestamp(baseTime, 81_000),
        },
        {
          user_id: user.id,
          entity_type: 'grammar',
          entity_id: 'grammar-1',
          status: 'failed',
          created_at: timestamp(baseTime, 82_000),
          updated_at: timestamp(baseTime, 82_000),
        },
      ],
    });

    console.log('Seed completed.');
    console.log(`Admin login: mock-admin@topik.local / Admin1234!`);
    console.log(`User login: mock-user@topik.local / User1234!`);
    console.log(
      `Active mock exam seeded for ${user.nickname} in session ${session.id}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
