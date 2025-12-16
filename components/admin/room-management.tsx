'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { createRoom, deleteRoom } from '@/app/actions/rooms'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Plus, Trash2, Users, MapPin, Loader2 } from 'lucide-react'
import { Room } from '@/types/supabase'
import { useRouter } from 'next/navigation'

export default function RoomManagement() {
  const router = useRouter()
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [roomToDelete, setRoomToDelete] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    capacity: '',
    location: '',
    facilities: '',
  })

  useEffect(() => {
    fetchRooms()
  }, [])

  async function fetchRooms() {
    setLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .order('name')

    if (error) {
      console.error('Error fetching rooms:', error)
      setError('실 목록을 불러오는 중 오류가 발생했습니다.')
    } else {
      setRooms(data || [])
    }
    setLoading(false)
  }

  const handleOpenDialog = () => {
    setIsDialogOpen(true)
    setFormData({ name: '', capacity: '', location: '', facilities: '' })
    setError(null)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setFormData({ name: '', capacity: '', location: '', facilities: '' })
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const formDataObj = new FormData()
    formDataObj.append('name', formData.name)
    formDataObj.append('capacity', formData.capacity)
    formDataObj.append('location', formData.location)
    formDataObj.append('facilities', formData.facilities)
    formDataObj.append('is_available', 'true')

    const result = await createRoom(formDataObj)

    if (result.error) {
      setError(result.error)
      setIsSubmitting(false)
    } else {
      setIsSubmitting(false)
      handleCloseDialog()
      await fetchRooms()
      router.refresh()
    }
  }

  const handleDeleteClick = (roomId: string) => {
    setRoomToDelete(roomId)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!roomToDelete) return

    setIsSubmitting(true)
    setError(null)

    const result = await deleteRoom(roomToDelete)

    if (result.error) {
      setError(result.error)
      setIsSubmitting(false)
      setIsDeleteDialogOpen(false)
    } else {
      setIsSubmitting(false)
      setIsDeleteDialogOpen(false)
      setRoomToDelete(null)
      await fetchRooms()
      router.refresh()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header with Add Button */}
      <div className="flex justify-end">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenDialog} className="w-full sm:w-auto text-sm sm:text-base py-2.5 sm:py-2">
              <Plus className="w-4 h-4 mr-2" />
              실 추가
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>새 실 추가</DialogTitle>
              <DialogDescription>
                새로운 특별실 정보를 입력해주세요
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                {error && (
                  <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="name">실 이름 *</Label>
                  <Input
                    id="name"
                    placeholder="예: 음악실"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="capacity">수용 인원 *</Label>
                  <Input
                    id="capacity"
                    type="number"
                    min="1"
                    placeholder="예: 30"
                    value={formData.capacity}
                    onChange={(e) =>
                      setFormData({ ...formData, capacity: e.target.value })
                    }
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">위치 *</Label>
                  <Input
                    id="location"
                    placeholder="예: 2층"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="facilities">설비 (선택)</Label>
                  <Input
                    id="facilities"
                    placeholder="예: 피아노, 스피커, 마이크 (쉼표로 구분)"
                    value={formData.facilities}
                    onChange={(e) =>
                      setFormData({ ...formData, facilities: e.target.value })
                    }
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-gray-500">
                    여러 설비를 입력할 경우 쉼표로 구분해주세요
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDialog}
                  disabled={isSubmitting}
                >
                  취소
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      추가 중...
                    </>
                  ) : (
                    '추가하기'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Error Message */}
      {error && !isDialogOpen && (
        <div className="p-4 text-sm text-red-600 bg-red-50 rounded-md">
          {error}
        </div>
      )}

      {/* Rooms List */}
      {rooms.length === 0 ? (
        <Card>
          <CardContent className="py-8 sm:py-12 text-center text-gray-500 text-sm sm:text-base">
            등록된 실이 없습니다. 실을 추가해주세요.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {rooms.map((room) => (
            <Card key={room.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg sm:text-xl mb-2 truncate">{room.name}</CardTitle>
                    <CardDescription className="space-y-1 text-xs sm:text-sm">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span className="truncate">{room.location}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span>최대 {room.capacity}명</span>
                      </div>
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteClick(room.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {room.facilities && room.facilities.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-2 sm:mb-3">
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
                <div className="mt-2 sm:mt-3">
                  <span
                    className={`inline-block px-2 sm:px-3 py-1 rounded text-xs font-medium ${
                      room.is_available
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {room.is_available ? '사용 가능' : '사용 불가'}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>실 삭제 확인</AlertDialogTitle>
            <AlertDialogDescription>
              정말 이 실을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
              <br />
              <span className="font-semibold text-red-600">
                해당 실에 예약이 있는 경우 삭제할 수 없습니다.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  삭제 중...
                </>
              ) : (
                '삭제하기'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

