import { Timestamp } from '@angular/fire/firestore';

export interface Subject {
  id?: string;
  name: string;
  slug: string;
  active: boolean;
  createdAt: Timestamp;
}
