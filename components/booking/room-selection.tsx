'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, MapPin, Check } from 'lucide-react'
import { Room } from '@/types/supabase'
import { cn } from '@/lib/utils'

interface RoomSelectionProps {
  onSelect: (roomId: string) => void
  selectedRoomId?: string
}

export default function RoomSelection({ onSelect, selectedRoomId }: RoomSelectionProps) {
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchRooms() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('is_available', true)
        .order('name')

      if (error) {
        console.error('Error fetching rooms:', error)
      } else {
        setRooms(data || [])
      }
      setLoading(false)
    }

    fetchRooms()
  }, [])

  if (loading) {
    return (
      <div className="grid md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (rooms.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          예약 가능한 실이 없습니다.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {rooms.map((room) => (
        <Card
          key={room.id}
          className={cn(
            'cursor-pointer transition-all hover:shadow-lg active:scale-[0.98]',
            selectedRoomId === room.id && 'ring-2 ring-blue-600 shadow-md'
          )}
          onClick={() => onSelect(room.id)}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg sm:text-xl mb-2 truncate">{room.name}</CardTitle>
                <CardDescription className="flex items-center gap-2 text-xs sm:text-sm">
                  <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="truncate">{room.location}</span>
                </CardDescription>
              </div>
              {selectedRoomId === room.id && (
                <div className="w-6 h-6 sm:w-7 sm:h-7 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Check className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                <Users className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                <span>최대 {room.capacity}명 수용</span>
              </div>
              {room.facilities && room.facilities.length > 0 && (
                <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2 sm:mt-3">
                  {room.facilities.map((facility, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 sm:py-1 bg-gray-100 text-gray-700 rounded text-xs"
                    >
                      {facility}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
      </div>
    </div>
  )
}

