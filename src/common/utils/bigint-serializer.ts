/**
 * Enables JSON.stringify to serialize BigInt primitives into strings.
 * This solves the native JavaScript error: "TypeError: Do not know how to serialize a BigInt"
 * and ensures seamless JSON responses across Express, NestJS, and Redis caches.
 */
export function registerBigIntSerializer(): void {
  if (!(BigInt.prototype as any).toJSON) {
    (BigInt.prototype as any).toJSON = function (this: bigint): string {
      return this.toString();
    };
  }
}

// Automatically register upon module import
registerBigIntSerializer();
