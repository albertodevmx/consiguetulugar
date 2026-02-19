import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  onSnapshot,
} from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class StripeService {
  private readonly fs = inject(Firestore);
  private readonly auth = inject(Auth);

  /**
   * Creates a Stripe Checkout Session via Firestore trigger
   * (using the "Run Payments with Stripe" Firebase Extension pattern).
   *
   * Writes to usuarios/{uid}/checkout_sessions — a Cloud Function
   * listens, creates the Checkout Session, and writes back the URL.
   */
  async redirectToCheckout(priceId: string) {
    const user = this.auth.currentUser;
    if (!user) throw new Error('Debes iniciar sesión primero.');

    const sessionsCol = collection(
      this.fs,
      `usuarios/${user.uid}/checkout_sessions`,
    );

    const docRef = await addDoc(sessionsCol, {
      price: priceId,
      success_url: `${window.location.origin}/suscripcion/exito`,
      cancel_url: `${window.location.origin}/suscripcion/cancelado`,
    });

    // Listen for the Cloud Function to write back the session URL
    return new Promise<void>((resolve, reject) => {
      const unsubscribe = onSnapshot(docRef, (snap) => {
        const data = snap.data() as Record<string, any> | undefined;
        if (data?.['error']) {
          unsubscribe();
          reject(new Error(data['error'].message));
        }
        if (data?.['url']) {
          unsubscribe();
          window.location.assign(data['url']);
          resolve();
        }
      });

      // Timeout after 30s
      setTimeout(() => {
        unsubscribe();
        reject(new Error('Tiempo de espera agotado. Intenta de nuevo.'));
      }, 30000);
    });
  }

  /**
   * Fallback: direct redirect using a Checkout Session URL
   */
  async redirectToUrl(url: string) {
    window.location.assign(url);
  }
}
