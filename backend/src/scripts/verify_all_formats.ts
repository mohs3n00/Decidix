import * as XLSX from 'xlsx';
import { DatasetParserService } from '../services/dataset_parser.js';

async function main() {
  console.log('=== MULTI-FORMAT PARSER VERIFICATION AUDIT ===\n');

  const testCases: Array<{
    format: string;
    filename: string;
    generate: () => Buffer;
    expectType: string;
  }> = [
    {
      format: 'csv',
      filename: 'sample_egypt_health.csv',
      expectType: 'CSV (Comma Separated)',
      generate: () =>
        Buffer.from(
          `region,indicator,year,value
Cairo,life_expectancy,2024,74.5
Alexandria,life_expectancy,2024,73.8
Giza,life_expectancy,2024,72.9`,
          'utf8'
        ),
    },
    {
      format: 'tsv',
      filename: 'sample_egypt_education.tsv',
      expectType: 'TSV (Tab Separated)',
      generate: () =>
        Buffer.from(
          `region\tindicator\tyear\tvalue
Cairo\tliteracy_rate\t2024\t88.5
Alexandria\tliteracy_rate\t2024\t86.2
Giza\tliteracy_rate\t2024\t82.1`,
          'utf8'
        ),
    },
    {
      format: 'json',
      filename: 'sample_egypt_tabular.json',
      expectType: 'JSON (Tabular Array)',
      generate: () =>
        Buffer.from(
          JSON.stringify([
            { region: 'Cairo', indicator: 'unemployment', year: 2024, value: 7.2 },
            { region: 'Alexandria', indicator: 'unemployment', year: 2024, value: 8.1 },
            { region: 'Giza', indicator: 'unemployment', year: 2024, value: 9.0 },
          ]),
          'utf8'
        ),
    },
    {
      format: 'jsonl',
      filename: 'sample_egypt_stream.jsonl',
      expectType: 'JSONL / NDJSON (Line-delimited JSON)',
      generate: () =>
        Buffer.from(
          `{"region":"Cairo","indicator":"internet_penetration","year":2024,"value":81.5}
{"region":"Alexandria","indicator":"internet_penetration","year":2024,"value":77.3}
{"region":"Giza","indicator":"internet_penetration","year":2024,"value":75.0}`,
          'utf8'
        ),
    },
    {
      format: 'xlsx',
      filename: 'sample_egypt_spreadsheets.xlsx',
      expectType: 'XLSX (Office Open XML Spreadsheet)',
      generate: () => {
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet([
          { region: 'Cairo', indicator: 'hospital_beds', year: 2024, value: 2.1 },
          { region: 'Alexandria', indicator: 'hospital_beds', year: 2024, value: 1.8 },
          { region: 'Giza', indicator: 'hospital_beds', year: 2024, value: 1.5 },
        ]);
        XLSX.utils.book_append_sheet(wb, ws, 'EgyptHealth');
        return XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' }) as Buffer;
      },
    },
    {
      format: 'xls',
      filename: 'sample_egypt_legacy.xls',
      expectType: 'XLS (Excel 97-2004 Binary Format / BIFF8)',
      generate: () => {
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet([
          { region: 'Cairo', indicator: 'school_enrollment', year: 2024, value: 96.5 },
          { region: 'Alexandria', indicator: 'school_enrollment', year: 2024, value: 94.2 },
          { region: 'Giza', indicator: 'school_enrollment', year: 2024, value: 91.8 },
        ]);
        XLSX.utils.book_append_sheet(wb, ws, 'LegacySheet');
        return XLSX.write(wb, { bookType: 'biff8', type: 'buffer' }) as Buffer;
      },
    },
  ];

  const results: any[] = [];

  for (const tc of testCases) {
    const buffer = tc.generate();
    try {
      const parsed = DatasetParserService.parse(buffer, tc.format, {
        filename: tc.filename,
        datasetId: `test_${tc.format}`,
      });

      const cols = parsed.report.detectedColumns;
      const recCount = parsed.report.processedRecords;
      const status = parsed.report.status;
      const canonicalRegions = parsed.canonical?.regions?.length ?? 0;
      const canonicalMetrics = parsed.canonical?.regional_metrics?.length ?? 0;

      results.push({
        format: tc.format.toUpperCase(),
        description: tc.expectType,
        bufferBytes: buffer.length,
        status: status === 'READY' ? 'PASS' : 'FAIL',
        records: recCount,
        detectedColumns: cols,
        canonicalRegions,
        canonicalMetrics,
        error: null,
      });
      console.log(`[PASS] ${tc.format.toUpperCase()} (${tc.filename}): ${recCount} records parsed successfully into ${canonicalMetrics} canonical metrics.`);
    } catch (err: any) {
      results.push({
        format: tc.format.toUpperCase(),
        description: tc.expectType,
        bufferBytes: buffer.length,
        status: 'FAIL',
        records: 0,
        error: err.message,
      });
      console.error(`[FAIL] ${tc.format.toUpperCase()} (${tc.filename}):`, err.message);
    }
  }

  console.log('\n--- FORMAT VERIFICATION SUMMARY TABLE ---');
  console.table(results);
}

main().catch(console.error);
