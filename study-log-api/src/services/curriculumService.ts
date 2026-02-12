import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../database/index.js';
import { generateCurriculumOutline, generateUnitTopics } from './llmService.js';

const SUBJECT_COLORS = [
  '#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1',
  '#13c2c2', '#eb2f96', '#fa8c16', '#a0d911', '#2f54eb',
];

const ALL_GRADES = [
  'middle-1', 'middle-2', 'middle-3',
  'high-1', 'high-2', 'high-2-science',
  'high-3', 'high-3-science',
];

interface CurriculumGenerationProgress {
  phase: number;
  totalUnits: number;
  completedUnits: number;
  currentSubject?: string;
  currentUnit?: string;
}

async function updateProgress(templateId: string, progress: CurriculumGenerationProgress): Promise<void> {
  await getPool().query(
    'UPDATE curriculum_templates SET progress = $1, updated_at = NOW() WHERE id = $2',
    [JSON.stringify(progress), templateId]
  );
}

// === 서버 시작 시 전체 학년 커리큘럼 일괄 생성 ===

export async function initializeAllTemplates(): Promise<void> {
  const pool = getPool();

  for (const grade of ALL_GRADES) {
    const { rows } = await pool.query(
      'SELECT id, status FROM curriculum_templates WHERE grade = $1',
      [grade]
    );

    if (rows.length > 0) {
      const { status } = rows[0] as { id: string; status: string };
      if (status === 'active' || status === 'generating') {
        console.log(`[Curriculum] ${grade}: already ${status}, skipping`);
        continue;
      }
      // archived -> retry
      const id = rows[0].id as string;
      console.log(`[Curriculum] ${grade}: archived, retrying...`);
      await pool.query(
        "UPDATE curriculum_templates SET status = 'generating', progress = '{}', updated_at = NOW() WHERE id = $1",
        [id]
      );
      generateAndSaveTemplate(id, grade).catch((err) => {
        console.error(`[Curriculum] ${grade} generation failed:`, err);
        getPool().query(
          "UPDATE curriculum_templates SET status = 'archived', updated_at = NOW() WHERE id = $1",
          [id]
        ).catch(console.error);
      });
    } else {
      const templateId = uuidv4();
      console.log(`[Curriculum] ${grade}: creating new template ${templateId}`);
      await pool.query(
        "INSERT INTO curriculum_templates (id, grade, status) VALUES ($1, $2, 'generating')",
        [templateId, grade]
      );
      generateAndSaveTemplate(templateId, grade).catch((err) => {
        console.error(`[Curriculum] ${grade} generation failed:`, err);
        getPool().query(
          "UPDATE curriculum_templates SET status = 'archived', updated_at = NOW() WHERE id = $1",
          [templateId]
        ).catch(console.error);
      });
    }
  }
}

// === 전체 초기화 (기존 템플릿 삭제 후 재생성) ===

export async function resetAndRegenerateAll(): Promise<void> {
  const pool = getPool();

  // FK 참조 먼저 삭제
  await pool.query('DELETE FROM user_curriculum_assignments');
  // 기존 템플릿 전부 삭제 (CASCADE로 ct_subjects → ct_units → ct_topics → ct_checklist_items 모두 삭제)
  await pool.query('DELETE FROM curriculum_templates');
  console.log('[Curriculum] All templates deleted, regenerating...');

  await initializeAllTemplates();
}

// === 학년별 템플릿 조회 (학생이 학년 선택 시 사용) ===

export async function getTemplateByGrade(grade: string): Promise<{ id: string; status: string } | null> {
  const pool = getPool();
  const { rows } = await pool.query(
    'SELECT id, status FROM curriculum_templates WHERE grade = $1',
    [grade]
  );
  if (rows.length === 0) return null;
  return { id: rows[0].id as string, status: rows[0].status as string };
}

// === 학생에게 학년 커리큘럼 자동 적용 ===

export async function applyGradeToUser(grade: string, userId: string): Promise<{ success: boolean; error?: string }> {
  const template = await getTemplateByGrade(grade);

  if (!template) {
    return { success: false, error: '해당 학년의 커리큘럼이 아직 생성되지 않았습니다' };
  }

  if (template.status === 'generating') {
    return { success: false, error: '커리큘럼 생성이 진행 중입니다. 잠시 후 다시 시도해주세요' };
  }

  if (template.status === 'archived') {
    return { success: false, error: '커리큘럼 생성에 실패했습니다. 관리자에게 문의하세요' };
  }

  // 이미 해당 템플릿을 적용한 적 있는지 확인
  const pool = getPool();
  const { rows: existing } = await pool.query(
    "SELECT id FROM user_curriculum_assignments WHERE user_id = $1 AND template_id = $2 AND status = 'active'",
    [userId, template.id]
  );
  if (existing.length > 0) {
    return { success: false, error: '이미 해당 학년의 커리큘럼이 적용되어 있습니다' };
  }

  await copyTemplateToUser(template.id, userId);
  return { success: true };
}

// === 2단계 생성 로직 ===

async function generateAndSaveTemplate(templateId: string, grade: string): Promise<void> {
  const pool = getPool();

  // === Phase 1: 과목 + 단원 구조 수집 ===
  await updateProgress(templateId, { phase: 1, totalUnits: 0, completedUnits: 0 });

  const outline = await generateCurriculumOutline(grade);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 재시도 시 기존 데이터 정리
    await client.query('DELETE FROM ct_subjects WHERE template_id = $1', [templateId]);

    const unitRecords: { ctUnitId: string; subjectName: string; unitName: string }[] = [];

    for (let si = 0; si < outline.subjects.length; si++) {
      const subject = outline.subjects[si];
      const ctSubjectId = uuidv4();
      const color = SUBJECT_COLORS[si % SUBJECT_COLORS.length];

      await client.query(
        'INSERT INTO ct_subjects (id, template_id, name, color, sort_order) VALUES ($1, $2, $3, $4, $5)',
        [ctSubjectId, templateId, subject.name, color, si]
      );

      for (let ui = 0; ui < subject.units.length; ui++) {
        const unit = subject.units[ui];
        const ctUnitId = uuidv4();

        await client.query(
          'INSERT INTO ct_units (id, ct_subject_id, name, sort_order) VALUES ($1, $2, $3, $4)',
          [ctUnitId, ctSubjectId, unit.name, ui]
        );

        unitRecords.push({ ctUnitId, subjectName: subject.name, unitName: unit.name });
      }
    }

    await client.query('COMMIT');

    // === Phase 2: 단원별 상세 토픽 수집 ===
    const totalUnits = unitRecords.length;
    let completedUnits = 0;

    await updateProgress(templateId, { phase: 2, totalUnits, completedUnits: 0 });

    for (const unitRecord of unitRecords) {
      await updateProgress(templateId, {
        phase: 2,
        totalUnits,
        completedUnits,
        currentSubject: unitRecord.subjectName,
        currentUnit: unitRecord.unitName,
      });

      try {
        const unitData = await generateUnitTopics(grade, unitRecord.subjectName, unitRecord.unitName);

        const unitClient = await pool.connect();
        try {
          await unitClient.query('BEGIN');

          for (let ti = 0; ti < unitData.topics.length; ti++) {
            const topic = unitData.topics[ti];
            const ctTopicId = uuidv4();

            await unitClient.query(
              'INSERT INTO ct_topics (id, ct_unit_id, title, difficulty, importance, sort_order) VALUES ($1, $2, $3, $4, $5, $6)',
              [ctTopicId, unitRecord.ctUnitId, topic.title, topic.difficulty || 'medium', topic.importance || 'medium', ti]
            );

            for (let ci = 0; ci < (topic.checklist || []).length; ci++) {
              await unitClient.query(
                'INSERT INTO ct_checklist_items (id, ct_topic_id, text, sort_order) VALUES ($1, $2, $3, $4)',
                [uuidv4(), ctTopicId, topic.checklist[ci], ci]
              );
            }
          }

          await unitClient.query('COMMIT');
        } catch (e) {
          await unitClient.query('ROLLBACK');
          throw e;
        } finally {
          unitClient.release();
        }
      } catch (err) {
        console.error(`[Curriculum] Failed: ${unitRecord.subjectName} > ${unitRecord.unitName}:`, err);
      }

      completedUnits++;
    }

    await pool.query(
      "UPDATE curriculum_templates SET status = 'active', progress = $1, updated_at = NOW() WHERE id = $2",
      [JSON.stringify({ phase: 2, totalUnits, completedUnits }), templateId]
    );
    console.log(`[Curriculum] ${grade}: completed (${completedUnits}/${totalUnits} units)`);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function copyTemplateToUser(templateId: string, userId: string): Promise<void> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { rows: ctSubjects } = await client.query(
      'SELECT * FROM ct_subjects WHERE template_id = $1 ORDER BY sort_order',
      [templateId]
    );

    for (const ctSubject of ctSubjects) {
      // 같은 이름의 과목이 이미 있으면 재사용
      const { rows: existingSubjects } = await client.query(
        'SELECT id FROM subjects WHERE user_id = $1 AND name = $2',
        [userId, ctSubject.name]
      );
      const subjectId = existingSubjects.length > 0
        ? existingSubjects[0].id as string
        : uuidv4();

      if (existingSubjects.length === 0) {
        await client.query(
          'INSERT INTO subjects (id, name, color, icon, sort_order, user_id, ct_subject_id) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [subjectId, ctSubject.name, ctSubject.color, ctSubject.icon, ctSubject.sort_order, userId, ctSubject.id]
        );
      }

      const { rows: ctUnits } = await client.query(
        'SELECT * FROM ct_units WHERE ct_subject_id = $1 ORDER BY sort_order',
        [ctSubject.id]
      );

      for (const ctUnit of ctUnits) {
        // 같은 과목 아래에 같은 이름의 단원이 있으면 재사용
        const { rows: existingUnits } = await client.query(
          'SELECT id FROM units WHERE subject_id = $1 AND name = $2',
          [subjectId, ctUnit.name]
        );
        const unitId = existingUnits.length > 0
          ? existingUnits[0].id as string
          : uuidv4();

        if (existingUnits.length === 0) {
          await client.query(
            'INSERT INTO units (id, subject_id, name, sort_order, ct_unit_id) VALUES ($1, $2, $3, $4, $5)',
            [unitId, subjectId, ctUnit.name, ctUnit.sort_order, ctUnit.id]
          );
        }

        const { rows: ctTopics } = await client.query(
          'SELECT * FROM ct_topics WHERE ct_unit_id = $1 ORDER BY sort_order',
          [ctUnit.id]
        );

        for (const ctTopic of ctTopics) {
          // 같은 단원 아래에 같은 제목의 토픽이 있으면 건너뜀
          const { rows: existingTopics } = await client.query(
            'SELECT id FROM topics WHERE unit_id = $1 AND title = $2',
            [unitId, ctTopic.title]
          );
          if (existingTopics.length > 0) continue;

          const topicId = uuidv4();
          await client.query(
            `INSERT INTO topics (id, subject_id, unit_id, title, difficulty, importance, sort_order, template_topic_id, column_name)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'backlog')`,
            [topicId, subjectId, unitId, ctTopic.title, ctTopic.difficulty, ctTopic.importance, ctTopic.sort_order, ctTopic.id]
          );

          const { rows: ctChecklist } = await client.query(
            'SELECT * FROM ct_checklist_items WHERE ct_topic_id = $1 ORDER BY sort_order',
            [ctTopic.id]
          );

          for (const item of ctChecklist) {
            await client.query(
              'INSERT INTO checklist_items (id, topic_id, text, sort_order) VALUES ($1, $2, $3, $4)',
              [uuidv4(), topicId, item.text, item.sort_order]
            );
          }
        }
      }
    }

    await client.query(
      'INSERT INTO user_curriculum_assignments (id, user_id, template_id) VALUES ($1, $2, $3)',
      [uuidv4(), userId, templateId]
    );

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function getTemplateStatus(templateId: string): Promise<string> {
  const pool = getPool();
  const { rows } = await pool.query('SELECT status FROM curriculum_templates WHERE id = $1', [templateId]);
  return rows.length > 0 ? (rows[0].status as string) : 'not_found';
}

export async function getTemplateStatusWithProgress(
  templateId: string
): Promise<{ status: string; progress?: CurriculumGenerationProgress }> {
  const pool = getPool();
  const { rows } = await pool.query(
    'SELECT status, progress FROM curriculum_templates WHERE id = $1',
    [templateId]
  );
  if (rows.length === 0) {
    return { status: 'not_found' };
  }
  const row = rows[0] as { status: string; progress: CurriculumGenerationProgress | Record<string, never> };
  const progress = row.progress && Object.keys(row.progress).length > 0
    ? row.progress as CurriculumGenerationProgress
    : undefined;
  return { status: row.status, progress };
}

export async function getGradeStatusWithProgress(
  grade: string
): Promise<{ status: string; progress?: CurriculumGenerationProgress } | null> {
  const pool = getPool();
  const { rows } = await pool.query(
    'SELECT status, progress FROM curriculum_templates WHERE grade = $1',
    [grade]
  );
  if (rows.length === 0) return null;
  const row = rows[0] as { status: string; progress: CurriculumGenerationProgress | Record<string, never> };
  const progress = row.progress && Object.keys(row.progress).length > 0
    ? row.progress as CurriculumGenerationProgress
    : undefined;
  return { status: row.status, progress };
}
