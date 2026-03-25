import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { usePatientStore } from '../stores/patientStore'
import { useAuthStore } from '../stores/authStore'
import { Button } from '../components/Button'
import { Modal, ConfirmDialog } from '../components/Modal'

export const PatientDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { currentPatient, visits, fetchPatient, fetchVisits, createVisit, deleteVisit, loading } = usePatientStore()

  const [saving, setSaving] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [soap, setSoap] = useState({
    subjective: '',
    objective: '',
    assessment: '',
    plan: ''
  })

  useEffect(() => {
    if (id) {
      fetchPatient(id)
      fetchVisits(id)
    }
  }, [id])

  const lastVisit = visits[0]
  const autoFill = () => {
    if (lastVisit) {
      setSoap({
        subjective: lastVisit.subjective || '',
        objective: lastVisit.objective || '',
        assessment: lastVisit.assessment || '',
        plan: lastVisit.plan || ''
      })
    }
  }

  const handleSaveVisit = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      await createVisit({
        patient_id: id,
        doctor_id: user?.id,
        visit_date: new Date().toISOString(),
        subjective: soap.subjective,
        objective: soap.objective,
        assessment: soap.assessment,
        plan: soap.plan,
        status: 'completed'
      })
      setSoap({ subjective: '', objective: '', assessment: '', plan: '' })
      fetchVisits(id)
    } catch (err) {
      alert('Gagal menyimpan: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      await deleteVisit(deleteConfirm.id)
      setDeleteConfirm(null)
      fetchVisits(id)
    } catch (err) {
      alert('Gagal hapus: ' + err.message)
    }
  }

  if (loading) {
    return (
      <div className="p-8 md:p-12 flex items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-0">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-5 md:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <Link to="/patients" className="text-slate-400 hover:text-sky-600 transition-colors">Daftar Pasien</Link>
          <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="font-medium text-slate-600">{currentPatient?.name || '-'}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span>RM:</span>
          <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-xs text-slate-600">{currentPatient?.medical_record_number || '-'}</span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* Left Panel - Patient Info */}
        <div className="lg:w-80 bg-slate-50/50 border-r border-slate-200 p-5 lg:p-6">
          <div className="space-y-5">
            {/* Patient Card */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-16 h-16 bg-gradient-to-br from-sky-400 to-cyan-500 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-sky-500/30">
                  {currentPatient?.name?.[0]?.toUpperCase() || 'P'}
                </div>
                <div>
                  <h2 className="font-bold text-slate-800 text-lg">{currentPatient?.name}</h2>
                  <p className="text-sm text-slate-500">
                    {currentPatient?.gender === 'L' ? 'Laki-laki' : 'Perempuan'} • {currentPatient?.age || '-'} tahun
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2.5 border-t border-slate-100">
                  <span className="text-slate-400">Tanggal Lahir</span>
                  <span className="text-slate-700 font-medium">
                    {currentPatient?.birth_date ? new Date(currentPatient.birth_date).toLocaleDateString('id-ID') : '-'}
                  </span>
                </div>
                <div className="flex justify-between py-2.5 border-t border-slate-100">
                  <span className="text-slate-400">No. HP</span>
                  <span className="text-slate-700">{currentPatient?.phone || '-'}</span>
                </div>
                {currentPatient?.blood_type && (
                  <div className="flex justify-between py-2.5 border-t border-slate-100">
                    <span className="text-slate-400">Gol. Darah</span>
                    <span className="font-bold text-red-600 bg-red-50 px-2.5 py-0.5 rounded-full text-xs">{currentPatient.blood_type}</span>
                  </div>
                )}
                {currentPatient?.allergies && (
                  <div className="mt-4 p-3.5 bg-red-50 border border-red-100 rounded-xl">
                    <span className="text-xs text-red-600 font-medium flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Alergi: {currentPatient.allergies}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Address */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Alamat</p>
              <p className="text-slate-700 text-sm leading-relaxed">{currentPatient?.address || '-'}</p>
            </div>

            {/* Last Visit */}
            {lastVisit && (
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Kunjungan Terakhir</span>
                  <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    {new Date(lastVisit.visit_date).toLocaleDateString('id-ID')}
                  </span>
                </div>
                {lastVisit.assessment && (
                  <p className="text-sm font-semibold text-slate-700">{lastVisit.assessment}</p>
                )}
                {lastVisit.plan && (
                  <p className="text-xs text-slate-400 mt-2 line-clamp-2">{lastVisit.plan}</p>
                )}
                <button
                  onClick={autoFill}
                  className="mt-3 text-xs text-sky-600 hover:text-sky-700 font-medium flex items-center gap-1.5 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Isi dari kunjungan terakhir
                </button>
              </div>
            )}

            {/* Visit Count */}
            <div className="bg-gradient-to-br from-sky-500/10 to-cyan-500/5 border border-sky-200/50 rounded-2xl p-5 text-center">
              <span className="text-4xl font-bold text-slate-800">{visits.length}</span>
              <p className="text-sm text-slate-500 mt-1 font-medium">Total Kunjungan</p>
            </div>
          </div>
        </div>

        {/* Right Panel - SOAP Form */}
        <div className="flex-1 p-6 md:p-8 lg:p-10 bg-white">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-3">
              <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              Catatan Kunjungan
            </h2>

            <form onSubmit={handleSaveVisit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    <span className="text-sky-600 font-bold">S</span>ubjective — Keluhan
                  </label>
                  <textarea
                    value={soap.subjective}
                    onChange={(e) => setSoap({ ...soap, subjective: e.target.value })}
                    placeholder="Keluhan utama pasien, riwayat penyakit..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10 outline-none transition-all min-h-[120px] text-sm bg-slate-50/50 text-slate-700 placeholder-slate-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    <span className="text-emerald-600 font-bold">O</span>bjective — Pemeriksaan
                  </label>
                  <textarea
                    value={soap.objective}
                    onChange={(e) => setSoap({ ...soap, objective: e.target.value })}
                    placeholder="Vital signs, pemeriksaan fisik..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all min-h-[120px] text-sm bg-slate-50/50 text-slate-700 placeholder-slate-400"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    <span className="text-amber-600 font-bold">A</span>ssessment — Diagnosis
                  </label>
                  <textarea
                    value={soap.assessment}
                    onChange={(e) => setSoap({ ...soap, assessment: e.target.value })}
                    placeholder="Diagnosis kerja / diagnosis banding..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 outline-none transition-all min-h-[120px] text-sm font-medium bg-slate-50/50 text-slate-700 placeholder-slate-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    <span className="text-purple-600 font-bold">P</span>lan — Rencana
                  </label>
                  <textarea
                    value={soap.plan}
                    onChange={(e) => setSoap({ ...soap, plan: e.target.value })}
                    placeholder="Terapi, obat, follow up..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 outline-none transition-all min-h-[120px] text-sm bg-slate-50/50 text-slate-700 placeholder-slate-400"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  type="submit"
                  loading={saving}
                  className="flex-1 py-3 text-sm font-semibold"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Simpan Kunjungan
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setSoap({ subjective: '', objective: '', assessment: '', plan: '' })}
                >
                  Clear
                </Button>
              </div>
            </form>

            {/* Visit History */}
            <div className="mt-10 pt-6 border-t border-slate-200">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-sky-600 transition-colors"
              >
                <svg
                  className={`w-5 h-5 transition-transform ${showHistory ? 'rotate-90' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Riwayat Kunjungan ({visits.length})
              </button>

              {showHistory && (
                <div className="mt-5 space-y-3">
                  {visits.map((visit, idx) => (
                    <div key={visit.id} className="p-5 bg-slate-50/80 border border-slate-200/80 rounded-xl">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold text-slate-700">
                          #{visits.length - idx} — {new Date(visit.visit_date).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        <button
                          onClick={() => setDeleteConfirm(visit)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {visit.subjective && (
                          <div>
                            <span className="text-xs text-sky-600 font-semibold">S:</span>
                            <p className="text-slate-600 mt-1 line-clamp-2">{visit.subjective}</p>
                          </div>
                        )}
                        {visit.objective && (
                          <div>
                            <span className="text-xs text-emerald-600 font-semibold">O:</span>
                            <p className="text-slate-600 mt-1 line-clamp-2">{visit.objective}</p>
                          </div>
                        )}
                        {visit.assessment && (
                          <div>
                            <span className="text-xs text-amber-600 font-semibold">A:</span>
                            <p className="text-slate-800 font-medium mt-1">{visit.assessment}</p>
                          </div>
                        )}
                        {visit.plan && (
                          <div>
                            <span className="text-xs text-purple-600 font-semibold">P:</span>
                            <p className="text-slate-600 mt-1 line-clamp-2">{visit.plan}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Hapus Kunjungan"
        message={`Hapus kunjungan pada ${deleteConfirm ? new Date(deleteConfirm.visit_date).toLocaleDateString('id-ID') : ''}?`}
      />
    </div>
  )
}
