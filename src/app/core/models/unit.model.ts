import { Timestamp } from '@angular/fire/firestore';

export interface Unit {
  id?: string;
  name: string;
  slug: string;
  active: boolean;
  createdAt: Timestamp;
}
