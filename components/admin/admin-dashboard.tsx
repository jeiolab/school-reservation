'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Calendar, Clock, MapPin, Users, Check, X, Loader2, AlertCircle, Trash2, Archive } from 'lucide-react'
import { format } from 'date-fns'
import { Reservation, Room, User as UserType } from '@/types/supabase'
import { toKoreaTime } from '@/lib/utils'
import CalendarView from './calendar-view'
import { archiveOldReservations } from '@/app/actions/archive'

interface ReservationWithDetails extends Reservation {
  rooms: Room | null
  users: UserType | null
  approved_by_user?: UserType | null
  rejected_by_user?: UserType | null
}

export default function AdminDashboard() {
  const [reservations, setReservations] = useState<ReservationWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'rejected'>('all')
  const [updating, setUpdating] = useState<string | null>(null)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectingReservationId, setRejectingReservationId] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingReservationId, setDeletingReservationId] = useState<string | null>(null)
  const [archiving, setArchiving] = useState(false)

  const fetchReservations = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    // 현재 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('Auth error:', authError)
      setReservations([])
      setLoading(false)
      return
    }

    // 사용자 프로필 확인
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('role, name, email')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching user profile:', profileError)
    } else {
      console.log('User profile:', userProfile)
    }

    let query = supabase
      .from('reservations')
      .select(`
        *,
        rooms (*),
        users!user_id (*),
        approved_by_user:users!approved_by (*),
        rejected_by_user:users!rejected_by (*)
      `)
      .order('created_at', { ascending: false })

    if (filter !== 'all') {
      query = query.eq('status', filter)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching reservations:', error)
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      })
      
      // RLS 정책 관련 에러인 경우 안내
      if (error.code === 'PGRST301' || error.message?.includes('permission denied') || error.message?.includes('policy')) {
        alert(`권한 오류가 발생했습니다.\n\n관리자가 모든 사용자 정보를 볼 수 있도록 RLS 정책을 추가해야 합니다.\n\nSupabase SQL Editor에서 다음 명령을 실행하세요:\n\nCREATE POLICY "Admins can view all users"\n  ON users FOR SELECT\n  USING (\n    EXISTS (\n      SELECT 1 FROM users u\n      WHERE u.id = auth.uid()\n      AND u.role IN ('teacher', 'admin')\n    )\n  );`)
      } else {
        alert(`예약 목록을 불러오는 중 오류가 발생했습니다.\n\n오류: ${error.message}\n\n코드: ${error.code}`)
      }
      setReservations([])
    } else {
      console.log('Fetched reservations:', data?.length || 0, 'items')
      // Transform data to match our interface
      const transformedData = (data || []).map((item: any) => {
        // attendees가 문자열인 경우 배열로 변환
        let attendees = item.attendees
        if (attendees) {
          if (typeof attendees === 'string') {
            try {
              // JSON 문자열인 경우 파싱
              attendees = JSON.parse(attendees)
            } catch {
              // JSON 파싱 실패 시 쉼표로 분리
              attendees = attendees.split(',').map((a: string) => a.trim()).filter(Boolean)
            }
          }
          // 배열이 아닌 경우 빈 배열로 설정
          if (!Array.isArray(attendees)) {
            attendees = []
          }
        } else {
          attendees = []
        }
        
        // 디버깅: attendees 데이터 확인
        if (attendees && attendees.length > 0) {
          console.log('Reservation ID:', item.id, 'Attendees:', attendees, 'Type:', typeof item.attendees)
        }
        
        return {
          ...item,
          attendees,
          approved_by_user: item.approved_by_user || null,
          rejected_by_user: item.rejected_by_user || null,
        }
      })
      setReservations(transformedData)
      
      // 데이터가 없을 때도 로그 출력
      if (!data || data.length === 0) {
        console.log('No reservations found. Filter:', filter)
      }
    }
    setLoading(false)
  }, [filter])

  useEffect(() => {
    fetchReservations()
  }, [fetchReservations])

  const updateReservationStatus = useCallback(async (
    reservationId: string, 
    status: 'confirmed' | 'rejected',
    reason?: string
  ) => {
    // UUID 형식 검증
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(reservationId)) {
      alert('잘못된 예약 ID 형식입니다.')
      return
    }

    setUpdating(reservationId)
    const supabase = createClient()

    // 현재 사용자 정보 가져오기
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      alert('로그인이 필요합니다.')
      setUpdating(null)
      return
    }

    // 권한 확인: teacher 또는 admin만 승인/거부 가능
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userProfile || (userProfile.role !== 'teacher' && userProfile.role !== 'admin')) {
      alert('권한이 없습니다. 교사 또는 관리자만 예약을 승인/거부할 수 있습니다.')
      setUpdating(null)
      return
    }

    // 예약 존재 여부 및 접근 권한 확인
    const { data: reservation } = await supabase
      .from('reservations')
      .select('id, user_id')
      .eq('id', reservationId)
      .single()

    if (!reservation) {
      alert('존재하지 않는 예약입니다.')
      setUpdating(null)
      return
    }

    // 거부인 경우 rejection_reason이 필수
    if (status === 'rejected' && (!reason || !reason.trim())) {
      alert('거부 사유를 입력해주세요.')
      setUpdating(null)
      return
    }

    // 업데이트할 데이터 준비
    const updateData: any = {
      status,
    }

    // 거부인 경우 rejection_reason 추가, 승인인 경우 null로 설정
    if (status === 'rejected') {
      updateData.rejection_reason = (reason || '').trim()
      updateData.approved_by = null // 거부 시 승인자 정보 제거
      // UUID 타입으로 명시적 변환
      updateData.rejected_by = user.id ? String(user.id) : null
    } else {
      updateData.rejection_reason = null
      // UUID 타입으로 명시적 변환
      updateData.approved_by = user.id ? String(user.id) : null
      updateData.rejected_by = null // 승인 시 거부자 정보 제거
    }

    // 한 번에 status, rejection_reason, approved_by 업데이트
    const { data: updatedData, error } = await supabase
      .from('reservations')
      .update(updateData)
      .eq('id', reservationId)
      .select('id, status, rejection_reason, approved_by, rejected_by, updated_at')

    if (error) {
      console.error('Error updating reservation:', error)
      
      // PGRST204 에러인 경우 (필드가 없음)
      if (error.code === 'PGRST204' || error.message?.includes('rejection_reason') || error.message?.includes('column') || error.message?.includes('approved_by') || error.message?.includes('rejected_by')) {
        const errorMessage = `필수 필드가 데이터베이스에 없습니다.

다음 단계를 따라주세요:

1. Supabase 대시보드로 이동
2. SQL Editor 열기
3. 다음 SQL 명령 실행:

ALTER TABLE reservations 
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

ALTER TABLE reservations 
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE reservations 
ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES users(id) ON DELETE SET NULL;

4. 실행 후 페이지를 새로고침하세요.`
        
        alert(errorMessage)
      } else {
        alert(`상태 업데이트 중 오류가 발생했습니다.\n\n오류: ${error.message}`)
      }
      setUpdating(null)
      return
    }

    // 업데이트 성공 확인
    if (!updatedData || updatedData.length === 0) {
      console.error('No data returned from update')
      alert('예약 상태 업데이트에 실패했습니다.')
      setUpdating(null)
      return
    }

    // 로컬 상태 즉시 업데이트 (옵티미스틱 업데이트)
    setReservations(prevReservations => 
      prevReservations.map(reservation => 
        reservation.id === reservationId
          ? {
              ...reservation,
              status: updateData.status,
              rejection_reason: updateData.rejection_reason || null,
              approved_by: updateData.approved_by || null,
              rejected_by: updateData.rejected_by || null,
              updated_at: updatedData[0].updated_at,
            }
          : reservation
      )
    )

    // 예약 목록 새로고침 (최신 데이터 확인)
    try {
      await fetchReservations()
    } catch (fetchError) {
      console.error('Error refreshing reservations:', fetchError)
      // 새로고침 실패해도 로컬 상태는 이미 업데이트되었으므로 계속 진행
    }

    setRejectDialogOpen(false)
    setRejectionReason('')
    setRejectingReservationId(null)
    setUpdating(null)
  }, [fetchReservations])

  const handleRejectClick = useCallback((reservationId: string) => {
    setRejectingReservationId(reservationId)
    setRejectDialogOpen(true)
  }, [])

  const handleRejectConfirm = useCallback(() => {
    if (rejectingReservationId) {
      updateReservationStatus(rejectingReservationId, 'rejected', rejectionReason)
    }
  }, [rejectingReservationId, rejectionReason, updateReservationStatus])

  const handleDeleteClick = useCallback((reservationId: string) => {
    setDeletingReservationId(reservationId)
    setDeleteDialogOpen(true)
  }, [])

  const handleArchiveClick = useCallback(async () => {
    if (!confirm('승인 후 2주일이 지난 예약을 보관함으로 이동하시겠습니까?')) {
      return
    }

    setArchiving(true)
    try {
      const result = await archiveOldReservations()
      if (result.error) {
        alert(`아카이브 중 오류가 발생했습니다: ${result.error}`)
      } else {
        const data = result.data as { archived_count?: number; deleted_count?: number } | undefined
        const archivedCount = data?.archived_count || 0
        const deletedCount = data?.deleted_count || 0
        
        if (archivedCount === 0 && deletedCount === 0) {
          alert('아카이브할 오래된 예약이 없습니다.\n(승인 후 2주일이 지난 예약만 아카이브됩니다)')
        } else {
          let message = `아카이브가 완료되었습니다.\n보관된 예약: ${archivedCount}개\n삭제된 예약: ${deletedCount}개`
          if (result.warning) {
            message += `\n\n경고: ${result.warning}`
          }
          alert(message)
        }
        
        // 아카이브된 예약들을 로컬 상태에서 제거
        if (deletedCount > 0 || archivedCount > 0) {
          // 전체 목록 새로고침
          await fetchReservations()
        }
      }
    } catch (error) {
      console.error('Error archiving:', error)
      alert('아카이브 중 오류가 발생했습니다.')
    } finally {
      setArchiving(false)
    }
  }, [fetchReservations])

  const deleteReservation = useCallback(async (reservationId: string) => {
    // UUID 형식 검증
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(reservationId)) {
      alert('잘못된 예약 ID 형식입니다.')
      return
    }

    setUpdating(reservationId)
    const supabase = createClient()

    // 현재 사용자 정보 가져오기
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      alert('로그인이 필요합니다.')
      setUpdating(null)
      return
    }

    // 권한 확인: teacher 또는 admin만 삭제 가능
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userProfile || (userProfile.role !== 'teacher' && userProfile.role !== 'admin')) {
      alert('권한이 없습니다. 교사 또는 관리자만 예약을 삭제할 수 있습니다.')
      setUpdating(null)
      return
    }

    // 예약 존재 여부 확인
    const { data: reservation } = await supabase
      .from('reservations')
      .select('id')
      .eq('id', reservationId)
      .single()

    if (!reservation) {
      alert('존재하지 않는 예약입니다.')
      setUpdating(null)
      return
    }

    const { error } = await supabase
      .from('reservations')
      .delete()
      .eq('id', reservationId)

    if (error) {
      console.error('Error deleting reservation:', error)
      alert(`예약 삭제 중 오류가 발생했습니다.\n\n오류: ${error.message}`)
      setUpdating(null)
      return
    }

    // 로컬 상태 즉시 업데이트 (옵티미스틱 업데이트)
    setReservations(prevReservations => 
      prevReservations.filter(reservation => reservation.id !== reservationId)
    )

    // 예약 목록 새로고침 (최신 데이터 확인)
    try {
      await fetchReservations()
    } catch (fetchError) {
      console.error('Error refreshing reservations:', fetchError)
      // 새로고침 실패해도 로컬 상태는 이미 업데이트되었으므로 계속 진행
    }
    
    setDeleteDialogOpen(false)
    setDeletingReservationId(null)
    setUpdating(null)
  }, [fetchReservations])

  const getStatusBadge = useCallback((status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-100 text-green-800">승인됨</Badge>
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">대기중</Badge>
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">거부됨</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }, [])

  const filteredReservations = useMemo(() => {
    if (filter === 'all') return reservations
    return reservations.filter((r) => r.status === filter)
  }, [reservations, filter])

  // 대기중 예약 수 계산
  const pendingCount = useMemo(() => {
    return reservations.filter(r => r.status === 'pending').length
  }, [reservations])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* View Mode Toggle & Filter */}
      <div className="flex flex-col gap-4">
        <div className="flex gap-2 border-b overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          {(['all', 'pending', 'confirmed', 'rejected'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                filter === f
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {f === 'all' ? '전체' : f === 'pending' ? '대기중' : f === 'confirmed' ? '승인됨' : '거부됨'}
              {f === 'pending' && pendingCount > 0 && (
                <span className="ml-1.5 sm:ml-2 text-xs bg-yellow-100 text-yellow-800 px-1.5 sm:px-2 py-0.5 rounded-full font-medium">{pendingCount}</span>
              )}
            </button>
          ))}
        </div>
        <div className="flex gap-2 justify-end flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleArchiveClick}
            disabled={archiving}
            className="text-sm sm:text-base px-3 sm:px-4"
          >
            {archiving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                처리 중...
              </>
            ) : (
              <>
                <Archive className="w-4 h-4 mr-2" />
                오래된 예약 보관
              </>
            )}
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="text-sm sm:text-base px-3 sm:px-4"
          >
            목록
          </Button>
          <Button
            variant={viewMode === 'calendar' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('calendar')}
            className="text-sm sm:text-base px-3 sm:px-4"
          >
            캘린더
          </Button>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <CalendarView filter={filter} />
      ) : (
        <>
          {/* Reservations Grid */}
          {filteredReservations.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                예약 내역이 없습니다.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
              {filteredReservations.map((reservation) => {
                const room = reservation.rooms
                const user = reservation.users

                return (
                  <Card key={reservation.id} className="hover:shadow-lg transition-all border-l-4 border-l-transparent hover:border-l-blue-500">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <CardTitle className="text-base sm:text-lg truncate">
                              {room?.name || '알 수 없음'}
                            </CardTitle>
                            {getStatusBadge(reservation.status)}
                            {reservation.status === 'confirmed' && reservation.approved_by_user && (
                              <span className="text-xs text-gray-500">
                                (승인자: {reservation.approved_by_user.name})
                              </span>
                            )}
                            {reservation.status === 'rejected' && reservation.rejected_by_user && (
                              <span className="text-xs text-gray-500">
                                (거부자: {reservation.rejected_by_user.name})
                              </span>
                            )}
                          </div>
                          <CardDescription className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                            <div className="flex items-center gap-1">
                              <Users className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{user?.name || '알 수 없음'}</span>
                            </div>
                            <span className="text-gray-400 hidden sm:inline">•</span>
                            <span className="truncate text-xs">{user?.email}</span>
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2 sm:space-y-3">
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                          <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span className="truncate">{room?.location || '위치 정보 없음'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                          <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span>{format(toKoreaTime(reservation.start_time), 'yyyy년 MM월 dd일')}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                          <Clock className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span>
                            {format(toKoreaTime(reservation.start_time), 'HH:mm')} -{' '}
                            {format(toKoreaTime(reservation.end_time), 'HH:mm')}
                          </span>
                        </div>
                        <div className="pt-2 border-t">
                          <p className="text-xs font-medium text-gray-500 mb-1">예약 사유</p>
                          <p className="text-xs sm:text-sm text-gray-700 line-clamp-2">{reservation.purpose}</p>
                        </div>
                        <div className="pt-2 border-t">
                          <div className="flex items-start gap-2">
                            <Users className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-500 mb-1">
                                동반자 {(() => {
                                  const attendees: any = reservation.attendees
                                  if (!attendees) return '(없음)'
                                  let attendeesArray: string[] = []
                                  if (Array.isArray(attendees)) {
                                    attendeesArray = attendees
                                  } else if (typeof attendees === 'string') {
                                    attendeesArray = attendees.split(',').map((a: string) => a.trim()).filter(Boolean)
                                  }
                                  return attendeesArray.length > 0 ? `(${attendeesArray.length}명)` : '(없음)'
                                })()}
                              </p>
                              {(() => {
                                const attendees: any = reservation.attendees
                                if (!attendees) {
                                  return <p className="text-xs sm:text-sm text-gray-400 italic">동반자 없음</p>
                                }
                                let attendeesArray: string[] = []
                                if (Array.isArray(attendees)) {
                                  attendeesArray = attendees
                                } else if (typeof attendees === 'string') {
                                  // JSON 배열 문자열인지 확인 (예: '["이름1", "이름2"]')
                                  if (attendees.trim().startsWith('[') && attendees.trim().endsWith(']')) {
                                    try {
                                      const parsed = JSON.parse(attendees)
                                      if (Array.isArray(parsed)) {
                                        attendeesArray = parsed
                                      } else {
                                        attendeesArray = attendees.split(',').map((a: string) => a.trim()).filter(Boolean)
                                      }
                                    } catch {
                                      // JSON 파싱 실패 시 일반 문자열로 처리
                                      attendeesArray = attendees.split(',').map((a: string) => a.trim()).filter(Boolean)
                                    }
                                  } else {
                                    // 일반 쉼표로 구분된 문자열
                                    attendeesArray = attendees.split(',').map((a: string) => a.trim()).filter(Boolean)
                                  }
                                }
                                if (attendeesArray.length > 0) {
                                  return <p className="text-xs sm:text-sm text-gray-700 break-words">{attendeesArray.join(', ')}</p>
                                }
                                return <p className="text-xs sm:text-sm text-gray-400 italic">동반자 없음</p>
                              })()}
                            </div>
                          </div>
                        </div>
                        {reservation.status === 'rejected' && (
                          <div className="pt-2 border-t">
                            <div className="p-2 sm:p-3 bg-red-50 border border-red-200 rounded-md">
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
                        )}
                        <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t mt-2">
                          {reservation.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => updateReservationStatus(reservation.id, 'confirmed')}
                                disabled={updating === reservation.id}
                                className="flex-1 text-sm sm:text-base py-2 sm:py-2.5"
                              >
                                {updating === reservation.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <>
                                    <Check className="w-4 h-4 mr-2" />
                                    승인
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleRejectClick(reservation.id)}
                                disabled={updating === reservation.id}
                                className="flex-1 text-sm sm:text-base py-2 sm:py-2.5"
                              >
                                {updating === reservation.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <>
                                    <X className="w-4 h-4 mr-2" />
                                    거부
                                  </>
                                )}
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteClick(reservation.id)}
                            disabled={updating === reservation.id}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 text-sm sm:text-base py-2 sm:py-2.5"
                          >
                            {updating === reservation.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Trash2 className="w-4 h-4 mr-2" />
                                삭제
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>예약 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              정말로 이 예약을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingReservationId) {
                  deleteReservation(deletingReservationId)
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rejection Reason Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>예약 거부</DialogTitle>
            <DialogDescription>
              예약을 거부하는 사유를 입력해주세요. 신청자에게 표시됩니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">거부 사유 *</Label>
              <Input
                id="rejection-reason"
                placeholder="예: 시간대 중복, 실 사용 불가 등"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false)
                setRejectionReason('')
                setRejectingReservationId(null)
              }}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={!rejectionReason.trim() || updating !== null}
            >
              {updating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  처리 중...
                </>
              ) : (
                '거부하기'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

