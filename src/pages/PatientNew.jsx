import { useState, useRef, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { usePatientStore } from '../stores/patientStore'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { Input, Select } from '../components/Input'
import { KTPScanner } from '../components/KTPScanner'

// Speech Recognition setup
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

const parseSpokenText = (text) => {
  const result = {
    name: '',
    gender: '',
    birth_date: '',
    address: ''
  }

  if (!text || text.trim().length < 2) {
    console.log('parseSpokenText: text kosong atau terlalu pendek', text)
    return result
  }

  console.log('parseSpokenText: input=', text)

  // Hapus punctuation untuk parsing yang lebih robust
  const cleanText = text.replace(/[,.\-:;]+/g, ' ')
  const lowerText = cleanText.toLowerCase()

  // Parse gender - lebih fleksibel
  if (/\b(perempuan|wanita|cewek|bini|istri)\b/.test(lowerText)) {
    result.gender = 'P'
  } else if (/\b(laki|pria|cowok|laki-laki|suami|pria)\b/.test(lowerText)) {
    result.gender = 'L'
  }

  // Parse birth date - banyak pola
  const monthNames = 'januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember'
  const monthAbbr = 'jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec'
  const monthAll = `${monthNames}|${monthAbbr}`
  const monthMap = {
    'jan': '01', 'januari': '01',
    'feb': '02', 'februari': '02',
    'mar': '03', 'maret': '03',
    'apr': '04', 'april': '04',
    'mei': '05', 'mei': '05',
    'jun': '06', 'juni': '06',
    'jul': '07', 'juli': '07',
    'agu': '08', 'agustus': '08', 'aug': '08',
    'sep': '09', 'september': '09',
    'okt': '10', 'oct': '10', 'oktober': '10',
    'nov': '11', 'november': '11',
    'des': '12', 'dec': '12', 'desember': '12'
  }

  // Pola: "14 November 1996" atau "14 nov 1996" atau "14 11 1996" atau "tanggal 14 bulan 11 tahun 1996"
  const datePatterns = [
    new RegExp(`(\\d{1,2})\\s+(${monthAll})\\s+(\\d{4})`, 'i'),
    new RegExp(`(\\d{1,2})\\s+(\\d{1,2})\\s+(\\d{4})`),
    new RegExp(`tanggal\\s*(\\d{1,2})\\s*(?:bulan\\s*)?(\\d{1,2})\\s*(?:tahun\\s*)?(\\d{4})`, 'i'),
    new RegExp(`lahir\\s+(?:tanggal\\s+)?(\\d{1,2})\\s+(?:bulan\\s+)?(\\d{1,2})\\s+(?:tahun\\s+)?(\\d{4})`, 'i')
  ]

  for (const pattern of datePatterns) {
    const match = cleanText.match(pattern)
    console.log('Trying date pattern:', pattern, '-> match:', match)
    if (match && match[1] && match[2] && match[3]) {
      const day = match[1].padStart(2, '0')
      const monthRaw = match[2].toLowerCase()
      const month = monthMap[monthRaw]
      let year = match[3]

      if (month && day && year) {
        if (year.length === 2) {
          year = parseInt(year) > 30 ? '19' + year : '20' + year
        }
        result.birth_date = `${year}-${month}-${day}`
        console.log('parseSpokenText: birth_date parsed=', result.birth_date, 'from match:', match[0])
        break
      }
    }
  }

  // Extract name - cari kata setelah "nama" atau di awal sebelum gender/date
  const nameRegexes = [
    /nama[:\s]+([a-zA-Z\s]+?)(?=\s+(?:laki|perempuan|lahir|tanggal|alamat|$))/i,
    /saya\s+nama\s+([a-zA-Z\s]+?)(?=\s+(?:laki|perempuan|lahir|tanggal|alamat|$))/i,
    /^([a-zA-Z\s]+?)(?=\s+(?:laki|perempuan|lahir|tanggal|alamat))/i
  ]

  for (const regex of nameRegexes) {
    const match = cleanText.match(regex)
    if (match && match[1]) {
      result.name = match[1].trim().replace(/\s+/g, ' ')
      console.log('parseSpokenText: name parsed=', result.name)
      break
    }
  }

  // Fallback name: Ambil kata pertama yang substantial sebelum stop words
  if (!result.name) {
    const words = cleanText.split(/\s+/)
    const stopWords = new Set(['nama', 'saya', 'dan', 'di', 'ke', 'dengan', 'untuk', 'ini', 'itu', 'dari', 'the', 'a', 'an', 'is', 'are'])
    const skipWords = new Set(['laki', 'laki-laki', 'perempuan', 'wanita', 'lahir', 'tanggal', 'bulan', 'tahun', 'alamat', 'tinggal', 'seorang', 'yang', 'umur', 'usia', 'pria', 'cewek', 'suami', 'istri'])

    const nameWords = []
    for (const word of words) {
      const lower = word.toLowerCase().replace(/[.,:]/g, '')
      if (skipWords.has(lower)) break
      if (!stopWords.has(lower) && word.length > 2 && /^[a-zA-Z]+$/.test(word)) {
        nameWords.push(word)
      }
    }
    if (nameWords.length > 0) {
      result.name = nameWords.join(' ')
      console.log('parseSpokenText: name fallback=', result.name)
    }
  }

  // Extract address - setelah "alamat", "tinggal", "domisili", atau kata-kata umum lainnya
  const addressRegexes = [
    /alamat[:\s]*(.+)/i,
    /tinggal\s+(?:di\s+)?(.+)/i,
    /domisili[:\s]*(.+)/i,
    /bertempat\s+di\s+(.+)/i,
    /di\s+(.+)/i
  ]

  for (const regex of addressRegexes) {
    const match = cleanText.match(regex)
    if (match && match[1]) {
      result.address = match[1].trim()
      console.log('parseSpokenText: address parsed=', result.address)
      break
    }
  }

  // Fallback: jika tidak ada pola, ambil tudo teks setelah tanggal atau gender
  if (!result.address) {
    // Cari posisi terakhir dari tanggal atau gender, ambil teks setelahnya
    const dateMatch = cleanText.match(/\d{1,2}\s+(?:januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)\s+\d{4}/i)
    const genderMatch = cleanText.match(/(?:perempuan|laki-laki|wanita|pria)/i)
    let startPos = 0

    if (dateMatch) startPos = Math.max(startPos, dateMatch.index + dateMatch[0].length)
    if (genderMatch) startPos = Math.max(startPos, genderMatch.index + genderMatch[0].length)

    if (startPos > 0) {
      const afterPos = cleanText.substring(startPos).trim()
      // Ambil beberapa kata pertama setelah tanggal/gender sebagai address
      const words = afterPos.split(/\s+/).slice(0, 20)
      if (words.length > 0) {
        result.address = words.join(' ')
        console.log('parseSpokenText: address fallback=', result.address)
      }
    }
  }

  console.log('parseSpokenText: result=', result)
  return result
}

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
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [recognitionSupported] = useState(!!SpeechRecognition)
  const recognitionRef = useRef(null)
  const finalTranscriptRef = useRef('')
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

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    setIsListening(false)
  }, [])

  const startListening = useCallback(() => {
    // Check HTTPS (Web Speech API requires secure context)
    const isHttps = location.protocol === 'https:'
    const isLocalhost = location.hostname === 'localhost' || location.hostname === '127.0.0.1'
    if (!isHttps && !isLocalhost) {
      alert('Speech to Text memerlukan HTTPS. Pastikan aplikasi diakses melalui https:// atau gunakan localhost.')
      return
    }

    // Get SpeechRecognition fresh at call time (more reliable)
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognitionClass) {
      alert('Maaf, browser Anda tidak mendukung Speech Recognition. Gunakan Chrome atau Edge di HP.')
      return
    }

    if (isListening) {
      stopListening()
      return
    }

    setTranscript('')
    finalTranscriptRef.current = ''

    const recognition = new SpeechRecognitionClass()
    recognitionRef.current = recognition
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'id-ID'

    recognition.onresult = (event) => {
      let newFinalTranscript = finalTranscriptRef.current
      let interimTranscript = ''

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i]
        const transcriptPiece = result[0].transcript

        if (result.isFinal) {
          // Deduplicate: mobile Chrome mengirim final results secara incremental
          // (misal: "nov" -> "novi" -> "novia"). Check apakah piece sudah ada
          // di末尾 (endsWith) atau sudah mengandung piece tsb (includes)
          const piece = transcriptPiece.trim()
          if (piece && !newFinalTranscript.endsWith(piece) && !newFinalTranscript.includes(piece)) {
            // Check apakah piece adalah versi panjang dari kata yang sudah ada
            // (misal sudah ada "nov", dapat "novi" -> skip karena "novi"包含 "nov")
            const alreadyHasShorterVersion = newFinalTranscript.split(/\s+/).some(word =>
              piece.startsWith(word) && piece.length > word.length
            )
            if (!alreadyHasShorterVersion) {
              if (newFinalTranscript.length > 0 && !newFinalTranscript.endsWith(' ')) {
                newFinalTranscript += ' '
              }
              newFinalTranscript += piece
            }
          }
        } else {
          interimTranscript += transcriptPiece
        }
      }

      finalTranscriptRef.current = newFinalTranscript
      setTranscript(newFinalTranscript + (interimTranscript ? ' ' + interimTranscript : ''))
    }

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error)
      setIsListening(false)
      if (event.error === 'not-allowed') {
        alert('Izin mikrofon ditolak. Klik ikon gembok 🔒 di address bar → Izinkan Mikrofon, lalu coba lagi.')
      } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
        alert('Error speech recognition: ' + event.error)
      }
    }

    recognition.onend = () => {
      console.log('Speech recognition ended. finalTranscript=', finalTranscriptRef.current)
      setIsListening(false)
      const finalText = finalTranscriptRef.current
      if (finalText) {
        const parsed = parseSpokenText(finalText)
        setForm(prev => {
          const updated = { ...prev }
          if (parsed.name) updated.name = parsed.name
          if (parsed.gender) updated.gender = parsed.gender
          if (parsed.birth_date) {
            updated.birth_date = parsed.birth_date
            updated.age = calculateAge(parsed.birth_date)
          }
          if (parsed.address) updated.address = parsed.address
          console.log('Form updated with parsed data:', updated)
          return updated
        })
      }
    }

    recognition.start()
    setIsListening(true)
  }, [isListening, stopListening])

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

      {/* Speech to Text Button */}
      {recognitionSupported && (
        <div className="mb-8">
          <button
            type="button"
            onClick={startListening}
            className={`w-full flex items-center justify-center gap-4 py-5 px-6 border-2 border-dashed rounded-2xl transition-all group ${
              isListening
                ? 'bg-red-50 border-red-200 text-red-700 animate-pulse'
                : 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200 text-emerald-700 hover:from-emerald-100 hover:to-teal-100 hover:border-emerald-300'
            }`}
          >
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-lg transition-all ${
              isListening
                ? 'bg-gradient-to-br from-red-500 to-rose-500 shadow-red-500/25'
                : 'bg-gradient-to-br from-emerald-500 to-teal-500 shadow-emerald-500/25 group-hover:shadow-emerald-500/40 group-hover:scale-105'
            }`}>
              {isListening ? (
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              ) : (
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              )}
            </div>
            <div className="text-left">
              <div className="text-base font-semibold">{isListening ? 'Sedang Mendengarkan...' : 'Speech to Text'}</div>
              <div className="text-sm opacity-70">
                {isListening ? 'Klik untuk berhenti' : 'Ucapkan nama, jenis kelamin, tanggal lahir, dan alamat'}
              </div>
            </div>
          </button>

          {/* Live Transcript Display */}
          {(transcript || isListening) && (
            <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'bg-slate-400'}`}></span>
                {isListening ? 'Mendengarkan...' : 'Hasil Speech'}
              </div>
              <p className="text-sm text-slate-700 font-mono">
                {transcript || (isListening ? '......' : '-')}
              </p>
            </div>
          )}
        </div>
      )}

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
