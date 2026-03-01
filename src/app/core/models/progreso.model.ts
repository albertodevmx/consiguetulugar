export interface ProgresoTema {
  tema_id: string;
  materia_id: string;
  total: number;
  correctas: number;
  falladas: string[];
}
