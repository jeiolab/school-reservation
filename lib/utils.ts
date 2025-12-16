import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 학번을 짧은 형식으로 변환 (예: "20240001" -> "240001")
 * @param studentId 학번 문자열
 * @returns 변환된 학번 또는 원본 문자열
 */
export function formatStudentId(studentId: string | null | undefined): string {
  if (!studentId) return ''
  
  // 8자리 학번인 경우 앞 2자리 제거 (예: "20240001" -> "240001")
  if (studentId.length === 8 && studentId.startsWith('20')) {
    return studentId.substring(2)
  }
  
  // 그 외의 경우 원본 반환
  return studentId
}

