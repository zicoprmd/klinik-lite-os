import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '../stores/authStore'
import { Button } from '../components/Button'
import { Input, Select } from '../components/Input'
import { Modal, ConfirmDialog } from '../components/Modal'
import * as db from '../lib/db'

const calculateAge = (birthDate) => {
  if (!birthDate) return '-'
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age >= 0 ? age : '-'
}

export const AdminPatients = () => {
  const { role, getOrganizations } = useAuthStore()
  const [patients, setPatients] = useState([])
  const [clinics, setClinics] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [filterClinic, setFilterClinic] = useState('')
  const [editPatient, setEditPatient] = useState(null)
  const [transferPatient, setTransferPatient] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({})
  const [transferForm, setTransferForm] = useState({ organization_id: '' })

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPatients, setTotalPatients] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const PAGE_SIZE = 25

  if (role !== 'super_admin') {
    return (
      <div className="p-8 md:p-12 flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Akses Ditolak</h2>
          <p className="text-slate-500">Halaman ini hanya untuk Super Admin</p>
        </div>
      </div>
    )
  }

  const loadClinics = useCallback(async () => {
    try {
      const orgs = await getOrganizations()
      setClinics(orgs || [])
    } catch (err) {
      console.error('Error loading clinics:', err)
    }
  }, [getOrganizations])

  const loadPatients = useCallback(async (page = 1, searchQuery = '', clinicId = '') => {
    setLoading(true)
    try {
      const result = await db.getPatients(clinicId || null, {
        page,
        pageSize: PAGE_SIZE,
        search: searchQuery,
        searchPhone: true
      })

      setPatients(result.data || [])
      setTotalPatients(result.totalCount)
      setTotalPages(result.totalPages)
      setCurrentPage(result.currentPage)
    } catch (err) {
      console.error('Error loading patients:', err)
      setPatients([])
      setTotalPatients(0)
      setTotalPages(0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadClinics()
  }, [loadClinics])

  useEffect(() => {
    loadPatients(1, '', filterClinic)
  }, [filterClinic, loadPatients])

  const handleSearchChange = (e) => {
    const value = e.target.value
    setSearch(value)
    loadPatients(1, value, filterClinic)
  }

  const handleClinicChange = (e) => {
    const value = e.target.value
    setFilterClinic(value)
    loadPatients(1, search, value)
  }

  const handlePageChange = (page) => {
    loadPatients(page, search, filterClinic)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const getClinicName = (orgId) => {
    const clinic = clinics.find(c => c.id === orgId)
    return clinic ? clinic.name : '-'
  }

  const handleEdit = (patient) => {
    setForm({ ...patient })
    setEditPatient(patient)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await db.updatePatient(editPatient.id, form)
      await loadPatients(currentPage, search, filterClinic)
      setEditPatient(null)
    } catch (err) {
      alert('Gagal update: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleTransfer = (patient) => {
    setTransferPatient(patient)
    setTransferForm({ organization_id: patient.organization_id || '' })
  }

  const handleTransferSave = async (e) => {
    e.preventDefault()
    if (!transferForm.organization_id) {
      alert('Pilih klinik tujuan')
      return
    }
    if (transferForm.organization_id === transferPatient.organization_id) {
      alert('Pasien sudah di klinik ini')
      return
    }
    setSaving(true)
    try {
      await db.updatePatient(transferPatient.id, { organization_id: transferForm.organization_id })
      await loadPatients(currentPage, search, filterClinic)
      setTransferPatient(null)
    } catch (err) {
      alert('Gagal transfer: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      await db.deletePatient(deleteConfirm.id)
      await loadPatients(currentPage, search, filterClinic)
      setDeleteConfirm(null)
    } catch (err) {
      alert('Gagal hapus: ' + err.message)
    }
  }

  return (
    <div className="p-0">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-5 md:px-8 py-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-sky-500 to-cyan-500 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              Kelola Pasien
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {totalPatients} pasien terdaftar
              {filterClinic && ` di ${getClinicName(filterClinic)}`}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-5 md:px-8 py-4 bg-slate-50/50 border-b border-slate-200">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Cari nama, No. RM, atau HP..."
              value={search}
              onChange={handleSearchChange}
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10 outline-none transition-all text-sm"
            />
          </div>
          <div className="w-full sm:w-64">
            <select
              value={filterClinic}
              onChange={handleClinicChange}
              className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10 outline-none transition-all text-sm cursor-pointer"
            >
              <option value="">Semua Klinik</option>
              {clinics.map(clinic => (
                <option key={clinic.id} value={clinic.id}>{clinic.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Patient List */}
      <div className="p-5 md:p-8">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : patients.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-slate-500 font-medium">Tidak ada pasien ditemukan</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {patients.map(patient => (
                <div
                  key={patient.id}
                  className="bg-white border border-slate-200/80 rounded-xl p-4 md:p-5 hover:shadow-md hover:border-slate-300 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Patient Info */}
                    <div className="flex items-start gap-4 min-w-0">
                      <div className="w-12 h-12 bg-gradient-to-br from-sky-400 to-cyan-500 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-lg shadow-sky-500/20 flex-shrink-0">
                        {(patient.name || '?')[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="font-semibold text-slate-800">{patient.name}</h3>
                          {patient.allergies && (
                            <span className="text-xs bg-red-50 text-red-600 px-2.5 py-1 rounded-full font-medium border border-red-100 flex-shrink-0">
                              ⚠️ Alergi
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                          <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-xs">{patient.medical_record_number || '-'}</span>
                          <span className="text-slate-300">•</span>
                          <span>{patient.gender === 'L' ? 'Laki-laki' : patient.gender === 'P' ? 'Perempuan' : '-'}</span>
                          <span className="text-slate-300">•</span>
                          <span>{patient.age || calculateAge(patient.birth_date)} th</span>
                        </div>
                        <div className="mt-1.5">
                          <span className="text-xs bg-purple-50 text-purple-600 px-2.5 py-1 rounded-full font-medium border border-purple-100">
                            🏥 {getClinicName(patient.organization_id)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleTransfer(patient)}
                        className="text-xs"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        Transfer
                      </Button>
                      <button
                        onClick={() => handleEdit(patient)}
                        className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-colors"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(patient)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                        title="Hapus"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {(patient.address || patient.phone) && (
                    <p className="mt-3 text-sm text-slate-400 truncate">
                      {patient.address && `${patient.address}`}
                      {patient.address && patient.phone && ' • '}
                      {patient.phone && patient.phone}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 mt-4">
                <p className="text-sm text-slate-500">
                  Menampilkan {patients.length > 0 ? (currentPage - 1) * PAGE_SIZE + 1 : 0}-{Math.min(currentPage * PAGE_SIZE, totalPatients)} dari {totalPatients} pasien
                  {search && ` (filter: "${search}")`}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === pageNum
                            ? 'bg-sky-500 text-white'
                            : 'border border-slate-200 hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit Modal */}
      <Modal isOpen={!!editPatient} onClose={() => setEditPatient(null)} title="Edit Pasien" size="md">
        <form onSubmit={handleSave} className="space-y-5">
          <Input
            label="Nama Lengkap"
            value={form.name || ''}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-5">
            <Select
              label="Jenis Kelamin"
              value={form.gender || 'L'}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
              options={[
                { value: 'L', label: 'Laki-laki' },
                { value: 'P', label: 'Perempuan' }
              ]}
            />
            <Input
              label="Tanggal Lahir"
              type="date"
              value={form.birth_date || ''}
              onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
            />
          </div>
          <Input
            label="Alamat"
            value={form.address || ''}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          <Input
            label="No. HP"
            value={form.phone || ''}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-5">
            <Input
              label="Gol. Darah"
              value={form.blood_type || ''}
              onChange={(e) => setForm({ ...form, blood_type: e.target.value })}
              placeholder="A, B, AB, O"
            />
            <Input
              label="Alergi"
              value={form.allergies || ''}
              onChange={(e) => setForm({ ...form, allergies: e.target.value })}
              placeholder="Tidak ada"
            />
          </div>
          <div className="flex gap-3 justify-end pt-5 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setEditPatient(null)}>Batal</Button>
            <Button type="submit" loading={saving}>Simpan</Button>
          </div>
        </form>
      </Modal>

      {/* Transfer Modal */}
      <Modal isOpen={!!transferPatient} onClose={() => setTransferPatient(null)} title={`Transfer Pasien: ${transferPatient?.name}`} size="md">
        <form onSubmit={handleTransferSave} className="space-y-5">
          <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
            <p className="text-sm text-amber-700">
              <strong>Pasien:</strong> {transferPatient?.name}<br />
              <strong>Klinik Saat Ini:</strong> {getClinicName(transferPatient?.organization_id)}
            </p>
          </div>

          <Select
            label="Pindahkan ke Klinik"
            value={transferForm.organization_id}
            onChange={(e) => setTransferForm({ organization_id: e.target.value })}
            options={[
              { value: '', label: '-- Pilih Klinik Tujuan --' },
              ...clinics
                .filter(c => c.id !== transferPatient?.organization_id)
                .map(c => ({ value: c.id, label: c.name }))
            ]}
            required
          />

          <div className="bg-sky-50 p-4 rounded-xl border border-sky-100">
            <p className="text-sm text-sky-700 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Transfer akan memindahkan pasien beserta seluruh histori kunjungan ke klinik tujuan.
            </p>
          </div>

          <div className="flex gap-3 justify-end pt-5 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setTransferPatient(null)}>Batal</Button>
            <Button type="submit" loading={saving}>Transfer</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Hapus Pasien"
        message={`Hapus "${deleteConfirm?.name}"? Semua data dan kunjungan juga dihapus.`}
      />
    </div>
  )
}
