import { Component, inject, computed } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { ExamenService } from '../../core/services/examen.service';

@Component({
  selector: 'app-subscription-success',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="container py-5 text-center">
      <i class="bi bi-check-circle-fill text-success" style="font-size: 4rem;"></i>
      <h1 class="mt-3">¡Suscripción activada!</h1>
      <p class="text-muted fs-5 mb-2">Tu pago fue procesado correctamente. Ya tienes acceso completo.</p>
      <p class="text-muted mb-4">
        Recuerda que puedes cancelar tu suscripción en cualquier momento desde tu
        <a routerLink="/perfil" class="fw-bold">perfil</a>.
      </p>

      @if (examenId()) {
        <a [routerLink]="examLink()" class="btn btn-success btn-lg">
          <i class="bi bi-play-circle me-1"></i> Ir a mi curso
        </a>
      } @else {
        <a routerLink="/explore" class="btn btn-success btn-lg">
          <i class="bi bi-play-circle me-1"></i> Comenzar a practicar
        </a>
      }
    </div>
  `,
})
export class SubscriptionSuccessComponent {
  private route = inject(ActivatedRoute);
  private examenSvc = inject(ExamenService);

  examenId = toSignal(
    this.route.queryParamMap.pipe(map((p) => p.get('examenId') ?? '')),
    { initialValue: '' },
  );

  private examenes = toSignal(this.examenSvc.list(), { initialValue: [] });

  examLink = computed(() => {
    const id = this.examenId();
    if (!id) return ['/explore'];
    const ex = this.examenes().find((e) => e.id === id);
    if (!ex) return ['/explore'];
    return ['/explore', ex.escuela, id];
  });
}
