import { Timestamp } from '@angular/fire/firestore';

export interface School {
  id?: string;
  name: string;
  slug: string;
  active: boolean;
  createdAt: Timestamp;
}
