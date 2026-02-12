import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config.js';

export interface CurriculumOutline {
  subjects: {
    name: string;
    units: { name: string }[];
  }[];
}

export interface UnitTopicsData {
  topics: {
    title: string;
    difficulty: 'high' | 'medium' | 'low';
    importance: 'high' | 'medium' | 'low';
    checklist: string[];
  }[];
}

const GRADE_LABELS: Record<string, string> = {
  'middle-1': '중학교 1학년',
  'middle-2': '중학교 2학년',
  'middle-3': '중학교 3학년',
  'high-1': '고등학교 1학년',
  'high-2': '고등학교 2학년 (문과)',
  'high-2-science': '고등학교 2학년 (이과)',
  'high-3': '고등학교 3학년 (문과)',
  'high-3-science': '고등학교 3학년 (이과)',
};

function parseJsonFromResponse(text: string): unknown {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse JSON from LLM response');
  }
  return JSON.parse(jsonMatch[0]);
}

export async function generateCurriculumOutline(grade: string): Promise<CurriculumOutline> {
  const anthropic = new Anthropic({ apiKey: config.anthropic.apiKey });
  const gradeLabel = GRADE_LABELS[grade] || grade;

  const systemPrompt = `당신은 한국 교육과정 전문가입니다. 사용자가 요청한 학년의 과목명과 단원명 목록만 JSON으로 생성해주세요.

응답은 반드시 다음 JSON 형식만 출력하세요 (다른 텍스트 없이):
{
  "subjects": [
    {
      "name": "과목명",
      "units": [
        { "name": "단원명" }
      ]
    }
  ]
}

규칙:
1. 해당 학년의 주요 과목 모두 포함 (국어, 수학, 영어, 사회/역사, 과학 등)
2. 각 과목당 실제 교과서 목차 기준으로 빠짐없이 단원을 나열
3. 토픽이나 체크리스트는 포함하지 마세요 - 과목명과 단원명만 출력
4. 2024년 개정 교육과정 기준`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    system: systemPrompt,
    messages: [
      { role: 'user', content: `${gradeLabel} 전체 교과과정의 과목과 단원 목록을 생성해주세요.` },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  return parseJsonFromResponse(text) as CurriculumOutline;
}

export async function generateUnitTopics(
  grade: string,
  subjectName: string,
  unitName: string
): Promise<UnitTopicsData> {
  const anthropic = new Anthropic({ apiKey: config.anthropic.apiKey });
  const gradeLabel = GRADE_LABELS[grade] || grade;

  const systemPrompt = `당신은 한국 교육과정 전문가입니다. 특정 과목의 특정 단원에 대한 세부 토픽과 체크리스트를 JSON으로 생성해주세요.

응답은 반드시 다음 JSON 형식만 출력하세요 (다른 텍스트 없이):
{
  "topics": [
    {
      "title": "세부 토픽/개념",
      "difficulty": "high|medium|low",
      "importance": "high|medium|low",
      "checklist": ["학습해야 할 세부 항목1", "항목2", "항목3"]
    }
  ]
}

규칙:
1. 해당 단원의 핵심 토픽을 5-10개 생성
2. 각 토픽별 3-5개의 체크리스트 항목 포함
3. 난이도(difficulty)와 중요도(importance)는 실제 시험 출제 빈도 기반으로 설정
4. 2024년 개정 교육과정 기준
5. 실제 교과서에서 다루는 내용을 빠짐없이 포함`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `${gradeLabel} '${subjectName}' 과목의 '${unitName}' 단원에 대한 세부 토픽을 생성해주세요.`,
      },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  return parseJsonFromResponse(text) as UnitTopicsData;
}
