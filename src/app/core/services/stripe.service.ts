import { Injectable, inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class StripeService {
  private readonly auth = inject(Auth);

  /**
   * Calls the Cloud Function to create an embedded checkout session.
   * Returns the client_secret needed by Stripe.js to mount the form.
   * @param priceId Stripe price ID
   * @param examenId The exam the user is paying for
   * @param examenNombre Human-readable name for the exam (shown in Stripe)
   */
  async createEmbeddedCheckout(
    priceId: string,
    examenId: string,
    examenNombre: string,
  ): Promise<string> {
    const user = this.auth.currentUser;
    if (!user) throw new Error('Debes iniciar sesion primero.');

    const token = await user.getIdToken();

    const response = await fetch(
      `${environment.functionsUrl}/createEmbeddedCheckout`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          priceId,
          examenId,
          examenNombre,
          returnUrl: `${window.location.origin}/suscripcion/exito?examenId=${encodeURIComponent(examenId)}`,
        }),
      },
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Error de conexion' }));
      throw new Error(err.error || 'Error al crear sesion de pago');
    }

    const { clientSecret } = await response.json();
    return clientSecret;
  }

  /**
   * Cancel the user's active Stripe subscription via Cloud Function.
   */
  async cancelSubscription(): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) throw new Error('Debes iniciar sesion primero.');

    const token = await user.getIdToken();

    const response = await fetch(
      `${environment.functionsUrl}/cancelSubscription`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Error de conexion' }));
      throw new Error(err.error || 'Error al cancelar la suscripcion');
    }
  }
}
