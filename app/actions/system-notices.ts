'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateSystemNotice(formData: FormData) {
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
      return { error: '권한이 없습니다. 교사 또는 관리자만 공지사항을 수정할 수 있습니다.' }
    }

    const restricted_hours = formData.get('restricted_hours') as string | null
    const notes = formData.get('notes') as string | null

    // 기존 공지사항이 있는지 확인
    const { data: existingNotice } = await supabase
      .from('system_notices')
      .select('id')
      .limit(1)
      .single()

    if (existingNotice) {
      // 업데이트
      const { error } = await supabase
        .from('system_notices')
        .update({
          restricted_hours: restricted_hours || null,
          notes: notes || null,
        })
        .eq('id', existingNotice.id)

      if (error) {
        console.error('Error updating system notice:', error)
        return { error: '공지사항 업데이트에 실패했습니다.' }
      }
    } else {
      // 새로 생성
      const { error } = await supabase
        .from('system_notices')
        .insert({
          restricted_hours: restricted_hours || null,
          notes: notes || null,
        })

      if (error) {
        console.error('Error creating system notice:', error)
        return { error: '공지사항 생성에 실패했습니다.' }
      }
    }

    revalidatePath('/dashboard')
    revalidatePath('/admin')
    return { success: true }
  } catch (error) {
    console.error('Error in updateSystemNotice:', error)
    return { error: '공지사항 업데이트 중 오류가 발생했습니다.' }
  }
}

export async function getSystemNotice() {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('system_notices')
      .select('*')
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116은 "no rows returned" 에러
      console.error('Error fetching system notice:', error)
      return null
    }

    return data || { restricted_hours: null, notes: null }
  } catch (error) {
    console.error('Error in getSystemNotice:', error)
    return null
  }
}





