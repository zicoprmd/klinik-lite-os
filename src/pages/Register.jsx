import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { Button } from '../components/Button'
import { Input } from '../components/Input'

export const Register = () => {
  const navigate = useNavigate()
  const { register, loading, error } = useAuthStore()
  const [orgForm, setOrgForm] = useState({
    name: '',
    slug: '',
    address: '',
    phone: ''
  })
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [step, setStep] = useState(1)
  const [localError, setLocalError] = useState('')

  const handleSlugChange = (value) => {
    const slug = value.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20)
    setOrgForm({ ...orgForm, name: value, slug })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLocalError('')

    if (step === 1) {
      if (!orgForm.name || !orgForm.slug) {
        setLocalError('Nama klinik dan subdomain wajib diisi')
        return
      }
      setStep(2)
      return
    }

    if (!userForm.name || !userForm.email || !userForm.password) {
      setLocalError('Semua field wajib diisi')
      return
    }

    if (userForm.password !== userForm.confirmPassword) {
      setLocalError('Password tidak cocok')
      return
    }

    if (userForm.password.length < 6) {
      setLocalError('Password minimal 6 karakter')
      return
    }

    try {
      await register(orgForm, userForm)
      navigate('/dashboard')
    } catch (err) {
      setLocalError(err.message)
    }
  }

  const displayError = localError || error

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-sky-500 to-cyan-500 rounded-2xl mb-4 shadow-lg shadow-sky-500/25">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Klinik Oz</h1>
          <p className="text-slate-500 text-sm mt-1">Buat akun klinik baru</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/50 p-8">
          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-6 mb-8">
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-sky-600' : 'text-slate-400'}`}>
              <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-semibold transition-all ${
                step >= 1 ? 'bg-gradient-to-br from-sky-500 to-sky-600 text-white shadow-lg shadow-sky-500/25' : 'bg-slate-100 text-slate-400'
              }`}>1</span>
              <span className="text-sm font-medium">Klinik</span>
            </div>
            <div className="w-10 h-0.5 bg-slate-200" />
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-sky-600' : 'text-slate-400'}`}>
              <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-semibold transition-all ${
                step >= 2 ? 'bg-gradient-to-br from-sky-500 to-sky-600 text-white shadow-lg shadow-sky-500/25' : 'bg-slate-100 text-slate-400'
              }`}>2</span>
              <span className="text-sm font-medium">Admin</span>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {displayError && (
              <div className="mb-5 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-center gap-3">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{displayError}</span>
              </div>
            )}

            {step === 1 ? (
              <div className="space-y-5">
                <Input
                  label="Nama Klinik"
                  value={orgForm.name}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="Klinik Sehat Bersama"
                  required
                />
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Subdomain
                  </label>
                  <div className="flex items-center">
                    <span className="px-4 py-2.5 bg-slate-100 border border-r-0 border-slate-200 rounded-l-xl text-slate-500 text-sm">
                      kliniksa.env/
                    </span>
                    <input
                      type="text"
                      value={orgForm.slug}
                      onChange={(e) => setOrgForm({ ...orgForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') })}
                      className="flex-1 px-4 py-2.5 border border-slate-200 rounded-r-xl focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10 outline-none bg-slate-50/50 text-slate-800 placeholder-slate-400 text-sm"
                      placeholder="namaklinik"
                      required
                    />
                  </div>
                </div>
                <Input
                  label="Alamat"
                  value={orgForm.address}
                  onChange={(e) => setOrgForm({ ...orgForm, address: e.target.value })}
                  placeholder="Jl. ..."
                />
                <Input
                  label="No. HP"
                  type="tel"
                  value={orgForm.phone}
                  onChange={(e) => setOrgForm({ ...orgForm, phone: e.target.value })}
                  placeholder="08xxxxxxxxxx"
                />
              </div>
            ) : (
              <div className="space-y-5">
                <Input
                  label="Nama Lengkap"
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  placeholder="Nama lengkap Anda"
                  required
                />
                <Input
                  label="Email"
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  placeholder="email@klinik.com"
                  required
                />
                <Input
                  label="Password"
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  placeholder="Minimal 6 karakter"
                  required
                />
                <Input
                  label="Konfirmasi Password"
                  type="password"
                  value={userForm.confirmPassword}
                  onChange={(e) => setUserForm({ ...userForm, confirmPassword: e.target.value })}
                  placeholder="Ulangi password"
                  required
                />
              </div>
            )}

            <div className="flex gap-3 mt-8">
              {step === 2 && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setStep(1)}
                  className="flex-1"
                >
                  Kembali
                </Button>
              )}
              <Button
                type="submit"
                loading={loading}
                className="flex-1"
              >
                {step === 1 ? 'Lanjut' : 'Buat Akun'}
              </Button>
            </div>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-slate-500 text-sm">
              Sudah punya akun?{' '}
              <Link to="/login" className="text-sky-600 hover:text-sky-700 font-medium">
                Login
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-slate-400 text-sm mt-6">
          Gratis untuk mencoba • Tanpa kartu kredit
        </p>
      </div>
    </div>
  )
}
