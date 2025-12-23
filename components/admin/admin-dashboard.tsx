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
import CalendarView from './calendar-view'
import { archiveOldReservations } from '@/app/actions/archive'

interface ReservationWithDetails extends Reservation {
  rooms: Room | null
  users: UserType | null
  approved_by_user?: UserType | null
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

    let query = supabase
      .from('reservations')
      .select(`
        *,
        rooms (*),
        users (*),
        approved_by_user:users!approved_by (*)
      `)
      .order('created_at', { ascending: false })

    if (filter !== 'all') {
      query = query.eq('status', filter)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching reservations:', error)
      setReservations([])
    } else {
      // Transform data to match our interface
      const transformedData = (data || []).map((item: any) => ({
        ...item,
        approved_by_user: item.approved_by_user || null,
      }))
      setReservations(transformedData)
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
    setUpdating(reservationId)
    const supabase = createClient()

    // 현재 사용자 정보 가져오기
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      alert('로그인이 필요합니다.')
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
    } else {
      updateData.rejection_reason = null
      updateData.approved_by = user.id // 승인 시 현재 사용자 ID 저장
    }

    // 한 번에 status, rejection_reason, approved_by 업데이트
    const { data, error } = await supabase
      .from('reservations')
      .update(updateData)
      .eq('id', reservationId)
      .select('id, status, rejection_reason, approved_by')

    if (error) {
      console.error('Error updating reservation:', error)
      
      // PGRST204 에러인 경우 (필드가 없음)
      if (error.code === 'PGRST204' || error.message?.includes('rejection_reason') || error.message?.includes('column') || error.message?.includes('approved_by')) {
        const errorMessage = `필수 필드가 데이터베이스에 없습니다.

다음 단계를 따라주세요:

1. Supabase 대시보드로 이동
2. SQL Editor 열기
3. 다음 SQL 명령 실행:

ALTER TABLE reservations 
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

ALTER TABLE reservations 
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id) ON DELETE SET NULL;

4. 실행 후 페이지를 새로고침하세요.`
        
        alert(errorMessage)
      } else {
        alert(`상태 업데이트 중 오류가 발생했습니다.\n\n오류: ${error.message}`)
      }
      setUpdating(null)
      return
    }

    // 예약 목록 새로고침
    await fetchReservations()
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
        alert('아카이브가 완료되었습니다.')
        await fetchReservations()
      }
    } catch (error) {
      console.error('Error archiving:', error)
      alert('아카이브 중 오류가 발생했습니다.')
    } finally {
      setArchiving(false)
    }
  }, [fetchReservations])

  const deleteReservation = useCallback(async (reservationId: string) => {
    setUpdating(reservationId)
    const supabase = createClient()

    const { error } = await supabase
      .from('reservations')
      .delete()
      .eq('id', reservationId)

    if (error) {
      console.error('Error deleting reservation:', error)
      alert(`예약 삭제 중 오류가 발생했습니다.\n\n오류: ${error.message}`)
    } else {
      await fetchReservations()
    }
    
    setDeleteDialogOpen(false)
    setDeletingReservationId(null)
    setUpdating(null)
  }

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
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  const filteredReservations = useMemo(() => {
    if (filter === 'all') return reservations
    return reservations.filter((r) => r.status === filter)
  }, [reservations, filter])

  // 대기중 예약 수 계산
  const pendingCount = useMemo(() => {
    return reservations.filter(r => r.status === 'pending').length
  }, [reservations])

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
                          <span>{format(new Date(reservation.start_time), 'yyyy년 MM월 dd일')}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                          <Clock className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span>
                            {format(new Date(reservation.start_time), 'HH:mm')} -{' '}
                            {format(new Date(reservation.end_time), 'HH:mm')}
                          </span>
                        </div>
                        <div className="pt-2 border-t">
                          <p className="text-xs font-medium text-gray-500 mb-1">예약 사유</p>
                          <p className="text-xs sm:text-sm text-gray-700 line-clamp-2">{reservation.purpose}</p>
                        </div>
                        {reservation.attendees && 
                         Array.isArray(reservation.attendees) && 
                         reservation.attendees.length > 0 && (
                          <div className="pt-1">
                            <p className="text-xs font-medium text-gray-500 mb-1">동반자</p>
                            <p className="text-xs sm:text-sm text-gray-600 line-clamp-1">
                              {Array.isArray(reservation.attendees) 
                                ? reservation.attendees.join(', ')
                                : String(reservation.attendees)}
                            </p>
                          </div>
                        )}
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

