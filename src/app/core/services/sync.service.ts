import { Injectable, inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { environment } from '../../../environments/environment';

export interface AuthUserRecord {
  uid: string;
  email: string | null;
  displayName: string | null;
  creationTime: string | null;
  lastSignInTime: string | null;
  inFirestore: boolean;
}

export interface ListAuthUsersResponse {
  users: AuthUserRecord[];
  total: number;
  unsynced: number;
}

@Injectable({ providedIn: 'root' })
export class SyncService {
  private readonly auth = inject(Auth);

  private async getHeaders(): Promise<HeadersInit> {
    const user = this.auth.currentUser;
    if (!user) throw new Error('No authenticated user');
    const token = await user.getIdToken();
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  private baseUrl(): string {
    return environment.functionsUrl;
  }

  async listAuthUsers(): Promise<ListAuthUsersResponse> {
    const headers = await this.getHeaders();
    const res = await fetch(`${this.baseUrl()}/listAuthUsers`, {
      method: 'POST',
      headers,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Error al listar usuarios');
    }
    return res.json();
  }

  async syncUser(uid: string): Promise<{ synced: boolean; message: string }> {
    const headers = await this.getHeaders();
    const res = await fetch(`${this.baseUrl()}/syncAuthUser`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ uid }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Error al sincronizar usuario');
    }
    return res.json();
  }

  async deleteUser(uid: string, deleteFirestore = true): Promise<{ deleted: boolean; message: string }> {
    const headers = await this.getHeaders();
    const res = await fetch(`${this.baseUrl()}/deleteAuthUser`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ uid, deleteFirestore }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Error al eliminar usuario');
    }
    return res.json();
  }
}
