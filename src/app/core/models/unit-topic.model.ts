import { Timestamp } from '@angular/fire/firestore';

export interface UnitTopic {
  id?: string;
  schoolId: string;
  examTypeId: string;
  subjectId: string;
  unitId: string;
  topicId: string;
  active: boolean;
  createdAt: Timestamp;
}
