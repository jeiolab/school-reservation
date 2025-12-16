import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import BookingFlow from '@/components/booking/booking-flow'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function BookingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-4xl">
        <div className="flex items-center gap-2 sm:gap-4 mb-6 sm:mb-8">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="gap-1 sm:gap-2 px-2 sm:px-3">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">대시보드</span>
            </Button>
          </Link>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">예약하기</h1>
        </div>
        <BookingFlow userId={user.id} />
      </div>
    </div>
  )
}

