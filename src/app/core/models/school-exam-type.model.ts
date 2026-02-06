import { Timestamp } from '@angular/fire/firestore';

export interface SchoolExamType {
  id?: string;
  schoolId: string;
  examTypeId: string;
  active: boolean;
  createdAt: Timestamp;
}
