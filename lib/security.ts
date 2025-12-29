/**
 * 보안 관련 유틸리티 함수
 */

/**
 * UUID 형식 검증
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

/**
 * UUID 검증 및 정리
 */
export function validateAndSanitizeUUID(uuid: string | null | undefined): string | null {
  if (!uuid || typeof uuid !== 'string') {
    return null
  }
  const trimmed = uuid.trim()
  return isValidUUID(trimmed) ? trimmed : null
}

/**
 * 입력 문자열 정리 (XSS 방지용)
 */
export function sanitizeString(input: string | null | undefined, maxLength?: number): string {
  if (!input || typeof input !== 'string') {
    return ''
  }
  // HTML 태그 제거
  let sanitized = input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim()
  
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength)
  }
  
  return sanitized
}

/**
 * 숫자 검증
 */
export function validateNumber(input: string | null | undefined, min?: number, max?: number): number | null {
  if (!input || typeof input !== 'string') {
    return null
  }
  const num = parseInt(input, 10)
  if (isNaN(num)) {
    return null
  }
  if (min !== undefined && num < min) {
    return null
  }
  if (max !== undefined && num > max) {
    return null
  }
  return num
}

