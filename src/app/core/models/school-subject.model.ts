import { Timestamp } from '@angular/fire/firestore';

export interface SchoolSubject {
  id?: string;
  schoolId: string;
  subjectId: string;
  active: boolean;
  createdAt: Timestamp;
}
