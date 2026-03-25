import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/Button'
import { Input, Select } from '../components/Input'
import { KTPScanner } from '../components/KTPScanner'
import * as db from '../lib/db'

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

export const PatientRegister = () => {
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [showScanner, setShowScanner] = useState(false)
  const [scannedData, setScannedData] = useState(null)
  const [form, setForm] = useState({
    name: '',
    gender: 'L',
    birth_date: '',
    age: '',
    phone: '',
    address: '',
    allergies: '',
    blood_type: '',
    medical_record_number: ''
  })

  const handleChange = (field, value) => {
    if (field === 'birth_date') {
      const age = calculateAge(value)
      setForm(prev => ({ ...prev, birth_date: value, age: age }))
    } else {
      setForm(prev => ({ ...prev, [field]: value }))
    }
  }

  const handleScanComplete = (data) => {
    console.log('Scanned KTP data:', data)
    setScannedData(data)

    let calculatedAge = ''
    if (data.birthDate) {
      calculatedAge = calculateAge(data.birthDate)
    }

    setForm(prev => ({
      ...prev,
      name: data.name || prev.name,
      gender: data.gender || prev.gender,
      birth_date: data.birthDate || prev.birth_date,
      age: calculatedAge || prev.age,
      address: data.address || prev.address,
      medical_record_number: data.nik || prev.medical_record_number
    }))

    setShowScanner(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      let mrNumber = form.medical_record_number
      if (!mrNumber) {
        const year = new Date().getFullYear()
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
        mrNumber = `MR/${year}/${random}`
      }

      const params = new URLSearchParams(window.location.search)
      const orgId = params.get('org') || 'org-001'

      const patientData = {
        name: form.name,
        gender: form.gender,
        birth_date: form.birth_date || null,
        age: form.age ? parseInt(form.age) : null,
        phone: form.phone || null,
        address: form.address || null,
        allergies: form.allergies || null,
        blood_type: form.blood_type || null,
        medical_record_number: mrNumber,
        organization_id: orgId
      }

      console.log('Saving patient data:', patientData)

      const result = await db.addPatient(patientData)
      console.log('Patient saved:', result)

      setSuccess(true)
    } catch (err) {
      console.error('Error saving patient:', err)
      setError('Gagal menyimpan: ' + (err.message || JSON.stringify(err)))
    } finally {
      setSaving(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/50 p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-emerald-500/25">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Pendaftaran Berhasil!</h2>
          <p className="text-slate-500 mb-8">Data pasien telah disimpan. Silakan datang ke loket untuk mendapatkan kartu berobat.</p>
          <Button onClick={() => {
            setSuccess(false)
            setScannedData(null)
            setForm({
              name: '',
              gender: 'L',
              birth_date: '',
              age: '',
              phone: '',
              address: '',
              allergies: '',
              blood_type: '',
              medical_record_number: ''
            })
          }} className="w-full py-3">
            Daftar Lagi
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 py-10 px-4">
        <div className="max-w-lg mx-auto text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-sky-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-sky-500/25">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Pendaftaran Pasien Baru</h1>
          <p className="text-slate-500 text-sm mt-2">Klinik Oz - Rekam Medis Elektronik</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-6">
        {/* Scan KTP Button */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => setShowScanner(true)}
            className="w-full flex items-center justify-center gap-4 py-5 px-6 bg-gradient-to-r from-sky-50 to-cyan-50 border-2 border-dashed border-sky-200 rounded-2xl text-sky-700 hover:from-sky-100 hover:to-cyan-100 hover:border-sky-300 transition-all group"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-sky-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-sky-500/25 group-hover:shadow-sky-500/40 group-hover:scale-105 transition-all">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="text-left">
              <div className="text-base font-semibold">Scan KTP untuk Isi Otomatis</div>
              <div className="text-sm text-sky-600/70">Foto KTP, data langsung terisi</div>
            </div>
          </button>
          {scannedData && (
            <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Data KTP berhasil dibaca. Periksa dan lengkapi data di bawah.</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 md:p-8 space-y-5">
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <Input
            label="Nama Lengkap"
            value={form.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Masukkan nama lengkap"
            required
          />

          <div className="grid grid-cols-2 gap-5">
            <Select
              label="Jenis Kelamin"
              value={form.gender}
              onChange={(e) => handleChange('gender', e.target.value)}
              options={[
                { value: 'L', label: 'Laki-laki' },
                { value: 'P', label: 'Perempuan' }
              ]}
            />
            <Input
              label="Tanggal Lahir"
              type="date"
              value={form.birth_date}
              onChange={(e) => handleChange('birth_date', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-5">
            <Input
              label="Umur"
              type="number"
              value={form.age}
              onChange={(e) => handleChange('age', e.target.value)}
              placeholder="Tahun"
            />
            <Select
              label="Golongan Darah"
              value={form.blood_type}
              onChange={(e) => handleChange('blood_type', e.target.value)}
              options={[
                { value: '', label: '-' },
                { value: 'A', label: 'A' },
                { value: 'B', label: 'B' },
                { value: 'AB', label: 'AB' },
                { value: 'O', label: 'O' }
              ]}
            />
          </div>

          <Input
            label="Nomor HP"
            type="tel"
            value={form.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder="08xxxxxxxxxx"
            required
          />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Alamat</label>
            <textarea
              value={form.address}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="Alamat lengkap..."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10 outline-none transition-all resize-none bg-slate-50/50 text-slate-800 placeholder-slate-400 text-sm"
              rows={3}
            />
          </div>

          <Input
            label="Alergi Obat"
            value={form.allergies}
            onChange={(e) => handleChange('allergies', e.target.value)}
            placeholder="Kosongkan jika tidak ada"
          />

          <Input
            label="No. RM (NIK dari KTP)"
            value={form.medical_record_number}
            onChange={(e) => handleChange('medical_record_number', e.target.value)}
            placeholder="Otomatis dari KTP atau manual"
          />

          <Button
            type="submit"
            loading={saving}
            className="w-full py-3 mt-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Daftar Sekarang
          </Button>

          <p className="text-center text-xs text-slate-400">
            Setelah mendaftar, silakan datang ke loket untuk verifikasi & cetak kartu berobat
          </p>
        </form>
      </div>

      {/* KTP Scanner Modal */}
      {showScanner && (
        <KTPScanner
          onScanComplete={handleScanComplete}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  )
}
