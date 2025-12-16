'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { deleteUser } from '@/app/actions/user'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Trash2, Loader2 } from 'lucide-react'

export default function DeleteAccountButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const handleDelete = async () => {
    setLoading(true)

    try {
      // 1. 서버 액션으로 데이터베이스에서 사용자 정보 및 예약 삭제
      const result = await deleteUser()

      if (result.error) {
        alert(result.error)
        setLoading(false)
        return
      }

      // 2. 쿠키 삭제 및 로그아웃
      const supabase = createClient()
      await supabase.auth.signOut()
      document.cookie = 'sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      document.cookie = 'sb-refresh-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'

      // 4. 홈페이지로 리다이렉트
      window.location.href = '/'
    } catch (error) {
      console.error('Error deleting account:', error)
      alert('탈퇴 처리 중 오류가 발생했습니다.')
      setLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="destructive"
          size="sm"
          className="flex items-center gap-2"
          disabled={loading}
        >
          <Trash2 className="w-4 h-4" />
          <span className="hidden sm:inline">계정 삭제</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>정말로 탈퇴하시겠습니까?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>이 작업은 되돌릴 수 없습니다.</p>
            <p className="font-semibold text-red-600">
              탈퇴 시 다음 정보가 모두 삭제됩니다:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>모든 예약 내역</li>
              <li>계정 정보</li>
              <li>개인 정보</li>
            </ul>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>취소</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                처리 중...
              </>
            ) : (
              '탈퇴하기'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

