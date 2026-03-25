import { useEffect, useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { Modal, ConfirmDialog } from '../components/Modal'
import * as db from '../lib/db'

export const AdminClinics = () => {
  const { role } = useAuthStore()
  const [clinics, setClinics] = useState([])
  const [loading, setLoading] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [editClinic, setEditClinic] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [form, setForm] = useState({ name: '', slug: '', address: '', phone: '' })

  useEffect(() => {
    loadClinics()
  }, [])

  const loadClinics = async () => {
    const data = await db.getOrganizations()
    setClinics(data)
  }

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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (editClinic) {
        await db.updateOrganization(editClinic.id, form)
      } else {
        await db.addOrganization(form)
      }

      await loadClinics()
      setShowAdd(false)
      setEditClinic(null)
      setForm({ name: '', slug: '', address: '', phone: '' })
    } catch (err) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    try {
      await db.deleteOrganization(deleteConfirm.id)
      await loadClinics()
      setDeleteConfirm(null)
    } catch (err) {
      alert(err.message)
    }
  }

  const handleEdit = (clinic) => {
    setEditClinic(clinic)
    setForm({ name: clinic.name, slug: clinic.slug, address: clinic.address || '', phone: clinic.phone || '' })
    setShowAdd(true)
  }

  const toggleActive = async (clinic) => {
    try {
      await db.updateOrganization(clinic.id, { is_active: !clinic.is_active })
      await loadClinics()
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div className="p-0">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-5 md:px-8 py-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              Kelola Klinik
            </h1>
            <p className="text-sm text-slate-500 mt-1">{clinics.length} klinik terdaftar</p>
          </div>
          <Button onClick={() => { setShowAdd(true); setEditClinic(null); setForm({ name: '', slug: '', address: '', phone: '' }) }} className="w-full sm:w-auto text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Tambah Klinik
          </Button>
        </div>
      </div>

      {/* Clinic List */}
      <div className="p-5 md:p-8">
        <div className="space-y-3">
          {clinics.map(clinic => (
            <div
              key={clinic.id}
              className={`bg-white border rounded-xl p-5 transition-all hover:shadow-md ${
                clinic.is_active ? 'border-slate-200/80 hover:border-slate-300' : 'border-red-200 bg-red-50/50'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-xl flex items-center justify-center text-white text-lg shadow-lg shadow-teal-500/20 flex-shrink-0">
                    🏥
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">{clinic.name}</h3>
                    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium mt-1.5 ${
                      clinic.is_active ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${clinic.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      {clinic.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                    <p className="text-sm text-slate-500 mt-2">{clinic.address || '-'}</p>
                    <p className="text-sm text-slate-400 mt-1">{clinic.phone || '-'}</p>
                    <p className="text-xs text-slate-400 mt-2 font-mono bg-slate-100 px-2 py-0.5 rounded inline-block">{clinic.slug}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => toggleActive(clinic)}
                    className={`p-2.5 rounded-xl transition-all ${
                      clinic.is_active
                        ? 'bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-100'
                        : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100'
                    }`}
                    title={clinic.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                  >
                    {clinic.is_active ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={() => handleEdit(clinic)}
                    className="p-2.5 rounded-xl bg-sky-50 text-sky-600 hover:bg-sky-100 border border-sky-100 transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(clinic)}
                    className="p-2.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={showAdd} onClose={() => { setShowAdd(false); setEditClinic(null) }} title={editClinic ? 'Edit Klinik' : 'Tambah Klinik'}>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <Input
              label="Nama Klinik"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Klinik XYZ"
              required
            />
            <Input
              label="Slug (URL)"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
              placeholder="klinik-xyz"
              required
            />
            <Input
              label="Alamat"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Jl. ABC No. 123"
            />
            <Input
              label="Telepon"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="021-1234567"
            />
          </div>
          <div className="flex gap-3 mt-6">
            <Button type="button" variant="secondary" onClick={() => { setShowAdd(false); setEditClinic(null) }} className="flex-1">
              Batal
            </Button>
            <Button type="submit" loading={loading} className="flex-1">
              {editClinic ? 'Simpan' : 'Tambah'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Hapus Klinik"
        message={`Yakin ingin menghapus "${deleteConfirm?.name}"? Data pasien di klinik ini mungkin akan terpengaruh.`}
      />
    </div>
  )
}
