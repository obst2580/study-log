import { registerSubjectHandlers } from './subjects';
import { registerTopicHandlers } from './topics';
import { registerStudySessionHandlers } from './studySessions';
import { registerReviewHandlers } from './reviews';

export function registerIpcHandlers(): void {
  registerSubjectHandlers();
  registerTopicHandlers();
  registerStudySessionHandlers();
  registerReviewHandlers();
}
