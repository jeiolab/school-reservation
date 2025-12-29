import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Get auth tokens from cookies
  const accessToken = request.cookies.get('sb-access-token')?.value
  const refreshToken = request.cookies.get('sb-refresh-token')?.value

  if (!accessToken || !refreshToken) {
    // No auth tokens, continue without auth check
    return response
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase environment variables are not set')
    return response
  }

  const supabase = createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: {
          'x-client-info': 'school-reser-middleware',
        },
      },
    }
  )

  // Set session
  const { data: { session }, error: sessionError } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  })

  // 세션이 유효하지 않으면 쿠키 삭제하고 계속 진행
  if (sessionError || !session) {
    const invalidResponse = NextResponse.next()
    invalidResponse.cookies.delete('sb-access-token')
    invalidResponse.cookies.delete('sb-refresh-token')
    
    // 대시보드나 관리자 페이지 접근 시에만 로그인으로 리디렉션
    if (request.nextUrl.pathname.startsWith('/dashboard') || request.nextUrl.pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    
    return invalidResponse
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  // 사용자 정보를 가져올 수 없으면 쿠키 삭제
  if (userError || !user) {
    const invalidResponse = NextResponse.next()
    invalidResponse.cookies.delete('sb-access-token')
    invalidResponse.cookies.delete('sb-refresh-token')
    
    // 대시보드나 관리자 페이지 접근 시에만 로그인으로 리디렉션
    if (request.nextUrl.pathname.startsWith('/dashboard') || request.nextUrl.pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    
    return invalidResponse
  }

  // Protect dashboard routes
  if (request.nextUrl.pathname.startsWith('/dashboard') && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Protect admin routes - check if user is teacher or admin
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Check user role from database
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userProfile || (userProfile.role !== 'admin' && userProfile.role !== 'teacher')) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // Redirect authenticated users away from login/signup pages and home page
  // 단, 이미 리디렉션 중인 경우는 제외 (무한 루프 방지)
  if (user) {
    const pathname = request.nextUrl.pathname
    if (
      pathname === '/' ||
      pathname === '/login' ||
      pathname === '/signup' ||
      pathname.startsWith('/signup/')
  ) {
      // 리디렉션 응답 생성
      const redirectResponse = NextResponse.redirect(new URL('/dashboard', request.url))
      return redirectResponse
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

