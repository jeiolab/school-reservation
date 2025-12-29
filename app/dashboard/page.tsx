import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Calendar, Clock, MapPin, Users, Plus, LogOut, Settings, AlertCircle, Info } from 'lucide-react'
import { format } from 'date-fns'
import LogoutButton from '@/components/auth/logout-button'
import DeleteAccountButton from '@/components/auth/delete-account-button'
import { formatStudentId, toKoreaTime } from '@/lib/utils'
import StudentIdDisplay from '@/components/user/student-id-display'
import { unstable_noStore as noStore } from 'next/cache'

// 한국 시간 기준 현재 날짜 가져오기
function getKoreaDate() {
  return toKoreaTime(new Date())
}
import { getActiveRoomRestrictions } from '@/app/actions/room-restrictions'

async function getUpcomingReservations(userId: string) {
  const supabase = await createClient()
  
  // 한국 시간 기준 현재 시간을 UTC로 변환
  const koreaNow = getKoreaDate()
  const utcNow = new Date(koreaNow.getTime() - (9 * 60 * 60 * 1000))
  
  const { data, error } = await supabase
    .from('reservations')
    .select(`
      *,
      rooms (
        id,
        name,
        location
      )
    `)
    .eq('user_id', userId)
    .in('status', ['pending', 'confirmed'])
    .gte('start_time', utcNow.toISOString())
    .order('start_time', { ascending: true })
    .limit(10)

  if (error) {
    console.error('Error fetching reservations:', error)
    return []
  }

  return Array.isArray(data) ? data : []
}

async function getRejectedReservations(userId: string) {
  const supabase = await createClient()
  
  // 모든 거부된 예약을 가져옴 (필터링 없이)
  const { data, error } = await supabase
    .from('reservations')
    .select(`
      *,
      rooms (
        id,
        name,
        location
      )
    `)
    .eq('user_id', userId)
    .eq('status', 'rejected')
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) {
    console.error('Error fetching rejected reservations:', error)
    return []
  }

  return data || []
}

function calculateDaysUntil(date: string | Date) {
  const target = typeof date === 'string' ? toKoreaTime(date) : toKoreaTime(date)
  const today = getKoreaDate()
  today.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  const diffTime = target.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

export default async function DashboardPage() {
  // 캐시 비활성화 - 항상 최신 사용자 정보를 가져오기 위해
  noStore()
  
  const supabase = await createClient()
  
  // 세션 명시적으로 새로고침
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) {
    console.error('Session error:', sessionError)
  }
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (!user || userError) {
    console.error('User auth error:', userError)
    redirect('/login')
  }

  // Get user profile with retry logic
  let userProfile: any = null
  let profileError: any = null
  
  // 첫 번째 시도
  let { data: profileData, error: firstError } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (firstError) {
    console.error('First attempt - Error fetching user profile:', {
      code: firstError.code,
      message: firstError.message,
      details: firstError.details,
      hint: firstError.hint,
      userId: user.id
    })
    
    // 세션을 새로고침하고 재시도
    await supabase.auth.refreshSession()
    
    // 두 번째 시도
    const retryResult = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()
    
    if (retryResult.error) {
      console.error('Second attempt - Error fetching user profile:', {
        code: retryResult.error.code,
        message: retryResult.error.message,
        details: retryResult.error.details,
        hint: retryResult.error.hint,
        userId: user.id
      })
      profileError = retryResult.error
    } else {
      userProfile = retryResult.data
      console.log('Successfully fetched user profile on retry:', userProfile)
    }
  } else {
    userProfile = profileData
    console.log('Successfully fetched user profile:', userProfile)
  }

  // userProfile이 null인 경우 - 에러를 로그에 남기고 기본값 사용하지 않음
  // 대신 에러 페이지로 리다이렉트하거나 명확한 에러 메시지 표시
  if (!userProfile) {
    console.error('CRITICAL: User profile is null after all attempts', {
      userId: user.id,
      userEmail: user.email,
      error: profileError,
      errorCode: profileError?.code,
      errorMessage: profileError?.message,
      errorDetails: profileError?.details,
      errorHint: profileError?.hint
    })
    
    // RLS 정책 오류인 경우 명확한 메시지 표시
    if (profileError?.code === 'PGRST301' || profileError?.message?.includes('permission denied') || profileError?.message?.includes('policy')) {
      console.error('RLS policy error detected - user may not have permission to view their own profile')
      // RLS 정책 문제인 경우, 기본값을 사용하지 않고 에러 상태로 처리
      // 하지만 앱이 크래시되지 않도록 임시로 기본값 사용
    }
    
    // 기본값을 사용하지 않고, 실제 데이터베이스에서 조회 실패를 명확히 표시
    // 하지만 앱이 크래시되지 않도록 임시로 기본값 사용 (나중에 개선 필요)
    userProfile = {
      id: user.id,
      email: user.email,
      name: user.email?.split('@')[0] || '사용자',
      role: 'student', // 임시 기본값 - 실제로는 데이터베이스 조회 실패를 해결해야 함
      student_id: null,
    }
    console.warn('Using fallback profile - this should be investigated. Check database and RLS policies.')
  } else {
    // 성공적으로 조회된 경우에도 로그 출력 (디버깅용)
    console.log('User profile successfully fetched:', {
      id: userProfile.id,
      email: userProfile.email,
      name: userProfile.name,
      role: userProfile.role,
      student_id: userProfile.student_id
    })
  }

  // 안전하게 데이터 가져오기 (에러 발생 시 빈 배열 반환)
  let upcomingReservations: any[] = []
  let rejectedReservations: any[] = []
  let roomRestrictions: any[] = []
  
  try {
    upcomingReservations = await getUpcomingReservations(user.id)
  } catch (error) {
    console.error('Error fetching upcoming reservations:', error)
    upcomingReservations = []
  }
  
  try {
    rejectedReservations = await getRejectedReservations(user.id)
  } catch (error) {
    console.error('Error fetching rejected reservations:', error)
    rejectedReservations = []
  }
  
  try {
    const restrictions = await getActiveRoomRestrictions()
    roomRestrictions = Array.isArray(restrictions) ? restrictions : []
  } catch (error) {
    console.error('Error fetching room restrictions:', error)
    roomRestrictions = []
  }
  
  // 배열이 아닌 경우 빈 배열로 변환 (이중 안전장치)
  const safeUpcomingReservations = Array.isArray(upcomingReservations) ? upcomingReservations : []
  const safeRejectedReservations = Array.isArray(rejectedReservations) ? rejectedReservations : []

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">대시보드</h1>
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              {(userProfile?.role === 'admin' || userProfile?.role === 'teacher') && (
                <Link href="/admin">
                  <Button variant="ghost" size="sm" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                    <Settings className="w-4 h-4" />
                    <span className="hidden sm:inline">관리자</span>
                  </Button>
                </Link>
              )}
              <div className="flex items-center gap-1 sm:gap-2 truncate max-w-[100px] sm:max-w-none">
                <span className="text-xs sm:text-sm text-gray-600">
                  {userProfile?.name || user.email}
                </span>
                {userProfile?.role === 'student' && (
                  <StudentIdDisplay 
                    studentId={userProfile?.student_id || null} 
                    role={userProfile?.role || null}
                  />
                )}
                {userProfile?.role !== 'student' && userProfile?.student_id && (
                  <span className="text-xs sm:text-sm text-gray-600">
                    ({formatStudentId(userProfile.student_id)})
                  </span>
                )}
                <span className="text-xs sm:text-sm text-gray-600">님</span>
              </div>
              <LogoutButton />
              <DeleteAccountButton />
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-4xl">
        {/* Welcome Section */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            안녕하세요, {userProfile?.name || '학생'}
            {userProfile?.student_id && ` (${formatStudentId(userProfile.student_id)})`}
            님
          </h2>
          <p className="text-sm sm:text-base text-gray-600">
            특별실 예약을 시작해보세요
          </p>
        </div>

        {/* Important Notice */}
        <div className="mb-6 sm:mb-8">
          <Card className="bg-blue-50 border-l-4 border-l-blue-600 shadow-md">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="flex-shrink-0 mt-0.5">
                  <Info className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base sm:text-lg font-bold text-blue-900 mb-2">
                    예약 안내
                  </h3>
                  <p className="text-sm sm:text-base text-blue-800 leading-relaxed">
                    특별실 사용은 예약 시스템으로 운영됩니다. 예약 후 담당 선생님에게 구두로 허락을 요청하세요. 이후 담당 선생님께서 승인을 해주셔야 예약 완료가 되며, 예약 완료 후 특별실을 사용할 수 있습니다.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Room Restrictions Notice */}
        {roomRestrictions && roomRestrictions.length > 0 && (
          <div className="mb-6 sm:mb-8">
            <Card className="border-l-4 border-l-red-500">
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  특별실 사용금지 공지
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {roomRestrictions.map((restriction: any) => (
                  <div
                    key={restriction.id}
                    className="p-3 sm:p-4 bg-red-50 border border-red-200 rounded-md"
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <h3 className="text-sm sm:text-base font-semibold text-red-900 mb-2">
                          {restriction.rooms?.name || '알 수 없음'}
                          {restriction.rooms?.location && ` (${restriction.rooms.location})`}
                        </h3>
                        <div className="space-y-2 text-xs sm:text-sm">
                          <div>
                            <span className="font-medium text-red-800">사용금지 시간대:</span>
                            <span className="ml-2 text-red-700">{restriction.restricted_hours}</span>
                          </div>
                          <div>
                            <span className="font-medium text-red-800">금지 사유:</span>
                            <p className="mt-1 text-red-700 whitespace-pre-wrap">{restriction.reason}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Action Button */}
        <div className="mb-6 sm:mb-8">
          <Link href="/booking">
            <Button size="lg" className="w-full sm:w-auto text-base sm:text-lg py-6 sm:py-7 px-6 sm:px-8">
              <Plus className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
              새 예약하기
            </Button>
          </Link>
        </div>

        {/* Upcoming Reservations */}
        <div className="mb-6 sm:mb-8">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
            다가오는 예약
          </h3>
          {safeUpcomingReservations.length === 0 ? (
            <Card>
              <CardContent className="py-8 sm:py-12 text-center text-gray-500 text-sm sm:text-base">
                예정된 예약이 없습니다.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {safeUpcomingReservations.map((reservation: any) => {
                const daysUntil = calculateDaysUntil(reservation.start_time)
                const room = reservation.rooms

                return (
                  <Card key={reservation.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3 sm:pb-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg sm:text-xl mb-1 truncate">
                            {room?.name || '알 수 없음'}
                          </CardTitle>
                          <CardDescription className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2">
                            <span className="flex items-center gap-1 text-xs sm:text-sm">
                              <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                              <span className="truncate">{room?.location || '위치 정보 없음'}</span>
                            </span>
                            <span className="flex items-center gap-1 text-xs sm:text-sm">
                              <Users className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                              최대 {Array.isArray(reservation.attendees) ? reservation.attendees.length : 0}명
                            </span>
                          </CardDescription>
                        </div>
                        {daysUntil >= 0 && (
                          <div className="bg-blue-100 text-blue-800 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold flex-shrink-0">
                            D-{daysUntil}
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2 sm:space-y-3">
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                          <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span>
                            {format(toKoreaTime(reservation.start_time), 'yyyy년 MM월 dd일')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                          <Clock className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span>
                            {format(toKoreaTime(reservation.start_time), 'HH:mm')} - {format(toKoreaTime(reservation.end_time), 'HH:mm')}
                          </span>
                        </div>
                        <div className="mt-2 sm:mt-3">
                          <span className={`inline-block px-2 sm:px-3 py-1 rounded text-xs font-medium ${
                            reservation.status === 'confirmed' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {reservation.status === 'confirmed' ? '승인됨' : '대기중'}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        {/* 거부된 예약 섹션 */}
        {safeRejectedReservations.length > 0 ? (
          <div className="mb-6 sm:mb-8">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
              거부된 예약
            </h3>
            <div className="space-y-3 sm:space-y-4">
              {safeRejectedReservations.map((reservation: any) => {
                const room = reservation.rooms

                return (
                  <Card key={reservation.id} className="hover:shadow-lg transition-shadow border-l-4 border-l-red-500">
                    <CardHeader className="pb-3 sm:pb-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg sm:text-xl mb-1 truncate">
                            {room?.name || '알 수 없음'}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-2">
                            <span className="flex items-center gap-1 text-xs sm:text-sm">
                              <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                              <span className="truncate">{room?.location || '위치 정보 없음'}</span>
                            </span>
                          </CardDescription>
                        </div>
                        <span className="bg-red-100 text-red-800 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold flex-shrink-0">
                          거부됨
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2 sm:space-y-3">
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                          <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span>
                            {format(toKoreaTime(reservation.start_time), 'yyyy년 MM월 dd일')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                          <Clock className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span>
                            {format(toKoreaTime(reservation.start_time), 'HH:mm')} - {format(toKoreaTime(reservation.end_time), 'HH:mm')}
                          </span>
                        </div>
                        <div className="mt-2 sm:mt-3 p-2 sm:p-3 bg-red-50 border border-red-200 rounded-md">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 text-red-600 mt-0.5 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs sm:text-sm font-medium text-red-800 mb-1">거부 사유</p>
                              {reservation.rejection_reason && reservation.rejection_reason.trim() ? (
                                <p className="text-xs sm:text-sm text-red-700 break-words">{reservation.rejection_reason}</p>
                              ) : (
                                <p className="text-xs sm:text-sm text-gray-600 italic">거부 사유가 제공되지 않았습니다.</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="mb-6 sm:mb-8">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
              거부된 예약
            </h3>
            <Card>
              <CardContent className="py-8 sm:py-12 text-center text-gray-500 text-sm sm:text-base">
                거부된 예약이 없습니다.
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

