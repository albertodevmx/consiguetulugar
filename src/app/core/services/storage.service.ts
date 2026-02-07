import { Injectable, inject, NgZone } from '@angular/core';
import {
  Storage,
  ref,
  uploadBytes,
  getDownloadURL,
} from '@angular/fire/storage';

@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly storage = inject(Storage);
  private readonly ngZone = inject(NgZone);

  async uploadImage(file: File, path: string): Promise<string> {
    const storageRef = ref(this.storage, path);
    await this.ngZone.run(() => uploadBytes(storageRef, file));
    return this.ngZone.run(() => getDownloadURL(storageRef));
  }
}
