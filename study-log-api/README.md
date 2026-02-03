# StudyLog API

Node.js REST API for the StudyLog spaced repetition study tracker.

## Quick Start

```bash
# Install dependencies
npm install

# Development (hot reload)
npm run dev

# Production build
npm run build
npm start
```

## Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `STUDYLOG_PORT` | `3100` | API server port |
| `STUDYLOG_DB_PATH` | `~/.studylog/studylog.db` | SQLite database path |
| `STUDYLOG_CORS_ORIGINS` | `*` | Comma-separated CORS origins |
| `NODE_ENV` | `development` | Environment mode |

## API Endpoints

### Health
- `GET /api/health` - Health check

### Subjects
- `GET /api/subjects` - List all subjects
- `POST /api/subjects` - Create subject
- `PATCH /api/subjects/:id` - Update subject
- `DELETE /api/subjects/:id` - Delete subject
- `GET /api/subjects/:id/units` - Get units for subject
- `POST /api/subjects/:id/units` - Create unit

### Topics
- `GET /api/topics` - List topics (filters: subjectId, column, unitId)
- `GET /api/topics/:id` - Get topic with relations
- `POST /api/topics` - Create topic
- `PATCH /api/topics/:id` - Update topic
- `DELETE /api/topics/:id` - Delete topic
- `POST /api/topics/:id/move` - Move topic to column
- `POST /api/topics/:id/advance` - Advance to next review stage

### Checklist & Links
- `GET /api/topics/:id/checklist` - Get checklist items
- `POST /api/topics/:id/checklist` - Create/update checklist item
- `DELETE /api/topics/:topicId/checklist/:itemId` - Delete checklist item
- `GET /api/topics/:id/links` - Get links
- `POST /api/topics/:id/links` - Create/update link
- `DELETE /api/topics/:topicId/links/:linkId` - Delete link

### Study Sessions
- `GET /api/study-sessions` - List sessions (filter: topicId)
- `POST /api/study-sessions` - Create session
- `GET /api/study-sessions/daily-counts` - Daily counts (startDate, endDate)

### Reviews
- `GET /api/reviews/upcoming` - Upcoming reviews
- `GET /api/reviews/due-today` - Topics due today
- `POST /api/reviews` - Create review entry

### Search
- `GET /api/search?q=xxx` - Full-text search (filter: subjectId)

### Settings
- `GET /api/settings` - Get app settings
- `PATCH /api/settings` - Update settings

### Stats
- `GET /api/stats` - Get XP and streak
- `GET /api/stats/mastery` - Subject mastery ratios
- `POST /api/stats/xp` - Add XP
- `POST /api/stats/streak` - Update streak

### Backup
- `GET /api/backup/export` - Export all data as JSON
- `POST /api/backup/import` - Import data from JSON

## Mac Mini Deployment

```bash
# Install as launchd service
./scripts/install.sh

# Manual commands
launchctl load ~/Library/LaunchAgents/com.studylog.api.plist
launchctl unload ~/Library/LaunchAgents/com.studylog.api.plist
```

Logs: `~/.studylog/logs/`

## MCP Integration

MCP tool definitions are in `mcp/studylog-tools.json`.
