import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePatientStore } from '../stores/patientStore'
import { useAuthStore } from '../stores/authStore'

export const Dashboard = () => {
  const { user } = useAuthStore()
  const { patients, fetchPatients, getTodaysVisits } = usePatientStore()
  const [todaysVisits, setTodaysVisits] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      await fetchPatients()
      const visits = await getTodaysVisits()
      setTodaysVisits(visits)
      setLoading(false)
    }
    loadData()
  }, [])

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Selamat pagi'
    if (hour < 15) return 'Selamat siang'
    return 'Selamat sore'
  }

  const stats = [
    {
      label: 'Total Pasien',
      value: patients.length,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      gradient: 'from-sky-500/10 to-sky-400/5',
      border: 'border-sky-200',
      iconBg: 'bg-sky-50',
      iconColor: 'text-sky-600',
    },
    {
      label: 'Kunjungan Hari Ini',
      value: todaysVisits.length,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      gradient: 'from-teal-500/10 to-teal-400/5',
      border: 'border-teal-200',
      iconBg: 'bg-teal-50',
      iconColor: 'text-teal-600',
    },
    {
      label: 'Pasien Baru',
      value: patients.filter(p => {
        if (!p.created_at) return false
        const created = new Date(p.created_at)
        const today = new Date()
        return created.toDateString() === today.toDateString()
      }).length,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      ),
      gradient: 'from-amber-500/10 to-amber-400/5',
      border: 'border-amber-200',
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
    },
    {
      label: 'Rata-rata / Hari',
      value: '-',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      gradient: 'from-violet-500/10 to-violet-400/5',
      border: 'border-violet-200',
      iconBg: 'bg-violet-50',
      iconColor: 'text-violet-600',
    },
  ]

  return (
    <div className="p-6 md:p-8 lg:p-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-800">
          {getGreeting()} 👋
        </h1>
        <p className="text-slate-500 mt-1">
          Berikut ringkasan aktivitas klinik hari ini
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 mb-8">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className={`bg-gradient-to-br ${stat.gradient} border ${stat.border} rounded-2xl p-5 md:p-6 hover:shadow-md transition-all duration-200 group`}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{stat.label}</p>
              <div className={`${stat.iconBg} ${stat.iconColor} w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                {stat.icon}
              </div>
            </div>
            <p className="text-3xl md:text-4xl font-bold text-slate-800">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {/* Today's Visits */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-teal-50 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-base font-semibold text-slate-800">Kunjungan Hari Ini</h2>
            </div>
            <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">{todaysVisits.length} pasien</span>
          </div>
          <div className="p-5 md:p-6">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : todaysVisits.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-slate-500 font-medium">Belum ada kunjungan hari ini</p>
                <p className="text-slate-400 text-sm mt-1">Pasien akan muncul di sini setelah check-in</p>
              </div>
            ) : (
              <div className="space-y-2">
                {todaysVisits.map(visit => (
                  <Link
                    key={visit.id}
                    to={`/patients/${visit.patient_id}`}
                    className="flex items-center justify-between p-4 rounded-xl hover:bg-slate-50 transition-colors group"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-11 h-11 bg-gradient-to-br from-sky-400 to-cyan-500 rounded-xl flex items-center justify-center text-white font-semibold text-sm shadow-lg shadow-sky-500/20">
                        {(visit.patients?.name || 'P')[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 group-hover:text-sky-600 transition-colors truncate">
                          {visit.patients?.name || 'Pasien'}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {new Date(visit.visit_date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      visit.status === 'completed'
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                        : 'bg-amber-50 text-amber-600 border border-amber-100'
                    }`}>
                      {visit.status || 'pending'}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
            <div className="w-9 h-9 bg-sky-50 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-slate-800">Aksi Cepat</h2>
          </div>
          <div className="p-5 md:p-6">
            <div className="grid grid-cols-2 gap-4">
              <Link
                to="/patients/new"
                className="p-5 bg-gradient-to-br from-sky-50 to-sky-100/50 border border-sky-200 rounded-xl text-center hover:shadow-md hover:-translate-y-0.5 transition-all group"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-sky-500 to-sky-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-sky-500/25 group-hover:shadow-sky-500/40 group-hover:scale-105 transition-all">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-sky-700">Pasien Baru</p>
              </Link>
              <Link
                to="/patients"
                className="p-5 bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-200 rounded-xl text-center hover:shadow-md hover:-translate-y-0.5 transition-all group"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-slate-500 to-slate-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-slate-500/25 group-hover:shadow-slate-500/40 group-hover:scale-105 transition-all">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-slate-700">Daftar Pasien</p>
              </Link>
            </div>

            {/* Recent Patients */}
            <div className="mt-6 pt-5 border-t border-slate-100">
              <h4 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Pasien Terbaru
              </h4>
              <div className="space-y-1">
                {patients.slice(0, 5).map(patient => (
                  <Link
                    key={patient.id}
                    to={`/patients/${patient.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group"
                  >
                    <div className="w-9 h-9 bg-gradient-to-br from-slate-200 to-slate-300 rounded-lg flex items-center justify-center text-slate-600 font-semibold text-xs">
                      {patient.name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700 group-hover:text-sky-600 font-medium truncate transition-colors">{patient.name}</p>
                    </div>
                    <svg className="w-4 h-4 text-slate-300 group-hover:text-slate-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ))}
                {patients.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-6">Belum ada pasien terdaftar</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
