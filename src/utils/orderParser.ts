/**
 * Deterministic Kirana Spoken Order Parser
 *
 * Inspects Hindi grocery spoken orders:
 * - Identifies products independently (sugar, salt, mustard oil, tea, atta).
 * - Extracts quantities and units without cross-item leakage.
 * - Supports Hindi fractions (आधा किलो, आधा लीटर, पाव किलो, डेढ़ किलो, ढाई किलो).
 * - Detects bare numbers/fractions without units (e.g. "आधा चीनी", "एक नमक", "3 सरसों तेल")
 *   and marks them as unclear instead of silently guessing quantities.
 * - Handles liquid volumes for oils (L / ml) without assuming kilograms.
 */

export interface ParsedItem {
  id: string;
  name: string;
  productType: 'weight' | 'liquid' | 'general';
  rawMatchedText: string;
  quantity: string | null;
  isUnclear: boolean;
  statusText: string;
  clarificationQuestion: string;
  options: string[];
}

export interface ParseResult {
  items: ParsedItem[];
  needsClarification: boolean;
  unclearItems: ParsedItem[];
}

interface ProductDef {
  id: string;
  name: string;
  type: 'weight' | 'liquid' | 'general';
  keywords: string[];
  defaultOptions: string[];
  defaultClarification: string;
}

const PRODUCT_DEFS: ProductDef[] = [
  {
    id: 'oil',
    name: 'सरसों का तेल (Mustard Oil)',
    type: 'liquid',
    keywords: [
      'सरसों का तेल',
      'सरसों के तेल',
      'सरसों तेल',
      'sarson tel',
      'sarson ka tel',
      'mustard oil',
      'रिफाइंड तेल',
      'कुकिंग ऑयल',
      'cooking oil',
      'सरसों',
      'तेल',
      'oil',
    ],
    defaultOptions: ['500 ml', '1 L', '2 L', '5 L'],
    defaultClarification: 'सरसों का तेल कितना और किस पैक में चाहिए?',
  },
  {
    id: 'sugar',
    name: 'चीनी (Sugar)',
    type: 'weight',
    keywords: ['चीनी', 'शक्कर', 'sugar', 'chini', 'shakkar'],
    defaultOptions: ['500 g', '1 kg', '2 kg'],
    defaultClarification: 'चीनी कितनी चाहिए—500 g, 1 kg या 2 kg?',
  },
  {
    id: 'salt',
    name: 'नमक (Salt)',
    type: 'weight',
    keywords: ['टाटा नमक', 'नमक', 'salt', 'namak'],
    defaultOptions: ['500 g', '1 kg', '2 kg'],
    defaultClarification: 'नमक कितना चाहिए?',
  },
  {
    id: 'tea',
    name: 'चायपत्ती (Tea)',
    type: 'weight',
    keywords: ['चायपत्ती', 'चाय पत्ती', 'चाय', 'tea', 'chai patti'],
    defaultOptions: ['100 g', '250 g', '500 g'],
    defaultClarification: 'चायपत्ती कितनी चाहिए?',
  },
  {
    id: 'atta',
    name: 'आटा (Atta)',
    type: 'weight',
    keywords: ['आशीर्वाद आटा', 'आटा', 'atta', 'flour'],
    defaultOptions: ['1 kg', '5 kg', '10 kg'],
    defaultClarification: 'आटा कितना चाहिए?',
  },
];

interface MatchedProductLocation {
  def: ProductDef;
  keyword: string;
  startIndex: number;
  endIndex: number;
}

/**
 * Extracts a normalized quantity string from a product's isolated segment.
 * Returns null if the quantity or unit is missing/ambiguous.
 */
function extractQuantityFromSegment(
  segment: string,
  productType: 'weight' | 'liquid' | 'general'
): { quantity: string | null; isUnclear: boolean } {
  const s = segment.toLowerCase().replace(/[,।!?]/g, ' ');

  // -------------------------------------------------------------
  // 1. Explicit Hindi Fraction + Unit Combinations
  // -------------------------------------------------------------
  // 250 g / पाव किलो
  if (/(पाव\s*किलो|पाव\s*kg|एक\s*पाव|1\s*पाव|250\s*ग्राम|250\s*g\b|250\s*gm)/i.test(s)) {
    return { quantity: '250 g', isUnclear: false };
  }

  // 500 g / आधा किलो (Weight)
  if (
    /(आधा\s*किलो|आधा\s*kg|आधा\s*k\.g|500\s*ग्राम|500\s*g\b|500\s*gm)/i.test(s) &&
    productType !== 'liquid'
  ) {
    return { quantity: '500 g', isUnclear: false };
  }

  // 500 ml / आधा लीटर (Liquid)
  if (/(आधा\s*लीटर|आधा\s*ltr|आधा\s*l\b|500\s*मिली|500\s*ml\b)/i.test(s)) {
    return { quantity: '500 ml', isUnclear: false };
  }

  // 750 g / पौना किलो
  if (/(पौना\s*किलो|तीन\s*पाव|750\s*ग्राम|750\s*g\b)/i.test(s)) {
    return { quantity: '750 g', isUnclear: false };
  }

  // 1.25 kg / सवा किलो
  if (/(सवा\s*किलो|1\.25\s*kg|1\.25\s*किलो)/i.test(s)) {
    return { quantity: '1.25 kg', isUnclear: false };
  }

  // 1.5 kg / डेढ़ किलो (Weight)
  if (
    /(डेढ़\s*किलो|डेढ\s*किलो|1\.5\s*kg|1\.5\s*किलो)/i.test(s) &&
    productType !== 'liquid'
  ) {
    return { quantity: '1.5 kg', isUnclear: false };
  }

  // 1.5 L / डेढ़ लीटर (Liquid)
  if (/(डेढ़\s*लीटर|डेढ\s*लीटर|1\.5\s*लीटर|1\.5\s*l\b|1\.5\s*ltr)/i.test(s)) {
    return { quantity: '1.5 L', isUnclear: false };
  }

  // 2.5 kg / ढाई किलो (Weight)
  if (
    /(ढाई\s*किलो|2\.5\s*kg|2\.5\s*किलो)/i.test(s) &&
    productType !== 'liquid'
  ) {
    return { quantity: '2.5 kg', isUnclear: false };
  }

  // 2.5 L / ढाई लीटर (Liquid)
  if (/(ढाई\s*लीटर|2\.5\s*लीटर|2\.5\s*l\b|2\.5\s*ltr)/i.test(s)) {
    return { quantity: '2.5 L', isUnclear: false };
  }

  // -------------------------------------------------------------
  // 2. Explicit Liquid Volumes (L / ml)
  // -------------------------------------------------------------
  if (productType === 'liquid') {
    const liquidRegex =
      /(\d+(?:\.\d+)?|एक|दो|तीन|चार|पाँच|पांच|दस)\s*(लीटर|ली\.?|ltr|liter|litre|l\b|मिलीलीटर|मिली|ml\b)/i;
    const match = s.match(liquidRegex);
    if (match) {
      let numStr = match[1];
      const unitStr = match[2].toLowerCase();

      // Normalize Hindi number words
      if (numStr === 'एक') numStr = '1';
      else if (numStr === 'दो') numStr = '2';
      else if (numStr === 'तीन') numStr = '3';
      else if (numStr === 'चार') numStr = '4';
      else if (numStr === 'पाँच' || numStr === 'पांच') numStr = '5';
      else if (numStr === 'दस') numStr = '10';

      const isMl = /^(मिलीलीटर|मिली|ml)$/i.test(unitStr);
      return {
        quantity: `${numStr} ${isMl ? 'ml' : 'L'}`,
        isUnclear: false,
      };
    }
  }

  // -------------------------------------------------------------
  // 3. Explicit Mass / Weight Units (kg / g)
  // -------------------------------------------------------------
  const weightRegex =
    /(\d+(?:\.\d+)?|एक|दो|तीन|चार|पाँच|पांच|दस)\s*(किलो|कि\.?|kg|k\.g|kilo|ग्राम|gm|g\b)/i;
  const weightMatch = s.match(weightRegex);
  if (weightMatch) {
    let numStr = weightMatch[1];
    const unitStr = weightMatch[2].toLowerCase();

    if (numStr === 'एक') numStr = '1';
    else if (numStr === 'दो') numStr = '2';
    else if (numStr === 'तीन') numStr = '3';
    else if (numStr === 'चार') numStr = '4';
    else if (numStr === 'पाँच' || numStr === 'पांच') numStr = '5';
    else if (numStr === 'दस') numStr = '10';

    const isGram = /^(ग्राम|gm|g)$/i.test(unitStr);
    return {
      quantity: `${numStr} ${isGram ? 'g' : 'kg'}`,
      isUnclear: false,
    };
  }

  // -------------------------------------------------------------
  // 4. Missing Unit or Bare Numbers / Fractions -> UNCLEAR!
  // If the segment mentions a number word or fraction without a unit,
  // we NEVER silently guess 2 kg or assume a unit.
  // -------------------------------------------------------------
  return {
    quantity: null,
    isUnclear: true,
  };
}

/**
 * Calculates the semantic boundary between two consecutive product matches.
 */
function findInterProductBoundary(text: string, endA: number, startB: number): number {
  const gap = text.substring(endA, startB);

  // 1. Check for conjunctions (और, तथा, एवं, व, and, or, comma)
  const conjMatch = gap.match(/(\s*(?:और|तथा|एवं|व|and|or|\+|,)\s*)/i);
  if (conjMatch && conjMatch.index !== undefined) {
    // Everything after the conjunction belongs to product B
    return endA + conjMatch.index + conjMatch[0].length;
  }

  // 2. Check for quantity / number start in the gap belonging to product B
  const qtyStartMatch = gap.match(
    /\b(आधा|पाव|पौना|सवा|डेढ़|डेढ|ढाई|एक|दो|तीन|चार|पाँच|पांच|छह|सात|आठ|नौ|दस|\d+)\b/i
  );
  if (qtyStartMatch && qtyStartMatch.index !== undefined) {
    // Everything from the quantity start belongs to product B
    return endA + qtyStartMatch.index;
  }

  // Fallback: split midway
  return Math.floor((endA + startB) / 2);
}

/**
 * Parses a raw spoken or typed transcript and outputs isolated product entities.
 */
export function parseOrderText(rawText: string): ParseResult {
  const text = (rawText || '').trim();

  // If text is empty, return initial baseline demonstration draft
  if (!text) {
    const sugarItem: ParsedItem = {
      id: 'sugar',
      name: 'चीनी (Sugar)',
      productType: 'weight',
      rawMatchedText: '',
      quantity: '2 kg',
      isUnclear: false,
      statusText: 'स्पष्ट ✓ (Verified)',
      clarificationQuestion: 'चीनी कितनी चाहिए—500 g, 1 kg या 2 kg?',
      options: ['500 g', '1 kg', '2 kg'],
    };

    const saltItem: ParsedItem = {
      id: 'salt',
      name: 'नमक (Salt)',
      productType: 'weight',
      rawMatchedText: '',
      quantity: null,
      isUnclear: true,
      statusText: 'मात्रा स्पष्ट नहीं है ⚠️',
      clarificationQuestion: 'नमक कितना चाहिए?',
      options: ['500 g', '1 kg', '2 kg'],
    };

    return {
      items: [sugarItem, saltItem],
      needsClarification: true,
      unclearItems: [saltItem],
    };
  }

  const lowerText = text.toLowerCase();
  const matchedLocations: MatchedProductLocation[] = [];

  // Match all known products and their locations in the transcript
  for (const def of PRODUCT_DEFS) {
    for (const kw of def.keywords) {
      const idx = lowerText.indexOf(kw.toLowerCase());
      if (idx !== -1) {
        // Prevent overlapping shorter keywords on the same product
        const alreadyMatched = matchedLocations.some(
          (m) =>
            m.def.id === def.id ||
            (idx >= m.startIndex && idx < m.endIndex) ||
            (idx + kw.length > m.startIndex && idx + kw.length <= m.endIndex)
        );

        if (!alreadyMatched) {
          matchedLocations.push({
            def,
            keyword: kw,
            startIndex: idx,
            endIndex: idx + kw.length,
          });
        }
      }
    }
  }

  // Sort matched products by their position in the transcript
  matchedLocations.sort((a, b) => a.startIndex - b.startIndex);

  const items: ParsedItem[] = [];

  if (matchedLocations.length > 0) {
    // Calculate isolated boundaries for each product
    const boundaries: number[] = [0];
    for (let i = 0; i < matchedLocations.length - 1; i++) {
      const b = findInterProductBoundary(
        text,
        matchedLocations[i].endIndex,
        matchedLocations[i + 1].startIndex
      );
      boundaries.push(b);
    }
    boundaries.push(text.length);

    for (let i = 0; i < matchedLocations.length; i++) {
      const current = matchedLocations[i];
      const segStart = boundaries[i];
      const segEnd = boundaries[i + 1];
      const segment = text.substring(segStart, segEnd);

      // Extract quantity strictly within this isolated segment
      const { quantity, isUnclear } = extractQuantityFromSegment(
        segment,
        current.def.type
      );

      // Customized clarification question
      let question = current.def.defaultClarification;
      if (
        current.def.id === 'sugar' &&
        /आधा/i.test(segment) &&
        !/किलो|kg/i.test(segment)
      ) {
        question = 'चीनी कितनी चाहिए—500 g, 1 kg या 2 kg?';
      }

      items.push({
        id: current.def.id,
        name: current.def.name,
        productType: current.def.type,
        rawMatchedText: segment.trim(),
        quantity,
        isUnclear,
        statusText: isUnclear ? 'मात्रा स्पष्ट नहीं है ⚠️' : 'स्पष्ट ✓ (Verified)',
        clarificationQuestion: question,
        options: current.def.defaultOptions,
      });
    }
  } else {
    // If no known products matched, provide a generic fallback item
    const customItem: ParsedItem = {
      id: 'custom-product',
      name: text.length > 35 ? text.substring(0, 35) + '...' : text,
      productType: 'general',
      rawMatchedText: text,
      quantity: null,
      isUnclear: true,
      statusText: 'विवरण स्पष्ट नहीं है ⚠️',
      clarificationQuestion: 'उत्पाद की मात्रा और इकाई कितनी चाहिए?',
      options: ['500 g', '1 kg', '2 kg', '1 L'],
    };
    items.push(customItem);
  }

  const unclearItems = items.filter((item) => item.isUnclear);
  const needsClarification = unclearItems.length > 0;

  return {
    items,
    needsClarification,
    unclearItems,
  };
}
