'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createRoomRestriction, getAllRooms, getActiveRoomRestrictions, deactivateRoomRestriction } from '@/app/actions/room-restrictions'
import { Loader2, Save, AlertCircle, X } from 'lucide-react'
import RestrictionTimeSelection from './restriction-time-selection'

interface Room {
  id: string
  name: string
  location: string
}

interface RoomRestriction {
  id: string
  room_id: string
  restricted_hours: string
  reason: string
  is_active: boolean
  rooms: Room | null
}

export default function RoomRestrictionManagement() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [restrictions, setRestrictions] = useState<RoomRestriction[]>([])
  const [selectedRoomId, setSelectedRoomId] = useState('')
  const [restrictionDescription, setRestrictionDescription] = useState('')
  const [restrictionData, setRestrictionData] = useState<{
    periodType?: 'weekday' | 'weekend' | 'all' | 'specific'
    startDate?: string
    endDate?: string
    startTime?: string
    endTime?: string
    description?: string
  }>({})
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      const [roomsData, restrictionsData] = await Promise.all([
        getAllRooms(),
        getActiveRoomRestrictions()
      ])
      setRooms(roomsData)
      setRestrictions(restrictionsData as RoomRestriction[])
      setIsLoading(false)
    }
    loadData()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    setMessage(null)

    if (!selectedRoomId || !restrictionDescription || !reason) {
      setMessage({ type: 'error', text: '모든 필드를 입력해주세요.' })
      setIsSubmitting(false)
      return
    }

    const formData = new FormData()
    formData.append('room_id', selectedRoomId)
    formData.append('restricted_hours', restrictionDescription)
    formData.append('reason', reason)

    const result = await createRoomRestriction(formData)

    if (result.error) {
      setMessage({ type: 'error', text: result.error })
    } else {
      setMessage({ type: 'success', text: '사용금지 공지가 성공적으로 등록되었습니다. 해당 특별실이 자동으로 사용중지 상태로 변경되었습니다.' })
      setSelectedRoomId('')
      setRestrictionDescription('')
      setRestrictionData({})
      setReason('')
      // 목록 새로고침
      const restrictionsData = await getActiveRoomRestrictions()
      setRestrictions(restrictionsData as RoomRestriction[])
    }

    setIsSubmitting(false)
  }

  async function handleDeactivate(restrictionId: string) {
    if (!confirm('사용금지 공지를 해제하시겠습니까? 해당 특별실이 다시 사용 가능 상태로 변경됩니다.')) {
      return
    }

    const result = await deactivateRoomRestriction(restrictionId)
    
    if (result.error) {
      setMessage({ type: 'error', text: result.error })
    } else {
      setMessage({ type: 'success', text: '사용금지 공지가 해제되었습니다.' })
      // 목록 새로고침
      const restrictionsData = await getActiveRoomRestrictions()
      setRestrictions(restrictionsData as RoomRestriction[])
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            특별실 사용금지 공지 관리
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="room_id">특별실 선택 *</Label>
              <Select value={selectedRoomId} onValueChange={setSelectedRoomId} disabled={isSubmitting}>
                <SelectTrigger id="room_id">
                  <SelectValue placeholder="사용금지를 적용할 특별실을 선택하세요">
                    {selectedRoomId && rooms.find(r => r.id === selectedRoomId) 
                      ? `${rooms.find(r => r.id === selectedRoomId)?.name} (${rooms.find(r => r.id === selectedRoomId)?.location})`
                      : '사용금지를 적용할 특별실을 선택하세요'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {rooms.map((room) => (
                    <SelectItem key={room.id} value={String(room.id)}>
                      {room.name} ({room.location})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                사용금지를 적용할 특별실을 선택해주세요
              </p>
            </div>

            <div className="space-y-2">
              <Label>사용금지 시간대 *</Label>
              <Card>
                <CardContent className="pt-6">
                  <RestrictionTimeSelection
                    onSelect={(data) => {
                      setRestrictionDescription(data.description)
                      setRestrictionData(data)
                    }}
                    selectedData={restrictionData}
                  />
                </CardContent>
              </Card>
              {restrictionDescription && (
                <p className="text-xs text-gray-500 mt-1">
                  선택된 시간대: <span className="font-medium">{restrictionDescription}</span>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">금지 사유 *</Label>
              <textarea
                id="reason"
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="예: 시설 점검, 특별 행사 준비, 안전 점검 등"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={isSubmitting}
                rows={4}
                required
              />
              <p className="text-xs text-gray-500">
                사용금지 사유를 입력해주세요. 이 내용이 모든 사용자에게 공지됩니다.
              </p>
            </div>

            {message && (
              <div
                className={`p-3 rounded-md text-sm ${
                  message.type === 'success'
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {message.text}
              </div>
            )}

            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  등록 중...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  사용금지 공지 등록
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 활성화된 사용금지 공지 목록 */}
      {restrictions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>현재 사용금지 중인 특별실</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {restrictions.map((restriction) => (
                <div
                  key={restriction.id}
                  className="p-4 border border-red-200 bg-red-50 rounded-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                        <h3 className="font-semibold text-red-900">
                          {restriction.rooms?.name || '알 수 없음'}
                          {restriction.rooms?.location && ` (${restriction.rooms.location})`}
                        </h3>
                      </div>
                      <div className="space-y-2 text-sm">
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeactivate(restriction.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-100 border-red-300"
                    >
                      <X className="w-4 h-4 mr-2" />
                      해제
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

