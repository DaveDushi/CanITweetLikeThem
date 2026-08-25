/**
 * Character-level hygiene for generated posts.
 *
 * Models occasionally emit mojibake (UTF-8 bytes reinterpreted as Latin-1,
 * e.g. "ðŸ‡¯ðŸµ" instead of a flag emoji), stylized symbol alphabets, or stray
 * control/zero-width characters. Everything here runs before a post is shown
 * to anyone: repair what is repairable, drop the rest.
 */

// Chars above U+00FF that cp1252 decodes from bytes 0x80-0x9F. Needed to map
// double-encoded text back to its original UTF-8 bytes.
const CP1252_REVERSE: Record<string, number> = {
  '\u20AC': 0x80, '\u201A': 0x82, '\u0192': 0x83, '\u201E': 0x84,
  '\u2026': 0x85, '\u2020': 0x86, '\u2021': 0x87, '\u02C6': 0x88,
  '\u2030': 0x89, '\u0160': 0x8A, '\u2039': 0x8B, '\u0152': 0x8C,
  '\u017D': 0x8E, '\u2018': 0x91, '\u2019': 0x92, '\u201C': 0x93,
  '\u201D': 0x94, '\u2022': 0x95, '\u2013': 0x96, '\u2014': 0x97,
  '\u02DC': 0x98, '\u2122': 0x99, '\u0161': 0x9A, '\u203A': 0x9B,
  '\u0153': 0x9C, '\u017E': 0x9E, '\u0178': 0x9F,
};

// Signature pairs of Latin-1-decoded UTF-8 (Ã© / â€" / Â  / ðŸ…).
const MOJIBAKE = /\u00C3[\u0080-\u00BF]|\u00E2\u20AC|\u00C2[\u0080-\u00BF]|\u00F0\u009F/;

function repairMojibake(t: string): string {
  if (!MOJIBAKE.test(t)) return t;
  const bytes: number[] = [];
  for (const ch of t) {
    const cp = ch.codePointAt(0)!;
    if (cp <= 0xff) bytes.push(cp);
    else if (CP1252_REVERSE[ch] !== undefined) bytes.push(CP1252_REVERSE[ch]);
    else return t; // legit non-Latin char present — not pure mojibake, leave it
  }
  try {
    const fixed = new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(bytes));
    if (!fixed || fixed.includes('\uFFFD') || MOJIBAKE.test(fixed)) return t;
    return fixed;
  } catch {
    return t;
  }
}

// Everything an X post may legitimately contain: ASCII + newline, common
// Latin letters/punctuation/currency, typographic punctuation, and the
// standard emoji blocks (incl. flags, keycap ZWJ and variation selector).
const ALLOWED = new RegExp(
  '[\\n \\x21-\\x7E' +
    '\\u00A1-\\u00FF' +
    '\\u200D\\u20E3\\uFE0F' +
    '\\u2010-\\u2027' +
    '\\u2030-\\u203A\\u203C\\u2049\\u20AC\\u2122\\u2139' +
    '\\u2194-\\u21AA' +
    '\\u231A\\u231B\\u2328\\u23CF\\u23E9-\\u23FA\\u24C2' +
    '\\u25AA-\\u25FE' +
    '\\u2600-\\u27BF' +
    '\\u2934\\u2935' +
    '\\u2B00-\\u2B55' +
    '\\u3030\\u303D\\u3297\\u3299' +
    ']',
  'u',
);
const ASTRAL_ALLOWED = new RegExp('[\\u{1F000}-\\u{1FAFF}]', 'u');

export function sanitizeTweet(raw: string): string {
  let t = repairMojibake(raw);

  let out = '';
  for (const ch of t) {
    const cp = ch.codePointAt(0)!;
    if (ch === '\t' || ch === '\u00A0') {
      out += ' ';
    } else if (ch === '\r' || ch === '\u2028' || ch === '\u2029') {
      // drop \r entirely (\n handling below covers line breaks)
      if (ch !== '\r') out += '\n';
    } else if (ALLOWED.test(ch) || (cp > 0xffff && ASTRAL_ALLOWED.test(ch))) {
      out += ch;
    }
    // anything else: control chars, zero-width, private use, math alphabets,
    // fullwidth forms, tag characters — dropped
  }

  return out.replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}
