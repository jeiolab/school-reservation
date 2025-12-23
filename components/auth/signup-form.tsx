'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { z } from 'zod'

const signupSchema = z.object({
  email: z.string().email('올바른 이메일 주소를 입력해주세요'),
  password: z.string().min(6, '비밀번호는 최소 6자 이상이어야 합니다'),
  name: z.string().min(2, '이름을 입력해주세요'),
  studentId: z.string().length(4, '학번은 4자리여야 합니다').regex(/^\d{4}$/, '학번은 숫자 4자리여야 합니다'),
})

export default function SignupForm() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    studentId: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [checkingEmail, setCheckingEmail] = useState(false)

  // 이메일 중복 확인
  const checkEmailAvailability = async (email: string) => {
    if (!email || !email.includes('@')) {
      setEmailError(null)
      return
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setEmailError(null)
      return
    }

    setCheckingEmail(true)
    setEmailError(null)

    try {
      const supabase = createClient()
      
      // users 테이블에서 이메일 확인
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('email')
        .eq('email', email)
        .maybeSingle()

      if (userData) {
        setEmailError('이미 사용 중인 이메일입니다.')
      } else if (userError && userError.code !== 'PGRST116') {
        // PGRST116은 "no rows returned" 에러이므로 중복이 아님
        console.error('Error checking email:', userError)
      } else {
        setEmailError(null)
      }
    } catch (err) {
      console.error('Error checking email:', err)
    } finally {
      setCheckingEmail(false)
    }
  }

  const handleEmailChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value
    setFormData({ ...formData, email })
    await checkEmailAvailability(email)
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // 비밀번호 확인
      if (formData.password !== formData.confirmPassword) {
        setError('비밀번호가 일치하지 않습니다.')
        setLoading(false)
        return
      }

      // 이메일 중복 확인
      if (emailError) {
        setError('이미 사용 중인 이메일입니다.')
        setLoading(false)
        return
      }

      // Validation
      const validatedData = signupSchema.parse({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        studentId: formData.studentId,
      })

      const supabase = createClient()

      // 1. Supabase Auth로 회원가입
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: validatedData.email,
        password: validatedData.password,
      })

      if (signUpError) {
        setError(signUpError.message)
        setLoading(false)
        return
      }

      if (!authData.user) {
        setError('회원가입에 실패했습니다.')
        setLoading(false)
        return
      }

      // 2. users 테이블에 사용자 정보 저장
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: validatedData.email,
          name: validatedData.name,
          role: 'student', // 기본값은 student
          student_id: validatedData.studentId,
        })

      if (insertError) {
        console.error('Error inserting user:', insertError)
        // 사용자 정보 저장 실패 시에도 계속 진행 (나중에 수정 가능)
      }

      // 3. 이메일 확인이 비활성화된 경우 자동 로그인
      // 세션이 있으면 바로 로그인, 없으면 이메일 확인 필요 안내
      if (authData.session) {
        // 이메일 확인이 비활성화된 경우 - 세션을 쿠키에 저장하고 바로 로그인
        const maxAge = 604800 * 4 // 4주
        document.cookie = `sb-access-token=${authData.session.access_token}; path=/; max-age=${maxAge}; SameSite=Lax`
        document.cookie = `sb-refresh-token=${authData.session.refresh_token}; path=/; max-age=${maxAge * 7}; SameSite=Lax`
        
        // 페이지 새로고침하여 서버에서 세션 인식
        window.location.href = '/dashboard'
      } else {
        // 이메일 확인이 필요한 경우 - 로그인 페이지로 이동하여 로그인 안내
        alert('회원가입이 완료되었습니다. 이메일을 확인하여 계정을 활성화해주세요.')
        router.push('/login')
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message)
      } else {
        setError('회원가입 중 오류가 발생했습니다.')
      }
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>학생 회원가입</CardTitle>
        <CardDescription>
          학생 계정을 생성하려면 정보를 입력해주세요
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSignup} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="name">이름 *</Label>
            <Input
              id="name"
              type="text"
              placeholder="홍길동"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">이메일 *</Label>
            <div className="relative">
              <Input
                id="email"
                type="email"
                placeholder="student@school.edu"
                value={formData.email}
                onChange={handleEmailChange}
                required
                disabled={loading}
                className={emailError ? 'border-red-500' : ''}
              />
              {checkingEmail && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
            {emailError && (
              <p className="text-xs text-red-600 mt-1">{emailError}</p>
            )}
            {!emailError && formData.email && !checkingEmail && (
              <p className="text-xs text-green-600 mt-1">사용 가능한 이메일입니다</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="studentId">학번 *</Label>
            <Input
              id="studentId"
              type="text"
              placeholder="0101"
              value={formData.studentId}
              onChange={(e) => {
                // 숫자만 입력 허용하고 최대 4자리로 제한
                const value = e.target.value.replace(/\D/g, '').slice(0, 4)
                setFormData({ ...formData, studentId: value })
              }}
              maxLength={4}
              required
              disabled={loading}
            />
            <p className="text-xs text-gray-500">4자리 학년반번호를 입력해주세요 (예: 0101)</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">비밀번호 *</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              disabled={loading}
            />
            <p className="text-xs text-gray-500">최소 6자 이상 입력해주세요</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">비밀번호 확인 *</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              required
              disabled={loading}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? '가입 중...' : '회원가입'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

