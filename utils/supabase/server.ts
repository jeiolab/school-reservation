import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'

export async function createClient() {
  const cookieStore = await cookies()
  
  // Get auth tokens from cookies
  const accessToken = cookieStore.get('sb-access-token')?.value
  const refreshToken = cookieStore.get('sb-refresh-token')?.value

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase environment variables are not configured')
  }

  const supabase = createSupabaseClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  )

  // Set session if tokens exist
  if (accessToken && refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    })
    
    // 세션이 유효하지 않으면 쿠키 삭제
    if (error || !data.session) {
      // 세션이 만료되었거나 유효하지 않음
      console.warn('Session invalid or expired:', error)
      return supabase
    }
    
    // 세션 설정 후 명시적으로 사용자 정보 확인
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError) {
      console.warn('Error getting user after setting session:', userError)
    }
  }

  return supabase
}

