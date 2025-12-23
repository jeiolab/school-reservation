'use server'

import { createClient } from '@/utils/supabase/server'

export async function archiveOldReservations() {
  const supabase = await createClient()
  
  // Check if user is admin or teacher
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: '로그인이 필요합니다.' }
  }

  const { data: userProfile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!userProfile || (userProfile.role !== 'admin' && userProfile.role !== 'teacher')) {
    return { error: '권한이 없습니다.' }
  }

  // Call the archive function
  const { data, error } = await supabase.rpc('archive_old_reservations', {})

  if (error) {
    console.error('Error archiving reservations:', error)
    return { error: error.message }
  }

  // Handle case where data might be null or empty
  const result = data && Array.isArray(data) && data.length > 0 
    ? data[0] 
    : { archived_count: 0, deleted_count: 0 }

  return { 
    success: true, 
    data: {
      archived_count: result.archived_count || 0,
      deleted_count: result.deleted_count || 0
    }
  }
}

