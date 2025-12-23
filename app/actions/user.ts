'use server'

import { createClient } from '@/utils/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

export async function deleteUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: '로그인이 필요합니다.' }
  }

  try {
    // 1. 사용자의 예약 내역 삭제
    const { error: reservationError } = await supabase
      .from('reservations')
      .delete()
      .eq('user_id', user.id)

    if (reservationError) {
      console.error('Error deleting reservations:', reservationError)
      // 예약 삭제 실패해도 계속 진행
    }

    // 2. users 테이블에서 사용자 정보 삭제
    const { error: userError } = await supabase
      .from('users')
      .delete()
      .eq('id', user.id)

    if (userError) {
      console.error('Error deleting user from users table:', userError)
      return { error: '사용자 정보 삭제 중 오류가 발생했습니다.' }
    }

    // 3. Supabase Auth에서 사용자 삭제 (Service Role Key 필요)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (supabaseUrl && supabaseServiceKey) {
      // Service Role Key로 Admin 클라이언트 생성
      const supabaseAdmin = createSupabaseClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })

      // Auth에서 사용자 삭제
      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)

      if (authDeleteError) {
        console.error('Error deleting user from Auth:', authDeleteError)
        // Auth 삭제 실패해도 데이터베이스는 이미 삭제되었으므로 경고만 표시
        console.warn('Auth 사용자 삭제 실패, 하지만 데이터베이스 정보는 삭제되었습니다.')
      }
    } else {
      console.warn('SUPABASE_SERVICE_ROLE_KEY가 설정되지 않아 Auth 사용자 삭제를 건너뜁니다.')
      console.warn('데이터베이스 정보는 삭제되었지만, Supabase Auth에서 수동으로 삭제해야 할 수 있습니다.')
    }

    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    console.error('Error deleting user:', error)
    return { error: '탈퇴 처리 중 오류가 발생했습니다.' }
  }
}

export async function updateStudentId(studentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: '로그인이 필요합니다.' }
  }

  // 학번 검증 (4자리 숫자)
  if (!/^\d{4}$/.test(studentId)) {
    return { error: '학번은 4자리 숫자여야 합니다.' }
  }

  try {
    // 사용자 정보 확인 (학생만 수정 가능)
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching user profile:', profileError)
      return { error: '사용자 정보를 불러올 수 없습니다.' }
    }

    if (userProfile?.role !== 'student') {
      return { error: '학생만 학번을 수정할 수 있습니다.' }
    }

    // 학번 업데이트
    const { error: updateError } = await supabase
      .from('users')
      .update({ student_id: studentId })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error updating student_id:', updateError)
      return { error: '학번 수정 중 오류가 발생했습니다.' }
    }

    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    console.error('Error updating student_id:', error)
    return { error: '학번 수정 중 오류가 발생했습니다.' }
  }
}

