export function TooltipTable({
  columns,
  rows,
}: {
  columns: readonly [string, string];
  rows: ReadonlyArray<readonly [string, string]>;
}) {
  return (
    <table className="border-border mt-2 w-full border-collapse text-sm">
      <thead>
        <tr>
          {columns.map((col) => (
            <th
              className="border-border border px-2 py-1 text-left"
              key={col}
            >
              {col}
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {rows.map(([first, second]) => (
          <tr key={first}>
            <td className="border-border border px-2 py-1">{first}</td>
            <td className="border-border border px-2 py-1">{second}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
