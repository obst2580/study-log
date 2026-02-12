import { Router } from 'express';
import { getPool } from '../database/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  copyTemplateToUser,
  getTemplateStatus,
  getTemplateStatusWithProgress,
  getGradeStatusWithProgress,
  applyGradeToUser,
  resetAndRegenerateAll,
} from '../services/curriculumService.js';

const router = Router();

// GET /api/curriculum/templates
router.get('/templates', asyncHandler(async (_req, res) => {
  const pool = getPool();
  const { rows } = await pool.query(
    'SELECT * FROM curriculum_templates ORDER BY grade'
  );
  res.json(rows.map((r) => ({
    id: r.id,
    grade: r.grade,
    version: r.version,
    generatedBy: r.generated_by,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  })));
}));

// GET /api/curriculum/templates/:grade
router.get('/templates/:grade', asyncHandler(async (req, res) => {
  const pool = getPool();
  const { grade } = req.params;

  const { rows: templates } = await pool.query(
    "SELECT * FROM curriculum_templates WHERE grade = $1 AND status = 'active'",
    [grade]
  );

  if (templates.length === 0) {
    res.status(404).json({ error: 'Template not found for this grade' });
    return;
  }

  const template = templates[0];
  const { rows: subjects } = await pool.query(
    'SELECT * FROM ct_subjects WHERE template_id = $1 ORDER BY sort_order',
    [template.id]
  );

  const subjectsWithDetails = [];
  for (const subject of subjects) {
    const { rows: units } = await pool.query(
      'SELECT * FROM ct_units WHERE ct_subject_id = $1 ORDER BY sort_order',
      [subject.id]
    );

    const unitsWithTopics = [];
    for (const unit of units) {
      const { rows: topics } = await pool.query(
        'SELECT * FROM ct_topics WHERE ct_unit_id = $1 ORDER BY sort_order',
        [unit.id]
      );

      const topicsWithChecklist = [];
      for (const topic of topics) {
        const { rows: checklist } = await pool.query(
          'SELECT * FROM ct_checklist_items WHERE ct_topic_id = $1 ORDER BY sort_order',
          [topic.id]
        );
        topicsWithChecklist.push({
          id: topic.id,
          title: topic.title,
          difficulty: topic.difficulty,
          importance: topic.importance,
          sortOrder: topic.sort_order,
          checklistItems: checklist.map((c: Record<string, unknown>) => ({
            id: c.id, text: c.text, sortOrder: c.sort_order,
          })),
        });
      }

      unitsWithTopics.push({
        id: unit.id,
        name: unit.name,
        sortOrder: unit.sort_order,
        topics: topicsWithChecklist,
      });
    }

    subjectsWithDetails.push({
      id: subject.id,
      name: subject.name,
      color: subject.color,
      icon: subject.icon,
      sortOrder: subject.sort_order,
      units: unitsWithTopics,
    });
  }

  res.json({
    id: template.id,
    grade: template.grade,
    version: template.version,
    generatedBy: template.generated_by,
    status: template.status,
    createdAt: template.created_at,
    updatedAt: template.updated_at,
    subjects: subjectsWithDetails,
  });
}));

// GET /api/curriculum/grade-status/:grade - 학년별 생성 상태 조회
router.get('/grade-status/:grade', asyncHandler(async (req, res) => {
  const { grade } = req.params;
  const result = await getGradeStatusWithProgress(grade);

  if (!result) {
    res.status(404).json({ error: 'Template not found for this grade' });
    return;
  }

  res.json({ grade, status: result.status, progress: result.progress });
}));

// GET /api/curriculum/generate/:id/status - 템플릿 ID로 상태 조회 (하위 호환)
router.get('/generate/:id/status', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await getTemplateStatusWithProgress(id);

  if (result.status === 'not_found') {
    res.status(404).json({ error: 'Template not found' });
    return;
  }

  res.json({ id, status: result.status, progress: result.progress });
}));

// POST /api/curriculum/apply-grade - 학년 선택 → 자동 적용
router.post('/apply-grade', asyncHandler(async (req, res) => {
  const { grade } = req.body;

  if (!grade) {
    res.status(400).json({ error: 'grade is required' });
    return;
  }

  const result = await applyGradeToUser(grade, req.userId);

  if (!result.success) {
    res.status(400).json({ error: result.error });
    return;
  }

  res.json({ success: true });
}));

// POST /api/curriculum/apply - 템플릿 ID로 적용 (하위 호환)
router.post('/apply', asyncHandler(async (req, res) => {
  const { templateId } = req.body;

  if (!templateId) {
    res.status(400).json({ error: 'templateId is required' });
    return;
  }

  const status = await getTemplateStatus(templateId);
  if (status !== 'active') {
    res.status(400).json({ error: 'Template is not ready yet' });
    return;
  }

  await copyTemplateToUser(templateId, req.userId);
  res.json({ success: true });
}));

// POST /api/curriculum/reset - 전체 초기화 및 재생성 (관리용)
router.post('/reset', asyncHandler(async (_req, res) => {
  await resetAndRegenerateAll();
  res.json({ success: true, message: 'All templates reset and regeneration started' });
}));

export default router;
