'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, ArrowRight, Calendar, Clock, Users, MapPin, Repeat } from 'lucide-react'
import { z } from 'zod'
import { addWeeks, getDay, format, parseISO } from 'date-fns'
import RoomSelection from './room-selection'
import DateTimeSelection from './date-time-selection'

const bookingSchema = z.object({
  roomId: z.string().min(1, '실을 선택해주세요').max(100, '실 ID가 너무 깁니다'),
  startTime: z.string().min(1, '시작 시간을 선택해주세요'),
  endTime: z.string().min(1, '종료 시간을 선택해주세요'),
  purpose: z.string().min(5, '예약 사유를 5자 이상 입력해주세요').max(500, '예약 사유는 500자 이하여야 합니다'),
  attendees: z.string().max(1000, '동반자 정보가 너무 깁니다').optional(),
})

type BookingFormData = z.infer<typeof bookingSchema>

interface BookingFlowProps {
  userId: string
}

export default function BookingFlow({ userId }: BookingFlowProps) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<Partial<BookingFormData>>({
    roomId: '',
    startTime: '',
    endTime: '',
    purpose: '',
    attendees: '',
  })
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringWeeks, setRecurringWeeks] = useState<string>('4')
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleRoomSelect = (roomId: string) => {
    setFormData({ ...formData, roomId })
    setStep(2)
  }

  const handleDateTimeSelect = (startTime: string, endTime: string) => {
    setFormData({ ...formData, startTime, endTime })
    setStep(3)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validate form data
      const validatedData = bookingSchema.parse({
        roomId: String(formData.roomId || ''),
        startTime: String(formData.startTime || ''),
        endTime: String(formData.endTime || ''),
        purpose: String(formData.purpose || ''),
        attendees: formData.attendees && formData.attendees.trim() 
          ? String(formData.attendees) 
          : undefined,
      })

      const supabase = createClient()

      // Get user role to determine if auto-approval is needed
      const { data: userProfile } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single()

      // Teachers and admins get auto-approved, students need approval
      const initialStatus = (userProfile?.role === 'teacher' || userProfile?.role === 'admin')
        ? 'confirmed'
        : 'pending'

      // Parse attendees string into array
      const attendeesArray = validatedData.attendees && validatedData.attendees.trim()
        ? validatedData.attendees.split(',').map(a => a.trim()).filter(Boolean)
        : []

      // Parse start and end times
      const startDateTime = parseISO(validatedData.startTime)
      const endDateTime = parseISO(validatedData.endTime)
      
      // Calculate time difference for recurring reservations
      const timeDiff = endDateTime.getTime() - startDateTime.getTime()

      // Generate reservation dates
      const reservationDates: Date[] = []
      
      if (isRecurring && recurringWeeks) {
        const weeks = parseInt(recurringWeeks, 10)
        
        // Add the first date
        reservationDates.push(startDateTime)
        
        // Generate recurring dates for the specified number of weeks
        // addWeeks automatically maintains the same day of week
        for (let week = 1; week < weeks; week++) {
          const nextDate = addWeeks(startDateTime, week)
          reservationDates.push(nextDate)
        }
      } else {
        // Single reservation
        reservationDates.push(startDateTime)
      }

      // Create reservations for all dates
      const reservations = reservationDates.map(date => {
        const startTime = new Date(date)
        const endTime = new Date(date.getTime() + timeDiff)
        
        return {
          user_id: userId,
          room_id: validatedData.roomId,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          purpose: validatedData.purpose,
          attendees: attendeesArray,
          status: initialStatus,
        }
      })

      // 예약 생성 전 최종 중복 체크
      // 모든 예약에 대해 중복 체크 수행
      for (const reservation of reservations) {
        // 해당 실의 모든 pending/confirmed 예약을 가져와서 클라이언트 측에서 겹침 체크
        // 두 시간 범위가 겹치는 조건: start_time < reservation.end_time AND end_time > reservation.start_time
        const { data: allReservations, error: checkError } = await supabase
          .from('reservations')
          .select('id, start_time, end_time, status')
          .eq('room_id', reservation.room_id)
          .in('status', ['pending', 'confirmed'])

        if (checkError) {
          console.error('Error checking for conflicts:', checkError)
          // 쿼리 오류가 발생해도 데이터베이스 트리거가 최종 방어선이므로 계속 진행
        } else if (allReservations) {
          // 클라이언트 측에서 겹침 체크
          const conflictingReservation = allReservations.find(existing => {
            const existingStart = new Date(existing.start_time)
            const existingEnd = new Date(existing.end_time)
            const newStart = new Date(reservation.start_time)
            const newEnd = new Date(reservation.end_time)
            
            // 두 시간 범위가 겹치는지 확인
            return existingStart < newEnd && existingEnd > newStart
          })

          if (conflictingReservation) {
            // pending 상태인 경우와 confirmed 상태인 경우를 구분하여 메시지 표시
            if (conflictingReservation.status === 'pending') {
              setError('해당 시간대에 예약 대기중입니다. 다른 시간을 선택해주세요.')
            } else {
              setError('해당 시간대에 이미 예약이 존재합니다. 다른 시간을 선택해주세요.')
            }
            setLoading(false)
            // 시간 선택 단계로 돌아가서 예약된 시간대를 다시 불러오기
            setStep(2)
            setRefreshTrigger(prev => prev + 1)
            return
          }
        }
      }

      // Insert all reservations
      const { error: insertError } = await supabase
        .from('reservations')
        .insert(reservations)

      if (insertError) {
        // Check if it's a double booking error
        if (insertError.message.includes('이미 예약이 존재합니다')) {
          // 데이터베이스 트리거에서 발생한 오류인 경우, pending 상태인지 확인하기 위해 다시 조회
          // 겹치는 예약을 찾기 위해 시간 범위 체크
          for (const reservation of reservations) {
            const { data: conflictingReservations } = await supabase
              .from('reservations')
              .select('status, start_time, end_time')
              .eq('room_id', reservation.room_id)
              .in('status', ['pending', 'confirmed'])
            
            if (conflictingReservations) {
              const conflicting = conflictingReservations.find(existing => {
                const existingStart = new Date(existing.start_time)
                const existingEnd = new Date(existing.end_time)
                const newStart = new Date(reservation.start_time)
                const newEnd = new Date(reservation.end_time)
                return existingStart < newEnd && existingEnd > newStart
              })
              
              if (conflicting) {
                if (conflicting.status === 'pending') {
                  setError('해당 시간대에 예약 대기중입니다. 다른 시간을 선택해주세요.')
                } else {
                  setError('해당 시간대에 이미 예약이 존재합니다. 다른 시간을 선택해주세요.')
                }
                setStep(2)
                setRefreshTrigger(prev => prev + 1)
                setLoading(false)
                return
              }
            }
          }
          
          // 위에서 찾지 못한 경우 기본 메시지
          setError('해당 시간대에 이미 예약이 존재합니다. 다른 시간을 선택해주세요.')
          setStep(2)
          setRefreshTrigger(prev => prev + 1)
        } else if (insertError.message.includes('사용금지')) {
          setError('해당 시간대는 사용금지 시간입니다. 다른 시간을 선택해주세요.')
          setStep(2)
          setRefreshTrigger(prev => prev + 1)
        } else {
          setError(insertError.message || '예약 생성 중 오류가 발생했습니다.')
        }
        setLoading(false)
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message)
      } else {
        setError('예약 생성 중 오류가 발생했습니다.')
      }
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-2 sm:gap-4 mb-6 sm:mb-8 overflow-x-auto">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center flex-shrink-0">
            <div
              className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-semibold text-sm sm:text-base ${
                step >= s
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {s}
            </div>
            {s < 3 && (
              <div
                className={`w-8 sm:w-16 h-1 mx-1 sm:mx-2 ${
                  step > s ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="p-4 text-sm text-red-600 bg-red-50 rounded-md">
          {error}
        </div>
      )}

      {/* Step 1: Room Selection */}
      {step === 1 && (
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold mb-4">실 선택</h2>
          <RoomSelection onSelect={handleRoomSelect} selectedRoomId={formData.roomId} />
        </div>
      )}

      {/* Step 2: Date & Time Selection */}
      {step === 2 && (
        <div>
          <Button
            variant="ghost"
            onClick={() => setStep(1)}
            className="mb-4 text-sm sm:text-base"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            이전
          </Button>
          <h2 className="text-xl sm:text-2xl font-semibold mb-4">날짜 및 시간 선택</h2>
          <DateTimeSelection
            roomId={formData.roomId || ''}
            onSelect={handleDateTimeSelect}
            selectedStartTime={formData.startTime}
            selectedEndTime={formData.endTime}
            refreshTrigger={refreshTrigger}
          />
        </div>
      )}

      {/* Step 3: Purpose & Attendees */}
      {step === 3 && (
        <form onSubmit={handleSubmit}>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setStep(2)}
            className="mb-4 text-sm sm:text-base"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            이전
          </Button>
          <h2 className="text-xl sm:text-2xl font-semibold mb-4">예약 정보 입력</h2>
          <Card>
            <CardHeader>
              <CardTitle>예약 사유 및 동반자</CardTitle>
              <CardDescription>
                예약 사유와 함께 참석할 동반자를 입력해주세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="purpose">예약 사유 *</Label>
                <Input
                  id="purpose"
                  placeholder="예: 음악 연습, 실험 수업 등"
                  value={formData.purpose}
                  onChange={(e) =>
                    setFormData({ ...formData, purpose: e.target.value })
                  }
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="attendees">동반자 (선택)</Label>
                <Input
                  id="attendees"
                  placeholder="이름을 쉼표로 구분하여 입력 (예: 홍길동, 김철수)"
                  value={formData.attendees}
                  onChange={(e) =>
                    setFormData({ ...formData, attendees: e.target.value })
                  }
                  disabled={loading}
                />
                <p className="text-sm text-gray-500">
                  여러 명을 입력할 경우 쉼표로 구분해주세요
                </p>
              </div>
              
              {/* 반복 예약 옵션 */}
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="recurring"
                    checked={isRecurring}
                    onCheckedChange={(checked) => setIsRecurring(checked === true)}
                    disabled={loading}
                  />
                  <Label
                    htmlFor="recurring"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                  >
                    <Repeat className="w-4 h-4" />
                    요일 반복 예약
                  </Label>
                </div>
                {isRecurring && (
                  <div className="space-y-2 pl-6">
                    <Label htmlFor="recurringWeeks">반복 주기</Label>
                    <Select
                      value={recurringWeeks}
                      onValueChange={setRecurringWeeks}
                      disabled={loading}
                    >
                      <SelectTrigger id="recurringWeeks">
                        <SelectValue placeholder="반복 주기를 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2주 (2회)</SelectItem>
                        <SelectItem value="4">4주 (4회)</SelectItem>
                        <SelectItem value="6">6주 (6회)</SelectItem>
                        <SelectItem value="8">8주 (8회)</SelectItem>
                        <SelectItem value="12">12주 (12회)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">
                      선택한 날짜의 요일마다 반복 예약됩니다. 예: 매주 월요일
                    </p>
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? '예약 중...' : isRecurring ? `${recurringWeeks}주 반복 예약 신청하기` : '예약 신청하기'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </form>
      )}
    </div>
  )
}

