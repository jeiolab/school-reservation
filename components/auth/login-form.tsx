'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'

export default function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [autoLogin, setAutoLogin] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 저장된 로그인 정보 불러오기
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedEmail = localStorage.getItem('saved_email')
      const savedAutoLogin = localStorage.getItem('auto_login') === 'true'
      
      if (savedEmail) {
        setEmail(savedEmail)
        setRememberMe(true)
      }
      
      if (savedAutoLogin) {
        setAutoLogin(true)
        // 자동 로그인 시도
        attemptAutoLogin(savedEmail)
      }
    }
  }, [])

  // 쿠키에서 토큰 읽기 헬퍼 함수
  const getCookie = (name: string): string | null => {
    if (typeof document === 'undefined') return null
    const value = `; ${document.cookie}`
    const parts = value.split(`; ${name}=`)
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null
    return null
  }

  const attemptAutoLogin = async (savedEmail: string | null) => {
    if (!savedEmail) return

    try {
      const supabase = createClient()
      
      // 1. 먼저 Supabase가 localStorage에 저장한 세션 확인
      const { data: { session: existingSession } } = await supabase.auth.getSession()
      
      if (existingSession) {
        // 세션이 있고 유효하면 대시보드로 이동
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          // 쿠키도 업데이트 (동기화)
          const maxAge = 604800 * 4 // 4주
          document.cookie = `sb-access-token=${existingSession.access_token}; path=/; max-age=${maxAge}; SameSite=Lax`
          document.cookie = `sb-refresh-token=${existingSession.refresh_token}; path=/; max-age=${maxAge * 7}; SameSite=Lax`
          window.location.href = '/dashboard'
          return
        }
      }

      // 2. 쿠키에서 토큰 읽기
      const accessToken = getCookie('sb-access-token')
      const refreshToken = getCookie('sb-refresh-token')

      if (accessToken && refreshToken) {
        // 쿠키에 토큰이 있으면 세션 복원 시도
        const { data: { session }, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })

        if (!error && session) {
          // 세션이 유효하면 대시보드로 이동
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            window.location.href = '/dashboard'
            return
          }
        } else {
          // 세션이 만료되었거나 유효하지 않으면 쿠키 삭제
          document.cookie = 'sb-access-token=; path=/; max-age=0'
          document.cookie = 'sb-refresh-token=; path=/; max-age=0'
          localStorage.removeItem('auto_login')
        }
      }
    } catch (err) {
      // 자동 로그인 실패 시 쿠키 정리
      console.log('Auto login not available:', err)
      document.cookie = 'sb-access-token=; path=/; max-age=0'
      document.cookie = 'sb-refresh-token=; path=/; max-age=0'
      localStorage.removeItem('auto_login')
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError(signInError.message)
        setLoading(false)
        return
      }

      if (data.session) {
        // 세션을 쿠키에 저장
        const maxAge = autoLogin ? 604800 * 4 : 3600 // 자동로그인: 4주, 일반: 1시간
        document.cookie = `sb-access-token=${data.session.access_token}; path=/; max-age=${maxAge}; SameSite=Lax`
        document.cookie = `sb-refresh-token=${data.session.refresh_token}; path=/; max-age=${maxAge * 7}; SameSite=Lax`

        // 로그인 정보 저장 설정
        if (rememberMe) {
          localStorage.setItem('saved_email', email)
        } else {
          localStorage.removeItem('saved_email')
        }

        if (autoLogin) {
          localStorage.setItem('auto_login', 'true')
        } else {
          localStorage.removeItem('auto_login')
        }
      }

      // 페이지 새로고침하여 서버에서 세션 인식
      window.location.href = '/dashboard'
    } catch (err) {
      setError('로그인 중 오류가 발생했습니다.')
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>로그인</CardTitle>
        <CardDescription>
          이메일과 비밀번호를 입력해주세요
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">이메일</Label>
            <Input
              id="email"
              type="email"
              placeholder="neungju@h.jne.go.kr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">비밀번호</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="rememberMe"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked === true)}
                disabled={loading}
              />
              <Label
                htmlFor="rememberMe"
                className="text-sm font-normal cursor-pointer"
              >
                이메일 저장
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="autoLogin"
                checked={autoLogin}
                onCheckedChange={(checked) => {
                  setAutoLogin(checked === true)
                  if (checked) {
                    setRememberMe(true) // 자동로그인 선택 시 이메일 저장도 활성화
                  }
                }}
                disabled={loading}
              />
              <Label
                htmlFor="autoLogin"
                className="text-sm font-normal cursor-pointer"
              >
                자동 로그인
              </Label>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? '로그인 중...' : '로그인'}
          </Button>
        </form>
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">
            계정이 없으신가요?{' '}
            <a href="/signup" className="text-blue-600 hover:text-blue-700 font-medium">
              회원가입
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

