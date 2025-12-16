'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { z } from 'zod'

const teacherSignupSchema = z.object({
  email: z.string().email('올바른 이메일 주소를 입력해주세요'),
  password: z.string().min(6, '비밀번호는 최소 6자 이상이어야 합니다'),
  name: z.string().min(2, '이름을 입력해주세요'),
  verificationCode: z.string().min(1, '인증 코드를 입력해주세요'),
})

// 교직원 인증 코드
// 환경 변수 NEXT_PUBLIC_TEACHER_VERIFICATION_CODE를 .env.local 파일에 설정하세요
const TEACHER_VERIFICATION_CODE = 
  process.env.NEXT_PUBLIC_TEACHER_VERIFICATION_CODE || ''

export default function TeacherSignupForm() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    verificationCode: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // 인증 코드 확인
      if (!TEACHER_VERIFICATION_CODE) {
        setError('인증 코드가 설정되지 않았습니다. 관리자에게 문의하세요.')
        setLoading(false)
        return
      }
      
      if (formData.verificationCode !== TEACHER_VERIFICATION_CODE) {
        setError('인증 코드가 올바르지 않습니다.')
        setLoading(false)
        return
      }

      // 비밀번호 확인
      if (formData.password !== formData.confirmPassword) {
        setError('비밀번호가 일치하지 않습니다.')
        setLoading(false)
        return
      }

      // Validation
      const validatedData = teacherSignupSchema.parse({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        verificationCode: formData.verificationCode,
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

      // 2. users 테이블에 교직원 정보 저장 (role: 'teacher')
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: validatedData.email,
          name: validatedData.name,
          role: 'teacher', // 교직원 역할
          student_id: null, // 교직원은 학번 없음
        })

      if (insertError) {
        console.error('Error inserting user:', insertError)
        setError('사용자 정보 저장 중 오류가 발생했습니다.')
        setLoading(false)
        return
      }

      // 3. 로그인 상태로 대시보드로 이동
      router.push('/dashboard')
      router.refresh()
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
        <CardTitle>교직원 회원가입</CardTitle>
        <CardDescription>
          교직원 계정을 생성하려면 인증 코드가 필요합니다
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
            <Input
              id="email"
              type="email"
              placeholder="teacher@school.edu"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="verificationCode">교직원 인증 코드 *</Label>
            <Input
              id="verificationCode"
              type="text"
              placeholder="인증 코드를 입력하세요"
              value={formData.verificationCode}
              onChange={(e) => setFormData({ ...formData, verificationCode: e.target.value })}
              required
              disabled={loading}
            />
            <p className="text-xs text-gray-500">
              교직원 인증 코드가 필요합니다. 관리자에게 문의하세요.
            </p>
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
            {loading ? '가입 중...' : '교직원 회원가입'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

