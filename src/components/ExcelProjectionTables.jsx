import { Input } from '@/components/ui/input';
import { formatCHF } from '../utils/calculations';

const OPERATING_ROWS = [
  { key: 'income', label: 'Income', type: 'amount' },
  { key: 'costs', label: 'Costs', type: 'amount' },
  { key: 'interest_rate', label: 'Interest rate', type: 'percent' },
  { key: 'interest_paid', label: 'Interest paid', type: 'amount' },
  { key: 'ebt', label: 'EBT', type: 'amount' },
  { key: 'tax', label: 'Tax', type: 'amount' },
  { key: 'dividend', label: 'Dividend', type: 'amount' },
];

const CAPITAL_ROWS = [
  { key: 'amortization', label: 'Amortissement dette', type: 'amount' },
  { key: 'debt', label: 'Debt', type: 'amount' },
  { key: 'value', label: 'Value', type: 'amount' },
  { key: 'cashflow', label: 'IRR cash-flow', type: 'amount' },
  { key: 'dividend_yield', label: 'Dividend Yield', type: 'percent' },
];

export function createEmptyExcelProjections() {
  return {
    operating_projection: {
      columns: ['1', '2', '3', '4', '5'],
      rows: OPERATING_ROWS.map((row) => ({ ...row, values: Array(5).fill(null) })),
    },
    capital_projection: {
      columns: ['0', '1', '2', '3', '4', '5'],
      rows: CAPITAL_ROWS.map((row) => ({ ...row, values: Array(6).fill(null) })),
      assumptions: {
        price_increase: null,
        sales_price: null,
        exit_debt: null,
        net: null,
        irr: null,
        average_dividend_yield: null,
      },
    },
  };
}

export default function ExcelProjectionTables({
  operatingProjection,
  capitalProjection,
  onOperatingChange,
  onCapitalChange,
  editable = false,
}) {
  const hasData = hasProjectionData(operatingProjection) || hasProjectionData(capitalProjection);

  if (!editable && !hasData) return null;

  const operating = normalizeProjection(operatingProjection, createEmptyExcelProjections().operating_projection, OPERATING_ROWS, 5);
  const capital = normalizeProjection(capitalProjection, createEmptyExcelProjections().capital_projection, CAPITAL_ROWS, 6);

  return (
    <div className="space-y-5">
      <ProjectionTable
        title="Projection exploitation"
        projection={operating}
        editable={editable}
        onChange={onOperatingChange}
      />
      <ProjectionTable
        title="Dette, valeur et rendement"
        projection={capital}
        editable={editable}
        onChange={onCapitalChange}
        footer={<CapitalAssumptions projection={capital} onChange={onCapitalChange} editable={editable} />}
      />
    </div>
  );
}

function ProjectionTable({ title, projection, editable, onChange, footer }) {
  return (
    <section className="bg-card rounded-xl border border-border p-6">
      <h3 className="font-heading font-semibold mb-5">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Rubrique</th>
              {projection.columns.map((column) => (
                <th key={column} className="text-right py-2 px-2 font-medium text-muted-foreground">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {projection.rows.map((row, rowIndex) => (
              <tr key={row.key}>
                <td className="py-2.5 pr-4 font-medium">{row.label}</td>
                {projection.columns.map((column, colIndex) => (
                  <td key={`${row.key}-${column}`} className="py-2.5 px-2 text-right font-mono">
                    {editable ? (
                      <Input
                        type="number"
                        value={row.values[colIndex] ?? ''}
                        onChange={(event) => updateCell(projection, rowIndex, colIndex, event.target.value, onChange)}
                        className="h-8 min-w-[96px] bg-background border-border text-right"
                      />
                    ) : (
                      formatValue(row.values[colIndex], row.type)
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {footer}
    </section>
  );
}

function CapitalAssumptions({ projection, onChange, editable }) {
  const assumptions = projection.assumptions || {};
  const items = [
    { key: 'price_increase', label: 'Price increase', type: 'percent' },
    { key: 'sales_price', label: 'Sales price', type: 'amount' },
    { key: 'exit_debt', label: 'Debt sortie', type: 'amount' },
    { key: 'net', label: 'Net', type: 'amount' },
    { key: 'irr', label: 'IRR', type: 'percent' },
    { key: 'average_dividend_yield', label: 'Dividend Yield moyen', type: 'percent' },
  ];

  return (
    <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 border-t border-border pt-4">
      {items.map((item) => (
        <div key={item.key}>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{item.label}</p>
          {editable ? (
            <Input
              type="number"
              value={assumptions[item.key] ?? ''}
              onChange={(event) => updateAssumption(projection, item.key, event.target.value, onChange)}
              className="mt-1 h-8 bg-background border-border"
            />
          ) : (
            <p className="mt-1 text-sm font-mono font-semibold">{formatValue(assumptions[item.key], item.type)}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function updateCell(projection, rowIndex, colIndex, rawValue, onChange) {
  const value = rawValue === '' ? null : Number(rawValue);
  const next = {
    ...projection,
    rows: projection.rows.map((row, index) =>
      index === rowIndex
        ? {
            ...row,
            values: row.values.map((cell, cellIndex) => (cellIndex === colIndex ? value : cell)),
          }
        : row
    ),
  };
  onChange?.(next);
}

function updateAssumption(projection, key, rawValue, onChange) {
  const value = rawValue === '' ? null : Number(rawValue);
  onChange?.({
    ...projection,
    assumptions: {
      ...(projection.assumptions || {}),
      [key]: value,
    },
  });
}

function normalizeProjection(projection, fallback, rowDefinitions, columnCount) {
  const source = projection && typeof projection === 'object' ? projection : fallback;
  const sourceRows = Array.isArray(source.rows) ? source.rows : [];

  return {
    ...fallback,
    ...source,
    columns: Array.isArray(source.columns) && source.columns.length ? source.columns : fallback.columns,
    rows: rowDefinitions.map((definition) => {
      const existing = sourceRows.find((row) => row.key === definition.key);
      const values = Array.isArray(existing?.values) ? existing.values : [];
      return {
        ...definition,
        values: Array.from({ length: columnCount }, (_, index) => values[index] ?? null),
      };
    }),
  };
}

function hasProjectionData(projection) {
  if (!projection || typeof projection !== 'object') return false;
  const rowsHaveData = projection.rows?.some((row) => row.values?.some((value) => value !== null && value !== undefined && value !== ''));
  const assumptionsHaveData = Object.values(projection.assumptions || {}).some((value) => value !== null && value !== undefined && value !== '');
  return Boolean(rowsHaveData || assumptionsHaveData);
}

function formatValue(value, type) {
  if (value === null || value === undefined || value === '') return '-';
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);
  if (type === 'percent') return `${number.toFixed(2)}%`;
  return formatCHF(number);
}
