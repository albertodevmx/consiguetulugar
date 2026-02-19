import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-subscription-success',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="container py-5 text-center">
      <i class="bi bi-check-circle-fill text-success" style="font-size: 4rem;"></i>
      <h1 class="mt-3">Suscripción activada</h1>
      <p class="text-muted fs-5 mb-4">Tu pago fue procesado correctamente. Ya puedes acceder a todo el contenido.</p>
      <a routerLink="/explore" class="btn btn-success btn-lg">
        <i class="bi bi-play-circle me-1"></i> Comenzar a practicar
      </a>
    </div>
  `,
})
export class SubscriptionSuccessComponent {}
