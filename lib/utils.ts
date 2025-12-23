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
  let utcDate: Date
  
  if (typeof dateString === 'string') {
    // ISO 문자열을 UTC로 파싱
    utcDate = new Date(dateString)
  } else {
    // Date 객체인 경우
    utcDate = dateString
  }
  
  // UTC 시간의 각 구성 요소를 가져옴
  const utcYear = utcDate.getUTCFullYear()
  const utcMonth = utcDate.getUTCMonth()
  const utcDay = utcDate.getUTCDate()
  const utcHours = utcDate.getUTCHours()
  const utcMinutes = utcDate.getUTCMinutes()
  const utcSeconds = utcDate.getUTCSeconds()
  const utcMilliseconds = utcDate.getUTCMilliseconds()
  
  // 한국 시간(UTC+9) 계산
  let koreaHours = utcHours + 9
  let koreaDay = utcDay
  let koreaMonth = utcMonth
  let koreaYear = utcYear
  
  // 시간이 24를 넘으면 다음 날로
  if (koreaHours >= 24) {
    koreaHours -= 24
    koreaDay += 1
    // 월의 마지막 날 체크
    const daysInMonth = new Date(koreaYear, koreaMonth + 1, 0).getDate()
    if (koreaDay > daysInMonth) {
      koreaDay = 1
      koreaMonth += 1
      if (koreaMonth >= 12) {
        koreaMonth = 0
        koreaYear += 1
      }
    }
  }
  
  // 로컬 시간대로 한국 시간을 생성
  // 이렇게 하면 format 함수가 로컬 시간대로 포맷팅할 때 한국 시간이 표시됨
  const koreaDate = new Date(
    koreaYear,
    koreaMonth,
    koreaDay,
    koreaHours,
    utcMinutes,
    utcSeconds,
    utcMilliseconds
  )
  
  return koreaDate
}

