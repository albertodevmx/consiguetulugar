import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  Firestore,
  collection,
  collectionData,
  getDocs,
  query,
  where,
} from '@angular/fire/firestore';
import { take } from 'rxjs';
import { Materia } from '../../core/models';

interface DiagRow {
  materiaId: string;
  nombre: string;
  temasCount: number;
  preguntasCount: number;
  status: 'ok' | 'no-temas' | 'no-preguntas' | 'empty';
}

@Component({
  selector: 'app-diagnostics',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="container-fluid py-4">
      <a routerLink="/dashboard" class="btn btn-secondary btn-sm mb-3">
        <i class="bi bi-arrow-left me-1"></i> Dashboard
      </a>

      <h2 class="mb-4"><i class="bi bi-clipboard2-pulse me-2"></i>Diagn\u00f3stico de datos</h2>

      <div class="row g-3 mb-4">
        <div class="col-md-3">
          <div class="card text-center">
            <div class="card-body">
              <h3 class="text-primary">{{ totalMaterias() }}</h3>
              <small class="text-muted">Materias</small>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card text-center">
            <div class="card-body">
              <h3 class="text-success">{{ totalPreguntas() }}</h3>
              <small class="text-muted">Preguntas (colecci\u00f3n preguntas)</small>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card text-center">
            <div class="card-body">
              <h3 class="text-info">{{ totalQuestionsEn() }}</h3>
              <small class="text-muted">Questions (colecci\u00f3n questions)</small>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card text-center">
            <div class="card-body">
              <h3 class="text-warning">{{ issueCount() }}</h3>
              <small class="text-muted">Materias con problemas</small>
            </div>
          </div>
        </div>
      </div>

      @if (loading()) {
        <div class="text-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Analizando...</span>
          </div>
          <p class="text-muted mt-2">Analizando datos de {{ progress() }} materias...</p>
        </div>
      } @else {
        <table class="table table-bordered table-hover">
          <thead class="table-dark">
            <tr>
              <th>Materia</th>
              <th>ID</th>
              <th>Temas</th>
              <th>Preguntas</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            @for (row of rows(); track row.materiaId) {
              <tr>
                <td>{{ row.nombre }}</td>
                <td><code class="small">{{ row.materiaId }}</code></td>
                <td>{{ row.temasCount }}</td>
                <td [class.text-danger]="row.preguntasCount === 0"
                    [class.fw-bold]="row.preguntasCount === 0">
                  {{ row.preguntasCount }}
                </td>
                <td>
                  @if (row.status === 'ok') {
                    <span class="badge bg-success">OK</span>
                  } @else if (row.status === 'no-preguntas') {
                    <span class="badge bg-danger">Sin preguntas</span>
                  } @else if (row.status === 'no-temas') {
                    <span class="badge bg-warning text-dark">Sin temas</span>
                  } @else {
                    <span class="badge bg-secondary">Vac\u00eda</span>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>

        @if (issueCount() > 0) {
          <div class="alert alert-warning mt-3">
            <i class="bi bi-exclamation-triangle me-2"></i>
            <strong>{{ issueCount() }} materias</strong> no tienen preguntas en la colecci\u00f3n <code>preguntas</code>.
            Las preguntas podr\u00edan estar en la colecci\u00f3n <code>questions</code> (sistema ingl\u00e9s) o simplemente no han sido cargadas.
          </div>
        }
      }
    </div>
  `,
})
export class DiagnosticsComponent {
  private readonly fs = inject(Firestore);

  rows = signal<DiagRow[]>([]);
  loading = signal(true);
  progress = signal('');
  totalMaterias = signal(0);
  totalPreguntas = signal(0);
  totalQuestionsEn = signal(0);
  issueCount = signal(0);

  constructor() {
    this.runDiagnostic();
  }

  private async runDiagnostic() {
    // 1. Get all materias
    const materiasSnap = await getDocs(collection(this.fs, 'materias'));
    const materias = materiasSnap.docs.map(
      (d) => ({ id: d.id, ...d.data() }) as Materia,
    );
    this.totalMaterias.set(materias.length);

    // 2. Count total preguntas (Spanish collection)
    const preguntasSnap = await getDocs(collection(this.fs, 'preguntas'));
    this.totalPreguntas.set(preguntasSnap.size);

    // 3. Count total questions (English collection)
    const questionsSnap = await getDocs(collection(this.fs, 'questions'));
    this.totalQuestionsEn.set(questionsSnap.size);

    // 4. For each materia, check temas and preguntas
    const results: DiagRow[] = [];
    for (let i = 0; i < materias.length; i++) {
      const m = materias[i];
      this.progress.set(`${i + 1}/${materias.length}`);

      // Count temas in subcollection
      const temasSnap = await getDocs(
        collection(this.fs, `materias/${m.id}/temas`),
      );
      const temasCount = temasSnap.size;

      // Count preguntas matching this materia_id
      const pregQ = query(
        collection(this.fs, 'preguntas'),
        where('materia_id', '==', m.id),
      );
      const pregSnap = await getDocs(pregQ);
      const preguntasCount = pregSnap.size;

      let status: DiagRow['status'] = 'ok';
      if (temasCount === 0 && preguntasCount === 0) status = 'empty';
      else if (temasCount === 0) status = 'no-temas';
      else if (preguntasCount === 0) status = 'no-preguntas';

      results.push({
        materiaId: m.id!,
        nombre: m.nombre_canonical || m.id!,
        temasCount,
        preguntasCount,
        status,
      });
    }

    results.sort((a, b) => a.nombre.localeCompare(b.nombre));
    this.rows.set(results);
    this.issueCount.set(results.filter((r) => r.status !== 'ok').length);
    this.loading.set(false);
  }
}
