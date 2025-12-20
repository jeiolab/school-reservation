'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateSystemNotice, getSystemNotice } from '@/app/actions/system-notices'
import { Loader2, Save, AlertCircle } from 'lucide-react'

export default function SystemNoticeManagement() {
  const [restrictedHours, setRestrictedHours] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    async function loadNotice() {
      setIsLoading(true)
      const notice = await getSystemNotice()
      if (notice) {
        setRestrictedHours(notice.restricted_hours || '')
        setNotes(notice.notes || '')
      }
      setIsLoading(false)
    }
    loadNotice()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    setMessage(null)

    const formData = new FormData()
    formData.append('restricted_hours', restrictedHours)
    formData.append('notes', notes)

    const result = await updateSystemNotice(formData)

    if (result.error) {
      setMessage({ type: 'error', text: result.error })
    } else {
      setMessage({ type: 'success', text: '공지사항이 성공적으로 업데이트되었습니다.' })
    }

    setIsSubmitting(false)
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          전역 공지사항 관리
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="restricted_hours">사용금지시간</Label>
            <Input
              id="restricted_hours"
              placeholder="예: 평일 18:00-20:00, 주말 전체"
              value={restrictedHours}
              onChange={(e) => setRestrictedHours(e.target.value)}
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-500">
              모든 특별실에 적용되는 사용 금지 시간대를 입력해주세요
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">유의사항</Label>
            <textarea
              id="notes"
              className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="예: 음향 장비 사용 시 사전 신고 필요, 음식물 반입 금지 등"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isSubmitting}
              rows={6}
            />
            <p className="text-xs text-gray-500">
              모든 사용자에게 표시될 유의사항을 입력해주세요
            </p>
          </div>

          {message && (
            <div
              className={`p-3 rounded-md text-sm ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {message.text}
            </div>
          )}

          <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                저장 중...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                저장
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

