export const CROCHET_PROJECT_SCHEMA = {
  type: "object",
  properties: {
    projectName: { type: "string" },
    summary: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        difficulty: { type: ["string", "null"] },
        finishedSize: { type: ["string", "null"] },
        tools: {
          type: "object",
          properties: {
            hookSize: { type: ["string", "null"] },
            yarnType: { type: ["string", "null"] },
            yarnWeight: { type: ["string", "null"] },
            colors: {
              type: "array",
              items: {
                type: "object",
                properties: { name: { type: "string" }, hex: { type: "string" } },
                required: ["name", "hex"],
              },
            },
          },
          required: ["hookSize", "yarnType", "yarnWeight", "colors"],
        },
        materials: { type: "array", items: { type: "string" } },
        skills: { type: "array", items: { type: "string" } },
        notes: { type: "array", items: { type: "string" } },
      },
      required: ["title", "description", "difficulty", "finishedSize", "tools", "materials", "skills", "notes"],
    },
    parts: {
      type: ["array", "null"],
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          partIndex: { type: "integer" },
          description: { type: "string" },
          details: {
            type: "object",
            properties: {
              rowCount: { type: "integer" },
              notes: { type: "array", items: { type: "string" } },
            },
            required: ["rowCount", "notes"],
          },
          rows: {
            type: "array",
            items: { $ref: "#/definitions/row" },
          },
        },
        required: ["name", "partIndex", "description", "details", "rows"],
      },
    },
    rows: {
      type: ["array", "null"],
      items: { $ref: "#/definitions/row" },
    },
  },
  required: ["projectName", "summary", "parts", "rows"],
  definitions: {
    row: {
      type: "object",
      properties: {
        rowNumber: { type: "integer" },
        title: { type: "string" },
        stitchCount: { type: ["integer", "null"] },
        instructions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              text: {
                type: "object",
                properties: {
                  human: { type: "string" },
                  abbreviated: { type: "string" },
                },
                required: ["human", "abbreviated"],
              },
            },
            required: ["id", "text"],
          },
        },
        originalRowText: { type: "string" },
        repeatGroupId: { type: ["string", "null"] },
        repeatIndex: { type: ["integer", "null"] },
        repeatTotal: { type: ["integer", "null"] },
      },
      required: ["rowNumber", "title", "stitchCount", "instructions", "originalRowText", "repeatGroupId", "repeatIndex", "repeatTotal"],
    },
  },
};

