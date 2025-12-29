import Link from 'next/link'
import { Calendar, Clock, Users, ArrowRight } from 'lucide-react'

export default async function HomePage() {
  // 리디렉션은 middleware에서 처리하므로 여기서는 제거
  // 무한 리디렉션 방지

  return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 md:py-16">
        <div className="max-w-4xl mx-auto text-center">
          {/* Hero Section */}
          <div className="mb-8 sm:mb-12 md:mb-16">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-4 sm:mb-6">
              능주고 특별실 예약 시스템
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-6 sm:mb-8 px-4">
              스마트폰으로 간편하게 특별실을 예약하고 관리하세요
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 sm:px-8 py-3 sm:py-4 rounded-lg text-base sm:text-lg transition-colors shadow-lg active:scale-95"
              >
                로그인
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-blue-600 border-2 border-blue-600 font-semibold px-6 sm:px-8 py-3 sm:py-4 rounded-lg text-base sm:text-lg transition-colors shadow-lg active:scale-95"
              >
                학생 회원가입
              </Link>
              <Link
                href="/signup/teacher"
                className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 sm:px-8 py-3 sm:py-4 rounded-lg text-base sm:text-lg transition-colors shadow-lg active:scale-95"
              >
                교직원 회원가입
              </Link>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8 mt-12 sm:mt-16 md:mt-20">
            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-3 sm:mb-4 mx-auto">
                <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2">실시간 예약</h3>
              <p className="text-sm sm:text-base text-gray-600">
                빈 교실을 실시간으로 확인하고 즉시 예약할 수 있습니다
              </p>
            </div>

            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-3 sm:mb-4 mx-auto">
                <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2">시간 관리</h3>
              <p className="text-sm sm:text-base text-gray-600">
                중복 예약을 방지하고 효율적으로 시간을 관리합니다
              </p>
            </div>

            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow sm:col-span-2 md:col-span-1">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-3 sm:mb-4 mx-auto">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2">간편한 관리</h3>
              <p className="text-sm sm:text-base text-gray-600">
                예약 내역을 한눈에 확인하고 관리할 수 있습니다
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

