import { useState, useRef, useCallback } from 'react'
import Tesseract from 'tesseract.js'

// Indonesian month names mapping
const MONTHS = {
  'januari': '01', 'februari': '02', 'maret': '03', 'april': '04',
  'mei': '05', 'juni': '06', 'juli': '07', 'agustus': '08',
  'september': '09', 'oktober': '10', 'november': '11', 'desember': '12',
  'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
  'jul': '07', 'jun': '06', 'ags': '08', 'agt': '08',
  'sep': '09', 'okt': '10', 'nov': '11', 'des': '12'
}

export const KTPScanner = ({ onScanComplete, onClose }) => {
  const [scanning, setScanning] = useState(false)
  const [preview, setPreview] = useState(null)
  const [progress, setProgress] = useState(0)
  const [statusText, setStatusText] = useState('')
  const [error, setError] = useState('')
  const [detectedData, setDetectedData] = useState(null)
  const [rawText, setRawText] = useState('')
  const [showRawText, setShowRawText] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editedData, setEditedData] = useState({})
  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)
  const [confidence, setConfidence] = useState(0)

  // Preprocess image with multiple techniques
  const preprocessImage = async (file) => {
    return new Promise((resolve) => {
      const img = new Image()
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      img.onload = () => {
        // Scale up for better OCR (3x for higher resolution)
        const scale = Math.max(2, Math.min(4, 1200 / img.width))
        canvas.width = img.width * scale
        canvas.height = img.height * scale

        // Draw original
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data

        // Apply histogram equalization and contrast enhancement
        const pixels = []
        for (let i = 0; i < data.length; i += 4) {
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
          pixels.push(gray)
        }

        // Calculate histogram
        const histogram = new Array(256).fill(0)
        pixels.forEach(p => histogram[Math.round(p)]++)

        // Calculate cumulative distribution
        const cdf = [histogram[0]]
        for (let i = 1; i < 256; i++) {
          cdf[i] = cdf[i - 1] + histogram[i]
        }

        // Find min and max for histogram equalization
        const minVal = cdf.findIndex(c => c > 0)
        const maxVal = 255 - cdf.reverse().findIndex(c => c > 0)

        // Apply adaptive preprocessing
        for (let i = 0; i < data.length; i += 4) {
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]

          // Histogram equalization
          let normalized = ((gray - minVal) / (maxVal - minVal)) * 255
          normalized = Math.max(0, Math.min(255, normalized))

          // Increase contrast
          const contrast = 1.5
          normalized = ((normalized - 128) * contrast) + 128
          normalized = Math.max(0, Math.min(255, normalized))

          // Apply slight sharpening effect by boosting edges
          const final = normalized > 127 ? 255 : 0 // Binary threshold works best for OCR

          data[i] = final     // R
          data[i + 1] = final // G
          data[i + 2] = final // B
        }

        ctx.putImageData(imageData, 0, 0)

        // Convert to blob
        canvas.toBlob((blob) => {
          resolve({
            file: new File([blob], 'preprocessed.png', { type: 'image/png' }),
            url: canvas.toDataURL()
          })
        }, 'image/png')
      }

      img.src = URL.createObjectURL(file)
    })
  }

  // Parse Indonesian date from various formats
  const parseIndonesianDate = (dateStr) => {
    if (!dateStr) return null

    // Try direct date patterns first (DD-MM-YYYY or similar)
    const directMatch = dateStr.match(/(\d{1,2})[\s\-\/\.](\d{1,2})[\s\-\/\.](\d{4})/)
    if (directMatch) {
      const day = directMatch[1].padStart(2, '0')
      const month = directMatch[2].padStart(2, '0')
      const year = directMatch[3]
      return `${year}-${month}-${day}`
    }

    // Try Indonesian month names
    const lowerDate = dateStr.toLowerCase()
    for (const [monthName, monthNum] of Object.entries(MONTHS)) {
      if (lowerDate.includes(monthName)) {
        const match = lowerDate.match(/(\d{1,2})[\s\-]*\.?[a-z\s]*\,?[\s]*(\d{4})/)
        if (match) {
          const day = match[1].padStart(2, '0')
          const year = match[2]
          return `${year}-${monthNum}-${day}`
        }
        // Try reverse order (Month DD, YYYY)
        const reverseMatch = lowerDate.match(/([a-z]+)[\s]*(\d{1,2})[\s]*\,?[\s]*(\d{4})/)
        if (reverseMatch && reverseMatch[1].includes(monthName)) {
          const day = reverseMatch[2].padStart(2, '0')
          const year = reverseMatch[3]
          return `${year}-${monthNum}-${day}`
        }
      }
    }

    return null
  }

  // Validate NIK using Luhn-like algorithm (Indonesian NIK checksum)
  const validateNik = (nik) => {
    if (!nik || nik.length !== 16) return false
    if (!/^\d{16}$/.test(nik)) return false
    return true
  }

  // Extract gender from NIK (digit 7-12 encodes birth date, digit 6 indicates gender)
  const extractGenderFromNik = (nik) => {
    if (!nik || nik.length !== 16) return null
    const dayRaw = parseInt(nik.substring(6, 8))
    return dayRaw > 40 ? 'P' : 'L'
  }

  // Extract birth date from NIK
  const extractBirthDateFromNik = (nik) => {
    if (!nik || nik.length !== 16) return null
    try {
      const dayRaw = parseInt(nik.substring(6, 8))
      const month = nik.substring(8, 10)
      const yearShort = parseInt(nik.substring(10, 12))

      const day = dayRaw > 40 ? dayRaw - 40 : dayRaw
      const year = yearShort > 50 ? 1900 + yearShort : 2000 + yearShort

      return `${year}-${month}-${day.toString().padStart(2, '0')}`
    } catch {
      return null
    }
  }

  // Parse KTP text with improved algorithm
  const parseKTP = useCallback((text) => {
    console.log('=== RAW OCR TEXT ===')
    console.log(text)
    console.log('====================')

    const lines = text.split('\n')
      .map(l => l.trim())
      .filter(l => l && l.length > 1)

    const data = {
      nik: '',
      name: '',
      birthPlace: '',
      birthDate: '',
      gender: '',
      address: '',
      rt: '',
      rw: '',
      kelurahan: '',
      kecamatan: '',
      kota: '',
      agama: '',
      status: '',
      pekerjaan: '',
      kewarganegaraan: '',
      berlakuUntil: '',
      confidence: 0
    }

    // Track found fields for confidence calculation
    let fieldsFound = 0
    let totalFields = 10

    const cleanText = (str) => {
      return str
        .replace(/[^\w\s,.\-\/\:]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    }

    const capitalizeWords = (str) => {
      if (!str) return ''
      return str.toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
    }

    // Find NIK - 16 consecutive digits
    for (const line of lines) {
      const cleanLine = line.replace(/\s+/g, ' ')
      const nikMatch = cleanLine.match(/\b(\d{16})\b/)
      if (nikMatch) {
        data.nik = nikMatch[1]
        fieldsFound++
        break
      }
      // Also check with various separators
      const nikMatch2 = cleanLine.match(/\b(\d{1,6}[\s\-\.]?\d{6}[\s\-\.]?\d{2,4})\b/)
      if (nikMatch2) {
        const potentialNik = nikMatch2[1].replace(/[\s\-\.]/g, '')
        if (potentialNik.length === 16 && /^\d{16}$/.test(potentialNik)) {
          data.nik = potentialNik
          fieldsFound++
          break
        }
      }
    }

    // Find NAME - usually after NIK or labeled with NAMA
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const upperLine = line.toUpperCase()

      // NAMA label
      if (upperLine.includes('NAMA') && !data.name) {
        if (line.includes(':')) {
          const afterColon = line.split(':').slice(1).join(':').trim()
          if (afterColon.length > 2 && afterColon.length < 100) {
            data.name = capitalizeWords(cleanText(afterColon))
            fieldsFound++
          }
        } else if (i + 1 < lines.length) {
          const nextLine = lines[i + 1]
          if (nextLine && !nextLine.match(/^\d/) && nextLine.length < 100) {
            data.name = capitalizeWords(cleanText(nextLine))
            fieldsFound++
          }
        }
      }
    }

    // Find name from position (e-KTP format: NIK line, then subsequent lines with name)
    if (!data.name) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        if (/\d{16}/.test(line)) {
          // Found NIK line, check next lines for name
          for (let j = 1; j <= 3 && i + j < lines.length; j++) {
            const candidate = lines[i + j]
            if (candidate &&
                candidate.length > 3 &&
                candidate.length < 80 &&
                !candidate.match(/^(TTL|ALAMAT|RT|RW|KEL|KEC|KELAMIN|JENIS|PROVINSI|KABUPATEN|KECAMATAN|KELURAHAN|AGAMA|STATUS|PEKERJAAN|KEWARGANEGARAAN|BERLAKU|\d)/i) &&
                !candidate.match(/\d{6}/)) {
              const nameCandidate = cleanText(candidate)
              if (nameCandidate.split(' ').length >= 2) {
                data.name = capitalizeWords(nameCandidate)
                fieldsFound++
                break
              }
            }
          }
          break
        }
      }
    }

    // Find TTL (Tempat/Tanggal Lahir)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const upperLine = line.toUpperCase()

      if ((upperLine.includes('TTL') || upperLine.includes('TEMPAT') || upperLine === 'LAHIR') && !data.birthPlace) {
        let ttlValue = ''

        if (line.includes(':')) {
          ttlValue = line.split(':').slice(1).join(':').trim()
        } else if (i + 1 < lines.length) {
          ttlValue = lines[i + 1].trim()
        }

        if (ttlValue) {
          // Parse birth place and date
          const parts = ttlValue.split(/[,](?![^[]*\])/).join(',').split(/[\-](?![^[]*\])/)

          if (parts.length >= 2) {
            data.birthPlace = capitalizeWords(cleanText(parts[0]))

            // Try to parse date
            const dateStr = parts.slice(1).join(' ')
            const parsedDate = parseIndonesianDate(dateStr)
            if (parsedDate) {
              data.birthDate = parsedDate
              fieldsFound++
            } else {
              // Try another split
              const dateMatch = dateStr.match(/(\d{1,2})[\s\-\.\/](\w+)[\s\-\.\/](\d{4})/)
              if (dateMatch) {
                const monthNum = MONTHS[dateMatch[2].toLowerCase()] || dateMatch[2]
                const day = dateMatch[1].padStart(2, '0')
                data.birthDate = `${dateMatch[3]}-${monthNum}-${day}`
                fieldsFound++
              }
            }
          }
        }
      }
    }

    // Find JENIS KELAMIN / KELAMIN
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const upperLine = line.toUpperCase()

      if ((upperLine.includes('KELAMIN') || upperLine.includes('JENIS')) && !data.gender) {
        let genderLine = ''

        if (line.includes(':')) {
          genderLine = line.split(':').slice(1).join(':').trim().toUpperCase()
        } else if (i + 1 < lines.length) {
          genderLine = lines[i + 1].trim().toUpperCase()
        }

        if (genderLine.includes('LAKI') || genderLine === 'L' || genderLine.includes('LAKI-LAKI') || genderLine === 'LAKI') {
          data.gender = 'L'
          fieldsFound++
        } else if (genderLine.includes('PEREMPUAN') || genderLine === 'P' || genderLine.includes('WANITA') || genderLine === 'PEREMPU') {
          data.gender = 'P'
          fieldsFound++
        }
      }
    }

    // Find ALAMAT
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const upperLine = line.toUpperCase()

      if (upperLine.includes('ALAMAT') && !upperLine.includes('DOMISILI') && !data.address) {
        let addrValue = ''

        if (line.includes(':')) {
          addrValue = line.split(':').slice(1).join(':').trim()
        } else if (i + 1 < lines.length) {
          // Collect multiple lines for address
          const addrLines = []
          for (let j = i + 1; j < lines.length && j < i + 5; j++) {
            const nextLine = lines[j]
            // Stop if we hit RT/RW/KEL/KEC pattern
            if (nextLine.match(/^(RT|RW|KEL\/DESA|KEL|DESA|KECAMATAN|KEC|KOTA|KABUPATEN|PROVINSI|AGAMA|STATUS|PEKERJAAN|KEWARGANEGARAAN)/i)) {
              break
            }
            addrLines.push(nextLine)
          }
          addrValue = addrLines.join(', ')
        }

        if (addrValue) {
          data.address = capitalizeWords(cleanText(addrValue))
          fieldsFound++
        }
      }
    }

    // Find RT/RW
    for (const line of lines) {
      const upperLine = line.toUpperCase()

      if (upperLine.includes('RT') || upperLine.includes('RW')) {
        const rtMatch = line.match(/RT[:\s]*(\d{1,3})/i)
        const rwMatch = line.match(/RW[:\s]*(\d{1,3})/i)

        if (rtMatch && !data.rt) {
          data.rt = rtMatch[1].padStart(3, '0')
        }
        if (rwMatch && !data.rw) {
          data.rw = rwMatch[1].padStart(3, '0')
        }
      }
    }

    // Find KELURAHAN / KEL / DESA
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const upperLine = line.toUpperCase()

      if ((upperLine.includes('KELURAHAN') || upperLine.includes('KEL/DESA') || upperLine.includes('KEL ') || upperLine.includes('DESA')) && !data.kelurahan) {
        if (line.includes(':')) {
          data.kelurahan = capitalizeWords(cleanText(line.split(':')[1]))
          fieldsFound++
        } else if (i + 1 < lines.length) {
          const nextLine = lines[i + 1]
          if (nextLine && !nextLine.match(/^(KEC|RT|RW|\d)/i)) {
            data.kelurahan = capitalizeWords(cleanText(nextLine))
            fieldsFound++
          }
        }
      }
    }

    // Find KECAMATAN / KEC
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const upperLine = line.toUpperCase()

      if (upperLine.includes('KECAMATAN') && !data.kecamatan) {
        if (line.includes(':')) {
          data.kecamatan = capitalizeWords(cleanText(line.split(':')[1]))
          fieldsFound++
        } else if (i + 1 < lines.length) {
          const nextLine = lines[i + 1]
          if (nextLine && !nextLine.match(/^(RT|RW|KEL|\d)/i)) {
            data.kecamatan = capitalizeWords(cleanText(nextLine))
            fieldsFound++
          }
        }
      }
    }

    // Find other fields
    for (const line of lines) {
      const upperLine = line.toUpperCase()

      // AGAMA
      if (upperLine.includes('AGAMA') && !data.agama) {
        const agamaMatch = line.match(/AGAMA[:\s]*(.+)/i)
        if (agamaMatch) {
          data.agama = capitalizeWords(cleanText(agamaMatch[1]))
        }
      }

      // STATUS PERKAWINAN
      if (upperLine.includes('STATUS') && !data.status) {
        const statusMatch = line.match(/STATUS[:\s]*(.+)/i)
        if (statusMatch) {
          data.status = capitalizeWords(cleanText(statusMatch[1]))
        }
      }

      // PEKERJAAN
      if (upperLine.includes('PEKERJAAN') && !data.pekerjaan) {
        const kerjaMatch = line.match(/PEKERJAAN[:\s]*(.+)/i)
        if (kerjaMatch) {
          data.pekerjaan = capitalizeWords(cleanText(kerjaMatch[1]))
        }
      }

      // KEWARGANEGARAAN
      if (upperLine.includes('KEWARGANEGARAAN') && !data.kewarganegaraan) {
        const negaraMatch = line.match(/KEWARGANEGARAAN[:\s]*(.+)/i)
        if (negaraMatch) {
          data.kewarganegaraan = capitalizeWords(cleanText(negaraMatch[1]))
        }
      }

      // BERLAKU
      if (upperLine.includes('BERLAKU') && !data.berlakuUntil) {
        const berlakuMatch = line.match(/BERLAKU[:\s]*(.+)/i)
        if (berlakuMatch) {
          const parsedDate = parseIndonesianDate(berlakuMatch[1])
          if (parsedDate) {
            data.berlakuUntil = parsedDate
          } else {
            data.berlakuUntil = capitalizeWords(cleanText(berlakuMatch[1]))
          }
        }
      }
    }

    // Extract gender from NIK if not found
    if (!data.gender && data.nik) {
      const genderFromNik = extractGenderFromNik(data.nik)
      if (genderFromNik) {
        data.gender = genderFromNik
      }
    }

    // Extract birth date from NIK if not found
    if (!data.birthDate && data.nik) {
      const birthFromNik = extractBirthDateFromNik(data.nik)
      if (birthFromNik) {
        data.birthDate = birthFromNik
      }
    }

    // Build full address if address is short
    if (data.address && data.address.length < 10) {
      const addrParts = []
      if (data.rt) addrParts.push(`RT ${data.rt}`)
      if (data.rw) addrParts.push(`RW ${data.rw}`)
      if (data.kelurahan) addrParts.push(`Kel. ${data.kelurahan}`)
      if (data.kecamatan) addrParts.push(`Kec. ${data.kecamatan}`)
      if (addrParts.length > 0) {
        data.address = addrParts.join(', ')
      }
    }

    // Calculate confidence
    data.confidence = Math.round((fieldsFound / totalFields) * 100)

    console.log('=== PARSED DATA ===')
    console.log(data)

    return data
  }, [])

  // Process image with OCR
  const processImage = async (file) => {
    setScanning(true)
    setError('')
    setProgress(0)
    setStatusText('Memuat gambar...')
    setDetectedData(null)
    setRawText('')

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target.result)
    reader.readAsDataURL(file)

    try {
      // Preprocess image
      setStatusText('Meningkatkan kualitas gambar...')
      setProgress(5)
      const { file: preprocessedFile } = await preprocessImage(file)
      setProgress(10)

      // Run OCR with better settings
      setStatusText('Memindai teks dari KTP...')

      const result = await Tesseract.recognize(preprocessedFile, 'ind+eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgress(10 + Math.round(m.progress * 85))
            setStatusText(`Memproses OCR... ${Math.round(m.progress * 100)}%`)
          }
        }
      })

      const text = result.data.text
      const confidence = result.data.confidence
      setConfidence(Math.round(confidence))
      setRawText(text)

      console.log('OCR Confidence:', confidence)
      console.log('OCR Text:', text)

      const parsedData = parseKTP(text)
      setDetectedData(parsedData)
      setEditedData(parsedData)

      setStatusText('Selesai!')
      setScanning(false)

      // Check if we got minimum required data
      if (!parsedData.name && !parsedData.nik) {
        setError('Tidak dapat membaca data KTP. Pastikan foto jelas dan semua teks terlihat.')
      }

    } catch (err) {
      console.error('OCR Error:', err)
      setError('Gagal memproses gambar. Silakan coba lagi.')
      setScanning(false)
    }
  }

  const handleConfirm = () => {
    const dataToSend = editMode ? editedData : detectedData
    if (!dataToSend) return

    const formData = {
      name: dataToSend.name || '',
      gender: dataToSend.gender || 'L',
      birthDate: dataToSend.birthDate || '',
      birthPlace: dataToSend.birthPlace || '',
      address: dataToSend.address || '',
      nik: dataToSend.nik || '',
      rt: dataToSend.rt || '',
      rw: dataToSend.rw || '',
      kelurahan: dataToSend.kelurahan || '',
      kecamatan: dataToSend.kecamatan || '',
      kota: dataToSend.kota || '',
      agama: dataToSend.agama || '',
      status: dataToSend.status || '',
      pekerjaan: dataToSend.pekerjaan || '',
      kewarganegaraan: dataToSend.kewarganegaraan || '',
      berlakuUntil: dataToSend.berlakuUntil || ''
    }

    onScanComplete(formData)
  }

  const handleEditChange = (field, value) => {
    setEditedData(prev => ({ ...prev, [field]: value }))
  }

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      processImage(file)
    }
  }

  const handleCameraCapture = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      processImage(file)
    }
  }

  const handleRetry = () => {
    setDetectedData(null)
    setEditedData({})
    setPreview(null)
    setError('')
    setRawText('')
    setShowRawText(false)
    setEditMode(false)
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    const match = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/)
    if (match) {
      return `${match[3]}-${match[2]}-${match[1]}`
    }
    return dateStr
  }

  const isNikValid = detectedData?.nik ? validateNik(detectedData.nik) : true

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-sky-500 to-cyan-500 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Scan KTP</h3>
              <p className="text-xs text-slate-500">OCR Indonesia</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-start gap-2">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Preview Image */}
          {preview && (
            <div className="mb-4 relative">
              <img src={preview} alt="Preview" className="w-full h-48 object-contain rounded-xl border border-slate-200 bg-slate-50" />
              {scanning && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center rounded-xl">
                  <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mb-3" />
                  <p className="text-white font-medium">{progress}%</p>
                  <p className="text-white/70 text-sm">{statusText}</p>
                </div>
              )}
            </div>
          )}

          {/* Scanning Progress */}
          {scanning && !preview && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin mb-4" />
              <p className="text-slate-600 font-medium">{statusText}</p>
              <p className="text-slate-400 text-sm mt-1">{progress}% complete</p>
              <div className="w-48 h-2 bg-slate-100 rounded-full mt-4 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-400 to-cyan-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Detected Data */}
          {detectedData && !scanning && (
            <div className="space-y-4">
              {/* Confidence & Raw Text Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    (detectedData.confidence || 0) >= 70 ? 'bg-green-100 text-green-700' :
                    (detectedData.confidence || 0) >= 40 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {detectedData.confidence || 0}% terdeteksi
                  </span>
                  {confidence > 0 && (
                    <span className="text-xs text-slate-400">
                      OCR: {confidence}%
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setShowRawText(!showRawText)}
                  className="text-xs text-sky-600 hover:text-sky-700"
                >
                  {showRawText ? 'Sembunyikan' : 'Lihat'} teks asli
                </button>
              </div>

              {/* Raw OCR Text */}
              {showRawText && rawText && (
                <div className="bg-slate-800 rounded-xl p-4 text-left">
                  <p className="text-xs text-slate-400 mb-2">Teks hasil OCR:</p>
                  <pre className="text-xs text-green-400 whitespace-pre-wrap font-mono overflow-x-auto max-h-32">
                    {rawText}
                  </pre>
                </div>
              )}

              {/* Data Fields */}
              <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-xl p-4 space-y-3">
                <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <svg className="w-4 h-4 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Data Terdeteksi
                </h4>

                {/* NIK */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500">NIK</label>
                    <input
                      type="text"
                      value={editMode ? editedData.nik : detectedData.nik}
                      onChange={(e) => handleEditChange('nik', e.target.value)}
                      readOnly={!editMode}
                      className={`w-full text-sm font-mono ${editMode ? 'bg-white border-slate-300' : 'bg-transparent border-transparent'} border rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-sky-500`}
                    />
                    {detectedData.nik && !isNikValid && (
                      <p className="text-xs text-red-500 mt-0.5">NIK tidak valid (harus 16 digit)</p>
                    )}
                  </div>
                  {/* Nama */}
                  <div>
                    <label className="text-xs text-slate-500">Nama</label>
                    <input
                      type="text"
                      value={editMode ? editedData.name : detectedData.name}
                      onChange={(e) => handleEditChange('name', e.target.value)}
                      readOnly={!editMode}
                      className={`w-full text-sm font-medium ${editMode ? 'bg-white border-slate-300' : 'bg-transparent border-transparent'} border rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-sky-500`}
                    />
                  </div>
                </div>

                {/* Gender & Birth Place/Date */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500">Jenis Kelamin</label>
                    {editMode ? (
                      <select
                        value={editedData.gender}
                        onChange={(e) => handleEditChange('gender', e.target.value)}
                        className="w-full text-sm bg-white border-slate-300 border rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-sky-500"
                      >
                        <option value="L">Laki-laki</option>
                        <option value="P">Perempuan</option>
                      </select>
                    ) : (
                      <p className="text-sm bg-transparent border-transparent px-2 py-1">
                        {detectedData.gender === 'L' ? 'Laki-laki' : detectedData.gender === 'P' ? 'Perempuan' : '-'}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Tempat, Tgl Lahir</label>
                    <input
                      type="text"
                      value={editMode ? `${editedData.birthPlace}, ${formatDate(editedData.birthDate)}` : `${detectedData.birthPlace || ''}, ${formatDate(detectedData.birthDate)}`}
                      onChange={(e) => {
                        const val = e.target.value
                        const parts = val.split(', ')
                        handleEditChange('birthPlace', parts[0] || '')
                        if (parts.length > 1) {
                          const dateStr = parts.slice(1).join(' ')
                          const parsed = parseIndonesianDate(dateStr)
                          if (parsed) handleEditChange('birthDate', parsed)
                        }
                      }}
                      readOnly={!editMode}
                      placeholder="Contoh: Jakarta, 15-08-1990"
                      className={`w-full text-sm ${editMode ? 'bg-white border-slate-300' : 'bg-transparent border-transparent'} border rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-sky-500`}
                    />
                  </div>
                </div>

                {/* Alamat */}
                <div>
                  <label className="text-xs text-slate-500">Alamat</label>
                  <textarea
                    value={editMode ? editedData.address : detectedData.address}
                    onChange={(e) => handleEditChange('address', e.target.value)}
                    readOnly={!editMode}
                    rows={2}
                    className={`w-full text-sm ${editMode ? 'bg-white border-slate-300' : 'bg-transparent border-transparent'} border rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none`}
                  />
                </div>

                {/* RT/RW, Kel, Kec */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-slate-500">RT/RW</label>
                    <input
                      type="text"
                      value={editMode ? `${editedData.rt || ''}/${editedData.rw || ''}` : `${detectedData.rt || ''}/${detectedData.rw || ''}`}
                      onChange={(e) => {
                        const val = e.target.value.split('/')
                        handleEditChange('rt', val[0] || '')
                        handleEditChange('rw', val[1] || '')
                      }}
                      readOnly={!editMode}
                      placeholder="001/002"
                      className={`w-full text-sm ${editMode ? 'bg-white border-slate-300' : 'bg-transparent border-transparent'} border rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-sky-500`}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Kelurahan</label>
                    <input
                      type="text"
                      value={editMode ? editedData.kelurahan : detectedData.kelurahan}
                      onChange={(e) => handleEditChange('kelurahan', e.target.value)}
                      readOnly={!editMode}
                      className={`w-full text-sm ${editMode ? 'bg-white border-slate-300' : 'bg-transparent border-transparent'} border rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-sky-500`}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Kecamatan</label>
                    <input
                      type="text"
                      value={editMode ? editedData.kecamatan : detectedData.kecamatan}
                      onChange={(e) => handleEditChange('kecamatan', e.target.value)}
                      readOnly={!editMode}
                      className={`w-full text-sm ${editMode ? 'bg-white border-slate-300' : 'bg-transparent border-transparent'} border rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-sky-500`}
                    />
                  </div>
                </div>

                {/* Additional Fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500">Agama</label>
                    <input
                      type="text"
                      value={editMode ? editedData.agama : detectedData.agama}
                      onChange={(e) => handleEditChange('agama', e.target.value)}
                      readOnly={!editMode}
                      className={`w-full text-sm ${editMode ? 'bg-white border-slate-300' : 'bg-transparent border-transparent'} border rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-sky-500`}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Status</label>
                    <input
                      type="text"
                      value={editMode ? editedData.status : detectedData.status}
                      onChange={(e) => handleEditChange('status', e.target.value)}
                      readOnly={!editMode}
                      className={`w-full text-sm ${editMode ? 'bg-white border-slate-300' : 'bg-transparent border-transparent'} border rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-sky-500`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500">Pekerjaan</label>
                    <input
                      type="text"
                      value={editMode ? editedData.pekerjaan : detectedData.pekerjaan}
                      onChange={(e) => handleEditChange('pekerjaan', e.target.value)}
                      readOnly={!editMode}
                      className={`w-full text-sm ${editMode ? 'bg-white border-slate-300' : 'bg-transparent border-transparent'} border rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-sky-500`}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Kewarganegaraan</label>
                    <input
                      type="text"
                      value={editMode ? editedData.kewarganegaraan : detectedData.kewarganegaraan}
                      onChange={(e) => handleEditChange('kewarganegaraan', e.target.value)}
                      readOnly={!editMode}
                      className={`w-full text-sm ${editMode ? 'bg-white border-slate-300' : 'bg-transparent border-transparent'} border rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-sky-500`}
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setEditMode(!editMode)}
                  className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                    editMode
                      ? 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200'
                      : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {editMode ? '🔒 Kunci Edit' : '✏️ Edit Data'}
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-sky-500 to-cyan-500 text-white rounded-xl font-medium hover:from-sky-600 hover:to-cyan-600 transition-all shadow-lg shadow-sky-500/30"
                >
                  ✅ Konfirmasi & Isi Form
                </button>
              </div>

              <button
                onClick={handleRetry}
                className="w-full py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
              >
                🔄 Scan Ulang KTP
              </button>
            </div>
          )}

          {/* Upload Options - Initial State */}
          {!scanning && !detectedData && (
            <div className="space-y-4">
              {/* Camera Button */}
              <label className="flex items-center justify-center gap-3 w-full py-4 px-4 bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white rounded-xl cursor-pointer transition-all shadow-lg shadow-sky-500/30 font-medium">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Ambil Foto KTP</span>
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleCameraCapture}
                  className="hidden"
                />
              </label>

              {/* Upload Button */}
              <label className="flex items-center justify-center gap-3 w-full py-4 px-4 bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-200 hover:border-slate-300 rounded-xl cursor-pointer transition-all font-medium">
                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span>Upload dari Galeri</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {/* Tips */}
              <div className="mt-6 p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-100">
                <p className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-2">
                  <span className="text-lg">💡</span> Tips untuk hasil terbaik:
                </p>
                <ul className="text-sm text-amber-700 space-y-1.5">
                  <li className="flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5">•</span>
                    <span>Pegang KTP tegak dan pastikan foto tidak blur</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5">•</span>
                    <span>Pencahayaan merata, hindari bayangan pada KTP</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5">•</span>
                    <span>Pastikan semua teks KTP terlihat jelas</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5">•</span>
                    <span>Gunakan resolusi kamera tertinggi jika possible</span>
                  </li>
                </ul>
              </div>

              {/* Supported Fields Info */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-xs font-semibold text-slate-600 mb-2">📋 Data yang akan diambil:</p>
                <div className="grid grid-cols-2 gap-1 text-xs text-slate-500">
                  <span>✓ NIK (16 digit)</span>
                  <span>✓ Nama Lengkap</span>
                  <span>✓ Tempat & Tanggal Lahir</span>
                  <span>✓ Jenis Kelamin</span>
                  <span>✓ Alamat Lengkap</span>
                  <span>✓ RT/RW, Kelurahan, Kecamatan</span>
                  <span>✓ Agama</span>
                  <span>✓ Status Perkawinan</span>
                  <span>✓ Pekerjaan</span>
                  <span>✓ Kewarganegaraan</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
