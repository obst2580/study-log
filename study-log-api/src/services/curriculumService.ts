import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../database/index.js';
import { generateCurriculum } from './llmService.js';

const SUBJECT_COLORS = [
  '#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1',
  '#13c2c2', '#eb2f96', '#fa8c16', '#a0d911', '#2f54eb',
];

export async function getOrGenerateTemplate(grade: string): Promise<{ id: string; status: string }> {
  const pool = getPool();

  // Check for existing active template
  const { rows: existing } = await pool.query(
    "SELECT id, status FROM curriculum_templates WHERE grade = $1 AND status IN ('active', 'generating')",
    [grade]
  );

  if (existing.length > 0) {
    return { id: existing[0].id as string, status: existing[0].status as string };
  }

  // Create template in generating state
  const templateId = uuidv4();
  await pool.query(
    "INSERT INTO curriculum_templates (id, grade, status) VALUES ($1, $2, 'generating')",
    [templateId, grade]
  );

  // Generate asynchronously
  generateAndSaveTemplate(templateId, grade).catch((err) => {
    console.error('Curriculum generation failed:', err);
    getPool().query(
      "UPDATE curriculum_templates SET status = 'archived', updated_at = NOW() WHERE id = $1",
      [templateId]
    ).catch(console.error);
  });

  return { id: templateId, status: 'generating' };
}

async function generateAndSaveTemplate(templateId: string, grade: string): Promise<void> {
  const pool = getPool();
  const data = await generateCurriculum(grade);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (let si = 0; si < data.subjects.length; si++) {
      const subject = data.subjects[si];
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

        for (let ti = 0; ti < unit.topics.length; ti++) {
          const topic = unit.topics[ti];
          const ctTopicId = uuidv4();

          await client.query(
            'INSERT INTO ct_topics (id, ct_unit_id, title, difficulty, importance, sort_order) VALUES ($1, $2, $3, $4, $5, $6)',
            [ctTopicId, ctUnitId, topic.title, topic.difficulty || 'medium', topic.importance || 'medium', ti]
          );

          for (let ci = 0; ci < (topic.checklist || []).length; ci++) {
            await client.query(
              'INSERT INTO ct_checklist_items (id, ct_topic_id, text, sort_order) VALUES ($1, $2, $3, $4)',
              [uuidv4(), ctTopicId, topic.checklist[ci], ci]
            );
          }
        }
      }
    }

    await client.query(
      "UPDATE curriculum_templates SET status = 'active', updated_at = NOW() WHERE id = $1",
      [templateId]
    );

    await client.query('COMMIT');
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
      const subjectId = uuidv4();
      await client.query(
        'INSERT INTO subjects (id, name, color, icon, sort_order, user_id, ct_subject_id) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [subjectId, ctSubject.name, ctSubject.color, ctSubject.icon, ctSubject.sort_order, userId, ctSubject.id]
      );

      const { rows: ctUnits } = await client.query(
        'SELECT * FROM ct_units WHERE ct_subject_id = $1 ORDER BY sort_order',
        [ctSubject.id]
      );

      for (const ctUnit of ctUnits) {
        const unitId = uuidv4();
        await client.query(
          'INSERT INTO units (id, subject_id, name, sort_order, ct_unit_id) VALUES ($1, $2, $3, $4, $5)',
          [unitId, subjectId, ctUnit.name, ctUnit.sort_order, ctUnit.id]
        );

        const { rows: ctTopics } = await client.query(
          'SELECT * FROM ct_topics WHERE ct_unit_id = $1 ORDER BY sort_order',
          [ctUnit.id]
        );

        for (const ctTopic of ctTopics) {
          const topicId = uuidv4();
          await client.query(
            `INSERT INTO topics (id, subject_id, unit_id, title, difficulty, importance, sort_order, template_topic_id, column_name)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'today')`,
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

    // Record assignment
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
