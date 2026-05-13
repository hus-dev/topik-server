import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

type VocabularyEntry = {
  word: string;
  meaning_ko: string;
  meaning_user_lang: string;
  level: number;
};

type Term = {
  ko: string;
  en: string;
  level: number;
};

function getConnectionString() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  const url = new URL(connectionString);
  if (url.protocol === 'mysql:') {
    url.protocol = 'mariadb:';
  }

  if (!url.searchParams.has('allowPublicKeyRetrieval')) {
    url.searchParams.set('allowPublicKeyRetrieval', 'true');
  }

  return url.toString();
}

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(getConnectionString()),
});

const basicWords: VocabularyEntry[] = [
  ['가게', 'store', '물건을 파는 곳', 1],
  ['가격', 'price', '물건의 값', 1],
  ['가구', 'furniture', '책상이나 의자 같은 물건', 1],
  ['가방', 'bag', '물건을 넣어 들고 다니는 것', 1],
  ['가수', 'singer', '노래하는 사람', 1],
  ['가족', 'family', '부모, 형제 등 가까운 사람들', 1],
  ['감기', 'cold', '기침과 콧물이 나는 병', 1],
  ['감사', 'thanks', '고마운 마음', 1],
  ['강아지', 'puppy', '어린 개', 1],
  ['개학', 'school opening', '방학 후 학교가 시작됨', 1],
  ['거실', 'living room', '집에서 함께 지내는 방', 1],
  ['건물', 'building', '사람이 지은 큰 구조물', 1],
  ['겨울', 'winter', '일 년 중 추운 계절', 1],
  ['결혼', 'marriage', '두 사람이 부부가 됨', 1],
  ['경기', 'game', '운동이나 시합', 1],
  ['고기', 'meat', '동물의 살로 만든 음식', 1],
  ['고향', 'hometown', '태어나거나 자란 곳', 1],
  ['공원', 'park', '사람들이 쉬거나 산책하는 곳', 1],
  ['공항', 'airport', '비행기를 타고 내리는 곳', 1],
  ['과일', 'fruit', '나무나 풀에서 나는 단 음식', 1],
  ['교실', 'classroom', '수업을 듣는 방', 1],
  ['구두', 'dress shoes', '격식을 갖춘 신발', 1],
  ['기분', 'feeling', '마음의 상태', 1],
  ['기차', 'train', '철길 위를 달리는 교통수단', 1],
  ['꽃집', 'flower shop', '꽃을 파는 가게', 1],
  ['날씨', 'weather', '하늘과 공기의 상태', 1],
  ['냉장고', 'refrigerator', '음식을 차갑게 보관하는 기계', 1],
  ['노래', 'song', '음에 맞추어 부르는 말', 1],
  ['도서관', 'library', '책을 읽거나 빌리는 곳', 1],
  ['동생', 'younger sibling', '나보다 어린 형제자매', 1],
  ['문제', 'problem', '풀거나 해결해야 하는 것', 1],
  ['물건', 'thing', '사용하거나 살 수 있는 것', 1],
  ['바다', 'sea', '넓고 짠물이 있는 곳', 1],
  ['버스', 'bus', '많은 사람이 함께 타는 차', 1],
  ['병원', 'hospital', '아픈 사람이 치료받는 곳', 1],
  ['사진', 'photo', '카메라로 찍은 그림', 1],
  ['생일', 'birthday', '태어난 날', 1],
  ['선물', 'gift', '다른 사람에게 주는 물건', 1],
  ['수업', 'class', '학교나 학원에서 배우는 시간', 1],
  ['시장', 'market', '물건을 사고파는 곳', 1],
  ['식당', 'restaurant', '음식을 사 먹는 곳', 1],
  ['약속', 'appointment', '만나거나 하기로 정한 일', 1],
  ['여름', 'summer', '일 년 중 더운 계절', 1],
  ['여행', 'travel', '다른 곳으로 가서 구경함', 1],
  ['우산', 'umbrella', '비를 막는 물건', 1],
  ['운동', 'exercise', '몸을 움직여 건강하게 하는 일', 1],
  ['은행', 'bank', '돈을 맡기거나 찾는 곳', 1],
  ['의자', 'chair', '앉는 데 쓰는 가구', 1],
  ['이름', 'name', '사람이나 물건을 부르는 말', 1],
  ['자동차', 'car', '길에서 달리는 교통수단', 1],
  ['전화', 'phone call', '멀리 있는 사람과 말하는 일', 1],
  ['주말', 'weekend', '토요일과 일요일', 1],
  ['주소', 'address', '사는 곳이나 있는 곳의 위치', 1],
  ['지갑', 'wallet', '돈과 카드를 넣는 물건', 1],
  ['친구', 'friend', '가깝게 지내는 사람', 1],
  ['학교', 'school', '학생들이 공부하는 곳', 1],
  ['회사', 'company', '사람들이 일하는 곳', 1],
  ['회의', 'meeting', '여러 사람이 모여 의논함', 1],
  ['간식', 'snack', '식사 사이에 먹는 음식', 2],
  ['건강', 'health', '몸과 마음의 좋은 상태', 2],
  ['계단', 'stairs', '오르내릴 수 있게 만든 단', 2],
  ['계획', 'plan', '앞으로 할 일을 미리 정함', 2],
  ['고객', 'customer', '물건이나 서비스를 사는 사람', 2],
  ['공연', 'performance', '무대에서 보여 주는 예술 활동', 2],
  ['관광', 'tourism', '여행하며 구경하는 일', 2],
  ['교통', 'transportation', '사람이나 물건이 오가는 일', 2],
  ['규칙', 'rule', '지켜야 하는 정해진 법', 2],
  ['기념일', 'anniversary', '기억하고 축하하는 날', 2],
  ['기회', 'opportunity', '어떤 일을 할 수 있는 때', 2],
  ['농구', 'basketball', '공을 던져 골을 넣는 운동', 2],
  ['대화', 'conversation', '서로 주고받는 말', 2],
  ['도착', 'arrival', '목적지에 이름', 2],
  ['동네', 'neighborhood', '사는 곳 주변', 2],
  ['등록', 'registration', '이름이나 정보를 올림', 2],
  ['마음', 'mind', '생각이나 감정', 2],
  ['물가', 'prices', '여러 물건의 값 수준', 2],
  ['방문', 'visit', '어떤 곳에 찾아감', 2],
  ['방법', 'method', '일을 하는 방식', 2],
  ['배달', 'delivery', '물건을 가져다줌', 2],
  ['변경', 'change', '다르게 바꿈', 2],
  ['부모', 'parents', '아버지와 어머니', 2],
  ['부탁', 'request', '다른 사람에게 해 달라고 함', 2],
  ['비교', 'comparison', '둘 이상을 견주어 봄', 2],
  ['사고', 'accident', '뜻밖에 생긴 나쁜 일', 2],
  ['생활', 'life', '살아가는 일상', 2],
  ['선택', 'choice', '여럿 중 하나를 고름', 2],
  ['소식', 'news', '새롭게 알려진 이야기', 2],
  ['습관', 'habit', '자주 해서 익숙해진 행동', 2],
  ['신청', 'application', '원하거나 필요해서 요청함', 2],
  ['안내', 'guidance', '알려 주거나 이끌어 줌', 2],
  ['예약', 'reservation', '미리 정해 둠', 2],
  ['이유', 'reason', '어떤 일이 생긴 까닭', 2],
  ['이용', 'use', '필요에 따라 씀', 2],
  ['인기', 'popularity', '많은 사람이 좋아함', 2],
  ['입장', 'entrance', '안으로 들어감', 2],
  ['장소', 'place', '어떤 일이 있는 곳', 2],
  ['전시', 'exhibition', '물건이나 작품을 보여 줌', 2],
  ['준비', 'preparation', '미리 갖추는 일', 2],
  ['직장', 'workplace', '일하는 곳', 2],
  ['참석', 'attendance', '모임에 나감', 2],
  ['취미', 'hobby', '좋아해서 즐겨 하는 일', 2],
  ['할인', 'discount', '값을 깎아 줌', 2],
  ['확인', 'confirmation', '맞는지 알아봄', 2],
].map(([word, meaning_ko, meaning_user_lang, level]) => ({
  word: String(word),
  meaning_ko: String(meaning_ko),
  meaning_user_lang: String(meaning_user_lang),
  level: Number(level),
}));

const topics: Term[] = [
  ['가족', 'family', 2],
  ['건강', 'health', 2],
  ['교육', 'education', 3],
  ['교통', 'transportation', 3],
  ['기술', 'technology', 4],
  ['기후', 'climate', 4],
  ['노동', 'labor', 4],
  ['농업', 'agriculture', 4],
  ['도시', 'city', 3],
  ['문화', 'culture', 3],
  ['복지', 'welfare', 4],
  ['사회', 'society', 3],
  ['산업', 'industry', 4],
  ['소비', 'consumption', 3],
  ['식품', 'food', 3],
  ['안전', 'safety', 3],
  ['언론', 'media', 5],
  ['여가', 'leisure', 3],
  ['역사', 'history', 4],
  ['예술', 'art', 4],
  ['의료', 'medical care', 4],
  ['인구', 'population', 4],
  ['인터넷', 'internet', 3],
  ['자원', 'resources', 4],
  ['전통', 'tradition', 4],
  ['정치', 'politics', 5],
  ['주거', 'housing', 4],
  ['지역', 'region', 3],
  ['직업', 'occupation', 3],
  ['청년', 'youth', 4],
  ['환경', 'environment', 3],
  ['경제', 'economy', 4],
  ['금융', 'finance', 5],
  ['관광', 'tourism', 3],
  ['과학', 'science', 4],
  ['국제', 'international affairs', 5],
  ['기업', 'company', 4],
  ['법률', 'law', 5],
  ['시장', 'market', 4],
  ['심리', 'psychology', 5],
  ['에너지', 'energy', 4],
  ['연구', 'research', 4],
  ['정보', 'information', 3],
  ['제도', 'system', 5],
  ['정책', 'policy', 5],
  ['공동체', 'community', 5],
  ['디지털', 'digital technology', 4],
  ['미래', 'future', 4],
  ['세계', 'world', 4],
  ['개인', 'individual', 3],
].map(([ko, en, level]) => ({ ko: String(ko), en: String(en), level: Number(level) }));

const aspects: Term[] = [
  ['문제', 'problem', 3],
  ['변화', 'change', 3],
  ['발전', 'development', 3],
  ['증가', 'increase', 3],
  ['감소', 'decrease', 3],
  ['개선', 'improvement', 4],
  ['보호', 'protection', 3],
  ['관리', 'management', 4],
  ['지원', 'support', 3],
  ['참여', 'participation', 3],
  ['갈등', 'conflict', 6],
  ['영향', 'influence', 6],
  ['역할', 'role', 3],
  ['필요성', 'necessity', 6],
  ['중요성', 'importance', 6],
  ['원인', 'cause', 3],
  ['결과', 'result', 3],
  ['방안', 'measure', 4],
  ['대책', 'countermeasure', 4],
  ['현상', 'phenomenon', 4],
  ['분석', 'analysis', 4],
  ['자료', 'data', 3],
  ['조사', 'survey', 3],
  ['정책', 'policy', 6],
  ['제도', 'system', 6],
  ['비용', 'cost', 4],
  ['효과', 'effect', 4],
  ['수준', 'level', 3],
  ['차이', 'difference', 3],
  ['확대', 'expansion', 4],
  ['축소', 'reduction', 4],
  ['위기', 'crisis', 6],
  ['전략', 'strategy', 6],
  ['평가', 'evaluation', 4],
  ['기준', 'standard', 4],
  ['가치', 'value', 4],
  ['인식', 'perception', 4],
  ['태도', 'attitude', 4],
  ['흐름', 'trend', 4],
  ['전망', 'prospect', 6],
  ['논의', 'discussion', 6],
  ['해결', 'solution', 3],
  ['선택', 'choice', 3],
  ['활용', 'use', 4],
  ['경쟁력', 'competitiveness', 5],
  ['가능성', 'possibility', 4],
  ['한계', 'limitation', 6],
  ['책임', 'responsibility', 4],
  ['권리', 'right', 6],
  ['의무', 'duty', 6],
].map(([ko, en, level]) => ({ ko: String(ko), en: String(en), level: Number(level) }));

const verbsAndAdjectives: VocabularyEntry[] = [
  ['가깝다', 'to be close', '거리나 관계가 멀지 않다', 1],
  ['가볍다', 'to be light', '무게가 적다', 2],
  ['간단하다', 'to be simple', '복잡하지 않다', 2],
  ['강조하다', 'to emphasize', '중요하게 말하다', 4],
  ['개발하다', 'to develop', '새롭게 만들거나 발전시키다', 4],
  ['개선하다', 'to improve', '더 좋게 고치다', 4],
  ['거절하다', 'to refuse', '받아들이지 않다', 3],
  ['검토하다', 'to review', '자세히 살펴보다', 5],
  ['결정하다', 'to decide', '하나로 정하다', 3],
  ['경험하다', 'to experience', '직접 겪다', 3],
  ['고려하다', 'to consider', '여러 가지를 생각하다', 5],
  ['공유하다', 'to share', '함께 쓰거나 나누다', 4],
  ['관찰하다', 'to observe', '자세히 보다', 4],
  ['구성하다', 'to compose', '여러 부분으로 만들다', 4],
  ['극복하다', 'to overcome', '어려움을 이겨 내다', 4],
  ['기대하다', 'to expect', '좋은 결과를 바라다', 3],
  ['나타나다', 'to appear', '보이거나 생기다', 3],
  ['논의하다', 'to discuss', '의견을 나누다', 5],
  ['달성하다', 'to achieve', '목표를 이루다', 4],
  ['대응하다', 'to respond', '상황에 맞게 처리하다', 5],
  ['도입하다', 'to introduce', '새 제도나 방법을 들여오다', 5],
  ['마련하다', 'to prepare', '필요한 것을 갖추다', 4],
  ['발견하다', 'to discover', '새로운 것을 찾아내다', 3],
  ['발생하다', 'to occur', '일이 생기다', 4],
  ['보완하다', 'to supplement', '부족한 부분을 채우다', 5],
  ['분석하다', 'to analyze', '자세히 나누어 살피다', 4],
  ['비판하다', 'to criticize', '문제점을 지적하다', 5],
  ['상승하다', 'to rise', '위로 올라가다', 4],
  ['선호하다', 'to prefer', '더 좋아하다', 4],
  ['설명하다', 'to explain', '알기 쉽게 말하다', 2],
  ['수용하다', 'to accept', '받아들이다', 5],
  ['실현하다', 'to realize', '생각한 일을 실제로 이루다', 5],
  ['예측하다', 'to predict', '앞일을 미리 생각하다', 5],
  ['유지하다', 'to maintain', '상태를 계속 지키다', 4],
  ['의존하다', 'to depend on', '다른 것에 기대다', 5],
  ['이해하다', 'to understand', '뜻을 알다', 2],
  ['인정하다', 'to admit', '옳거나 사실이라고 받아들이다', 4],
  ['적용하다', 'to apply', '어떤 일에 맞게 쓰다', 4],
  ['제공하다', 'to provide', '필요한 것을 주다', 3],
  ['증명하다', 'to prove', '사실임을 밝히다', 5],
  ['참여하다', 'to participate', '어떤 일에 함께하다', 3],
  ['추진하다', 'to promote', '일을 앞으로 밀고 나가다', 5],
  ['확대하다', 'to expand', '범위를 넓히다', 4],
  ['확보하다', 'to secure', '필요한 것을 얻어 두다', 5],
  ['활용하다', 'to utilize', '잘 이용하다', 4],
].map(([word, meaning_ko, meaning_user_lang, level]) => ({
  word: String(word),
  meaning_ko: String(meaning_ko),
  meaning_user_lang: String(meaning_user_lang),
  level: Number(level),
}));

function buildVocabulary(): VocabularyEntry[] {
  const entries = new Map<string, VocabularyEntry>();
  const add = (entry: VocabularyEntry) => {
    if (entry.level < 1 || entry.level > 6) {
      throw new Error(`Invalid level for ${entry.word}: ${entry.level}`);
    }
    entries.set(entry.word, entry);
  };

  [...basicWords, ...verbsAndAdjectives].forEach(add);

  for (const aspect of aspects) {
    for (const topic of topics) {
      if (entries.size >= 1000) break;

      const level = Math.min(6, Math.max(topic.level, aspect.level));
      add({
        word: `${topic.ko} ${aspect.ko}`,
        meaning_ko: `${topic.en} ${aspect.en}`,
        meaning_user_lang: `${topic.ko} 관련 ${aspect.ko}`,
        level,
      });
    }
  }

  const result = [...entries.values()].slice(0, 1000);
  if (result.length !== 1000) {
    throw new Error(`Expected 1000 vocabulary entries, got ${result.length}`);
  }

  return result;
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function importVocabulary(entries: VocabularyEntry[]) {
  const words = entries.map((entry) => entry.word);
  const timestamp = BigInt(Date.now());

  await prisma.user_vocabulary.deleteMany({
    where: {
      vocabulary: {
        word: { notIn: words },
      },
    },
  });
  await prisma.vocabulary.deleteMany({
    where: { word: { notIn: words } },
  });

  for (const wordChunk of chunk(words, 200)) {
    await prisma.user_vocabulary.deleteMany({
      where: {
        vocabulary: {
          word: { in: wordChunk },
        },
      },
    });
    await prisma.vocabulary.deleteMany({
      where: { word: { in: wordChunk } },
    });
  }

  let inserted = 0;
  for (const entryChunk of chunk(entries, 200)) {
    await prisma.vocabulary.createMany({
      data: entryChunk.map((entry) => ({
        word: entry.word,
        meaning_ko: entry.meaning_ko,
        meaning_user_lang: entry.meaning_user_lang,
        level: entry.level,
        tts_url: null,
        is_downloaded: 0,
        updated_at: timestamp,
      })),
    });
    inserted += entryChunk.length;
  }

  const levelCounts = await prisma.vocabulary.groupBy({
    by: ['level'],
    _count: { _all: true },
    where: { word: { in: words } },
    orderBy: { level: 'asc' },
  });

  return {
    inserted,
    levelCounts: levelCounts.map((item) => ({
      level: item.level,
      count: item._count._all,
    })),
  };
}

async function main() {
  const entries = buildVocabulary();
  const result = await importVocabulary(entries);

  console.log('Vocabulary import completed.');
  console.log(JSON.stringify(result, null, 2));
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
