import { Timestamp } from '@angular/fire/firestore';

export interface SubjectUnit {
  id?: string;
  schoolId: string;
  examTypeId: string;
  subjectId: string;
  unitId: string;
  active: boolean;
  createdAt: Timestamp;
}
