import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config.js';

interface CurriculumSubjectData {
  name: string;
  units: {
    name: string;
    topics: {
      title: string;
      difficulty: 'high' | 'medium' | 'low';
      importance: 'high' | 'medium' | 'low';
      checklist: string[];
    }[];
  }[];
}

export interface CurriculumData {
  subjects: CurriculumSubjectData[];
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

export async function generateCurriculum(grade: string): Promise<CurriculumData> {
  const anthropic = new Anthropic({ apiKey: config.anthropic.apiKey });
  const gradeLabel = GRADE_LABELS[grade] || grade;

  const systemPrompt = `당신은 한국 교육과정 전문가입니다. 사용자가 요청한 학년의 전체 교과과정을 JSON 형식으로 생성해주세요.

응답은 반드시 다음 JSON 형식만 출력하세요 (다른 텍스트 없이):
{
  "subjects": [
    {
      "name": "과목명",
      "units": [
        {
          "name": "단원명",
          "topics": [
            {
              "title": "세부 토픽/개념",
              "difficulty": "high|medium|low",
              "importance": "high|medium|low",
              "checklist": ["학습해야 할 세부 항목1", "항목2", "항목3"]
            }
          ]
        }
      ]
    }
  ]
}

규칙:
1. 해당 학년의 주요 과목 모두 포함 (국어, 수학, 영어, 사회/역사, 과학 등)
2. 각 과목당 실제 교과서 기준 단원 구성
3. 각 단원당 5-10개의 핵심 토픽
4. 토픽별 3-5개의 체크리스트 항목
5. 난이도와 중요도는 실제 시험 출제 빈도 기반
6. 총 토픽 수는 과목당 30-50개 정도`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 16000,
    system: systemPrompt,
    messages: [
      { role: 'user', content: `${gradeLabel} 전체 교과과정을 생성해주세요. 2024년 개정 교육과정 기준으로 해주세요.` },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse curriculum JSON from LLM response');
  }

  return JSON.parse(jsonMatch[0]) as CurriculumData;
}
