import { Timestamp } from '@angular/fire/firestore';

export interface ExamType {
  id?: string;
  name: string;
  slug: string;
  active: boolean;
  createdAt: Timestamp;
}
