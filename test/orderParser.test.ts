import { parseOrderText } from '../src/utils/orderParser';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`PASS: ${message}`);
}

async function runTests() {
  console.log('\n======================================================');
  console.log('RUNNING AUTOMATED BOLPROOF ORDER PARSER TESTS');
  console.log('======================================================\n');

  // -------------------------------------------------------------------------
  // 1. Acceptance Test: "आधा चीनी एक नमक 3 सरसों तेल ऑर्डर करना है"
  // -------------------------------------------------------------------------
  console.log('--- 1. Acceptance Test: Multi-product transcript with missing units ---');
  const acceptance = parseOrderText('आधा चीनी एक नमक 3 सरसों तेल ऑर्डर करना है');

  assert(acceptance.items.length === 3, 'Should identify exactly 3 products');

  const sugar = acceptance.items.find((i) => i.id === 'sugar');
  const salt = acceptance.items.find((i) => i.id === 'salt');
  const oil = acceptance.items.find((i) => i.id === 'oil');

  assert(Boolean(sugar), 'Sugar must be present in parsed items');
  assert(Boolean(salt), 'Salt must be present in parsed items');
  assert(Boolean(oil), 'Mustard oil must be present in parsed items');

  assert(sugar?.quantity !== '2 kg', 'Sugar must NOT be assigned 2 kg when user said "आधा चीनी"');
  assert(sugar?.quantity === null, 'Sugar quantity must be null (unclear)');
  assert(sugar?.isUnclear === true, 'Sugar must be marked as unclear');
  assert(
    sugar?.clarificationQuestion.includes('चीनी कितनी चाहिए') || false,
    'Sugar clarification question should target sugar'
  );

  assert(salt?.quantity === null, 'Salt must NOT inherit sugar quantity; must be null');
  assert(salt?.isUnclear === true, 'Salt must be marked as unclear');
  assert(salt?.clarificationQuestion.includes('नमक कितना चाहिए') || false, 'Salt clarification question should target salt');

  assert(oil?.quantity === null, 'Mustard oil must NOT receive an invented quantity');
  assert(oil?.productType === 'liquid', 'Mustard oil must be classified as a liquid');
  assert(oil?.isUnclear === true, 'Mustard oil must be marked as unclear');
  assert(oil?.options.includes('1 L') || false, 'Mustard oil clarification options must include liquid volumes (L/ml)');

  assert(acceptance.needsClarification === true, 'needsClarification must be true');
  assert(acceptance.unclearItems.length === 3, 'All 3 items must be in unclearItems list');

  // -------------------------------------------------------------------------
  // 2. Hindi Fractions with Explicit Units
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Hindi Fractions with Explicit Units ---');

  const halfKgSugar = parseOrderText('आधा किलो चीनी');
  assert(halfKgSugar.items[0]?.quantity === '500 g', '"आधा किलो चीनी" must resolve to 500 g');
  assert(halfKgSugar.items[0]?.isUnclear === false, '"आधा किलो चीनी" must be clear');

  const halfKgSugarAlt = parseOrderText('आधा kg चीनी');
  assert(halfKgSugarAlt.items[0]?.quantity === '500 g', '"आधा kg चीनी" must resolve to 500 g');

  const halfLiterOil = parseOrderText('आधा लीटर सरसों तेल');
  assert(halfLiterOil.items[0]?.quantity === '500 ml', '"आधा लीटर सरसों तेल" must resolve to 500 ml');
  assert(halfLiterOil.items[0]?.isUnclear === false, '"आधा लीटर सरसों तेल" must be clear');

  const pavKgTea = parseOrderText('पाव किलो चायपत्ती');
  assert(pavKgTea.items[0]?.quantity === '250 g', '"पाव किलो चायपत्ती" must resolve to 250 g');
  assert(pavKgTea.items[0]?.isUnclear === false, '"पाव किलो चायपत्ती" must be clear');

  const oneAndHalfKgSugar = parseOrderText('डेढ़ किलो चीनी');
  assert(oneAndHalfKgSugar.items[0]?.quantity === '1.5 kg', '"डेढ़ किलो चीनी" must resolve to 1.5 kg');
  assert(oneAndHalfKgSugar.items[0]?.isUnclear === false, '"डेढ़ किलो चीनी" must be clear');

  const twoAndHalfKgAtta = parseOrderText('ढाई किलो आटा');
  assert(twoAndHalfKgAtta.items[0]?.quantity === '2.5 kg', '"ढाई किलो आटा" must resolve to 2.5 kg');
  assert(twoAndHalfKgAtta.items[0]?.isUnclear === false, '"ढाई किलो आटा" must be clear');

  const twoKgSugar = parseOrderText('दो किलो चीनी');
  assert(twoKgSugar.items[0]?.quantity === '2 kg', '"दो किलो चीनी" must resolve to 2 kg');
  assert(twoKgSugar.items[0]?.isUnclear === false, '"दो किलो चीनी" must be clear');

  // -------------------------------------------------------------------------
  // 3. Missing Units / Bare Fractions & Numbers
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Missing Units / Bare Numbers & Fractions ---');

  const bareAdhaSugar = parseOrderText('आधा चीनी');
  assert(bareAdhaSugar.items[0]?.quantity === null, '"आधा चीनी" without unit must have null quantity');
  assert(bareAdhaSugar.items[0]?.isUnclear === true, '"आधा चीनी" must be marked as unclear');

  const bareEkNamak = parseOrderText('एक नमक');
  assert(bareEkNamak.items[0]?.quantity === null, '"एक नमक" without unit must have null quantity');
  assert(bareEkNamak.items[0]?.isUnclear === true, '"एक नमक" must be marked as unclear');

  const bare3Oil = parseOrderText('3 सरसों तेल');
  assert(bare3Oil.items[0]?.quantity === null, '"3 सरसों तेल" without unit must have null quantity');
  assert(bare3Oil.items[0]?.isUnclear === true, '"3 सरसों तेल" must be marked as unclear');

  // -------------------------------------------------------------------------
  // 4. Cross-Item Quantity Assignment (No cross-contamination)
  // -------------------------------------------------------------------------
  console.log('\n--- 4. Cross-Item Quantity Assignment ---');

  const cross1 = parseOrderText('दो किलो चीनी और एक नमक');
  const c1Sugar = cross1.items.find((i) => i.id === 'sugar');
  const c1Salt = cross1.items.find((i) => i.id === 'salt');
  assert(c1Sugar?.quantity === '2 kg', 'Sugar must receive 2 kg');
  assert(c1Sugar?.isUnclear === false, 'Sugar must be clear');
  assert(c1Salt?.quantity === null, 'Salt must NOT inherit sugar quantity (must be null)');
  assert(c1Salt?.isUnclear === true, 'Salt must be marked unclear');

  const cross2 = parseOrderText('एक चीनी और दो किलो नमक');
  const c2Sugar = cross2.items.find((i) => i.id === 'sugar');
  const c2Salt = cross2.items.find((i) => i.id === 'salt');
  assert(c2Sugar?.quantity === null, 'Sugar must NOT inherit salt quantity (must be null)');
  assert(c2Sugar?.isUnclear === true, 'Sugar must be marked unclear');
  assert(c2Salt?.quantity === '2 kg', 'Salt must receive 2 kg');
  assert(c2Salt?.isUnclear === false, 'Salt must be clear');

  const cross3 = parseOrderText('500 ml सरसों तेल और 2 kg चीनी');
  const c3Oil = cross3.items.find((i) => i.id === 'oil');
  const c3Sugar = cross3.items.find((i) => i.id === 'sugar');
  assert(c3Oil?.quantity === '500 ml', 'Oil must be 500 ml');
  assert(c3Sugar?.quantity === '2 kg', 'Sugar must be 2 kg');
  assert(cross3.needsClarification === false, 'Both explicit items must be verified');

  // -------------------------------------------------------------------------
  // 5. Multiple Products with All Explicit Units
  // -------------------------------------------------------------------------
  console.log('\n--- 5. Multiple Products with Explicit Units ---');
  const allClear = parseOrderText('2 kg चीनी 1 kg नमक 1 लीटर सरसों तेल');
  assert(allClear.items.length === 3, 'Should find all 3 products');
  assert(allClear.items.every((i) => !i.isUnclear), 'All items should be verified');
  assert(allClear.needsClarification === false, 'needsClarification should be false');

  // -------------------------------------------------------------------------
  // 6. Missing Quantities Completely
  // -------------------------------------------------------------------------
  console.log('\n--- 6. Missing Quantities Completely ---');
  const noQty = parseOrderText('चीनी और नमक दे दो');
  assert(noQty.items.length === 2, 'Should find 2 products');
  assert(noQty.items.every((i) => i.isUnclear), 'Both items without quantity must be unclear');
  assert(noQty.needsClarification === true, 'needsClarification should be true');

  console.log('\n======================================================');
  console.log('ALL 23 UNIT TESTS PASSED SUCCESSFULLY!');
  console.log('======================================================\n');
}

runTests().catch((err) => {
  console.error('\nTests failed with error:', err);
  process.exit(1);
});
