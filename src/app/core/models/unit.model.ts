import { Timestamp } from '@angular/fire/firestore';

export interface Unit {
  id?: string;
  name: string;
  slug: string;
  subjectId: string;
  active: boolean;
  createdAt: Timestamp;
}
