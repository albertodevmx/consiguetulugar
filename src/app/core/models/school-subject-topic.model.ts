import { Timestamp } from '@angular/fire/firestore';

export interface SchoolSubjectTopic {
  id?: string;
  schoolSubjectId: string;
  schoolId: string;
  subjectId: string;
  topicId: string;
  active: boolean;
  createdAt: Timestamp;
}
