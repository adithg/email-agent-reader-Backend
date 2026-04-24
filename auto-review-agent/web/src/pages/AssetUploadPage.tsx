import { ChangeEvent, useMemo, useState } from 'react';
import { AlertTriangle, FileUp, Upload, CheckCircle2 } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { supabase } from '../lib/supabase';
import { InvalidAssetRow, parseAssetsCsv, ParsedAssetRow } from '../lib/assetsCsv';

export default function AssetUploadPage() {
  const [csvText, setCsvText] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedAssetRow[]>([]);
  const [invalidRows, setInvalidRows] = useState<InvalidAssetRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);

  const previewRows = useMemo(() => parsedRows.slice(0, 8), [parsedRows]);

  const updateParsedState = (nextCsvText: string) => {
    setCsvText(nextCsvText);

    if (!nextCsvText.trim()) {
      setParsedRows([]);
      setInvalidRows([]);
      setMessage(null);
      return;
    }

    try {
      const result = parseAssetsCsv(nextCsvText);
      setParsedRows(result.validRows);
      setInvalidRows(result.invalidRows);

      if (result.validRows.length === 0) {
        setMessage({ type: 'warning', text: 'No valid asset rows found yet.' });
      } else if (result.invalidRows.length > 0) {
        setMessage({
          type: 'warning',
          text: `${result.validRows.length} valid row(s) ready. ${result.invalidRows.length} row(s) need attention.`,
        });
      } else {
        setMessage({ type: 'success', text: `${result.validRows.length} valid row(s) ready to insert.` });
      }
    } catch (error) {
      setParsedRows([]);
      setInvalidRows([]);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Unable to parse CSV.',
      });
    }
  };

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    updateParsedState(text);
  };

  const handleInsert = async () => {
    setMessage(null);

    if (!csvText.trim()) {
      setMessage({ type: 'error', text: 'Paste CSV data or upload a CSV file first.' });
      return;
    }

    let result;
    try {
      result = parseAssetsCsv(csvText);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Unable to parse CSV.',
      });
      return;
    }

    setParsedRows(result.validRows);
    setInvalidRows(result.invalidRows);

    if (result.validRows.length === 0) {
      setMessage({ type: 'error', text: 'There are no valid rows to insert.' });
      return;
    }

    setLoading(true);
    const { error } = await supabase.from('assets').insert(result.validRows);
    setLoading(false);

    if (error) {
      setMessage({ type: 'error', text: error.message });
      return;
    }

    const suffix =
      result.invalidRows.length > 0
        ? ` ${result.invalidRows.length} invalid row(s) were skipped.`
        : '';

    setMessage({
      type: 'success',
      text: `Inserted ${result.validRows.length} asset row(s) successfully.${suffix}`,
    });
    setCsvText('');
    setParsedRows([]);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-primary-dark">Asset Upload</h1>
        <p className="text-muted">
          Upload or paste CSV data to insert assets into Supabase in one bulk action.
        </p>
      </div>

      {message && (
        <div
          className={`rounded-lg border p-4 text-sm ${
            message.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-700'
              : message.type === 'warning'
                ? 'border-amber-200 bg-amber-50 text-amber-800'
                : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1.15fr_0.85fr]">
        <Card title="CSV Input" subtitle="Use the required header order: name, category, quantity, available, notes">
          <div className="space-y-5">
            <div className="rounded-xl border border-dashed border-border bg-slate-50 p-5">
              <label className="mb-2 block text-sm font-medium text-primary-dark">Upload CSV file</label>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileUpload}
                className="block w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-primary-dark file:mr-4 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-dark"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-primary-dark">Paste CSV manually</label>
              <textarea
                value={csvText}
                onChange={(event) => updateParsedState(event.target.value)}
                placeholder={'name,category,quantity,available,notes\nMacBook Pro 14",Laptop,3,true,Charger included'}
                className="block min-h-[280px] w-full rounded-lg border border-border bg-white px-3 py-3 text-sm text-primary-dark placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={handleInsert} isLoading={loading} className="gap-2">
                <Upload className="h-4 w-4" />
                {loading ? 'Uploading...' : 'Upload & Insert'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setCsvText('');
                  setParsedRows([]);
                  setInvalidRows([]);
                  setMessage(null);
                }}
                disabled={loading}
              >
                Clear
              </Button>
            </div>
          </div>
        </Card>

        <div className="space-y-8">
          <Card title="Import Summary">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                <p className="text-sm font-medium text-green-700">Valid Rows</p>
                <p className="mt-1 text-3xl font-bold text-green-700">{parsedRows.length}</p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-medium text-amber-800">Invalid Rows</p>
                <p className="mt-1 text-3xl font-bold text-amber-800">{invalidRows.length}</p>
              </div>
            </div>
            <div className="mt-4 rounded-lg border border-border bg-slate-50 p-4 text-sm text-muted">
              Rows missing required fields or invalid boolean / integer values are not inserted.
            </div>
          </Card>

          {invalidRows.length > 0 && (
            <Card title="Validation Warnings" subtitle="These rows will be skipped">
              <div className="space-y-3">
                {invalidRows.slice(0, 6).map((row) => (
                  <div key={`${row.rowNumber}-${row.reason}`} className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <div className="mb-1 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-700" />
                      <span className="text-sm font-semibold text-amber-800">Row {row.rowNumber}</span>
                    </div>
                    <p className="text-sm text-amber-800">{row.reason}</p>
                    <p className="mt-1 text-xs text-amber-700/80">{row.raw}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      <Card title="Preview" subtitle="First valid rows ready for insert">
        {previewRows.length === 0 ? (
          <div className="py-10 text-center text-muted">
            <FileUp className="mx-auto mb-3 h-8 w-8 text-slate-400" />
            Add CSV data to preview parsed asset rows.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Category</th>
                  <th className="px-3 py-2 font-medium">Quantity</th>
                  <th className="px-3 py-2 font-medium">Available</th>
                  <th className="px-3 py-2 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, index) => (
                  <tr key={`${row.name}-${index}`} className="border-b border-border/70 last:border-b-0">
                    <td className="px-3 py-3 font-medium text-primary-dark">{row.name}</td>
                    <td className="px-3 py-3 text-primary-dark">{row.category}</td>
                    <td className="px-3 py-3 text-primary-dark">{row.quantity}</td>
                    <td className="px-3 py-3">
                      <Badge variant={row.available ? 'success' : 'danger'}>
                        {row.available ? 'Available' : 'Unavailable'}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-muted">{row.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {parsedRows.length > previewRows.length && (
              <div className="mt-4 flex items-center gap-2 text-sm text-muted">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Showing {previewRows.length} of {parsedRows.length} valid rows.
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
