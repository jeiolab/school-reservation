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
 * UTC 시간을 한국 시간(UTC+9)으로 변환하여 표시
 * @param dateString ISO 문자열 또는 Date 객체
 * @returns 한국 시간대로 표시할 수 있는 Date 객체
 */
export function toKoreaTime(dateString: string | Date): Date {
  let utcTimestamp: number
  
  if (typeof dateString === 'string') {
    // ISO 문자열을 파싱 (UTC 시간으로 저장됨)
    const date = new Date(dateString)
    // getTime()은 항상 UTC 기준 밀리초를 반환
    utcTimestamp = date.getTime()
  } else {
    // Date 객체인 경우, UTC 타임스탬프를 가져옴
    utcTimestamp = dateString.getTime()
  }
  
  // UTC 타임스탬프에 9시간(한국 시간대 오프셋)을 더함
  const koreaOffsetMs = 9 * 60 * 60 * 1000
  const koreaTimestamp = utcTimestamp + koreaOffsetMs
  
  // 새로운 Date 객체 생성
  // 이 Date 객체는 로컬 시간대로 표시되지만, 우리가 원하는 한국 시간 값을 가짐
  // format 함수는 이 Date 객체를 로컬 시간대로 포맷팅하므로, 
  // UTC+9 시간이 올바르게 표시됨
  return new Date(koreaTimestamp)
}

