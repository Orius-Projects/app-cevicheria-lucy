/** @vitest-environment jsdom */
import React from 'react';
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { TableSelector } from '../TableSelector';
import { useTablesStore } from '../../../stores/tablesStore';

afterEach(cleanup);

const mock12Tables = [
  // Primer Piso (4 mesas)
  { id: 't1', code: 'M01', zone: 'Primer Piso', seats: 4, state: 'LIBRE' as const, openSessionId: null },
  { id: 't2', code: 'M02', zone: 'Primer Piso', seats: 4, state: 'OCUPADA' as const, openSessionId: 's2' },
  { id: 't3', code: 'M03', zone: 'Primer Piso', seats: 4, state: 'LIBRE' as const, openSessionId: null },
  { id: 't4', code: 'M04', zone: 'Primer Piso', seats: 4, state: 'LIBRE' as const, openSessionId: null },
  // Segundo Piso (4 mesas)
  { id: 't5', code: 'M05', zone: 'Segundo Piso', seats: 4, state: 'LIBRE' as const, openSessionId: null },
  { id: 't6', code: 'M06', zone: 'Segundo Piso', seats: 4, state: 'OCUPADA' as const, openSessionId: 's6' },
  { id: 't7', code: 'M07', zone: 'Segundo Piso', seats: 4, state: 'LIBRE' as const, openSessionId: null },
  { id: 't8', code: 'M08', zone: 'Segundo Piso', seats: 4, state: 'POR_CERRAR' as const, openSessionId: 's8' },
  // Afuera (4 mesas: M09 a M12)
  { id: 't9', code: 'M09', zone: 'Afuera (Terraza)', seats: 4, state: 'LIBRE' as const, openSessionId: null },
  { id: 't10', code: 'M10', zone: 'Afuera (Terraza)', seats: 4, state: 'LIBRE' as const, openSessionId: null },
  { id: 't11', code: 'M11', zone: 'Afuera (Terraza)', seats: 4, state: 'OCUPADA' as const, openSessionId: 's11' },
  { id: 't12', code: 'M12', zone: 'Afuera (Terraza)', seats: 4, state: 'LIBRE' as const, openSessionId: null }
];

describe('TableSelector Interactive Floor View', () => {
  beforeEach(() => {
    useTablesStore.setState({
      tables: mock12Tables,
      isLoading: false,
      error: null,
      fetchTables: vi.fn().mockResolvedValue(undefined)
    });
  });

  it('renders interactive zone selector tabs and displays all 12 tables divided across the 3 zones without upper right badge tags', () => {
    render(<TableSelector />);

    // Zone tabs exist
    expect(screen.getByRole('tab', { name: /Todo el Local/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Primer Piso/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Segundo Piso/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Afuera del Local/i })).toBeInTheDocument();

    // Zone headers in "Todo el local" view (without subtitles)
    expect(screen.getByRole('heading', { name: 'Primer Piso' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Segundo Piso' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Afuera del Local' })).toBeInTheDocument();

    // Removed subtitles and footer text must NOT be present
    expect(screen.queryByText(/Salón Principal • 4 mesas/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Tocar para abrir/i)).not.toBeInTheDocument();

    // Upper-right count badges in section headers must NOT be present
    expect(screen.queryByText(/4 libres/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/3 libres/i)).not.toBeInTheDocument();

    // All 12 tables are rendered
    for (let i = 1; i <= 12; i++) {
      const code = i < 10 ? `M0${i}` : `M${i}`;
      expect(screen.getByText(code)).toBeInTheDocument();
    }
  });

  it('filters to only Segundo Piso tables when clicking its tab', () => {
    render(<TableSelector />);

    fireEvent.click(screen.getByRole('tab', { name: /Segundo Piso/i }));

    // Only Segundo Piso section is visible
    expect(screen.getByRole('heading', { name: 'Segundo Piso' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Primer Piso' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Afuera del Local' })).not.toBeInTheDocument();

    // Tables M05-M08 are present, M01 is not
    expect(screen.getByText('M05')).toBeInTheDocument();
    expect(screen.getByText('M06')).toBeInTheDocument();
    expect(screen.getByText('M07')).toBeInTheDocument();
    expect(screen.getByText('M08')).toBeInTheDocument();
    expect(screen.queryByText('M01')).not.toBeInTheDocument();
  });

  it('calls onSelectTable when clicking a table card', () => {
    const handleSelect = vi.fn();
    render(<TableSelector onSelectTable={handleSelect} />);

    const m01Btn = screen.getByText('M01').closest('button')!;
    fireEvent.click(m01Btn);

    expect(handleSelect).toHaveBeenCalledTimes(1);
    expect(handleSelect).toHaveBeenCalledWith(expect.objectContaining({ code: 'M01' }));
  });
});
