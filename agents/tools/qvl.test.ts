/**
 * QVL engine tests.
 *
 * These exist for one reason: beat 4 only works if the block is real, and "it's real" is a
 * claim a judge is entitled to test. Run `npm test` and the engine decides each of the four
 * demo candidates from data, plus two synthetic cases that prove it is not pattern-matching
 * on the demo inputs.
 *
 * Run: npm test   (from agents/)
 */

import { checkQvl, FALLBACK_QVL, type Qvl } from './qvl.js';

let failures = 0;
let checks = 0;

function check(label: string, actual: unknown, expected: unknown): void {
  checks += 1;
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) {
    failures += 1;
    console.error(`  FAIL ${label}\n       expected ${JSON.stringify(expected)}\n       actual   ${JSON.stringify(actual)}`);
  } else {
    console.log(`  ok   ${label}`);
  }
}

const SPECS_OK = {
  capacity: '64GB',
  organization: '2Rx4',
  speed: '4800 MT/s (PC5-38400B)',
  formFactor: 'RDIMM 288-pin',
  voltage: '1.1V',
};

console.log('\n1. the cheapest candidate — spec-compatible, NOT on the QVL (the block)');
{
  const v = checkQvl({ mpn: 'TRA564G48D436O', vendor: 'V-color Technology', specs: SPECS_OK }, FALLBACK_QVL);
  check('decision', v.decision, 'block');
  check('result', v.result, 'not-listed');
  check('onQvl', v.onQvl, false);
  // This is the pairing that makes the beat: specs pass AND it is still blocked.
  check('specsMatch', v.specsMatch, true);
  check('no spec mismatches', v.mismatches.length, 0);
  check('evaluation queue found', v.evaluationQueueId, 'EVAL-G4-0412');
  check('offers a way forward', v.qualifiedAlternatives.length > 0, true);
  console.log('       reason:', v.reason);
}

console.log('\n2. the broker part — qualified MPN, so the QVL CLEARS it (authenticity is separate)');
{
  const v = checkQvl({ mpn: 'MTC20F2085S1RC48BA1', vendor: 'Micron via broker', specs: SPECS_OK }, FALLBACK_QVL);
  check('decision', v.decision, 'pass');
  check('result', v.result, 'qualified');
  check('validation report', v.validationReportId, 'MV-G4-0244');
  // The QVL must NOT be the thing that catches the counterfeit. That is beat 5's job.
  check('note separates part from lot', /covers the part, not/.test(v.note ?? ''), true);
}

console.log('\n3. the two qualified alternates both pass');
for (const [mpn, report] of [
  ['M321R8GA0BB0-CQK', 'MV-G4-0288'],
  ['HMCG94MEBRA109N', 'MV-G4-0291'],
] as const) {
  const v = checkQvl({ mpn, vendor: 'x', specs: SPECS_OK }, FALLBACK_QVL);
  check(`${mpn} decision`, v.decision, 'pass');
  check(`${mpn} report`, v.validationReportId, report);
}

console.log('\n4. a genuinely wrong part — blocked on SPECS, with the fields named');
{
  const v = checkQvl(
    {
      mpn: 'FAKE-32GB-3200',
      vendor: 'Nobody',
      specs: { capacity: '32GB', organization: '1Rx8', speed: '3200 MT/s', formFactor: 'UDIMM', voltage: '1.2V' },
    },
    FALLBACK_QVL,
  );
  check('decision', v.decision, 'block');
  check('specsMatch', v.specsMatch, false);
  check('all five requirements flagged', v.mismatches.length, 5);
  check(
    'mismatch fields',
    v.mismatches.map((m) => m.field).sort(),
    ['capacityGB', 'formFactor', 'ranks', 'speedMTps', 'voltage'],
  );
}

console.log('\n5. a requirement the candidate does not state is a mismatch, not a pass');
{
  const v = checkQvl({ mpn: 'SILENT-PART', vendor: 'x', specs: { capacity: '64GB' } }, FALLBACK_QVL);
  check('silence is not compliance', v.specsMatch, false);
  check('four unstated fields flagged', v.mismatches.length, 4);
}

console.log('\n6. THE PROOF THE ENGINE IS DATA-DRIVEN: add the blocked part to the QVL, it passes');
{
  const amended: Qvl = {
    ...FALLBACK_QVL,
    approvedAlternates: [
      {
        mpn: 'TRA564G48D436O',
        vendor: 'V-color Technology',
        specs: { capacityGB: 64, speedMTps: 4800, ranks: '2Rx4', formFactor: 'RDIMM', voltage: '1.1V' },
        validationReportId: 'MV-G4-0499',
        validatedOn: '2026-10-03',
      },
    ],
  };
  const before = checkQvl({ mpn: 'TRA564G48D436O', vendor: 'V-color', specs: SPECS_OK }, FALLBACK_QVL);
  const after = checkQvl({ mpn: 'TRA564G48D436O', vendor: 'V-color', specs: SPECS_OK }, amended);
  check('blocked against rev-D', before.decision, 'block');
  check('passes against amended QVL', after.decision, 'pass');
  check('as an approved alternate', after.result, 'approved-alternate');
  // Same code, same candidate, different QVL, different answer. That is the whole argument.
}

console.log('\n7. numeric units are compared numerically, not as strings');
{
  const v = checkQvl(
    { mpn: 'M321R8GA0BB0-CQK', vendor: 'Samsung', specs: { ...SPECS_OK, speed: 4800, capacity: 64 } },
    FALLBACK_QVL,
  );
  check('4800 === "4800 MT/s"', v.specsMatch, true);
}

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures > 0) {
  console.error(`${failures} FAILED`);
  process.exit(1);
}
console.log('QVL engine OK — the block is a function of data, not a string.\n');
