import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-subscription-cancel',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="container py-5 text-center">
      <i class="bi bi-x-circle-fill text-warning" style="font-size: 4rem;"></i>
      <h1 class="mt-3">Pago cancelado</h1>
      <p class="text-muted fs-5 mb-4">No se realizó ningún cargo. Puedes intentarlo de nuevo cuando quieras.</p>
      <a routerLink="/suscripcion" class="btn btn-primary btn-lg">
        <i class="bi bi-arrow-left me-1"></i> Volver a suscripción
      </a>
    </div>
  `,
})
export class SubscriptionCancelComponent {}
