'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, MapPin, Users, Loader2, Archive } from 'lucide-react'
import { format } from 'date-fns'
import { Room, User as UserType } from '@/types/supabase'
import { toKoreaTime } from '@/lib/utils'

interface ArchivedReservation {
  id: string
  original_id: string
  user_id: string
  room_id: string
  start_time: string
  end_time: string
  purpose: string
  status: 'pending' | 'confirmed' | 'rejected'
  attendees: string[]
  approved_by: string | null
  rejection_reason: string | null
  created_at: string
  updated_at: string
  archived_at: string
  rooms: Room | null
  users: UserType | null
  approved_by_user?: UserType | null
}

export default function ArchiveDashboard() {
  const [reservations, setReservations] = useState<ArchivedReservation[]>([])
  const [loading, setLoading] = useState(true)

  const fetchArchivedReservations = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('reservations_archive')
      .select(`
        *,
        rooms (*),
        users (*),
        approved_by_user:users!approved_by (*)
      `)
      .order('archived_at', { ascending: false })

    if (error) {
      console.error('Error fetching archived reservations:', error)
      setReservations([])
    } else {
      const transformedData = (data || []).map((item: any) => ({
        ...item,
        approved_by_user: item.approved_by_user || null,
      }))
      setReservations(transformedData)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchArchivedReservations()
  }, [fetchArchivedReservations])

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {reservations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <Archive className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>보관된 예약 내역이 없습니다.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          {reservations.map((reservation) => {
            const room = reservation.rooms
            const user = reservation.users

            return (
              <Card key={reservation.id} className="hover:shadow-lg transition-all border-l-4 border-l-gray-300">
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
                    <div className="pt-2 border-t">
                      <p className="text-xs text-gray-500">
                        보관일: {format(toKoreaTime(reservation.archived_at), 'yyyy년 MM월 dd일 HH:mm')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

