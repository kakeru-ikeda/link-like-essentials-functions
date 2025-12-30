/**
 * Firestoreに保存するデータから undefined を null に変換するユーティリティ関数
 *
 * Firestoreは undefined 値を受け付けないため、すべての undefined を null に変換します。
 *
 * @param data - サニタイズ対象のデータ
 * @returns サニタイズされたデータ（undefined が null に変換される）
 *
 * @example
 * const data = { name: 'John', bio: undefined, age: 30 };
 * const sanitized = sanitizeForFirestore(data);
 * // => { name: 'John', bio: null, age: 30 }
 */
export function sanitizeForFirestore<T>(data: T): T {
  // null, undefined, primitive types の場合
  if (data === undefined) {
    return null as T;
  }

  if (data === null || typeof data !== 'object') {
    return data;
  }

  // Array の場合
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForFirestore(item)) as T;
  }

  // Object の場合（Timestamp等のFirestore型は変換しない）
  if (data.constructor === Object) {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeForFirestore(value);
    }
    return sanitized as T;
  }

  // Timestamp, FieldValue などのFirestore特殊型はそのまま返す
  return data;
}
