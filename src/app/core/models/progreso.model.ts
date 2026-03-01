export interface ProgresoTema {
  tema_id: string;
  materia_id: string;
  total: number;
  correctas: number;
  falladas: string[];
  completado?: boolean;
}

/**
 * Calcula el porcentaje de dominio de un tema.
 * Fórmula: (correctas / total) * min(correctas / 100, 1)
 * Requiere mínimo 100 respuestas correctas para alcanzar el 100%.
 */
export function calcularDominio(correctas: number, total: number): number {
  if (total === 0 || correctas === 0) return 0;
  const accuracy = correctas / total;
  const factor = Math.min(correctas / 100, 1);
  return Math.round(accuracy * factor * 100);
}
