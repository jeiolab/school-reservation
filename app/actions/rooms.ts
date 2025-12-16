'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const createRoomSchema = z.object({
  name: z.string().min(1, '실 이름을 입력해주세요'),
  capacity: z.number().min(1, '수용 인원은 1명 이상이어야 합니다'),
  location: z.string().min(1, '위치를 입력해주세요'),
  facilities: z.array(z.string()).optional(),
  is_available: z.boolean().optional().default(true),
})

export async function createRoom(formData: FormData) {
  try {
    const supabase = await createClient()

    // 권한 체크: teacher 또는 admin만 접근 가능
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { error: '인증이 필요합니다.' }
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userProfile || (userProfile.role !== 'teacher' && userProfile.role !== 'admin')) {
      return { error: '권한이 없습니다. 교사 또는 관리자만 실을 추가할 수 있습니다.' }
    }

    // FormData에서 값 추출
    const name = formData.get('name') as string
    const capacityString = formData.get('capacity') as string
    const capacityValue = capacityString ? parseInt(capacityString, 10) : NaN
    const location = formData.get('location') as string
    const facilitiesString = formData.get('facilities') as string
    const is_available = formData.get('is_available') === 'true'

    // capacity 유효성 검사
    if (!capacityString || isNaN(capacityValue) || capacityValue < 1) {
      return { error: '수용 인원은 1 이상의 숫자여야 합니다.' }
    }

    // facilities 문자열을 배열로 변환
    const facilities = facilitiesString
      ? facilitiesString.split(',').map(f => f.trim()).filter(Boolean)
      : []

    // Validation
    const validatedData = createRoomSchema.parse({
      name: name || '',
      capacity: capacityValue,
      location: location || '',
      facilities: facilities.length > 0 ? facilities : undefined,
      is_available: is_available ?? true,
    })

    // DB에 삽입
    const { data, error } = await supabase
      .from('rooms')
      .insert({
        name: validatedData.name,
        capacity: validatedData.capacity,
        location: validatedData.location,
        facilities: validatedData.facilities || [],
        is_available: validatedData.is_available,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating room:', error)
      return { error: error.message || '실 추가 중 오류가 발생했습니다.' }
    }

    revalidatePath('/admin/rooms')
    return { success: true, data }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message }
    }
    console.error('Error in createRoom:', error)
    return { error: '실 추가 중 오류가 발생했습니다.' }
  }
}

export async function deleteRoom(roomId: string) {
  try {
    const supabase = await createClient()

    // 권한 체크: teacher 또는 admin만 접근 가능
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { error: '인증이 필요합니다.' }
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userProfile || (userProfile.role !== 'teacher' && userProfile.role !== 'admin')) {
      return { error: '권한이 없습니다. 교사 또는 관리자만 실을 삭제할 수 있습니다.' }
    }

    // 해당 실에 예약이 있는지 확인
    const { data: reservations } = await supabase
      .from('reservations')
      .select('id')
      .eq('room_id', roomId)
      .limit(1)

    if (reservations && reservations.length > 0) {
      return { error: '해당 실에 예약이 있어 삭제할 수 없습니다.' }
    }

    // DB에서 삭제
    const { error } = await supabase
      .from('rooms')
      .delete()
      .eq('id', roomId)

    if (error) {
      console.error('Error deleting room:', error)
      return { error: error.message || '실 삭제 중 오류가 발생했습니다.' }
    }

    revalidatePath('/admin/rooms')
    return { success: true }
  } catch (error) {
    console.error('Error in deleteRoom:', error)
    return { error: '실 삭제 중 오류가 발생했습니다.' }
  }
}

