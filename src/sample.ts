export function sampleFromSchema(schema: any, depth = 0): unknown {
    if (!schema || depth > 12) return "example";
    if (Array.isArray(schema.enum) && schema.enum.length > 0) return schema.enum[0];
    if (Array.isArray(schema.anyOf) && schema.anyOf.length > 0) {
      return sampleFromSchema(schema.anyOf[0], depth + 1);
    }
    if (schema.default !== undefined) return schema.default;
  
    switch (schema.type) {
      case "string":
        return "example";
      case "integer":
      case "number":
        return Math.max(1, schema.minimum ?? 1);
      case "boolean":
        return true;
      case "array":
        return [sampleFromSchema(schema.items, depth + 1)];
      default: {
        // objects (and anything unknown): fill required properties only
        const out: Record<string, unknown> = {};
        for (const key of schema.required ?? []) {
          out[key] = sampleFromSchema(schema.properties?.[key], depth + 1);
        }
        return out;
      }
    }
  }