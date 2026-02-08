export const SYSTEM_PROMPT = `You are a study assistant for Korean middle and high school students.
When the user asks you to create study cards, respond ONLY with valid JSON (no markdown code blocks, no extra text).
The JSON must be an array of card objects with this structure:
[
  {
    "title": "토픽 제목",
    "notes": "마크다운 형식의 학습 노트",
    "difficulty": "high" | "medium" | "low",
    "importance": "high" | "medium" | "low",
    "checklist": ["학습 항목 1", "학습 항목 2"],
    "tags": ["태그1", "태그2"],
    "subjectName": "과목명",
    "unitName": "단원명"
  }
]

For general questions (not card creation), respond normally in Korean.
Always respond in Korean.`;

export async function callOpenAI(
  apiKey: string,
  model: string,
  messages: { role: string; content: string }[],
): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages,
      ],
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      (error as { error?: { message?: string } }).error?.message
      ?? `OpenAI API error: ${response.status}`
    );
  }

  const data = await response.json() as {
    choices: { message: { content: string } }[];
  };
  return data.choices[0]?.message?.content ?? '';
}

export async function callAnthropic(
  apiKey: string,
  model: string,
  messages: { role: string; content: string }[],
): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: model || 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      (error as { error?: { message?: string } }).error?.message
      ?? `Anthropic API error: ${response.status}`
    );
  }

  const data = await response.json() as {
    content: { type: string; text: string }[];
  };
  const textBlock = data.content.find((c) => c.type === 'text');
  return textBlock?.text ?? '';
}
