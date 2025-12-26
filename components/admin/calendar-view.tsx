'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Loader2 } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns'
import { Reservation, Room, User as UserType } from '@/types/supabase'
import { toKoreaTime } from '@/lib/utils'

// 한국 시간 기준 현재 날짜 가져오기
function getKoreaDate() {
  return toKoreaTime(new Date())
}

interface ReservationWithDetails extends Reservation {
  rooms: Room | null
  users: UserType | null
}

interface CalendarViewProps {
  filter?: 'all' | 'pending' | 'confirmed' | 'rejected'
}

export default function CalendarView({ filter = 'all' }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(getKoreaDate())
  const [reservations, setReservations] = useState<ReservationWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  // useMemo로 메모이제이션하여 불필요한 재계산 방지
  const monthStart = useMemo(() => startOfMonth(currentDate), [currentDate])
  const monthEnd = useMemo(() => endOfMonth(currentDate), [currentDate])
  const calendarStart = useMemo(() => startOfWeek(monthStart), [monthStart])
  const calendarEnd = useMemo(() => endOfWeek(monthEnd), [monthEnd])
  const days = useMemo(() => eachDayOfInterval({ start: calendarStart, end: calendarEnd }), [calendarStart, calendarEnd])

  const fetchReservations = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setLoading(true)
    }
    
    const supabase = createClient()

    // 한국 시간 기준으로 월의 시작과 끝 계산
    const koreaMonthStart = toKoreaTime(monthStart.toISOString())
    const koreaMonthEnd = toKoreaTime(monthEnd.toISOString())
    
    // UTC로 변환하여 쿼리 (데이터베이스는 UTC로 저장됨)
    const utcMonthStart = new Date(koreaMonthStart.getTime() - (9 * 60 * 60 * 1000))
    const utcMonthEnd = new Date(koreaMonthEnd.getTime() - (9 * 60 * 60 * 1000))
    // 월의 마지막 날의 끝까지 포함
    const utcMonthEndPlus = new Date(utcMonthEnd.getTime() + (24 * 60 * 60 * 1000))

    // 캘린더에서는 승인된 예약만 표시
    let query = supabase
      .from('reservations')
      .select(`
        *,
        rooms (*),
        users!user_id (*)
      `)
      .eq('status', 'confirmed')
      .gte('start_time', utcMonthStart.toISOString())
      .lt('start_time', utcMonthEndPlus.toISOString())

    const { data, error } = await query.order('start_time', { ascending: true })

    if (error) {
      console.error('Error fetching reservations:', error)
    } else {
      setReservations(data || [])
    }
    setLoading(false)
  }, [monthStart, monthEnd])

  // 초기 로딩 및 월 변경 시 데이터 가져오기
  useEffect(() => {
    const isInitialLoad = loading && reservations.length === 0
    fetchReservations(isInitialLoad)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthStart, monthEnd])

  const getReservationsForDate = (date: Date) => {
    return reservations.filter((reservation) => {
      const reservationDate = toKoreaTime(reservation.start_time)
      return isSameDay(reservationDate, date)
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-300'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const previousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1))
  }

  const nextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1))
  }

  const today = getKoreaDate()
  const selectedDateReservations = selectedDate ? getReservationsForDate(selectedDate) : []

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 sm:gap-4">
          <Button variant="outline" size="sm" onClick={previousMonth} className="px-2 sm:px-3">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
            {format(currentDate, 'yyyy년 MM월')}
          </h2>
          <Button variant="outline" size="sm" onClick={nextMonth} className="px-2 sm:px-3">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentDate(today)}
          className="w-full sm:w-auto"
        >
          오늘
        </Button>
      </div>

      {/* Calendar Grid */}
      <Card className="relative">
        {loading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        )}
        <CardContent className="p-4">
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
              <div key={day} className="text-center text-sm font-semibold text-gray-700 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const dayReservations = getReservationsForDate(day)
              const isCurrentMonth = isSameMonth(day, currentDate)
              const isToday = isSameDay(day, today)
              const isSelected = selectedDate && isSameDay(day, selectedDate)

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={`
                    min-h-[60px] sm:min-h-[80px] p-1 sm:p-2 text-left border rounded-md transition-colors
                    ${!isCurrentMonth ? 'text-gray-300 bg-gray-50' : 'text-gray-900 bg-white'}
                    ${isToday ? 'ring-2 ring-blue-500' : ''}
                    ${isSelected ? 'bg-blue-50 border-blue-500' : 'border-gray-200'}
                    hover:bg-gray-50 active:bg-gray-100
                  `}
                >
                  <div className={`text-xs sm:text-sm font-medium mb-0.5 sm:mb-1 ${isToday ? 'text-blue-600' : ''}`}>
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-0.5 sm:space-y-1">
                    {dayReservations.slice(0, 2).map((reservation) => (
                      <div
                        key={reservation.id}
                        className={`text-[10px] sm:text-xs px-1 py-0.5 rounded border truncate ${getStatusColor(reservation.status)}`}
                        title={`${reservation.rooms?.name || ''} - ${format(toKoreaTime(reservation.start_time), 'HH:mm')}`}
                      >
                        {reservation.rooms?.name || '알 수 없음'}
                      </div>
                    ))}
                    {dayReservations.length > 2 && (
                      <div className="text-[10px] sm:text-xs text-gray-500">
                        +{dayReservations.length - 2}개
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected Date Reservations */}
      {selectedDate && selectedDateReservations.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <CalendarIcon className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                {format(selectedDate, 'yyyy년 MM월 dd일')} 예약 내역
              </h3>
            </div>
            <div className="space-y-3">
              {selectedDateReservations.map((reservation) => {
                const room = reservation.rooms
                const user = reservation.users

                return (
                  <div
                    key={reservation.id}
                    className="p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 mb-1">
                          {room?.name || '알 수 없음'}
                        </div>
                        <div className="text-sm text-gray-600">
                          {user?.name || '알 수 없음'} ({user?.email})
                        </div>
                      </div>
                      <Badge className={getStatusColor(reservation.status)}>
                        {reservation.status === 'confirmed'
                          ? '승인됨'
                          : reservation.status === 'pending'
                          ? '대기중'
                          : '거부됨'}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600">
                      {format(toKoreaTime(reservation.start_time), 'HH:mm')} -{' '}
                      {format(toKoreaTime(reservation.end_time), 'HH:mm')}
                    </div>
                    {reservation.purpose && (
                      <div className="text-sm text-gray-600 mt-1">
                        사유: {reservation.purpose}
                      </div>
                    )}
                    {reservation.attendees && 
                     Array.isArray(reservation.attendees) && 
                     reservation.attendees.length > 0 && (
                      <div className="text-sm text-gray-600 mt-1">
                        동반자: {reservation.attendees.join(', ')}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedDate && selectedDateReservations.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            {format(selectedDate, 'yyyy년 MM월 dd일')}에는 예약이 없습니다.
          </CardContent>
        </Card>
      )}
    </div>
  )
}

