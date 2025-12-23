import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import AdminDashboard from '@/components/admin/admin-dashboard'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Building2, ArrowLeft, AlertCircle, Archive } from 'lucide-react'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user is admin or teacher
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
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="gap-1 sm:gap-2 px-2 sm:px-3">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">대시보드</span>
              </Button>
            </Link>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 truncate">관리자 대시보드</h1>
          </div>
          <div className="flex gap-2 w-full sm:w-auto flex-wrap">
            <Link href="/admin/rooms" className="flex-1 sm:flex-none">
              <Button className="w-full sm:w-auto">
                <Building2 className="w-4 h-4 mr-2" />
                실 관리
              </Button>
            </Link>
            <Link href="/admin/restrictions" className="flex-1 sm:flex-none">
              <Button variant="outline" className="w-full sm:w-auto">
                <AlertCircle className="w-4 h-4 mr-2" />
                사용금지 공지
              </Button>
            </Link>
            <Link href="/admin/archive" className="flex-1 sm:flex-none">
              <Button variant="outline" className="w-full sm:w-auto">
                <Archive className="w-4 h-4 mr-2" />
                보관함
              </Button>
            </Link>
          </div>
        </div>
        <AdminDashboard />
      </div>
    </div>
  )
}

