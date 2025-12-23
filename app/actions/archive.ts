'use server'

import { createClient } from '@/utils/supabase/server'
import { Reservation } from '@/types/supabase'

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

  try {
    // 2주일 전 날짜 계산 (한국 시간 기준)
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 14)
    cutoffDate.setHours(0, 0, 0, 0)
    
    // UTC로 변환 (데이터베이스는 UTC로 저장됨)
    const utcCutoffDate = new Date(cutoffDate.getTime() - (9 * 60 * 60 * 1000))

    // 1단계: 아카이브할 예약 조회 (승인 후 2주일이 지난 예약)
    // updated_at이 없을 수 있으므로 모든 confirmed 예약을 가져온 후 필터링
    const { data: allConfirmedReservations, error: fetchError } = await supabase
      .from('reservations')
      .select('*')
      .eq('status', 'confirmed')
      .not('approved_by', 'is', null)

    if (fetchError) {
      console.error('Error fetching reservations to archive:', fetchError)
      return { error: `예약 조회 중 오류가 발생했습니다: ${fetchError.message}` }
    }

    if (!allConfirmedReservations || allConfirmedReservations.length === 0) {
      return { 
        success: true, 
        data: { archived_count: 0, deleted_count: 0 }
      }
    }

    // updated_at 또는 created_at을 기준으로 2주일이 지난 예약 필터링
    const reservationsToArchive = (allConfirmedReservations || []).filter((reservation: Reservation) => {
      const updateDate = reservation.updated_at || reservation.created_at
      if (!updateDate) return false
      const updateDateObj = new Date(updateDate)
      return updateDateObj < utcCutoffDate
    })

    if (reservationsToArchive.length === 0) {
      return { 
        success: true, 
        data: { archived_count: 0, deleted_count: 0 }
      }
    }

    // 2단계: 이미 아카이브된 예약 제외
    const reservationIds = reservationsToArchive.map(r => r.id)
    const { data: existingArchives } = await supabase
      .from('reservations_archive')
      .select('original_id')
      .in('original_id', reservationIds)

    const existingArchiveIds = new Set(existingArchives?.map(a => a.original_id) || [])
    const toArchive = reservationsToArchive.filter(r => !existingArchiveIds.has(r.id))

    if (toArchive.length === 0) {
      return { 
        success: true, 
        data: { archived_count: 0, deleted_count: 0 }
      }
    }

    // 3단계: 아카이브 테이블에 삽입
    const archiveData = toArchive.map(reservation => ({
      original_id: reservation.id,
      user_id: reservation.user_id,
      room_id: reservation.room_id,
      start_time: reservation.start_time,
      end_time: reservation.end_time,
      purpose: reservation.purpose,
      status: reservation.status,
      attendees: reservation.attendees || [],
      approved_by: reservation.approved_by,
      rejection_reason: reservation.rejection_reason,
      created_at: reservation.created_at,
      updated_at: reservation.updated_at || reservation.created_at,
      archived_at: new Date().toISOString()
    }))

    const { error: insertError } = await supabase
      .from('reservations_archive')
      .insert(archiveData)

    if (insertError) {
      console.error('Error inserting into archive:', insertError)
      return { error: `아카이브 저장 중 오류가 발생했습니다: ${insertError.message}` }
    }

    // 4단계: 원본 테이블에서 삭제
    const archivedIds = toArchive.map(r => r.id)
    const { error: deleteError } = await supabase
      .from('reservations')
      .delete()
      .in('id', archivedIds)

    if (deleteError) {
      console.error('Error deleting from reservations:', deleteError)
      // 아카이브는 성공했으므로 경고만 표시
      return { 
        success: true, 
        data: { 
          archived_count: toArchive.length, 
          deleted_count: 0 
        },
        warning: `아카이브는 완료되었지만 원본 삭제 중 오류가 발생했습니다: ${deleteError.message}`
      }
    }

    return { 
      success: true, 
      data: {
        archived_count: toArchive.length,
        deleted_count: archivedIds.length
      }
    }
  } catch (error) {
    console.error('Unexpected error archiving reservations:', error)
    return { 
      error: `예상치 못한 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}` 
    }
  }
}

