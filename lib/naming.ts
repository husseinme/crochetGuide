const sanitizeTitle = (value: string): string =>
  value
    .replace(/^row\s+\d+[:.)-]?\s*/i, "")
    .replace(/^round\s+\d+[:.)-]?\s*/i, "")
    .replace(/^rnd\s+\d+[:.)-]?\s*/i, "")
    .replace(/^r\d+[:.)-]?\s*/i, "")
    .replace(/[()[\]{}]/g, "")
    .trim();

export const inferProjectName = (patternText: string, existingCount: number): string => {
  const lines = patternText
    .split(/\r?\n/)
    .map((line) => sanitizeTitle(line))
    .filter(Boolean);

  const candidate = lines.find((line) => {
    const wordCount = line.split(/\s+/).length;
    return wordCount >= 2 && wordCount <= 7 && line.length <= 48;
  });

  return candidate || `Crochet Project ${existingCount + 1}`;
};
