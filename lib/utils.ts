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

/**
 * UTC 시간을 한국 시간(UTC+9)으로 변환
 * @param dateString ISO 문자열 또는 Date 객체
 * @returns 한국 시간대의 Date 객체
 */
export function toKoreaTime(dateString: string | Date): Date {
  let date: Date
  
  if (typeof dateString === 'string') {
    // ISO 문자열인 경우 UTC로 파싱
    // ISO 문자열이 'Z'로 끝나면 UTC, 그렇지 않으면 로컬 시간대로 파싱됨
    if (dateString.endsWith('Z') || dateString.includes('+') || dateString.includes('-', 10)) {
      // UTC 시간으로 파싱
      date = new Date(dateString)
    } else {
      // 시간대 정보가 없으면 UTC로 가정
      date = new Date(dateString + 'Z')
    }
  } else {
    date = dateString
  }
  
  // UTC 시간을 기준으로 한국 시간(UTC+9) 계산
  // getTime()은 항상 UTC 기준 밀리초를 반환하므로, 여기에 9시간을 더함
  const koreaTime = new Date(date.getTime() + (9 * 60 * 60 * 1000))
  return koreaTime
}

