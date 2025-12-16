import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import TeacherSignupForm from '@/components/auth/teacher-signup-form'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default async function TeacherSignupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              홈으로
            </Button>
          </Link>
        </div>
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            교직원 회원가입
          </h1>
          <p className="text-gray-600">교직원 계정을 생성하세요</p>
        </div>
        <TeacherSignupForm />
        <div className="mt-6 text-center space-y-2">
          <p className="text-sm text-gray-600">
            학생이신가요?{' '}
            <Link href="/signup" className="text-blue-600 hover:text-blue-700 font-medium">
              학생 회원가입
            </Link>
          </p>
          <p className="text-sm text-gray-600">
            이미 계정이 있으신가요?{' '}
            <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
              로그인
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

