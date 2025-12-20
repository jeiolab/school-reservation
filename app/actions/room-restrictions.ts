'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createRoomRestriction(formData: FormData) {
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
      return { error: '권한이 없습니다. 교사 또는 관리자만 사용금지 공지를 작성할 수 있습니다.' }
    }

    const roomId = formData.get('room_id') as string
    const restrictedHours = formData.get('restricted_hours') as string
    const reason = formData.get('reason') as string

    if (!roomId || !restrictedHours || !reason) {
      return { error: '모든 필드를 입력해주세요.' }
    }

    // 기존 활성화된 제한이 있으면 비활성화
    const { data: existingRestriction } = await supabase
      .from('room_restrictions')
      .select('id')
      .eq('room_id', roomId)
      .eq('is_active', true)
      .single()

    if (existingRestriction) {
      await supabase
        .from('room_restrictions')
        .update({ is_active: false })
        .eq('id', existingRestriction.id)
    }

    // 새 제한 생성 (트리거가 자동으로 is_available을 false로 변경)
    const { error } = await supabase
      .from('room_restrictions')
      .insert({
        room_id: roomId,
        restricted_hours: restrictedHours.trim(),
        reason: reason.trim(),
        is_active: true,
        created_by: user.id,
      })

    if (error) {
      console.error('Error creating room restriction:', error)
      return { error: '사용금지 공지 생성에 실패했습니다.' }
    }

    revalidatePath('/dashboard')
    revalidatePath('/admin')
    revalidatePath('/admin/rooms')
    return { success: true }
  } catch (error) {
    console.error('Error in createRoomRestriction:', error)
    return { error: '사용금지 공지 생성 중 오류가 발생했습니다.' }
  }
}

export async function deactivateRoomRestriction(restrictionId: string) {
  try {
    const supabase = await createClient()

    // 권한 체크
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
      return { error: '권한이 없습니다.' }
    }

    // 제한 비활성화 (트리거가 자동으로 is_available을 true로 복원)
    const { error } = await supabase
      .from('room_restrictions')
      .update({ is_active: false })
      .eq('id', restrictionId)

    if (error) {
      console.error('Error deactivating room restriction:', error)
      return { error: '사용금지 공지 해제에 실패했습니다.' }
    }

    revalidatePath('/dashboard')
    revalidatePath('/admin')
    revalidatePath('/admin/rooms')
    return { success: true }
  } catch (error) {
    console.error('Error in deactivateRoomRestriction:', error)
    return { error: '사용금지 공지 해제 중 오류가 발생했습니다.' }
  }
}

export async function getActiveRoomRestrictions() {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('room_restrictions')
      .select(`
        *,
        rooms (
          id,
          name,
          location
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching room restrictions:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error in getActiveRoomRestrictions:', error)
    return []
  }
}

export async function getAllRooms() {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('rooms')
      .select('id, name, location')
      .order('name')

    if (error) {
      console.error('Error fetching rooms:', error)
      return []
    }

    // id를 문자열로 변환하여 반환
    return (data || []).map((room: { id: number | string; name: string; location: string }) => ({
      ...room,
      id: String(room.id)
    }))
  } catch (error) {
    console.error('Error in getAllRooms:', error)
    return []
  }
}

