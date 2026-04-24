export interface ParsedAssetRow {
  name: string;
  category: string;
  quantity: number;
  available: boolean;
  notes: string;
}

export interface InvalidAssetRow {
  rowNumber: number;
  raw: string;
  reason: string;
}

export interface ParseAssetsCsvResult {
  validRows: ParsedAssetRow[];
  invalidRows: InvalidAssetRow[];
}

const REQUIRED_HEADERS = ['name', 'category', 'quantity', 'available', 'notes'] as const;

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += character;
  }

  values.push(current.trim());
  return values;
}

function normalizeHeader(header: string) {
  return header.trim().toLowerCase();
}

export function parseAssetsCsv(csvText: string): ParseAssetsCsvResult {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    throw new Error('CSV input is empty.');
  }

  const headers = parseCsvLine(lines[0]).map(normalizeHeader);
  const missingHeaders = REQUIRED_HEADERS.filter((header) => !headers.includes(header));

  if (missingHeaders.length > 0) {
    throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`);
  }

  const columnIndex = Object.fromEntries(headers.map((header, index) => [header, index])) as Record<string, number>;
  const validRows: ParsedAssetRow[] = [];
  const invalidRows: InvalidAssetRow[] = [];

  for (let rowIndex = 1; rowIndex < lines.length; rowIndex += 1) {
    const rawLine = lines[rowIndex];

    if (!rawLine.replace(/,/g, '').trim()) {
      continue;
    }

    const cells = parseCsvLine(rawLine);
    const name = cells[columnIndex.name]?.trim() || '';
    const category = cells[columnIndex.category]?.trim() || '';
    const quantityValue = cells[columnIndex.quantity]?.trim() || '';
    const availableValue = cells[columnIndex.available]?.trim().toLowerCase() || '';
    const notes = cells[columnIndex.notes]?.trim() || '';

    if (!name || !category || !quantityValue || !availableValue) {
      invalidRows.push({
        rowNumber: rowIndex + 1,
        raw: rawLine,
        reason: 'Missing one or more required fields.',
      });
      continue;
    }

    const quantity = Number(quantityValue);
    if (!Number.isInteger(quantity)) {
      invalidRows.push({
        rowNumber: rowIndex + 1,
        raw: rawLine,
        reason: 'Quantity must be an integer.',
      });
      continue;
    }

    if (!['true', 'false'].includes(availableValue)) {
      invalidRows.push({
        rowNumber: rowIndex + 1,
        raw: rawLine,
        reason: 'Available must be true or false.',
      });
      continue;
    }

    validRows.push({
      name,
      category,
      quantity,
      available: availableValue === 'true',
      notes,
    });
  }

  return { validRows, invalidRows };
}
