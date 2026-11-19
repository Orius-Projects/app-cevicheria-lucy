/**
 * Formateo de fechas y horas en zona horaria America/Lima (sin "hace X minutos").
 */

export interface FormatLimaOptions {
  includeDate?: boolean;
  includeSeconds?: boolean;
}

export function formatLima(
  isoDate: string | Date | null | undefined,
  options?: FormatLimaOptions
): string {
  if (!isoDate) return '-';
  const date = typeof isoDate === 'string' ? new Date(isoDate) : isoDate;
  if (isNaN(date.getTime())) return '-';

  const includeDate = options?.includeDate ?? true;
  const includeSeconds = options?.includeSeconds ?? false;

  const intlOptions: Intl.DateTimeFormatOptions = {
    timeZone: 'America/Lima',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  };

  if (includeSeconds) {
    intlOptions.second = '2-digit';
  }

  if (includeDate) {
    intlOptions.day = '2-digit';
    intlOptions.month = '2-digit';
    intlOptions.year = 'numeric';
  }

  return new Intl.DateTimeFormat('es-PE', intlOptions).format(date);
}

export function formatLimaTime(isoDate: string | Date | null | undefined): string {
  return formatLima(isoDate, { includeDate: false });
}
