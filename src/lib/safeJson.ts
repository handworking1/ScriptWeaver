/** Safe JSON parse — returns fallback on error / 安全 JSON 解析，失败返回回退值 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}
