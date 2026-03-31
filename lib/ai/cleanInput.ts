export type CleanResult = {
  cleaned: string;
  removedSections: string[];
  length: number;
};

const footerPatterns = [
  /all rights reserved/i,
  /copyright/i,
  /pattern number/i,
  /customer service/i,
  /purchase/i,
  /order/i,
  /lion brand/i,
  /yarndex/i,
  /print(ed)?/i,
];

const headerPatterns = [
  /page \d+/i,
  /www\./i,
  /http(s)?:\/\//i,
];

export function cleanRawPatternText(input: string): CleanResult {
  const removed: string[] = [];
  const lines = input.split(/\r?\n/);
  const filtered: string[] = [];
  let skipAbbrev = false;

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line) {
      filtered.push("");
      continue;
    }

    if (/^abbreviations[:]?/i.test(line)) {
      skipAbbrev = true;
      removed.push(line);
      continue;
    }
    if (skipAbbrev) {
      if (/^notes[:]?/i.test(line) || /^pattern/i.test(line) || /^rnds?/i.test(line) || /^row/i.test(line)) {
        skipAbbrev = false;
      } else {
        removed.push(line);
        continue;
      }
    }

    if (footerPatterns.some((re) => re.test(line)) || headerPatterns.some((re) => re.test(line))) {
      removed.push(line);
      continue;
    }

    filtered.push(line);
  }

  const deduped = filtered.filter((line, idx, arr) => !(line && idx > 0 && line === arr[idx - 1]));
  const cleaned = deduped.join("\n").trim();
  return { cleaned, removedSections: removed, length: cleaned.length };
}

