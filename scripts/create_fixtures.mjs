import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as XLSX from '../backend/node_modules/xlsx/xlsx.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.join(__dirname, 'fixtures');

if (!fs.existsSync(fixturesDir)) {
  fs.mkdirSync(fixturesDir, { recursive: true });
}

// 1. CSV
const csvContent = `region,indicator,year,value
Cairo,life_expectancy,2022,73.8
Cairo,life_expectancy,2023,74.1
Cairo,life_expectancy,2024,74.5
Cairo,physicians_density,2022,2.8
Cairo,physicians_density,2023,2.9
Cairo,physicians_density,2024,3.1
Alexandria,life_expectancy,2022,73.1
Alexandria,life_expectancy,2023,73.5
Alexandria,life_expectancy,2024,73.8
Alexandria,physicians_density,2022,2.6
Alexandria,physicians_density,2023,2.7
Alexandria,physicians_density,2024,2.9
Giza,life_expectancy,2022,71.4
Giza,life_expectancy,2023,71.8
Giza,life_expectancy,2024,72.1
Giza,physicians_density,2022,2.2
Giza,physicians_density,2023,2.3
Giza,physicians_density,2024,2.4
`;
fs.writeFileSync(path.join(fixturesDir, 'test_egypt_health.csv'), csvContent);

// 2. TSV
const tsvContent = `region\tindicator\tyear\tvalue
Cairo\tliteracy_rate\t2022\t86.2
Cairo\tliteracy_rate\t2023\t87.4
Cairo\tliteracy_rate\t2024\t88.5
Cairo\tschool_enrolment\t2022\t94.8
Cairo\tschool_enrolment\t2023\t95.5
Cairo\tschool_enrolment\t2024\t96.2
Alexandria\tliteracy_rate\t2022\t84.1
Alexandria\tliteracy_rate\t2023\t85.0
Alexandria\tliteracy_rate\t2024\t86.1
Alexandria\tschool_enrolment\t2022\t93.0
Alexandria\tschool_enrolment\t2023\t94.0
Alexandria\tschool_enrolment\t2024\t94.8
`;
fs.writeFileSync(path.join(fixturesDir, 'test_egypt_education.tsv'), tsvContent);

// 3. JSON array
const jsonRecords = [
  { region: 'Cairo', indicator: 'broadband_coverage', year: 2022, value: 76.0 },
  { region: 'Cairo', indicator: 'broadband_coverage', year: 2023, value: 79.5 },
  { region: 'Cairo', indicator: 'broadband_coverage', year: 2024, value: 82.5 },
  { region: 'Alexandria', indicator: 'broadband_coverage', year: 2022, value: 72.0 },
  { region: 'Alexandria', indicator: 'broadband_coverage', year: 2023, value: 75.1 },
  { region: 'Alexandria', indicator: 'broadband_coverage', year: 2024, value: 78.3 },
  { region: 'Giza', indicator: 'broadband_coverage', year: 2022, value: 65.0 },
  { region: 'Giza', indicator: 'broadband_coverage', year: 2023, value: 68.2 },
  { region: 'Giza', indicator: 'broadband_coverage', year: 2024, value: 71.0 }
];
fs.writeFileSync(path.join(fixturesDir, 'test_egypt_records.json'), JSON.stringify(jsonRecords, null, 2));

// 4. JSONL
const jsonlContent = [
  JSON.stringify({ region: 'Cairo', indicator: 'clean_water_access', year: 2022, value: 97.0 }),
  JSON.stringify({ region: 'Cairo', indicator: 'clean_water_access', year: 2023, value: 97.6 }),
  JSON.stringify({ region: 'Cairo', indicator: 'clean_water_access', year: 2024, value: 98.2 }),
  JSON.stringify({ region: 'Alexandria', indicator: 'clean_water_access', year: 2022, value: 95.0 }),
  JSON.stringify({ region: 'Alexandria', indicator: 'clean_water_access', year: 2023, value: 95.8 }),
  JSON.stringify({ region: 'Alexandria', indicator: 'clean_water_access', year: 2024, value: 96.5 })
].join('\n') + '\n';
fs.writeFileSync(path.join(fixturesDir, 'test_egypt_stream.jsonl'), jsonlContent);

// 5. XLSX workbook
const wb = XLSX.utils.book_new();
const wsData = [
  ['region', 'indicator', 'year', 'value'],
  ['Cairo', 'economic_growth', 2022, 4.2],
  ['Cairo', 'economic_growth', 2023, 4.8],
  ['Cairo', 'economic_growth', 2024, 5.1],
  ['Alexandria', 'economic_growth', 2022, 3.8],
  ['Alexandria', 'economic_growth', 2023, 4.1],
  ['Alexandria', 'economic_growth', 2024, 4.4],
  ['Giza', 'economic_growth', 2022, 3.2],
  ['Giza', 'economic_growth', 2023, 3.6],
  ['Giza', 'economic_growth', 2024, 3.9],
];
const ws = XLSX.utils.aoa_to_sheet(wsData);
XLSX.utils.book_append_sheet(wb, ws, 'Egypt_Economy');
const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
fs.writeFileSync(path.join(fixturesDir, 'test_egypt_economy.xlsx'), buf);

// 6. Malformed CSV
const malformedContent = `name,type,notes
InvalidRow1,unknown,none
InvalidRow2,unknown,none
`;
fs.writeFileSync(path.join(fixturesDir, 'test_malformed.csv'), malformedContent);

console.log('Successfully created all 6 test fixtures in scripts/fixtures/:');
for (const file of fs.readdirSync(fixturesDir)) {
  const stat = fs.statSync(path.join(fixturesDir, file));
  console.log(` - ${file} (${stat.size} bytes)`);
}
