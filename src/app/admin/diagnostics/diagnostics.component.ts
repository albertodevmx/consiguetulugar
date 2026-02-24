import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  Firestore,
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
} from '@angular/fire/firestore';
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

        <!-- Fix button -->
        @if (issueCount() > 0 && !fixing() && !fixDone()) {
          <div class="alert alert-info d-flex align-items-center justify-content-between">
            <div>
              <i class="bi bi-wrench me-2"></i>
              <strong>{{ fixableCount() }} materias</strong> pueden repararse autom\u00e1ticamente.
              Los ex\u00e1menes apuntan a materias sin preguntas cuando existe otra materia con el mismo nombre que S\u00cd tiene preguntas.
            </div>
            <button class="btn btn-warning" (click)="fixData()">
              <i class="bi bi-tools me-1"></i> Reparar datos
            </button>
          </div>
        }

        @if (fixing()) {
          <div class="alert alert-info">
            <div class="spinner-border spinner-border-sm me-2" role="status"></div>
            Reparando... {{ fixProgress() }}
          </div>
        }

        @if (fixDone()) {
          <div class="alert alert-success">
            <i class="bi bi-check-circle me-2"></i>
            <strong>Reparaci\u00f3n completada.</strong> Se actualizaron {{ fixedCount() }} referencias en materias_mapping.
            Recarga la p\u00e1gina para ver el diagn\u00f3stico actualizado.
          </div>
        }

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

        @if (issueCount() > 0 && !fixDone()) {
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
  fixableCount = signal(0);

  fixing = signal(false);
  fixDone = signal(false);
  fixProgress = signal('');
  fixedCount = signal(0);

  // Map: badMateriaId → goodMateriaId (for the fix)
  private remapTable = new Map<string, string>();

  constructor() {
    this.runDiagnostic();
  }

  private async runDiagnostic() {
    const materiasSnap = await getDocs(collection(this.fs, 'materias'));
    const materias = materiasSnap.docs.map(
      (d) => ({ id: d.id, ...d.data() }) as Materia,
    );
    this.totalMaterias.set(materias.length);

    const preguntasSnap = await getDocs(collection(this.fs, 'preguntas'));
    this.totalPreguntas.set(preguntasSnap.size);

    const questionsSnap = await getDocs(collection(this.fs, 'questions'));
    this.totalQuestionsEn.set(questionsSnap.size);

    const results: DiagRow[] = [];
    for (let i = 0; i < materias.length; i++) {
      const m = materias[i];
      this.progress.set(`${i + 1}/${materias.length}`);

      const temasSnap = await getDocs(
        collection(this.fs, `materias/${m.id}/temas`),
      );

      const pregQ = query(
        collection(this.fs, 'preguntas'),
        where('materia_id', '==', m.id),
      );
      const pregSnap = await getDocs(pregQ);

      let status: DiagRow['status'] = 'ok';
      if (temasSnap.size === 0 && pregSnap.size === 0) status = 'empty';
      else if (temasSnap.size === 0) status = 'no-temas';
      else if (pregSnap.size === 0) status = 'no-preguntas';

      results.push({
        materiaId: m.id!,
        nombre: m.nombre_canonical || m.id!,
        temasCount: temasSnap.size,
        preguntasCount: pregSnap.size,
        status,
      });
    }

    results.sort((a, b) => a.nombre.localeCompare(b.nombre));
    this.rows.set(results);
    this.issueCount.set(results.filter((r) => r.status !== 'ok').length);

    // Build remap table: for each name, find the best materia (most preguntas)
    const byName = new Map<string, DiagRow[]>();
    for (const r of results) {
      const list = byName.get(r.nombre) ?? [];
      list.push(r);
      byName.set(r.nombre, list);
    }

    this.remapTable.clear();
    for (const [, group] of byName) {
      const best = group
        .filter((r) => r.preguntasCount > 0)
        .sort((a, b) => b.preguntasCount - a.preguntasCount)[0];
      if (!best) continue; // no materia with preguntas for this name
      for (const r of group) {
        if (r.materiaId !== best.materiaId && r.preguntasCount === 0) {
          this.remapTable.set(r.materiaId, best.materiaId);
        }
      }
    }
    this.fixableCount.set(this.remapTable.size);
    this.loading.set(false);
  }

  async fixData() {
    if (this.remapTable.size === 0) return;
    this.fixing.set(true);
    let updated = 0;

    // Get all examenes
    const examenesSnap = await getDocs(collection(this.fs, 'examenes'));
    const total = examenesSnap.docs.length;

    for (let i = 0; i < examenesSnap.docs.length; i++) {
      const exDoc = examenesSnap.docs[i];
      this.fixProgress.set(`Examen ${i + 1}/${total}`);

      // Get materias_mapping for this exam
      const mappingSnap = await getDocs(
        collection(this.fs, `examenes/${exDoc.id}/materias_mapping`),
      );

      for (const mapDoc of mappingSnap.docs) {
        const data = mapDoc.data();
        const currentId = data['materia_id'] as string;
        const goodId = this.remapTable.get(currentId);

        if (goodId) {
          // Update materia_id to point to the materia that has preguntas
          await updateDoc(
            doc(this.fs, `examenes/${exDoc.id}/materias_mapping/${mapDoc.id}`),
            { materia_id: goodId },
          );
          updated++;
          console.log(
            `Fixed: exam ${exDoc.id} mapping ${mapDoc.id}: ${currentId} → ${goodId}`,
          );
        }
      }
    }

    this.fixedCount.set(updated);
    this.fixing.set(false);
    this.fixDone.set(true);
  }
}
