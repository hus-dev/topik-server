import * as crypto from 'crypto';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { GetAiExplanationDto } from './dto/get-ai-explanation.dto';
import { GetAiWritingFeedbackDto } from './dto/get-ai-writing-feedback.dto';

export interface KeyVocabItem {
  korean: string;
  translation: string;
}

export interface AiExplanationPayload {
  wrongReason: string;
  correctReason: string;
  keyVocabulary: KeyVocabItem[];
  tip: string;
}

export interface QuestionAiExplanationResult {
  questionId: string;
  selectedOption: string;
  correctAnswer: string;
  isCorrect: boolean;
  languageCode: string;
  explanation: AiExplanationPayload;
  rawExplanationText: string;
  source: 'cache' | 'db' | 'ai' | 'fallback';
}

export interface WritingGrammarCorrection {
  original: string;
  corrected: string;
  reason: string;
}

export interface WritingFeedbackPayload {
  scoreEstimate: string;
  grammarCorrections: WritingGrammarCorrection[];
  deductionPoints: string;
  polishedVersion: string;
  nativeFeedback: string;
  keyVocabulary: KeyVocabItem[];
}

export interface QuestionAiWritingFeedbackResult {
  questionId: string;
  userAnswer: string;
  languageCode: string;
  feedback: WritingFeedbackPayload;
  source: 'cache' | 'ai' | 'fallback';
}


function getLanguageFullName(langCode: string): string {
  const map: Record<string, string> = {
    ko: 'Korean (한국어)',
    en: 'English',
    uz: 'Uzbek (Oʻzbek tili)',
    ru: 'Russian (Русский)',
    vi: 'Vietnamese (Tiếng Việt)',
    zh: 'Chinese (中文)',
    ja: 'Japanese (日本語)',
    fr: 'French (Français)',
    de: 'German (Deutsch)',
  };
  return map[langCode.toLowerCase()] || langCode;
}

function cleanText(text: string): string {
  if (!text) return '';
  return text
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16)),
    )
    .trim();
}

@Injectable()
export class QuestionsAiExplanationService {
  private readonly logger = new Logger(QuestionsAiExplanationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly configService: ConfigService,
  ) {}

  async explainQuestion(
    questionId: string,
    dto: GetAiExplanationDto,
    fallbackUserLang?: string,
  ): Promise<QuestionAiExplanationResult> {
    const question = await this.prisma.questions.findUnique({
      where: { id: questionId },
      include: {
        question_options: {
          orderBy: { option_number: 'asc' },
        },
        question_passages: true,
      },
    });

    if (!question) {
      throw new NotFoundException(`Question with ID ${questionId} not found`);
    }

    const rawSelected = (dto.selectedOption || '').trim();
    const rawCorrect = (question.correct_answer || '').trim();

    // 정규화된 옵션 번호/라벨 식별 (예: "2" or "2. 선택지" -> "2")
    const cleanSelected = this.normalizeOption(rawSelected);
    const cleanCorrect = this.normalizeOption(rawCorrect);
    const isCorrect = cleanSelected === cleanCorrect;

    const targetLang = (
      dto.languageCode ||
      fallbackUserLang ||
      'uz'
    ).toLowerCase();

    const cacheKey = `ai:q_expl:${questionId}:${cleanSelected}:${targetLang}`;

    // 1. Redis 캐시 확인 (30일 TTL)
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as QuestionAiExplanationResult;
        return { ...parsed, source: 'cache' };
      }
    } catch (e) {
      this.logger.warn(`Redis get failed for key: ${cacheKey}`, e);
    }

    // 2. DB 영구 캐시(question_ai_explanations) 확인
    try {
      const dbRecord = await this.prisma.question_ai_explanations.findUnique({
        where: {
          question_id_selected_option_language_code: {
            question_id: questionId,
            selected_option: cleanSelected,
            language_code: targetLang,
          },
        },
      });

      if (dbRecord) {
        let parsedPayload: AiExplanationPayload;
        try {
          parsedPayload = JSON.parse(dbRecord.explanation);
        } catch {
          parsedPayload = {
            wrongReason: '',
            correctReason: dbRecord.explanation,
            keyVocabulary: [],
            tip: '',
          };
        }

        const rawText = this.formatRawText(
          parsedPayload,
          cleanSelected,
          cleanCorrect,
          isCorrect,
        );

        const result: QuestionAiExplanationResult = {
          questionId,
          selectedOption: cleanSelected,
          correctAnswer: cleanCorrect,
          isCorrect,
          languageCode: targetLang,
          explanation: parsedPayload,
          rawExplanationText: rawText,
          source: 'db',
        };

        // Redis에 30일(2,592,000초) 캐싱
        try {
          await this.redis.set(cacheKey, JSON.stringify(result), 2592000);
        } catch (err) {
          this.logger.warn(`Failed to set Redis cache for key ${cacheKey}: ${err}`);
        }
        return result;
      }
    } catch (dbErr) {
      this.logger.warn(`DB findUnique failed for question explanation: ${dbErr}`);
    }

    // 3. Gemini AI 실시간 해설 생성
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (apiKey && apiKey.trim().length > 0) {
      try {
        const primaryModel =
          this.configService.get<string>('GEMINI_MODEL') ||
          'gemini-flash-lite-latest';

        const aiPayload = await this.callGeminiApi(
          apiKey,
          primaryModel,
          question,
          cleanSelected,
          cleanCorrect,
          isCorrect,
          targetLang,
        );

        if (aiPayload) {
          const rawText = this.formatRawText(
            aiPayload,
            cleanSelected,
            cleanCorrect,
            isCorrect,
          );

          const result: QuestionAiExplanationResult = {
            questionId,
            selectedOption: cleanSelected,
            correctAnswer: cleanCorrect,
            isCorrect,
            languageCode: targetLang,
            explanation: aiPayload,
            rawExplanationText: rawText,
            source: 'ai',
          };

          // DB에 영구 저장 (upsert)
          try {
            await this.prisma.question_ai_explanations.upsert({
              where: {
                question_id_selected_option_language_code: {
                  question_id: questionId,
                  selected_option: cleanSelected,
                  language_code: targetLang,
                },
              },
              create: {
                question_id: questionId,
                selected_option: cleanSelected,
                language_code: targetLang,
                explanation: JSON.stringify(aiPayload),
                created_at: BigInt(Date.now()),
              },
              update: {
                explanation: JSON.stringify(aiPayload),
              },
            });
          } catch (err) {
            this.logger.warn(`Failed to persist question_ai_explanations: ${err}`);
          }

          // questions 테이블의 ai_explanation 필드도 최신 해설로 동기화
          try {
            await this.prisma.questions.update({
              where: { id: questionId },
              data: {
                ai_explanation: rawText.slice(0, 3990),
                is_ai_generated: 1,
              },
            });
          } catch (err) {
            this.logger.warn(`Failed to update questions.ai_explanation: ${err}`);
          }

          // Redis에 30일 캐싱
          try {
            await this.redis.set(cacheKey, JSON.stringify(result), 2592000);
          } catch (err) {
            this.logger.warn(`Failed to cache result in Redis: ${err}`);
          }

          return result;
        }
      } catch (geminiErr) {
        this.logger.error(`Gemini explanation generation failed: ${geminiErr}`);
      }
    } else {
      this.logger.warn(`GEMINI_API_KEY is not set. Using structured fallback.`);
    }

    // 4. Fallback 처리
    const fallbackPayload = this.generateFallback(
      question,
      cleanSelected,
      cleanCorrect,
      isCorrect,
      targetLang,
    );
    const rawFallbackText = this.formatRawText(
      fallbackPayload,
      cleanSelected,
      cleanCorrect,
      isCorrect,
    );

    return {
      questionId,
      selectedOption: cleanSelected,
      correctAnswer: cleanCorrect,
      isCorrect,
      languageCode: targetLang,
      explanation: fallbackPayload,
      rawExplanationText: rawFallbackText,
      source: 'fallback',
    };
  }

  private normalizeOption(text: string): string {
    if (!text) return '';
    const match = text.match(/^([1-4])/);
    if (match) return match[1];
    return text.trim();
  }

  private formatRawText(
    payload: AiExplanationPayload,
    selected: string,
    correct: string,
    isCorrect: boolean,
  ): string {
    const parts: string[] = [];

    if (!isCorrect && payload.wrongReason) {
      parts.push(`❌ [선택한 ${selected}번이 오답인 이유]\n${payload.wrongReason}`);
    }

    if (payload.correctReason) {
      parts.push(
        isCorrect
          ? `✅ [정답 ${correct}번 해설]\n${payload.correctReason}`
          : `✅ [정답 ${correct}번인 이유]\n${payload.correctReason}`,
      );
    }

    if (payload.keyVocabulary && payload.keyVocabulary.length > 0) {
      const vocabList = payload.keyVocabulary
        .map((v) => `• ${v.korean}: ${v.translation}`)
        .join('\n');
      parts.push(`💡 [핵심 단어]\n${vocabList}`);
    }

    if (payload.tip) {
      parts.push(`📌 [문제 풀이 팁]\n${payload.tip}`);
    }

    return parts.join('\n\n');
  }

  private async callGeminiApi(
    apiKey: string,
    model: string,
    question: any,
    selectedOption: string,
    correctAnswer: string,
    isCorrect: boolean,
    targetLang: string,
  ): Promise<AiExplanationPayload | null> {
    const targetLangName = getLanguageFullName(targetLang);

    const optionsText = (question.question_options || [])
      .map((o: any) => `${o.option_number}. ${o.content}`)
      .join('\n');

    const passageText =
      question.question_passages?.passage_text ||
      question.question_passages?.title ||
      '';

    const selectedOptionObj = (question.question_options || []).find(
      (o: any) => String(o.option_number) === selectedOption,
    );
    const selectedOptionContent = selectedOptionObj
      ? `${selectedOptionObj.option_number}. ${selectedOptionObj.content}`
      : selectedOption;

    const correctOptionObj = (question.question_options || []).find(
      (o: any) => String(o.option_number) === correctAnswer,
    );
    const correctOptionContent = correctOptionObj
      ? `${correctOptionObj.option_number}. ${correctOptionObj.content}`
      : correctAnswer;

    const prompt = `당신은 외국인 학생을 위한 친절하고 전문적인 TOPIK(한국어능력시험) 전문 AI 튜터입니다.
학생이 문제를 풀고 해설을 요청했습니다.
반드시 학생의 모국어인 [${targetLangName}]로 명확하고 이해하기 쉽게 해설을 작성하세요.

[시험 문제 정보]
- 영역: ${question.section || 'TOPIK'}
- 문제 유형: ${question.question_type || '객관식'}
- 지문 본문(Passage):
"""
${passageText || '(지문 없음 / 발문 참조)'}
"""
- 문제 발문(Prompt):
"${question.prompt || ''}"
- 선택지 목록:
${optionsText || '(선택지 없음)'}
- 정답: ${correctOptionContent}
- 학생이 선택한 답: ${selectedOptionContent}
- 기존 기본 해설(참고용): "${question.explanation || ''}"

[작성 지침]
1. 해설 언어: 모든 설명 문장은 반드시 [${targetLangName}]로 작성해야 합니다.
2. 학생의 답 (${selectedOptionContent})이 왜 오답인지:
   - 지문의 어느 부분과 불일치하거나 왜 왜곡된 것인지 구체적인 단서와 함께 설명하세요.
   - 만약 학생이 정답을 맞춘 경우라면, wrongReason은 빈 문자열("")로 두세요.
3. 정답 (${correctOptionContent})이 왜 올바른지:
   - 지문 속 핵심 문장이나 근거를 짚어주며 명쾌하게 설명하세요.
4. 핵심 어휘(keyVocabulary):
   - 문제 풀이에 결정적이었던 중요 한국어 단어 2~3개를 선별하고, korean에는 한국어 원형, translation에는 [${targetLangName}] 뜻을 작성하세요.
5. 학습 팁(tip):
   - 이와 유사한 TOPIK 문제를 풀 때 실수하지 않는 실전 요령을 [${targetLangName}]로 1~2문장으로 조언하세요.

[응답 형식 - 오직 아래 JSON 포맷으로만 응답]:
{
  "wrongReason": "${targetLangName}로 작성된 오답 이유",
  "correctReason": "${targetLangName}로 작성된 정답 이유",
  "keyVocabulary": [
    { "korean": "한국어 단어", "translation": "${targetLangName} 번역" }
  ],
  "tip": "${targetLangName}로 작성된 풀이 팁"
}`;

    const modelsToTry = Array.from(
      new Set([
        model,
        'gemini-flash-lite-latest',
        'gemini-3.1-flash-lite',
        'gemini-3.5-flash',
        'gemini-3.8-flash',
      ]),
    );

    for (const m of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);

        let response: Response;
        try {
          response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [{ text: prompt }],
                },
              ],
              generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.3,
              },
            }),
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeout);
        }

        if (!response.ok) {
          const errText = await response.text();
          this.logger.warn(`Gemini (${m}) returned HTTP ${response.status}: ${errText}`);
          continue;
        }

        const data = await response.json();
        const textContent =
          data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (textContent) {
          const parsed = JSON.parse(textContent);
          return {
            wrongReason: cleanText(parsed.wrongReason || ''),
            correctReason: cleanText(parsed.correctReason || ''),
            keyVocabulary: Array.isArray(parsed.keyVocabulary)
              ? parsed.keyVocabulary.map((v: any) => ({
                  korean: cleanText(v.korean || ''),
                  translation: cleanText(v.translation || ''),
                }))
              : [],
            tip: cleanText(parsed.tip || ''),
          };
        }
      } catch (err) {
        this.logger.warn(`Model ${m} call failed for explanation: ${err}`);
      }
    }

    return null;
  }

  private generateFallback(
    question: any,
    selectedOption: string,
    correctAnswer: string,
    isCorrect: boolean,
    targetLang: string,
  ): AiExplanationPayload {
    const baseExplanation = question.explanation
      ? cleanText(question.explanation)
      : '지문의 맥락을 주의 깊게 살펴보세요.';

    if (isCorrect) {
      return {
        wrongReason: '',
        correctReason: `정답은 ${correctAnswer}번입니다. ${baseExplanation}`,
        keyVocabulary: [],
        tip: '정답의 핵심 근거가 지문에 명확히 제시되어 있습니다.',
      };
    }

    return {
      wrongReason: `선택하신 ${selectedOption}번은 본문의 내용과 일치하지 않거나 함정 선지입니다.`,
      correctReason: `올바른 정답은 ${correctAnswer}번입니다. ${baseExplanation}`,
      keyVocabulary: [],
      tip: '지문에서 정답과 직접 관련된 핵심 표현의 전후 문맥을 확인하세요.',
    };
  }

  async provideWritingFeedback(
    questionId: string,
    dto: GetAiWritingFeedbackDto,
    fallbackUserLang?: string,
  ): Promise<QuestionAiWritingFeedbackResult> {
    const question = await this.prisma.questions.findUnique({
      where: { id: questionId },
      include: {
        question_passages: true,
      },
    });

    if (!question) {
      throw new NotFoundException(`Question with ID ${questionId} not found`);
    }

    const rawUserAnswer = (dto.userAnswer || '').trim();
    const targetLang = (
      dto.languageCode ||
      fallbackUserLang ||
      'uz'
    ).toLowerCase();

    const answerHash = crypto
      .createHash('md5')
      .update(rawUserAnswer)
      .digest('hex')
      .slice(0, 12);

    const cacheKey = `ai:w_fb:${questionId}:${answerHash}:${targetLang}`;

    // 1. Redis 캐시 확인 (30일 TTL)
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as QuestionAiWritingFeedbackResult;
        return { ...parsed, source: 'cache' };
      }
    } catch (e) {
      this.logger.warn(`Redis get failed for writing feedback: ${cacheKey}`, e);
    }

    // 2. Gemini AI 첨삭 생성
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (apiKey && apiKey.trim().length > 0) {
      try {
        const primaryModel =
          this.configService.get<string>('GEMINI_MODEL') ||
          'gemini-flash-lite-latest';

        const aiFeedback = await this.callGeminiWritingApi(
          apiKey,
          primaryModel,
          question,
          rawUserAnswer,
          targetLang,
        );

        if (aiFeedback) {
          const result: QuestionAiWritingFeedbackResult = {
            questionId,
            userAnswer: rawUserAnswer,
            languageCode: targetLang,
            feedback: aiFeedback,
            source: 'ai',
          };

          try {
            await this.redis.set(cacheKey, JSON.stringify(result), 2592000);
          } catch (err) {
            this.logger.warn(`Failed to cache writing feedback in Redis: ${err}`);
          }

          return result;
        }
      } catch (err) {
        this.logger.error(`Gemini writing feedback generation failed: ${err}`);
      }
    }

    // 3. Fallback
    const fallbackFeedback = this.generateWritingFallback(
      question,
      rawUserAnswer,
      targetLang,
    );

    return {
      questionId,
      userAnswer: rawUserAnswer,
      languageCode: targetLang,
      feedback: fallbackFeedback,
      source: 'fallback',
    };
  }

  private async callGeminiWritingApi(
    apiKey: string,
    model: string,
    question: any,
    userAnswer: string,
    targetLang: string,
  ): Promise<WritingFeedbackPayload | null> {
    const targetLangName = getLanguageFullName(targetLang);

    const passageText =
      question.question_passages?.passage_text ||
      question.question_passages?.title ||
      '';

    const prompt = `당신은 외국인 학생을 위한 TOPIK II(한국어능력시험) 쓰기 영역 전문 수석 채점관이자 첨삭 지도 강사입니다.
학생이 작성한 쓰기 답안을 공식 TOPIK 채점 기준에 따라 엄격하고 친절하게 정밀 첨삭해 주세요.
모든 설명, 감점 요인, 총평은 반드시 학생의 모국어인 [${targetLangName}]로 명확하게 작성하세요.

[시험 문제 정보]
- 문제 번호: ${question.questionNumber}번
- 문제 유형: ${question.question_type || '쓰기'}
- 문제 지문 / 제시문:
"""
${passageText || '(지문 없음 / 발문 참조)'}
"""
- 문제 발문 / 조건:
"${question.prompt || ''}"
- 공식 모범 답안:
"${question.correct_answer || ''}"
- 채점 기준 및 해설:
"${question.explanation || ''}"

[학생이 작성한 답안]
"""
${userAnswer || '(답안 미작성)'}
"""

[채점 및 첨삭 지침]
1. 문제 유형별 핵심 기준:
   - 51번/52번(단답형 빈칸): ㉠, ㉡의 문맥 적합성, 종결어미 격식체(-ㅂ니다/습니다 vs -ㄴ/는다), 주술 호응 검사.
   - 53번(소논술/도표): 그래프 정보 누락 여부, -ㄴ/는다 평어체 일관성, 분량(200~300자), 표현의 객관성.
   - 54번(대논술): 3대 제시 조건 충족, 단락 전개, 격식체, 어휘의 다양성.
2. grammarCorrections:
   - 학생 글에서 맞춤법, 띄어쓰기, 조사, 어미가 잘못된 부분을 찾아 original(원문), corrected(교정안), reason([${targetLangName}]로 작성된 이유)으로 배열 구성.
3. scoreEstimate: 예상 획득 점수 (예: "7 / 10점", "23 / 30점").
4. deductionPoints: 어떤 부분에서 왜 감점되었는지 [${targetLangName}]로 구체적으로 설명.
5. polishedVersion: 학생의 원래 의도를 살리면서, 한국어 원어민/TOPIK 최고 득점자 수준으로 자연스럽고 유려하게 다듬은 모범 한국어 문장/단락.
6. nativeFeedback: 학생에게 도움이 되는 종합 총평과 실전 팁을 [${targetLangName}]로 따뜻하게 조언.
7. keyVocabulary: 이 문제를 쓸 때 사용하면 점수가 올라가는 고급 어휘 2~3개 (korean, translation).

[응답 형식 - 반드시 아래 JSON 포맷으로만 응답]:
{
  "scoreEstimate": "예: 8 / 10점",
  "grammarCorrections": [
    {
      "original": "학생의 틀린 부분",
      "corrected": "교정된 올바른 표현",
      "reason": "${targetLangName}로 된 설명"
    }
  ],
  "deductionPoints": "${targetLangName}로 설명된 감점 요인",
  "polishedVersion": "자연스럽게 다듬어진 완성형 한국어 모범 문장",
  "nativeFeedback": "${targetLangName}로 작성된 총평 및 조언",
  "keyVocabulary": [
    { "korean": "한국어 어휘", "translation": "${targetLangName} 번역" }
  ]
}`;

    const modelsToTry = Array.from(
      new Set([
        model,
        'gemini-flash-lite-latest',
        'gemini-3.1-flash-lite',
        'gemini-3.5-flash',
        'gemini-3.8-flash',
      ]),
    );

    for (const m of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        let response: Response;
        try {
          response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.3,
              },
            }),
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeout);
        }

        if (!response.ok) {
          const errText = await response.text();
          this.logger.warn(`Gemini (${m}) returned HTTP ${response.status}: ${errText}`);
          continue;
        }

        const data = await response.json();
        const textContent =
          data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (textContent) {
          const parsed = JSON.parse(textContent);
          return {
            scoreEstimate: cleanText(parsed.scoreEstimate || ''),
            grammarCorrections: Array.isArray(parsed.grammarCorrections)
              ? parsed.grammarCorrections.map((c: any) => ({
                  original: cleanText(c.original || ''),
                  corrected: cleanText(c.corrected || ''),
                  reason: cleanText(c.reason || ''),
                }))
              : [],
            deductionPoints: cleanText(parsed.deductionPoints || ''),
            polishedVersion: cleanText(parsed.polishedVersion || ''),
            nativeFeedback: cleanText(parsed.nativeFeedback || ''),
            keyVocabulary: Array.isArray(parsed.keyVocabulary)
              ? parsed.keyVocabulary.map((v: any) => ({
                  korean: cleanText(v.korean || ''),
                  translation: cleanText(v.translation || ''),
                }))
              : [],
          };
        }
      } catch (err) {
        this.logger.warn(`Model ${m} call failed for writing feedback: ${err}`);
      }
    }

    return null;
  }

  private generateWritingFallback(
    question: any,
    userAnswer: string,
    targetLang: string,
  ): WritingFeedbackPayload {
    const modelAnswer = question.correct_answer || '공식 모범 답안을 참고하세요.';
    return {
      scoreEstimate: '채점 진행 중',
      grammarCorrections: [],
      deductionPoints: '공식 모범 답안과 비교하여 어미와 필수 조건 충족 여부를 확인하세요.',
      polishedVersion: modelAnswer,
      nativeFeedback: '작성하신 답안의 문맥과 어미를 모범 답안과 대조해 보세요.',
      keyVocabulary: [],
    };
  }
}

