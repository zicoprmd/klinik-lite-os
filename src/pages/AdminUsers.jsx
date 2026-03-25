import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { Button } from '../components/Button'
import { Input, Select } from '../components/Input'
import { Modal, ConfirmDialog } from '../components/Modal'

export const AdminUsers = () => {
  const { user, role, organization, getUsers, addUser, deleteUser, getOrganizations } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'dokter', organization_id: '' })
  const [users, setUsers] = useState([])
  const [clinics, setClinics] = useState([])

  useEffect(() => {
    const loadData = async () => {
      try {
        const allUsers = await getUsers()
        setUsers(allUsers || [])

        if (role === 'super_admin') {
          const orgs = await getOrganizations()
          setClinics(orgs || [])
          if (orgs?.length > 0 && !form.organization_id) {
            setForm(f => ({ ...f, organization_id: orgs[0].id }))
          }
        }
      } catch (e) {
        console.error(e)
      }
    }
    loadData()
  }, [organization, role])

  if (role !== 'admin' && role !== 'super_admin') {
    return (
      <div className="p-8 md:p-12 flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Akses Ditolak</h2>
          <p className="text-slate-500">Halaman ini hanya untuk admin</p>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await addUser(form)
      setShowAdd(false)
      setForm({ name: '', email: '', password: '', role: 'dokter' })
    } catch (err) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    try {
      await deleteUser(deleteConfirm.id)
      setDeleteConfirm(null)
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
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              Kelola Pengguna
            </h1>
            <p className="text-sm text-slate-500 mt-1">{users.length} akun terdaftar</p>
          </div>
          <Button onClick={() => setShowAdd(true)} className="w-full sm:w-auto text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Tambah Pengguna
          </Button>
        </div>
      </div>

      {/* User List */}
      <div className="p-5 md:p-8">
        <div className="space-y-3">
          {users.map(u => (
            <div
              key={u.id}
              className={`bg-white border rounded-xl p-5 transition-all hover:shadow-md ${
                u.id === user?.id ? 'border-sky-200 bg-sky-50/30' : 'border-slate-200/80 hover:border-slate-300'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg flex-shrink-0 ${
                    u.role === 'admin' ? 'bg-gradient-to-br from-violet-500 to-purple-500' : 'bg-gradient-to-br from-sky-500 to-cyan-500'
                  }`}>
                    {u.name[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-800">{u.name}</h3>
                      {u.id === user?.id && (
                        <span className="text-xs bg-sky-100 text-sky-600 px-2.5 py-1 rounded-full font-medium border border-sky-200">Anda</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">{u.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
                    u.role === 'admin'
                      ? 'bg-violet-50 text-violet-600 border border-violet-100'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}>
                    {u.role === 'admin' ? '👑 Admin' : '👨‍⚕️ Dokter'}
                  </span>

                  {u.id !== user?.id && (
                    <button
                      onClick={() => setDeleteConfirm(u)}
                      className="p-2.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 transition-all"
                      title="Hapus"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add User Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Tambah Pengguna Baru" size="md">
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Nama Lengkap"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Nama lengkap pengguna"
            required
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="email@klinik.com"
            required
          />
          <Input
            label="Password"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="Minimal 6 karakter"
            minLength={6}
            required
          />
          {role === 'super_admin' && (
            <Select
              label="Klinik"
              value={form.organization_id}
              onChange={(e) => setForm({ ...form, organization_id: e.target.value })}
              options={clinics.map(c => ({ value: c.id, label: c.name }))}
            />
          )}
          <Select
            label="Role"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            options={[
              { value: 'dokter', label: 'Dokter' },
              { value: 'admin', label: 'Admin' }
            ]}
          />
          <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setShowAdd(false)}>Batal</Button>
            <Button type="submit" loading={loading}>Simpan</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Hapus Pengguna"
        message={`Hapus akun "${deleteConfirm?.name}"?`}
      />
    </div>
  )
}
