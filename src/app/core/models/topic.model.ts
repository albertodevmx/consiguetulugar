import { Timestamp } from '@angular/fire/firestore';

export interface Topic {
  id?: string;
  name: string;
  slug: string;
  active: boolean;
  createdAt: Timestamp;
}
