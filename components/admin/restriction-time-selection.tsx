'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Clock } from 'lucide-react'
import { format, setHours, setMinutes } from 'date-fns'
import { cn } from '@/lib/utils'

// Generate time slots (30-minute intervals from 8:00 to 22:00)
const generateTimeSlots = () => {
  const slots = []
  for (let hour = 8; hour <= 22; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
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

interface RestrictionTimeSelectionProps {
  onSelect: (restrictionData: {
    periodType: 'weekday' | 'weekend' | 'all' | 'specific'
    startDate?: string
    endDate?: string
    startTime?: string
    endTime?: string
    description: string
  }) => void
  selectedData?: {
    periodType?: 'weekday' | 'weekend' | 'all' | 'specific'
    startDate?: string
    endDate?: string
    startTime?: string
    endTime?: string
    description?: string
  }
}

export default function RestrictionTimeSelection({
  onSelect,
  selectedData,
}: RestrictionTimeSelectionProps) {
  const [periodType, setPeriodType] = useState<'weekday' | 'weekend' | 'all' | 'specific'>(
    selectedData?.periodType || 'weekday'
  )
  const [startDate, setStartDate] = useState<string>(
    selectedData?.startDate || format(new Date(), 'yyyy-MM-dd')
  )
  const [endDate, setEndDate] = useState<string>(
    selectedData?.endDate || format(new Date(), 'yyyy-MM-dd')
  )
  const [startTime, setStartTime] = useState<string>(selectedData?.startTime || '')
  const [endTime, setEndTime] = useState<string>(selectedData?.endTime || '')

  const generateDescription = () => {
    let description = ''

    if (periodType === 'all') {
      description = '전체 기간'
      if (startTime && endTime) {
        description += ` ${startTime} - ${endTime}`
      }
    } else if (periodType === 'weekday') {
      description = '평일'
      if (startTime && endTime) {
        description += ` ${startTime} - ${endTime}`
      } else {
        description += ' 전체'
      }
    } else if (periodType === 'weekend') {
      description = '주말'
      if (startTime && endTime) {
        description += ` ${startTime} - ${endTime}`
      } else {
        description += ' 전체'
      }
    } else if (periodType === 'specific') {
      if (startDate === endDate) {
        description = format(new Date(startDate), 'yyyy년 MM월 dd일')
      } else {
        description = `${format(new Date(startDate), 'yyyy년 MM월 dd일')} - ${format(new Date(endDate), 'yyyy년 MM월 dd일')}`
      }
      if (startTime && endTime) {
        description += ` ${startTime} - ${endTime}`
      } else {
        description += ' 전체'
      }
    }

    return description
  }

  const handleConfirm = () => {
    const description = generateDescription()

    onSelect({
      periodType,
      startDate: periodType === 'specific' ? startDate : undefined,
      endDate: periodType === 'specific' ? endDate : undefined,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      description,
    })
  }

  // 시간이 변경될 때마다 자동으로 description 업데이트
  const handleTimeChange = () => {
    if (startTime && endTime) {
      const description = generateDescription()
      onSelect({
        periodType,
        startDate: periodType === 'specific' ? startDate : undefined,
        endDate: periodType === 'specific' ? endDate : undefined,
        startTime,
        endTime,
        description,
      })
    }
  }

  const minDate = format(new Date(), 'yyyy-MM-dd')
  const maxDate = format(new Date(new Date().setFullYear(new Date().getFullYear() + 1)), 'yyyy-MM-dd')

  // 시간이 모두 선택되면 자동으로 description 업데이트
  useEffect(() => {
    if (startTime && endTime) {
      const description = generateDescription()
      onSelect({
        periodType,
        startDate: periodType === 'specific' ? startDate : undefined,
        endDate: periodType === 'specific' ? endDate : undefined,
        startTime,
        endTime,
        description,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startTime, endTime, periodType, startDate, endDate])

  return (
    <div className="space-y-4">
      {/* Period Type Selection */}
      <div className="space-y-2">
        <Label>기간 유형 *</Label>
        <Select
          value={periodType}
          onValueChange={(value: 'weekday' | 'weekend' | 'all' | 'specific') => {
            setPeriodType(value)
            if (value !== 'specific') {
              setStartDate(format(new Date(), 'yyyy-MM-dd'))
              setEndDate(format(new Date(), 'yyyy-MM-dd'))
            }
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="weekday">평일</SelectItem>
            <SelectItem value="weekend">주말</SelectItem>
            <SelectItem value="all">전체 기간</SelectItem>
            <SelectItem value="specific">특정 날짜</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Date Selection (only for specific dates) */}
      {periodType === 'specific' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="start_date">시작 날짜 *</Label>
            <Input
              id="start_date"
              type="date"
              min={minDate}
              max={maxDate}
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value)
                if (e.target.value > endDate) {
                  setEndDate(e.target.value)
                }
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end_date">종료 날짜 *</Label>
            <Input
              id="end_date"
              type="date"
              min={startDate}
              max={maxDate}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Time Selection (optional) */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>시간 선택 (선택사항)</Label>
          <p className="text-xs text-gray-500">
            시간을 선택하지 않으면 해당 기간 전체가 사용금지됩니다
          </p>
        </div>

        {!startTime && (
          <div>
            <Label className="text-sm">시작 시간</Label>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 mt-2">
              {timeSlots.map((slot) => {
                const [slotHour, slotMinute] = slot.split(':').map(Number)
                const disabled = slotHour > 21 || (slotHour === 21 && slotMinute > 30)

                return (
                  <Button
                    key={slot}
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={disabled}
                    onClick={() => {
                      setStartTime(slot)
                      if (endTime && slot >= endTime) {
                        setEndTime('')
                      }
                      // 시간 변경 후 자동 업데이트는 useEffect에서 처리
                    }}
                    className={cn(
                      'text-xs sm:text-sm py-2 sm:py-2.5',
                      disabled && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    {slot}
                  </Button>
                )
              })}
            </div>
          </div>
        )}

        {startTime && (
          <div>
            <Label>종료 시간</Label>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 mt-2">
              {timeSlots.map((slot) => {
                const [startHour, startMinute] = startTime.split(':').map(Number)
                const [slotHour, slotMinute] = slot.split(':').map(Number)

                const startDateTime = setMinutes(setHours(new Date(), startHour), startMinute)
                const slotDateTime = setMinutes(setHours(new Date(), slotHour), slotMinute)

                const disabled = slotDateTime <= startDateTime

                const selected = endTime === slot

                return (
                  <Button
                    key={slot}
                    type="button"
                    variant={selected ? 'default' : 'outline'}
                    size="sm"
                    disabled={disabled}
                    onClick={() => {
                      setEndTime(slot)
                      // 시간 변경 후 자동 업데이트는 useEffect에서 처리
                    }}
                    className={cn(
                      disabled && 'opacity-50 cursor-not-allowed'
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
                {startTime} - {endTime}
              </span>
            </div>
            <Button onClick={handleConfirm} type="button" className="w-full">
              시간 확인
            </Button>
          </div>
        )}

        {!startTime && (
          <Button
            onClick={handleConfirm}
            type="button"
            variant="outline"
            className="w-full"
          >
            전체 시간으로 설정
          </Button>
        )}
      </div>
    </div>
  )
}

