import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import LoginForm from '@/components/auth/login-form'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Home, ArrowLeft } from 'lucide-react'

export default async function LoginPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-4 sm:mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-1 sm:gap-2 text-sm sm:text-base px-2 sm:px-3">
              <ArrowLeft className="w-4 h-4" />
              홈으로
            </Button>
          </Link>
        </div>
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            특별실 예약 시스템
          </h1>
          <p className="text-sm sm:text-base text-gray-600">로그인하여 시작하세요</p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}

