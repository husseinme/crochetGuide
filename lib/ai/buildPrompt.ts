import { CROCHET_PROJECT_SCHEMA } from "./schema";

export const buildPrompt = (pattern: string) => {
  return {
    text: `Convert this LONG crochet pattern into structured JSON only. No markdown.

Required keys: projectName, summary, parts OR rows, instructions with text.human and text.abbreviated, repeat metadata, stitchCount.

Ignore: copyright, promo text, repeated headers/footers, website/order info, duplicate title blocks, abbreviation glossaries, filler legal text.
Keep: title, materials/tools, notes that affect execution, named sections (Head/Body/Border/Assembly/etc.), actual rows/rounds.

Instruction rules:
- Each instruction must be a complete standalone action; no orphan fragments.
- Interpret crochet shorthand first; then write clear human text and concise abbreviated text.
- Do not split inside a logical grouped lace action (e.g., "ch 5, sk next 5 sts, sc in next st" stays grouped).
- For compound sequences, split into separate checklist actions if they are independent steps.

Repeat rules:
- Expand finite repeats like "Rnds 26-33: Rep Rnd 18-25" or "Rnds 34 and 35: Rep Rnd 18 twice" into explicit rows with repeatGroupId/repeatIndex/repeatTotal.
- For open-ended repeats like "Rep Row 2 until strap is 25 in", do NOT invent counts; keep a repeatable instruction row describing the condition.

Parts:
- Only create parts when the pattern clearly names sections. Otherwise set parts=null and use rows.

Output must strictly follow this JSON schema (do not wrap in markdown fences):
${JSON.stringify(CROCHET_PROJECT_SCHEMA)}

Now return only the JSON object.

Pattern:\n${pattern}`,
  };
};

