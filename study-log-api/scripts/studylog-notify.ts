#!/usr/bin/env npx tsx

/**
 * StudyLog 알림 스크립트
 * OpenClaw Gateway를 통해 Discord 채널에 복습 알림을 보냅니다.
 */

const STUDYLOG_API = 'http://localhost:3100';
const OPENCLAW_GATEWAY = 'http://127.0.0.1:18789';
const GATEWAY_TOKEN = '68a8a66aa2698fdede79feea90c4ff49';
const DISCORD_CHANNEL_ID = '1467439577856999569'; // #현서-학습

interface Topic {
  id: string;
  title: string;
  subjectName: string;
  subjectColor: string;
  column: string;
}

interface Stats {
  totalXp: number;
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: string | null;
}

async function getDueCards(): Promise<Topic[]> {
  const res = await fetch(`${STUDYLOG_API}/api/reviews/due-today`);
  return res.json();
}

async function getStats(): Promise<Stats> {
  const res = await fetch(`${STUDYLOG_API}/api/stats`);
  return res.json();
}

async function sendDiscordMessage(message: string): Promise<void> {
  // OpenClaw Gateway API를 통해 메시지 전송
  const payload = {
    channel: 'discord',
    target: `channel:${DISCORD_CHANNEL_ID}`,
    message: message,
  };

  try {
    const res = await fetch(`${OPENCLAW_GATEWAY}/api/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GATEWAY_TOKEN}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.error('Failed to send message:', await res.text());
    }
  } catch (err) {
    console.error('Error sending message:', err);
  }
}

async function main() {
  const mode = process.argv[2] || 'check';

  const cards = await getDueCards();
  const stats = await getStats();

  if (mode === 'morning') {
    // 아침 알림: 오늘 복습할 카드 수
    if (cards.length > 0) {
      const subjects = [...new Set(cards.map(c => c.subjectName))];
      const subjectSummary = subjects.map(s => {
        const count = cards.filter(c => c.subjectName === s).length;
        return `${s} ${count}개`;
      }).join(', ');

      await sendDiscordMessage(
        `현서야, 좋은 아침! 오늘 복습할 카드가 ${cards.length}개 있어.\n` +
        `📚 ${subjectSummary}\n` +
        `시간 날 때 복습하자!`
      );
    }
  } else if (mode === 'afternoon') {
    // 오후 알림: 리마인더
    if (cards.length > 0) {
      await sendDiscordMessage(
        `현서야, 아직 복습할 카드가 ${cards.length}개 남았어.\n` +
        `잠깐 시간 내서 복습할까? 하나씩 하면 금방이야!`
      );
    }
  } else if (mode === 'evening') {
    // 저녁 알림: 하루 요약
    const streakEmoji = stats.currentStreak >= 7 ? '🔥' :
                        stats.currentStreak >= 3 ? '✨' : '💪';

    if (cards.length === 0) {
      await sendDiscordMessage(
        `현서야, 오늘 복습 완료! 잘했어! ${streakEmoji}\n` +
        `📊 총 XP: ${stats.totalXp} | 연속 학습: ${stats.currentStreak}일`
      );
    } else {
      await sendDiscordMessage(
        `현서야, 오늘 ${cards.length}개 카드가 아직 남았어.\n` +
        `자기 전에 빠르게 훑어볼까?\n` +
        `📊 현재 XP: ${stats.totalXp} | 연속 학습: ${stats.currentStreak}일`
      );
    }
  } else {
    // 기본: 상태 확인만
    console.log(`Due cards: ${cards.length}`);
    console.log(`Stats: XP=${stats.totalXp}, Streak=${stats.currentStreak}`);

    if (cards.length > 0) {
      console.log('\nCards:');
      cards.forEach(c => console.log(`  - [${c.subjectName}] ${c.title}`));
    }
  }
}

main().catch(console.error);
