import { Component, inject, computed } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, switchMap } from 'rxjs';
import { Firestore, doc, docData } from '@angular/fire/firestore';
import { Tema } from '../../core/models';

@Component({
  selector: 'app-topic-lesson',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="container py-4">
      <button class="btn btn-warning btn-sm mb-3" onclick="history.back()">
        <i class="bi bi-arrow-left me-1"></i> Volver
      </button>

      @if (tema(); as t) {
        <h2 class="mb-1"><i class="bi bi-journal-richtext me-2"></i>{{ t.nombre_canonical }}</h2>
        <p class="text-muted mb-4">Leccion del tema</p>

        @if (t.leccion_html) {
          <div class="lesson-content" [innerHTML]="t.leccion_html"></div>

          <div class="d-flex gap-2 mt-4 mb-3">
            <a [routerLink]="['/practice/tema', temaId()]" class="btn btn-success">
              <i class="bi bi-play-fill me-1"></i> Practicar este tema
            </a>
          </div>
        } @else {
          <div class="text-center text-muted py-5">
            <i class="bi bi-journal-x fs-1 d-block mb-2"></i>
            <p class="fs-5">Esta leccion aun no ha sido generada.</p>
          </div>
        }
      } @else {
        <div class="d-flex justify-content-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Cargando...</span>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host ::ng-deep .lesson-content {
      h2 { font-size: 1.6rem; font-weight: 700; color: var(--bs-primary); margin-top: 1.5rem; margin-bottom: 0.75rem; }
      h3 { font-size: 1.3rem; font-weight: 600; color: #333; margin-top: 1.25rem; margin-bottom: 0.5rem; }
      h4 { font-size: 1.1rem; font-weight: 600; margin-top: 1rem; margin-bottom: 0.5rem; }
      p { line-height: 1.7; margin-bottom: 0.75rem; }
      ul, ol { margin-bottom: 0.75rem; padding-left: 1.5rem; }
      li { margin-bottom: 0.35rem; line-height: 1.6; }
      strong { color: #1a5632; }
      blockquote {
        border-left: 4px solid var(--bs-warning);
        background: #fff8e1;
        padding: 0.75rem 1rem;
        margin: 1rem 0;
        border-radius: 0 8px 8px 0;
        font-style: italic;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 1rem 0;
      }
      th, td {
        border: 1px solid #dee2e6;
        padding: 0.5rem 0.75rem;
        text-align: left;
      }
      th { background: #f8f9fa; font-weight: 600; }
    }
  `],
})
export class TopicLessonComponent {
  private route = inject(ActivatedRoute);
  private fs = inject(Firestore);

  temaId = toSignal(
    this.route.paramMap.pipe(map((p) => p.get('temaId')!)),
    { initialValue: '' },
  );

  tema = toSignal(
    this.route.paramMap.pipe(
      map((p) => p.get('temaId')!),
      switchMap((id) => docData(doc(this.fs, 'temas', id), { idField: 'id' }) as import('rxjs').Observable<Tema>),
    ),
  );
}
