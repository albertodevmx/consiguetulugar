import { Injectable, inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class StripeService {
  private readonly auth = inject(Auth);

  /**
   * Calls the Cloud Function to create an embedded checkout session.
   * Returns the client_secret needed by Stripe.js to mount the form.
   */
  async createEmbeddedCheckout(priceId: string): Promise<string> {
    const user = this.auth.currentUser;
    if (!user) throw new Error('Debes iniciar sesión primero.');

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
          returnUrl: `${window.location.origin}/suscripcion/exito`,
        }),
      },
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Error de conexión' }));
      throw new Error(err.error || 'Error al crear sesión de pago');
    }

    const { clientSecret } = await response.json();
    return clientSecret;
  }
}
