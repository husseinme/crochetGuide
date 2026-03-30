import type { YarnColor } from "@/types/project";
import { useState, useEffect } from "react";

type ColorTextProps = {
  text: string;
  colors: YarnColor[];
};

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildRegex = (colors: YarnColor[]) => {
  const names = colors
    .map((c) => c.name.trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  if (names.length === 0) return null;
  return new RegExp(`(${names.map(escape).join("|")})`, "gi");
};

export function ColorText({ text, colors }: ColorTextProps) {
  const [touchVisible, setTouchVisible] = useState<number | null>(null);
  const regex = buildRegex(colors);

  useEffect(() => {
    if (touchVisible === null) return;
    const t = setTimeout(() => setTouchVisible(null), 1500);
    return () => clearTimeout(t);
  }, [touchVisible]);

  if (!regex) return <span>{text}</span>;

  const segments: Array<{ text: string; color?: YarnColor }> = [];
  let lastIndex = 0;
  for (const match of text.matchAll(regex)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    if (start > lastIndex) {
      segments.push({ text: text.slice(lastIndex, start) });
    }
    const name = match[0];
    const color = colors.find((c) => c.name.toLowerCase() === name.toLowerCase());
    segments.push({ text: name, color });
    lastIndex = end;
  }
  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex) });
  }

  return (
    <>
      {segments.map((seg, idx) => {
        if (!seg.color) return <span key={idx}>{seg.text}</span>;
        const visible = touchVisible === idx;
        return (
          <span key={idx} className="relative inline-flex items-center gap-1 align-middle">
            <span
              className="inline-flex h-3 w-3 rounded-full border border-border"
              style={{ backgroundColor: seg.color.hex }}
              onMouseEnter={() => setTouchVisible(idx)}
              onMouseLeave={() => setTouchVisible(null)}
              onTouchStart={() => setTouchVisible(idx)}
            />
            <span>{seg.text}</span>
            {visible ? (
              <span className="absolute -top-7 left-1/2 z-10 -translate-x-1/2 rounded-md border border-border bg-surface px-2 py-1 text-xs text-muted shadow-panel">
                {seg.color.name} {seg.color.hex}
              </span>
            ) : null}
          </span>
        );
      })}
    </>
  );
}
