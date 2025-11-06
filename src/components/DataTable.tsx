import { useState, useCallback, ReactNode } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

export type SortDirection = 'asc' | 'desc' | null;

export interface Column<T> {
  key: string;
  header: string;
  accessor: (row: T) => string | number | ReactNode;
  sortable?: boolean;
  ariaLabel?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  caption: string;
  emptyMessage?: string;
  rowKey: (row: T, index: number) => string;
  highlightRow?: (row: T) => boolean;
  ariaLabel?: string;
  ariaDescription?: string;
}

export function DataTable<T>({
  data,
  columns,
  caption,
  emptyMessage = 'No data available',
  rowKey,
  highlightRow,
  ariaLabel,
  ariaDescription
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const handleSort = useCallback((columnKey: string) => {
    const column = columns.find(col => col.key === columnKey);
    if (!column?.sortable) return;

    if (sortKey === columnKey) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortKey(null);
      }
    } else {
      setSortKey(columnKey);
      setSortDirection('asc');
    }
  }, [sortKey, sortDirection, columns]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent, columnKey: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSort(columnKey);
    }
  }, [handleSort]);

  const sortedData = [...data];
  if (sortKey && sortDirection) {
    const column = columns.find(col => col.key === sortKey);
    if (column) {
      sortedData.sort((a, b) => {
        const aValue = column.accessor(a);
        const bValue = column.accessor(b);

        const aNum = typeof aValue === 'number' ? aValue : String(aValue);
        const bNum = typeof bValue === 'number' ? bValue : String(bValue);

        if (typeof aNum === 'number' && typeof bNum === 'number') {
          return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
        }

        const aStr = String(aNum).toLowerCase();
        const bStr = String(bNum).toLowerCase();

        if (sortDirection === 'asc') {
          return aStr.localeCompare(bStr);
        }
        return bStr.localeCompare(aStr);
      });
    }
  }

  const getSortIcon = (columnKey: string) => {
    if (sortKey !== columnKey) {
      return <ChevronsUpDown className="w-4 h-4 opacity-50" aria-hidden="true" />;
    }
    if (sortDirection === 'asc') {
      return <ChevronUp className="w-4 h-4" aria-hidden="true" />;
    }
    return <ChevronDown className="w-4 h-4" aria-hidden="true" />;
  };

  const getSortLabel = (columnKey: string, columnHeader: string) => {
    if (sortKey !== columnKey) {
      return `${columnHeader}, sortable column, currently not sorted`;
    }
    if (sortDirection === 'asc') {
      return `${columnHeader}, sorted ascending`;
    }
    return `${columnHeader}, sorted descending`;
  };

  return (
    <div className="w-full overflow-x-auto">
      <table
        className="w-full border-collapse"
        aria-label={ariaLabel || caption}
        aria-describedby={ariaDescription ? "table-description" : undefined}
        role="table"
      >
        <caption className="sr-only">{caption}</caption>
        {ariaDescription && (
          <caption id="table-description" className="sr-only">
            {ariaDescription}
          </caption>
        )}

        <thead className="bg-slate-800/80 backdrop-blur-sm sticky top-0 z-10">
          <tr role="row">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={`px-6 py-4 text-left text-sm font-bold text-white uppercase tracking-wider border-b-2 border-purple-500/50 ${
                  column.sortable ? 'cursor-pointer hover:bg-slate-700/80 transition-colors' : ''
                }`}
                onClick={column.sortable ? () => handleSort(column.key) : undefined}
                onKeyDown={column.sortable ? (e) => handleKeyDown(e, column.key) : undefined}
                tabIndex={column.sortable ? 0 : undefined}
                aria-sort={
                  sortKey === column.key
                    ? sortDirection === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : column.sortable
                    ? 'none'
                    : undefined
                }
                aria-label={column.sortable ? getSortLabel(column.key, column.header) : column.ariaLabel || column.header}
                role="columnheader"
              >
                <div className="flex items-center gap-2">
                  <span>{column.header}</span>
                  {column.sortable && getSortIcon(column.key)}
                </div>
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="bg-slate-900/50 divide-y divide-slate-700/50">
          {sortedData.length === 0 ? (
            <tr role="row">
              <td
                colSpan={columns.length}
                className="px-6 py-8 text-center text-slate-400"
                role="cell"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            sortedData.map((row, index) => {
              const isHighlighted = highlightRow?.(row);
              return (
                <tr
                  key={rowKey(row, index)}
                  className={`transition-colors ${
                    isHighlighted
                      ? 'bg-gradient-to-r from-purple-600/30 to-pink-600/30 hover:from-purple-600/40 hover:to-pink-600/40'
                      : 'hover:bg-slate-800/50'
                  }`}
                  role="row"
                  aria-label={isHighlighted ? 'Current player (highlighted)' : undefined}
                >
                  {columns.map((column) => (
                    <td
                      key={`${rowKey(row, index)}-${column.key}`}
                      className={`px-6 py-4 text-sm ${
                        isHighlighted ? 'text-white font-semibold' : 'text-slate-300'
                      }`}
                      role="cell"
                    >
                      {column.accessor(row)}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
