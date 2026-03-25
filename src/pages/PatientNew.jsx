import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { usePatientStore } from '../stores/patientStore'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { Input, Select } from '../components/Input'
import { KTPScanner } from '../components/KTPScanner'

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

export const PatientNew = () => {
  const navigate = useNavigate()
  const { createPatient } = usePatientStore()
  const [loading, setLoading] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [scannedData, setScannedData] = useState(null)
  const [form, setForm] = useState({
    name: '',
    gender: 'L',
    age: '',
    address: '',
    phone: '',
    medical_record_number: '',
    birth_date: '',
    blood_type: '',
    allergies: ''
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const mrNumber = form.medical_record_number || `RM-${Date.now()}`
      const patientData = { ...form, medical_record_number: mrNumber }

      const patient = await createPatient(patientData)
      navigate(`/patients/${patient.id}`)
    } catch (err) {
      alert('Gagal menyimpan: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

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

  return (
    <div className="p-6 md:p-8 lg:p-10 max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-6">
        <Link to="/patients" className="text-slate-400 hover:text-sky-600 transition-colors">Pasien</Link>
        <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-slate-600 font-medium">Pasien Baru</span>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-800 mb-2">Tambah Pasien Baru</h1>
        <p className="text-slate-500">Isi formulir di bawah untuk mendaftarkan pasien baru</p>
      </div>

      {/* Scan KTP Button */}
      <div className="mb-8">
        <button
          type="button"
          onClick={() => setShowScanner(true)}
          className="w-full flex items-center justify-center gap-4 py-5 px-6 bg-gradient-to-r from-sky-50 to-cyan-50 border-2 border-dashed border-sky-200 rounded-2xl text-sky-700 hover:from-sky-100 hover:to-cyan-100 hover:border-sky-300 transition-all group"
        >
          <div className="w-14 h-14 bg-gradient-to-br from-sky-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-sky-500/25 group-hover:shadow-sky-500/40 group-hover:scale-105 transition-all">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6 md:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Nama Lengkap"
            value={form.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Nama pasien"
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
              readOnly
              className="bg-slate-50"
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

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Alamat</label>
            <textarea
              value={form.address}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="Alamat lengkap..."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10 outline-none transition-all resize-none bg-white text-slate-800 placeholder-slate-400 text-sm"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Input
              label="No. HP"
              type="tel"
              value={form.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="08xxxxxxxxxx"
            />
            <Input
              label="No. RM (Opsional)"
              value={form.medical_record_number}
              onChange={(e) => handleChange('medical_record_number', e.target.value)}
              placeholder="Auto-generate jika kosong"
            />
          </div>

          <Input
            label="Alergi (Opsional)"
            value={form.allergies}
            onChange={(e) => handleChange('allergies', e.target.value)}
            placeholder="Obat/alergi makanan..."
          />

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-slate-100">
            <Link to="/patients">
              <Button variant="secondary" type="button" className="w-full sm:w-auto">Batal</Button>
            </Link>
            <Button type="submit" loading={loading} className="w-full sm:w-auto">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Simpan Pasien
            </Button>
          </div>
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
