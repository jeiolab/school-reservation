'use client'

import { formatStudentId } from '@/lib/utils'
import EditStudentIdButton from './edit-student-id-button'

interface StudentIdDisplayProps {
  studentId: string | null
  role: string | null
}

export default function StudentIdDisplay({ studentId, role }: StudentIdDisplayProps) {
  // 학생만 학번 수정 가능
  if (role !== 'student') {
    return null
  }

  return (
    <span className="text-xs sm:text-sm text-gray-600 flex items-center gap-1">
      {studentId && `(${formatStudentId(studentId)})`}
      <EditStudentIdButton currentStudentId={studentId} />
    </span>
  )
}




