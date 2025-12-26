'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function AutoLoginCheck() {
  const router = useRouter()

  useEffect(() => {
    async function checkAutoLogin() {
      try {
        const supabase = createClient()
        
        // 1. Supabase 세션 확인
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (session && !sessionError) {
          const { data: { user }, error: userError } = await supabase.auth.getUser()
          if (user && !userError) {
            // 쿠키 동기화
            const maxAge = 604800 * 4 // 4주
            const isProduction = process.env.NODE_ENV === 'production'
            const secureFlag = isProduction ? '; Secure' : ''
            document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=${maxAge}; SameSite=Lax${secureFlag}`
            document.cookie = `sb-refresh-token=${session.refresh_token}; path=/; max-age=${maxAge * 7}; SameSite=Lax${secureFlag}`
            router.push('/dashboard')
            return
          }
        }

        // 2. 쿠키에서 토큰 확인
        const getCookie = (name: string): string | null => {
          if (typeof document === 'undefined') return null
          const value = `; ${document.cookie}`
          const parts = value.split(`; ${name}=`)
          if (parts.length === 2) return parts.pop()?.split(';').shift() || null
          return null
        }

        const accessToken = getCookie('sb-access-token')
        const refreshToken = getCookie('sb-refresh-token')

        if (accessToken && refreshToken) {
          const { data: { session }, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (!error && session) {
            const { data: { user }, error: userError } = await supabase.auth.getUser()
            if (user && !userError) {
              router.push('/dashboard')
            }
          }
        }
      } catch (err) {
        console.log('Auto login check error:', err)
      }
    }

    checkAutoLogin()
  }, [router])

  return null
}




