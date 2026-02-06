import { Timestamp } from '@angular/fire/firestore';

export interface ExamTypeSubject {
  id?: string;
  schoolId: string;
  examTypeId: string;
  subjectId: string;
  active: boolean;
  createdAt: Timestamp;
}
