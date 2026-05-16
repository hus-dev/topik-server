import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import * as bcrypt from 'bcrypt';

function getDatabaseUrl() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not set');
  const url = new URL(connectionString);
  if (url.protocol === 'mysql:') url.protocol = 'mariadb:';
  if (url.hostname === 'localhost' || url.hostname === '::1') url.hostname = '127.0.0.1';
  if (!url.searchParams.has('allowPublicKeyRetrieval')) url.searchParams.set('allowPublicKeyRetrieval', 'true');
  return url.toString();
}

function createPrismaClient() {
  return new PrismaClient({ adapter: new PrismaMariaDb(getDatabaseUrl()) });
}

async function main() {
  const prisma = createPrismaClient();
  const baseTime = BigInt(Date.now());

  try {
    console.log('🚀 Starting Full Database Seeding (TOPIK II 102nd Exam)...');

    // 1. CLEANUP (Using a safer MariaDB cleanup method)
    console.log('🧹 Clearing existing data...');
    
    // List tables in correct dependency order (children first)
    const tables = [
      'answers',
      'user_downloads',
      'user_vocabulary',
      'user_grammar_items',
      'sync_queue',
      'exam_sessions',
      'question_media',
      'question_options',
      'explanation_videos',
      'questions',
      'question_passages',
      'question_sets',
      'topik_exam_schedules',
      'users'
    ];

    for (const table of tables) {
      try {
        await prisma.$executeRawUnsafe(`DELETE FROM \`${table}\`;`);
      } catch (e) {
        console.warn(`⚠️ Could not clear table ${table}, attempting to force...`);
        await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0;');
        await prisma.$executeRawUnsafe(`DELETE FROM \`${table}\`;`);
        await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1;');
      }
    }

    // 2. CREATE ADMIN & USER
    console.log('👤 Creating test users...');
    const adminPassword = await bcrypt.hash('Admin1234!', 10);
    const userPassword = await bcrypt.hash('User1234!', 10);

    await prisma.users.create({
      data: {
        id: 'admin-id',
        email: 'mock-admin@topik.local',
        nickname: 'AdminMaster',
        password_hash: adminPassword,
        role: 'admin',
        provider: 'local',
        target_level: 6,
        language_code: 'ko',
        timezone: 'Asia/Seoul',
        timer_mode: 'normal',
        created_at: baseTime,
        updated_at: baseTime,
      }
    });

    await prisma.users.create({
      data: {
        id: 'user-id',
        email: 'mock-user@topik.local',
        nickname: 'TopikLearner',
        password_hash: userPassword,
        role: 'user',
        provider: 'local',
        target_level: 4,
        language_code: 'ko',
        timezone: 'Asia/Seoul',
        timer_mode: 'normal',
        created_at: baseTime,
        updated_at: baseTime,
      }
    });

    // 3. SEED TOPIK II READING (102nd)
    const readingSetId = 'topik2-102-reading';
    console.log('📚 Seeding Reading Section...');
    await prisma.question_sets.create({
      data: {
        id: readingSetId,
        title: '제 102회 TOPIK II 읽기',
        section: 'reading',
        level: 4,
        exam_kind: 'past',
        total_questions: 50,
        duration_seconds: 4200,
        display_order: 1021,
        created_at: baseTime,
        updated_at: baseTime,
      },
    });

    const readingData = [
      { number: 1, prompt: '( )에 들어갈 가장 알맞은 것을 고르십시오.', content: '이 동네로 이사를 ( ) 일 년이 됐다.', options: ['온 지', '올 때', '오거나', '오다가'], answer: '1' },
      { number: 5, prompt: '다음은 무엇에 대한 글인지 고르십시오.', content: '걸을 때 발이 편하게~ 가볍고 디자인도 예뻐요.', options: ['구두', '우산', '자전거', '선풍기'], answer: '1' },
      { number: 13, prompt: '순서대로 알맞게 나열한 것을 고르십시오.', content: '(가) 그래서 껍질째 먹기도 편하고 식감도 좋다.\n(나) 신비 복숭아는 2017년에 한국에 처음 소개된 여름 과일이다.\n(다) 다른 복숭아에 비해 이른 시기에 먹을 수 있다는 것도 장점이다.\n(라) 껍질이 얇은 복숭아와 속이 부드러운 복숭아의 장점을 결합해 만들었다.', options: ['나-라-가-다', '나-가-다-라', '라-나-다-가', '라-다-가-나'], answer: '1' },
      { number: 44, prompt: '( )에 들어갈 말로 가장 알맞은 것을 고르십시오.', content: '르네상스 시대에 꽃을 피운 해부학은 인체의 내부를 파악할 수 있게 해... (중략) ... 이전의 그림에서는 ( ) 알지 못해 사람의 발이 떠 있는 것처럼 어색하게 그렸다.', options: ['질병이 언제 발생하는지', '근육이 어떻게 움직이는지', '인체의 구조가 왜 단순해지는지', '해부학이 어떤 식으로 분류되는지'], answer: '2' },
    ];

    for (const q of readingData) {
      const passage = await prisma.question_passages.create({
        data: { id: `${readingSetId}-q${q.number}-p`, content: q.content, created_at: baseTime, updated_at: baseTime }
      });
      await prisma.questions.create({
        data: {
          id: `${readingSetId}-q${q.number}`, set_id: readingSetId, passage_id: passage.id, section: 'reading', question_type: 'multiple_choice',
          question_number: q.number, level: 4, prompt: q.prompt, correct_answer: q.answer, created_at: baseTime, updated_at: baseTime,
          question_options: { create: q.options.map((opt, idx) => ({ option_number: idx + 1, content: opt, is_correct: idx + 1 === parseInt(q.answer) ? 1 : 0 })) }
        }
      });
    }

    // 4. SEED TOPIK II LISTENING (102nd)
    const listeningSetId = 'topik2-102-listening';
    console.log('🎧 Seeding Listening Section...');
    await prisma.question_sets.create({
      data: {
        id: listeningSetId,
        title: '제 102회 TOPIK II 듣기',
        section: 'listening',
        level: 4,
        exam_kind: 'past',
        total_questions: 50,
        duration_seconds: 3600,
        display_order: 1022,
        created_at: baseTime,
        updated_at: baseTime,
      },
    });

    const listeningData = [
      { number: 1, prompt: '가장 알맞은 그림을 고르십시오.', transcript: '남자: 이 책을 소포로 보내고 싶은데요. 소포 상자 살 수 있지요?', options: ['그림 1: 카운터', '그림 2: 상자 선택', '그림 3: 포장', '그림 4: 접수'], answer: '2', audio: '2-01.mp3' },
      { number: 4, prompt: '이어질 수 있는 말로 알맞은 것을 고르십시오.', transcript: '남자: 우리 차 한잔할까? 저 카페 어때?', options: ['카페를 찾고 있어.', '같이 들어가 보자.', '벌써 만난 것 같아.', '차를 마시기로 했어.'], answer: '2', audio: '2-04.mp3' },
      { number: 31, prompt: '남자의 중심 생각으로 알맞은 것을 고르십시오.', transcript: '남자: 휴일이나 야간에 문을 여는 약국이 점점 줄고 있습니다. 편의점에서 더 많은 의약품을 판매하도록 해야 합니다.', options: ['편의점 판매 실태 조사', '사용 교육 필요', '판매 품목 확대', '정부 관리 필요'], answer: '3', audio: '2-31.mp3' },
    ];

    for (const q of listeningData) {
      await prisma.questions.create({
        data: {
          id: `${listeningSetId}-q${q.number}`, set_id: listeningSetId, section: 'listening', question_type: 'multiple_choice',
          question_number: q.number, level: 4, prompt: q.prompt, correct_answer: q.answer, created_at: baseTime, updated_at: baseTime,
          question_options: { create: q.options.map((opt, idx) => ({ option_number: idx + 1, content: opt, is_correct: idx + 1 === parseInt(q.answer) ? 1 : 0 })) },
          question_media: { create: { media_type: 'audio', url: `/topik_data/제102회 TOPIK2 듣기파일/${q.audio}`, transcript: q.transcript, created_at: baseTime, updated_at: baseTime } }
        }
      });
    }

    console.log('✅ Full Seeding Completed Successfully!');
  } catch (error) {
    console.error('❌ Seeding Failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
