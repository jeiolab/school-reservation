'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Clock, AlertCircle } from 'lucide-react'
import { format, addDays, isAfter, setHours, setMinutes, startOfDay, isBefore, isSameDay } from 'date-fns'
import { Reservation } from '@/types/supabase'
import { cn, toKoreaTime } from '@/lib/utils'

interface DateTimeSelectionProps {
  roomId: string
  onSelect: (startTime: string, endTime: string) => void
  selectedStartTime?: string
  selectedEndTime?: string
}

// Generate time slots (30-minute intervals from 8:00 to 22:00)
// 시작 시간: 8:00 ~ 21:30
// 종료 시간: 8:30 ~ 22:00
const generateTimeSlots = () => {
  const slots = []
  for (let hour = 8; hour <= 22; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      // 22:00은 종료 시간으로만 사용 가능 (시작 시간은 21:30까지)
      if (hour === 22 && minute === 0) {
        slots.push(format(setMinutes(setHours(new Date(), hour), minute), 'HH:mm'))
        break
      }
      const time = setMinutes(setHours(new Date(), hour), minute)
      slots.push(format(time, 'HH:mm'))
    }
  }
  return slots
}

const timeSlots = generateTimeSlots()

export default function DateTimeSelection({
  roomId,
  onSelect,
  selectedStartTime,
  selectedEndTime,
}: DateTimeSelectionProps) {
  // 한국 시간 기준 현재 시간 가져오기 (UTC + 9시간)
  const getKoreaTime = () => {
    const now = new Date()
    const koreaOffset = 9 * 60 // 한국은 UTC+9 (분 단위)
    const utc = now.getTime() + (now.getTimezoneOffset() * 60 * 1000)
    return new Date(utc + (koreaOffset * 60 * 1000))
  }

  const koreaNow = getKoreaTime()
  const [selectedDate, setSelectedDate] = useState<string>(
    format(koreaNow, 'yyyy-MM-dd')
  )
  const [startTime, setStartTime] = useState<string>(
    selectedStartTime ? format(toKoreaTime(selectedStartTime), 'HH:mm') : ''
  )
  const [endTime, setEndTime] = useState<string>(
    selectedEndTime ? format(toKoreaTime(selectedEndTime), 'HH:mm') : ''
  )
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(new Set())
  const [restrictedSlots, setRestrictedSlots] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function fetchBookedSlots() {
      if (!roomId || !selectedDate) return

      setLoading(true)
      const supabase = createClient()

      // 한국 시간 기준으로 날짜 계산
      const selectedDateObj = new Date(selectedDate + 'T00:00:00+09:00')
      const startOfSelectedDay = startOfDay(selectedDateObj)
      const endOfSelectedDay = addDays(startOfSelectedDay, 1)

      // Fetch booked reservations
      const { data, error } = await supabase
        .from('reservations')
        .select('start_time, end_time')
        .eq('room_id', roomId)
        .in('status', ['pending', 'confirmed'])
        .gte('start_time', startOfSelectedDay.toISOString())
        .lt('start_time', endOfSelectedDay.toISOString())

      if (error) {
        console.error('Error fetching booked slots:', error)
      } else {
        const booked = new Set<string>()
        data?.forEach((reservation: Reservation) => {
          const start = toKoreaTime(reservation.start_time)
          const end = toKoreaTime(reservation.end_time)
          let current = new Date(start)

          while (current < end) {
            booked.add(format(current, 'HH:mm'))
            current = new Date(current.getTime() + 30 * 60 * 1000) // Add 30 minutes
          }
        })
        setBookedSlots(booked)
      }

      // Fetch room restrictions
      const { data: restrictionsData, error: restrictionsError } = await supabase
        .from('room_restrictions')
        .select('restricted_hours')
        .eq('room_id', roomId)
        .eq('is_active', true)

      if (restrictionsError) {
        console.error('Error fetching restrictions:', restrictionsError)
      } else {
        const restricted = new Set<string>()
        // 한국 시간 기준으로 선택된 날짜 파싱
        const selectedDateObjKorea = new Date(selectedDate + 'T00:00:00+09:00')
        const dayOfWeek = selectedDateObjKorea.getDay() // 0=Sunday, 6=Saturday
        const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

        restrictionsData?.forEach((restriction: { restricted_hours: string }) => {
          const restrictionText = restriction.restricted_hours

          // Skip "전체 기간" - handled by is_available flag
          if (restrictionText.startsWith('전체 기간')) {
            return
          }

          // Check weekday restrictions
          if (restrictionText.startsWith('평일') && isWeekday) {
            const timeMatch = restrictionText.match(/(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/)
            if (timeMatch) {
              const startTime = timeMatch[1]
              const endTime = timeMatch[2]
              // Add all time slots between start and end
              timeSlots.forEach(slot => {
                if (slot >= startTime && slot < endTime) {
                  restricted.add(slot)
                }
              })
            } else {
              // Entire weekday is restricted
              timeSlots.forEach(slot => restricted.add(slot))
            }
          }

          // Check weekend restrictions
          if (restrictionText.startsWith('주말') && isWeekend) {
            const timeMatch = restrictionText.match(/(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/)
            if (timeMatch) {
              const startTime = timeMatch[1]
              const endTime = timeMatch[2]
              // Add all time slots between start and end
              timeSlots.forEach(slot => {
                if (slot >= startTime && slot < endTime) {
                  restricted.add(slot)
                }
              })
            } else {
              // Entire weekend is restricted
              timeSlots.forEach(slot => restricted.add(slot))
            }
          }

          // Check specific date restrictions
          const dateMatch = restrictionText.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/)
          if (dateMatch) {
            const restrictionYear = parseInt(dateMatch[1])
            const restrictionMonth = parseInt(dateMatch[2]) - 1 // Month is 0-indexed
            const restrictionDay = parseInt(dateMatch[3])
            // 한국 시간 기준으로 제한 날짜 생성
            const restrictionDate = new Date(restrictionYear, restrictionMonth, restrictionDay)
            
            // Check if it's a date range
            const rangeMatch = restrictionText.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일\s*-\s*(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/)
            if (rangeMatch) {
              const endYear = parseInt(rangeMatch[4])
              const endMonth = parseInt(rangeMatch[5]) - 1
              const endDay = parseInt(rangeMatch[6])
              const endDate = new Date(endYear, endMonth, endDay)
              
              // 한국 시간 기준으로 날짜 비교
              if (selectedDateObjKorea >= restrictionDate && selectedDateObjKorea <= endDate) {
                const timeMatch = restrictionText.match(/(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/)
                if (timeMatch) {
                  const startTime = timeMatch[1]
                  const endTime = timeMatch[2]
                  timeSlots.forEach(slot => {
                    if (slot >= startTime && slot < endTime) {
                      restricted.add(slot)
                    }
                  })
                } else {
                  // Entire date range is restricted
                  timeSlots.forEach(slot => restricted.add(slot))
                }
              }
            } else {
              // Single date - 한국 시간 기준으로 날짜 비교
              if (format(selectedDateObjKorea, 'yyyy-MM-dd') === format(restrictionDate, 'yyyy-MM-dd')) {
                const timeMatch = restrictionText.match(/(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/)
                if (timeMatch) {
                  const startTime = timeMatch[1]
                  const endTime = timeMatch[2]
                  timeSlots.forEach(slot => {
                    if (slot >= startTime && slot < endTime) {
                      restricted.add(slot)
                    }
                  })
                } else {
                  // Entire date is restricted
                  timeSlots.forEach(slot => restricted.add(slot))
                }
              }
            }
          }
        })
        setRestrictedSlots(restricted)
      }

      setLoading(false)
    }

    fetchBookedSlots()
  }, [roomId, selectedDate])

  const isSlotBooked = (slot: string) => {
    return bookedSlots.has(slot)
  }

  const isSlotRestricted = (slot: string) => {
    return restrictedSlots.has(slot)
  }

  // 선택한 날짜가 오늘인지 확인 (한국 시간 기준)
  const isToday = (dateString: string) => {
    const currentKoreaTime = getKoreaTime()
    const selectedDateObj = new Date(dateString + 'T00:00:00+09:00') // 한국 시간대로 파싱
    return isSameDay(currentKoreaTime, selectedDateObj)
  }

  // 시간 슬롯이 지난 시간인지 확인 (한국 시간 기준)
  const isPastTime = (slot: string, dateString: string) => {
    if (!isToday(dateString)) return false
    
    const currentKoreaTime = getKoreaTime()
    const [slotHour, slotMinute] = slot.split(':').map(Number)
    
    // 선택한 날짜와 시간을 한국 시간대로 생성
    const slotDateTime = new Date(`${dateString}T${String(slotHour).padStart(2, '0')}:${String(slotMinute).padStart(2, '0')}:00+09:00`)
    
    return slotDateTime < currentKoreaTime
  }

  const isSlotDisabled = (slot: string, isStartTime: boolean = true) => {
    if (isSlotBooked(slot)) return true
    if (isSlotRestricted(slot)) return true
    
    // 한국 시간 기준으로 지난 시간 체크
    if (selectedDate && isPastTime(slot, selectedDate)) {
      return true
    }
    
    const [slotHour, slotMinute] = slot.split(':').map(Number)
    
    // 시작 시간 선택 시: 21:30까지만 선택 가능
    if (isStartTime) {
      if (slotHour > 21 || (slotHour === 21 && slotMinute > 30)) {
        return true
      }
    }
    
    // 종료 시간 선택 시: 22:00까지만 선택 가능
    if (!isStartTime) {
      if (slotHour > 22 || (slotHour === 22 && slotMinute > 0)) {
        return true
      }
    }
    
    if (!startTime) return false

    const [startHour, startMinute] = startTime.split(':').map(Number)

    const startDateTime = setMinutes(setHours(new Date(), startHour), startMinute)
    const slotDateTime = setMinutes(setHours(new Date(), slotHour), slotMinute)

    return slotDateTime <= startDateTime
  }

  const handleConfirm = () => {
    if (!startTime || !endTime || !selectedDate) return

    // 한국 시간 기준으로 지난 시간 체크
    if (isPastTime(startTime, selectedDate)) {
      alert('지난 시간은 선택할 수 없습니다.')
      return
    }

    const startDateTime = new Date(`${selectedDate}T${startTime}:00`)
    const endDateTime = new Date(`${selectedDate}T${endTime}:00`)

    if (endDateTime <= startDateTime) {
      alert('종료 시간은 시작 시간보다 늦어야 합니다.')
      return
    }

    onSelect(startDateTime.toISOString(), endDateTime.toISOString())
  }

  // 한국 시간 기준으로 최소 날짜 설정
  const minDate = format(koreaNow, 'yyyy-MM-dd')
  const maxDate = format(addDays(koreaNow, 30), 'yyyy-MM-dd')

  return (
    <div className="space-y-6">
      {/* Date Selection */}
      <Card>
        <CardHeader>
          <CardTitle>날짜 선택</CardTitle>
          <CardDescription>예약할 날짜를 선택해주세요</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="date">날짜</Label>
            <Input
              id="date"
              type="date"
              min={minDate}
              max={maxDate}
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value)
                setStartTime('')
                setEndTime('')
              }}
            />
            <p className="text-sm text-gray-500">
              최대 30일 후까지 예약 가능합니다
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Time Selection */}
      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle>시간 선택</CardTitle>
            <CardDescription>
              시작 시간과 종료 시간을 선택해주세요 (30분 단위)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-500">
                예약 가능한 시간을 확인하는 중...
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm sm:text-base">시작 시간 (21:30까지 선택 가능)</Label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 mt-2">
                    {timeSlots.map((slot) => {
                      const disabled = isSlotDisabled(slot, true)
                      const selected = startTime === slot

                      return (
                        <Button
                          key={slot}
                          type="button"
                          variant={selected ? 'default' : 'outline'}
                          size="sm"
                          disabled={disabled}
                          onClick={() => {
                            setStartTime(slot)
                            if (endTime && slot >= endTime) {
                              setEndTime('')
                            }
                          }}
                          className={cn(
                            'text-xs sm:text-sm py-2 sm:py-2.5',
                            disabled && 'opacity-50 cursor-not-allowed',
                            isSlotBooked(slot) && 'bg-red-100 border-red-300',
                            isSlotRestricted(slot) && 'bg-orange-100 border-orange-300'
                          )}
                        >
                          {slot}
                        </Button>
                      )
                    })}
                  </div>
                  {(bookedSlots.size > 0 || restrictedSlots.size > 0) && (
                    <div className="text-xs text-gray-500 mt-2 space-y-1">
                      {bookedSlots.size > 0 && (
                        <p className="flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          빨간색으로 표시된 시간은 이미 예약되었습니다
                        </p>
                      )}
                      {restrictedSlots.size > 0 && (
                        <p className="flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          주황색으로 표시된 시간은 사용금지 시간입니다
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {startTime && (
                  <div>
                    <Label>종료 시간 (22:00까지 선택 가능)</Label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 mt-2">
                      {timeSlots.map((slot) => {
                        const [startHour, startMinute] = startTime.split(':').map(Number)
                        const [slotHour, slotMinute] = slot.split(':').map(Number)

                        const startDateTime = setMinutes(setHours(new Date(), startHour), startMinute)
                        const slotDateTime = setMinutes(setHours(new Date(), slotHour), slotMinute)

                        // 종료 시간은 시작 시간보다 늦어야 함
                        // 한국 시간 기준으로 지난 시간 체크
                        const disabled: boolean =
                          slotDateTime <= startDateTime ||
                          isSlotBooked(slot) ||
                          (startTime ? slot <= startTime : false) ||
                          isSlotDisabled(slot, false) ||
                          (selectedDate ? isPastTime(slot, selectedDate) : false)

                        const selected = endTime === slot

                        return (
                          <Button
                            key={slot}
                            type="button"
                            variant={selected ? 'default' : 'outline'}
                            size="sm"
                            disabled={disabled}
                            onClick={() => setEndTime(slot)}
                            className={cn(
                              disabled ? 'opacity-50 cursor-not-allowed' : '',
                              isSlotBooked(slot) ? 'bg-red-100 border-red-300' : '',
                              isSlotRestricted(slot) ? 'bg-orange-100 border-orange-300' : ''
                            )}
                          >
                            {slot}
                          </Button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {startTime && endTime && (
                  <div className="pt-4 border-t">
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                      <Clock className="w-4 h-4" />
                      <span>
                        {format(new Date(`${selectedDate}T${startTime}:00+09:00`), 'yyyy년 MM월 dd일 HH:mm')} -{' '}
                        {format(new Date(`${selectedDate}T${endTime}:00+09:00`), 'HH:mm')}
                      </span>
                    </div>
                    <Button onClick={handleConfirm} className="w-full">
                      시간 확인
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

