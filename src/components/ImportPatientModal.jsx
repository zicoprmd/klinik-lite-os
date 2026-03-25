import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { Button } from './Button'
import { Modal } from './Modal'

export const ImportPatientModal = ({ isOpen, onClose, onImport }) => {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState([])
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const fileInputRef = useRef(null)

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setError('')
    setResult(null)

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

        if (jsonData.length < 2) {
          setError('File terlalu sedikit. Minimal harus ada header dan 1 data.')
          setPreview([])
          return
        }

        const headers = jsonData[0].map(h => String(h).toLowerCase().trim())
        const rows = jsonData.slice(1).filter(row => row.some(cell => cell !== null && cell !== undefined && cell !== ''))

        // Map columns
        const colMap = {
          nama: headers.findIndex(h => ['nama', 'name', 'nama lengkap', 'nama_pasien'].includes(h)),
          jenis_kelamin: headers.findIndex(h => ['jenis_kelamin', 'gender', 'jk', 'sex', 'kelamin'].includes(h)),
          tanggal_lahir: headers.findIndex(h => ['tanggal_lahir', 'birth_date', 'tgl_lahir', 'tanggal lahir', 'lahir'].includes(h)),
          alamat: headers.findIndex(h => ['alamat', 'address', 'addr'].includes(h)),
          no_hp: headers.findIndex(h => ['no_hp', 'phone', 'hp', 'nomor hp', 'nohp', 'no hp', 'mobile'].includes(h)),
          nik: headers.findIndex(h => ['nik', 'no_ktp', 'ktp', 'no ktp', 'noktp', 'no nik'].includes(h))
        }

        // Validate required columns
        const missingCols = Object.entries(colMap).filter(([key, idx]) => idx === -1).map(([key]) => key)
        if (missingCols.length > 0) {
          setError(`Kolom tidak ditemukan: ${missingCols.join(', ')}. Pastikan file memiliki kolom: nama, jenis_kelamin, tanggal_lahir, alamat, no_hp, nik`)
          setPreview([])
          return
        }

        const mapped = rows.map((row, idx) => {
          const rawJk = row[colMap.jenis_kelamin]
          let gender = 'L'
          if (rawJk) {
            const jk = String(rawJk).toLowerCase().trim()
            if (jk === 'p' || jk === 'perempuan' || jk === 'wanita' || jk === 'f' || jk === 'female') {
              gender = 'P'
            }
          }

          let birthDate = row[colMap.tanggal_lahir]
          if (birthDate) {
            // Handle Excel serial date or string date
            if (typeof birthDate === 'number') {
              // Excel serial date
              const date = new Date((birthDate - 25569) * 86400 * 1000)
              birthDate = date.toISOString().split('T')[0]
            } else if (typeof birthDate === 'string') {
              // Try to parse string date
              const parsed = new Date(birthDate)
              if (!isNaN(parsed)) {
                birthDate = parsed.toISOString().split('T')[0]
              }
            }
          }

          // Calculate age from birth date
          let age = ''
          if (birthDate) {
            const today = new Date()
            const birth = new Date(birthDate)
            age = today.getFullYear() - birth.getFullYear()
            const monthDiff = today.getMonth() - birth.getMonth()
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
              age--
            }
            if (age < 0) age = ''
          }

          return {
            _row: idx + 2,
            nama: String(row[colMap.nama] || '').trim(),
            jenis_kelamin: gender,
            tanggal_lahir: birthDate || '',
            alamat: String(row[colMap.alamat] || '').trim(),
            no_hp: String(row[colMap.no_hp] || '').trim(),
            nik: String(row[colMap.nik] || '').trim(),
            age: age
          }
        })

        setPreview(mapped)
      } catch (err) {
        console.error('Parse error:', err)
        setError('Gagal membaca file: ' + err.message)
        setPreview([])
      }
    }
    reader.readAsArrayBuffer(selectedFile)
  }

  const handleImport = async () => {
    if (preview.length === 0) return

    setImporting(true)
    setError('')

    try {
      let successCount = 0
      let errorCount = 0
      const errors = []

      for (const patient of preview) {
        try {
          await onImport({
            name: patient.nama,
            gender: patient.jenis_kelamin,
            birth_date: patient.tanggal_lahir,
            age: patient.age,
            address: patient.alamat,
            phone: patient.no_hp,
            medical_record_number: patient.nik || `RM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          })
          successCount++
        } catch (err) {
          errorCount++
          errors.push(`Baris ${patient._row}: ${err.message}`)
        }
      }

      setResult({ success: successCount, error: errorCount, errors })
      if (successCount > 0) {
        setTimeout(() => {
          onClose()
          setFile(null)
          setPreview([])
          setResult(null)
        }, 2000)
      }
    } catch (err) {
      setError('Import gagal: ' + err.message)
    } finally {
      setImporting(false)
    }
  }

  const handleClose = () => {
    onClose()
    setFile(null)
    setPreview([])
    setError('')
    setResult(null)
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Import Pasien dari Excel/CSV" size="lg">
      <div className="space-y-5">
        {/* Download Template */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800 mb-2">
            <strong>Format kolom yang diperlukan:</strong>
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-blue-700">
            <span>nama</span>
            <span>jenis_kelamin (L/P)</span>
            <span>tanggal_lahir</span>
            <span>alamat</span>
            <span>no_hp</span>
            <span>nik</span>
          </div>
          <button
            type="button"
            onClick={() => {
              const template = [
                ['nama', 'jenis_kelamin', 'tanggal_lahir', 'alamat', 'no_hp', 'nik'],
                ['Budi Santoso', 'L', '1990-05-15', 'Jl. Merdeka No. 10', '081234567890', '1234567890123456'],
                ['Siti Aminah', 'P', '1985-03-22', 'Jl. Sudirman No. 25', '081234567891', '2345678901234567']
              ]
              const ws = XLSX.utils.aoa_to_sheet(template)
              const wb = XLSX.utils.book_new()
              XLSX.utils.book_append_sheet(wb, ws, 'Template')
              XLSX.writeFile(wb, 'template_import_pasien.xlsx')
            }}
            className="mt-3 text-xs text-blue-600 hover:text-blue-800 underline"
          >
            Download template Excel
          </button>
        </div>

        {/* File Input */}
        <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-slate-400 transition-colors">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            {file ? (
              <div className="text-slate-700">
                <svg className="w-10 h-10 mx-auto mb-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-slate-500">({(file.size / 1024).toFixed(1)} KB)</p>
              </div>
            ) : (
              <div className="text-slate-500">
                <svg className="w-10 h-10 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="font-medium">Klik untuk pilih file</p>
                <p className="text-sm">atau drag & drop file .xlsx, .xls, .csv</p>
              </div>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className={`border rounded-lg p-4 ${result.error === 0 ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
            <p className={`font-medium ${result.error === 0 ? 'text-green-700' : 'text-yellow-700'}`}>
              Berhasil import {result.success} pasien
              {result.error > 0 && `, ${result.error} gagal`}
            </p>
            {result.errors.length > 0 && (
              <div className="mt-2 text-xs text-yellow-700 max-h-32 overflow-y-auto">
                {result.errors.slice(0, 5).map((e, i) => (
                  <p key={i}>{e}</p>
                ))}
                {result.errors.length > 5 && <p>...dan {result.errors.length - 5} error lainnya</p>}
              </div>
            )}
          </div>
        )}

        {/* Preview Table */}
        {preview.length > 0 && !result && (
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
              <p className="text-sm font-medium text-slate-700">Preview ({preview.length} data)</p>
            </div>
            <div className="max-h-64 overflow-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-slate-600 font-medium">#</th>
                    <th className="px-3 py-2 text-left text-slate-600 font-medium">Nama</th>
                    <th className="px-3 py-2 text-left text-slate-600 font-medium">JK</th>
                    <th className="px-3 py-2 text-left text-slate-600 font-medium">Tgl Lahir</th>
                    <th className="px-3 py-2 text-left text-slate-600 font-medium">Alamat</th>
                    <th className="px-3 py-2 text-left text-slate-600 font-medium">No. HP</th>
                    <th className="px-3 py-2 text-left text-slate-600 font-medium">NIK</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {preview.slice(0, 20).map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-3 py-2 text-slate-400">{idx + 1}</td>
                      <td className="px-3 py-2 text-slate-800">{row.nama}</td>
                      <td className="px-3 py-2 text-slate-600">{row.jenis_kelamin}</td>
                      <td className="px-3 py-2 text-slate-600">{row.tanggal_lahir}</td>
                      <td className="px-3 py-2 text-slate-600 truncate max-w-[150px]">{row.alamat}</td>
                      <td className="px-3 py-2 text-slate-600">{row.no_hp}</td>
                      <td className="px-3 py-2 text-slate-600">{row.nik}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.length > 20 && (
                <div className="px-4 py-2 text-xs text-slate-500 bg-slate-50">
                  ...dan {preview.length - 20} data lainnya
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={handleClose}>
            {result ? 'Tutup' : 'Batal'}
          </Button>
          {preview.length > 0 && !result && (
            <Button onClick={handleImport} loading={importing}>
              Import {preview.length} Pasien
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
