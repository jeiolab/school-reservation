import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import RoomManagement from '@/components/admin/room-management'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default async function RoomsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 권한 체크: teacher 또는 admin만 접근 가능
  const { data: userProfile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!userProfile || (userProfile.role !== 'admin' && userProfile.role !== 'teacher')) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-6xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <Link href="/admin">
              <Button variant="ghost" size="sm" className="gap-1 sm:gap-2 px-2 sm:px-3">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">관리자 대시보드</span>
              </Button>
            </Link>
            <div className="flex-1 sm:flex-none">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">실 관리</h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-1 sm:mt-2">특별실을 추가하고 관리할 수 있습니다</p>
            </div>
          </div>
        </div>
        <RoomManagement />
      </div>
    </div>
  )
}

