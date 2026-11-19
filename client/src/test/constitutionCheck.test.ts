import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Constitution and Scope Guards (Feature 002 UI)', () => {
  const forbiddenPatterns = [
    { pattern: /\bigvRate\b/i, name: 'igvRate (sin impuestos/IGV)' },
    { pattern: /\btaxCents\b/i, name: 'taxCents (sin impuestos/IGV)' },
    { pattern: /\bbilling\b/i, name: 'billing (sin facturación)' },
    { pattern: /\bsunat\b/i, name: 'sunat (sin SUNAT)' },
    { pattern: /\bpaymentMethod\b/i, name: 'paymentMethod (sin pagos en 002)' },
    { pattern: /\bpaymentStatus\b/i, name: 'paymentStatus (sin pagos en 002)' },
    { pattern: /\bpreparationTime\b/i, name: 'preparationTime (sin tiempos de cocina)' },
    { pattern: /\bcookingTime\b/i, name: 'cookingTime (sin tiempos de cocina)' },
    { pattern: /\btiempos?\b/i, name: 'tiempo/tiempos (sin tiempos de servicio ni cocina - F4)' },
    { pattern: /\bEN_PREPARACION\b/, name: 'EN_PREPARACION (estado prohibido)' },
    { pattern: /\bcostCents\b/i, name: 'costCents (sin costos)' }
  ];

  function getFiles(dir: string): string[] {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...getFiles(fullPath));
      } else if (
        (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) &&
        !entry.name.includes('.test.') &&
        !entry.name.includes('setup.ts')
      ) {
        files.push(fullPath);
      }
    }
    return files;
  }

  const srcDir = path.resolve(__dirname, '..');
  const files = getFiles(srcDir);

  it('verifies that no client code introduces forbidden terms from out-of-scope features', () => {
    const violations: { file: string; rule: string; line: number }[] = [];

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');

      lines.forEach((lineText, idx) => {
        // Skip comment lines
        const trimmed = lineText.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;

        for (const { pattern, name } of forbiddenPatterns) {
          if (pattern.test(lineText)) {
            violations.push({
              file: path.relative(srcDir, file),
              rule: name,
              line: idx + 1
            });
          }
        }
      });
    }

    expect(
      violations,
      `Violaciones a la constitución detectadas:\n${JSON.stringify(violations, null, 2)}`
    ).toEqual([]);
  });
});
