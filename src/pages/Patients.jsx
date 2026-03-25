import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { Button } from '../components/Button'
import { Input, Select } from '../components/Input'
import { Modal, ConfirmDialog } from '../components/Modal'
import { usePatientStore } from '../stores/patientStore'

const calculateAge = (birthDate) => {
  if (!birthDate) return ''
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age >= 0 ? age : ''
}

export const Patients = () => {
  const { role, getOrganizations } = useAuthStore()
  const { patients, fetchPatients, loading, updatePatient, deletePatient, createVisit } = usePatientStore()
  const [search, setSearch] = useState('')
  const [editPatient, setEditPatient] = useState(null)
  const [quickVisit, setQuickVisit] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({})
  const [quickSoip, setQuickSoip] = useState({ subjective: '', objective: '', assessment: '', plan: '' })
  const [clinics, setClinics] = useState([])

  const loadClinics = async () => {
    if (role === 'super_admin') {
      const orgs = await getOrganizations()
      setClinics(orgs || [])
    }
  }

  useEffect(() => {
    fetchPatients()
    loadClinics()
  }, [])

  const filteredPatients = patients.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.medical_record_number?.toLowerCase().includes(search.toLowerCase())
  )

  const handleEdit = (patient) => {
    setForm({ ...patient })
    setEditPatient(patient)
  }

  const handleChange = (field, value) => {
    if (field === 'birth_date') {
      const age = calculateAge(value)
      setForm(prev => ({ ...prev, birth_date: value, age: age }))
    } else {
      setForm(prev => ({ ...prev, [field]: value }))
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await updatePatient(editPatient.id, form)
      setEditPatient(null)
      await fetchPatients()
    } catch (err) {
      alert('Gagal update: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      await deletePatient(deleteConfirm.id)
      setDeleteConfirm(null)
      await fetchPatients()
    } catch (err) {
      alert('Gagal hapus: ' + err.message)
    }
  }

  const handleQuickVisit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await createVisit({
        patient_id: quickVisit.id,
        doctor_id: 'demo-user',
        visit_date: new Date().toISOString(),
        subjective: quickSoip.subjective,
        objective: quickSoip.objective,
        assessment: quickSoip.assessment,
        plan: quickSoip.plan,
        status: 'completed'
      })
      setQuickVisit(null)
      setQuickSoip({ subjective: '', objective: '', assessment: '', plan: '' })
    } catch (err) {
      alert('Gagal: ' + err.message)
    } finally {
      setSaving(false)
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
              Daftar Pasien
            </h1>
            <p className="text-sm text-slate-500 mt-1">{patients.length} pasien terdaftar</p>
          </div>
          <div className="flex gap-3">
            <Link to="/pendaftaran" className="hidden sm:block">
              <Button variant="secondary" className="text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Link Daftar
              </Button>
            </Link>
            <Link to="/patients/new">
              <Button className="text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Pasien Baru
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-5 md:px-8 py-4 bg-slate-50/50 border-b border-slate-200">
        <div className="relative max-w-md">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Cari nama atau No. RM..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10 outline-none transition-all text-sm"
          />
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
        ) : filteredPatients.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-slate-500 font-medium">Tidak ada pasien ditemukan</p>
            <Link to="/patients/new" className="mt-4 inline-block">
              <Button className="text-sm">+ Tambah Pasien Baru</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPatients.map(patient => (
              <div
                key={patient.id}
                className="bg-white border border-slate-200/80 rounded-xl p-4 md:p-5 hover:shadow-md hover:border-slate-300 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Patient Info */}
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 bg-gradient-to-br from-sky-400 to-cyan-500 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-lg shadow-sky-500/20 flex-shrink-0">
                      {patient.name[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-800">{patient.name}</h3>
                        {patient.allergies && (
                          <span className="text-xs bg-red-50 text-red-600 px-2.5 py-1 rounded-full font-medium border border-red-100 flex-shrink-0">
                            ⚠️ Alergi
                          </span>
                        )}
                        {role === 'super_admin' && (
                          <span className="text-xs bg-purple-50 text-purple-600 px-2.5 py-1 rounded-full font-medium border border-purple-100 flex-shrink-0 hidden md:inline">
                            {clinics.find(c => c.id === patient.organization_id)?.name?.slice(0, 10) || '...'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-xs">{patient.medical_record_number || '-'}</span>
                        <span className="text-slate-300">•</span>
                        <span>{patient.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</span>
                        <span className="text-slate-300">•</span>
                        <span>{patient.age || '-'} th</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      onClick={() => setQuickVisit(patient)}
                      className="text-xs"
                    >
                      + Kunjungan
                    </Button>
                    <Link to={`/patients/${patient.id}`}>
                      <Button variant="secondary" size="sm" className="text-xs px-3">
                        Buka
                      </Button>
                    </Link>
                    <button
                      onClick={() => handleEdit(patient)}
                      className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(patient)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Hapus"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                {patient.address && (
                  <p className="mt-3 text-sm text-slate-400 truncate">{patient.address}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <Modal isOpen={!!editPatient} onClose={() => setEditPatient(null)} title="Edit Pasien" size="md">
        <form onSubmit={handleSave} className="space-y-5">
          <Input
            label="Nama Lengkap"
            value={form.name || ''}
            onChange={(e) => handleChange('name', e.target.value)}
            required
          />
          <div className="grid grid-cols-2 gap-5">
            <Select
              label="Jenis Kelamin"
              value={form.gender || 'L'}
              onChange={(e) => handleChange('gender', e.target.value)}
              options={[
                { value: 'L', label: 'Laki-laki' },
                { value: 'P', label: 'Perempuan' }
              ]}
            />
            <Input
              label="Tanggal Lahir"
              type="date"
              value={form.birth_date || ''}
              onChange={(e) => handleChange('birth_date', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-5">
            <Input
              label="Umur"
              type="number"
              value={form.age || ''}
              readOnly
              className="bg-slate-50"
            />
            <Input
              label="Alamat"
              value={form.address || ''}
              onChange={(e) => handleChange('address', e.target.value)}
            />
          </div>
          <Input
            label="No. HP"
            value={form.phone || ''}
            onChange={(e) => handleChange('phone', e.target.value)}
          />
          <div className="flex gap-3 justify-end pt-5 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setEditPatient(null)}>Batal</Button>
            <Button type="submit" loading={saving}>Simpan</Button>
          </div>
        </form>
      </Modal>

      {/* Quick Visit Modal */}
      <Modal isOpen={!!quickVisit} onClose={() => setQuickVisit(null)} title={`Kunjungan Cepat: ${quickVisit?.name}`} size="lg">
        <form onSubmit={handleQuickVisit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Input
              label="S - Keluhan"
              value={quickSoip.subjective}
              onChange={(e) => setQuickSoip({ ...quickSoip, subjective: e.target.value })}
              placeholder="Keluhan utama..."
              required
            />
            <Input
              label="O - Pemeriksaan"
              value={quickSoip.objective}
              onChange={(e) => setQuickSoip({ ...quickSoip, objective: e.target.value })}
              placeholder="Vital signs, fisik..."
              required
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Input
              label="A - Diagnosis"
              value={quickSoip.assessment}
              onChange={(e) => setQuickSoip({ ...quickSoip, assessment: e.target.value })}
              placeholder="Diagnosis kerja..."
              required
            />
            <Input
              label="P - Rencana"
              value={quickSoip.plan}
              onChange={(e) => setQuickSoip({ ...quickSoip, plan: e.target.value })}
              placeholder="Terapi, follow up..."
              required
            />
          </div>
          <div className="flex gap-3 justify-end pt-5 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setQuickVisit(null)}>Batal</Button>
            <Button type="submit" loading={saving}>💾 Simpan</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Hapus Pasien"
        message={`Hapus "${deleteConfirm?.name}"? Semua kunjungan juga dihapus.`}
      />
    </div>
  )
}
