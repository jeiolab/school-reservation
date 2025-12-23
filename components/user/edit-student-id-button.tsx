'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { updateStudentId } from '@/app/actions/user'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Edit2, Loader2 } from 'lucide-react'

interface EditStudentIdButtonProps {
  currentStudentId: string | null
  onUpdate?: () => void
}

export default function EditStudentIdButton({ currentStudentId, onUpdate }: EditStudentIdButtonProps) {
  const [open, setOpen] = useState(false)
  const [studentId, setStudentId] = useState(currentStudentId || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      setStudentId(currentStudentId || '')
      setError(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // 검증
    if (!/^\d{4}$/.test(studentId)) {
      setError('학번은 4자리 숫자여야 합니다.')
      setLoading(false)
      return
    }

    try {
      const result = await updateStudentId(studentId)

      if (result.error) {
        setError(result.error)
        setLoading(false)
        return
      }

      // 성공
      setOpen(false)
      if (onUpdate) {
        onUpdate()
      } else {
        // 페이지 새로고침
        window.location.reload()
      }
    } catch (err) {
      console.error('Error updating student ID:', err)
      setError('학번 수정 중 오류가 발생했습니다.')
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
          <Edit2 className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>학번 수정</DialogTitle>
          <DialogDescription>
            4자리 학년반번호를 입력해주세요 (예: 0101)
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="studentId">학번</Label>
              <Input
                id="studentId"
                type="text"
                placeholder="0101"
                value={studentId}
                onChange={(e) => {
                  // 숫자만 입력 허용하고 최대 4자리로 제한
                  const value = e.target.value.replace(/\D/g, '').slice(0, 4)
                  setStudentId(value)
                  setError(null)
                }}
                maxLength={4}
                disabled={loading}
                className={error ? 'border-red-500' : ''}
              />
              {error && (
                <p className="text-xs text-red-600">{error}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              취소
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  수정 중...
                </>
              ) : (
                '수정'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

