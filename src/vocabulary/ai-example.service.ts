import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import { GenerateAiExampleDto } from './dto/generate-ai-example.dto';

export interface AiExampleResponse {
  korean: string;
  translation: string;
  contextTag: string;
}

const CONTEXT_TAGS = ['일상 대화', 'TOPIK 실전', '사회·문화', '개인 경험', '학술·시사'];

function getTargetLanguageName(langCode: string): string {
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

function cleanTranslation(text: string): string {
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
export class AiExampleService {
  private readonly logger = new Logger(AiExampleService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly redis: RedisService,
  ) {}

  async generateExample(
    dto: GenerateAiExampleDto,
  ): Promise<AiExampleResponse> {
    const word = dto.word.trim();
    const index = Math.max(0, dto.index ?? 0);
    const targetLang = (dto.targetLang || 'ko').toLowerCase();
    const meaning = dto.meaning?.trim();
    const contextTag = CONTEXT_TAGS[index % CONTEXT_TAGS.length];

    const cacheKey = `ai:voca:example:${encodeURIComponent(word)}:${index}:${targetLang}`;

    // 1. Redis 캐시 확인 (30일 TTL)
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as AiExampleResponse;
      }
    } catch (e) {
      this.logger.warn(`Redis get failed for cacheKey: ${cacheKey}`, e);
    }

    // 2. Google Gemini API 호출
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (apiKey && apiKey.trim().length > 0) {
      try {
        const primaryModel =
          this.configService.get<string>('GEMINI_MODEL') ||
          'gemini-flash-lite-latest';
        const result = await this.callGeminiApi(
          apiKey,
          primaryModel,
          word,
          meaning,
          index,
          targetLang,
          contextTag,
        );

        if (result) {
          // Redis에 30일간 캐싱 (2,592,000초)
          try {
            await this.redis.set(cacheKey, JSON.stringify(result), 2592000);
          } catch (cacheErr) {
            this.logger.warn(`Redis set failed for cacheKey: ${cacheKey}`, cacheErr);
          }
          return result;
        }
      } catch (geminiErr) {
        this.logger.error(
          `Gemini API generation failed for word "${word}": ${geminiErr}`,
        );
      }
    } else {
      this.logger.warn(
        `GEMINI_API_KEY is not configured. Serving fallback example for "${word}".`,
      );
    }

    // 3. Fallback 생성 (API 키가 없거나 일시적 오류 시 안정적인 대체 응답)
    const fallback = this.generateFallback(word, meaning, index, targetLang, contextTag);
    return fallback;
  }

  private async callGeminiApi(
    apiKey: string,
    model: string,
    word: string,
    meaning: string | undefined,
    index: number,
    targetLang: string,
    contextTag: string,
  ): Promise<AiExampleResponse | null> {
    const targetLangName = getTargetLanguageName(targetLang);

    const prompt = `당신은 한국어 교육 및 TOPIK(한국어능력시험) 전문 AI 한국어 강사입니다.
제공된 한국어 단어의 품사(명사/동사/형용사/부사 등)와 의미에 꼭 맞는 자연스럽고 정확한 한국어 예문과 학습자 모국어 번역을 생성하세요.

[단어 정보]
- 단어: "${word}"
- 의미 맥락: "${meaning || '기본 사전적 의미'}"
- 예문 변형 순번: ${index} (매 순번마다 다른 상황, 일상, 시험 문맥의 새로운 예문을 생성하세요)
- 문맥 스타일: "${contextTag}"
- 목표 번역 언어: "${targetLangName}"

[필수 원칙]
1. 한국어 예문은 반드시 단어 '${word}'가 올바른 조사/어미와 함께 자연스럽게 결합된 완성형 문장이어야 합니다.
2. 기계적인 템플릿(예: '평소에 ~을 중요하게 생각합니다')을 절대 사용하지 마세요. 실제 원어민 대화나 TOPIK 지문에서 사용되는 생동감 있는 문장이어야 합니다.
3. ${contextTag} 스타일의 어조와 문맥을 반영하세요.
4. 번역은 목표 언어('${targetLangName}')로 정확하고 매끄럽게 번역하세요.
5. 반드시 아래 JSON 형식으로만 응답하세요:
{
  "korean": "자연스러운 한국어 예문",
  "translation": "목표 언어 번역 문장",
  "contextTag": "${contextTag}"
}`;

    const modelsToTry = Array.from(
      new Set([
        model,
        'gemini-flash-lite-latest',
        'gemini-3.1-flash-lite',
        'gemini-flash-latest',
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
                temperature: 0.7,
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
          continue; // 다른 모델 시도
        }

        const data = await response.json();
        const textContent =
          data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (textContent) {
          const parsed = JSON.parse(textContent);
          if (parsed && typeof parsed.korean === 'string') {
            return {
              korean: parsed.korean.trim(),
              translation: cleanTranslation(parsed.translation || meaning || parsed.korean),
              contextTag: parsed.contextTag || contextTag,
            };
          }
        }
      } catch (err) {
        this.logger.warn(`Model ${m} call failed: ${err}`);
      }
    }

    return null;
  }

  private generateFallback(
    word: string,
    meaning: string | undefined,
    index: number,
    targetLang: string,
    contextTag: string,
  ): AiExampleResponse {
    // 동사/형용사 등 품사를 고려한 자연스러운 기본형 문맥
    const isVerbOrAdj = word.endsWith('다');
    const stem = isVerbOrAdj ? word.slice(0, -1) : word;

    let korean = '';
    if (isVerbOrAdj) {
      const verbPatterns = [
        `매일 꾸준히 ${stem}는 습관을 기르는 것이 중요합니다.`,
        `실제 상황에서 어떻게 ${stem}는지 직접 확인해 보았습니다.`,
        `이 문제를 해결하기 위해 다양한 방식으로 ${stem}려고 노력했습니다.`,
        `전문가들은 앞으로 더 적극적으로 ${stem}야 한다고 강조했습니다.`,
        `경험이 쌓일수록 ${stem}는 방법도 점점 익숙해집니다.`,
      ];
      korean = verbPatterns[index % verbPatterns.length];
    } else {
      const nounPatterns = [
        `이번 시험에서는 ${word}와 관련된 표현이 자주 출제되었습니다.`,
        `한국 생활을 하면서 ${word}의 중요성을 깊이 느끼게 되었습니다.`,
        `다양한 문맥 속에서 ${word}의 쓰임새를 정확히 익혀 두세요.`,
        `최근 연구에 따르면 ${word}에 대한 관심이 지속적으로 증가하고 있습니다.`,
        `친구와의 대화에서 ${word}라는 표현을 자연스럽게 사용해 보았습니다.`,
      ];
      korean = nounPatterns[index % nounPatterns.length];
    }

    const translation = meaning
      ? `(${word}: ${cleanTranslation(meaning)}) ${korean}`
      : korean;

    return {
      korean,
      translation,
      contextTag,
    };
  }
}
