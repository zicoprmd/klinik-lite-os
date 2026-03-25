import { useState, useRef } from 'react'
import Tesseract from 'tesseract.js'

export const KTPScanner = ({ onScanComplete, onClose }) => {
  const [scanning, setScanning] = useState(false)
  const [preview, setPreview] = useState(null)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [detectedData, setDetectedData] = useState(null)
  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)

  // Preprocess image - convert to grayscale and enhance contrast
  const preprocessImage = (file) => {
    return new Promise((resolve) => {
      const img = new Image()
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      img.onload = () => {
        // Scale up for better OCR
        const scale = 2
        canvas.width = img.width * scale
        canvas.height = img.height * scale
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        
        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data
        
        // Convert to grayscale and increase contrast
        for (let i = 0; i < data.length; i += 4) {
          // Grayscale
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
          
          // Increase contrast (threshold)
          const contrast = gray > 128 ? 255 : 0
          
          data[i] = contrast     // R
          data[i + 1] = contrast // G
          data[i + 2] = contrast // B
          // Alpha stays the same
        }
        
        ctx.putImageData(imageData, 0, 0)
        
        // Convert to blob
        canvas.toBlob((blob) => {
          resolve(new File([blob], 'preprocessed.png', { type: 'image/png' }))
        }, 'image/png')
      }
      
      img.src = URL.createObjectURL(file)
    })
  }

  // Parse KTP text - Indonesian format
  const parseKTP = (text) => {
    console.log('=== RAW OCR TEXT ===')
    console.log(text)
    console.log('====================')
    
    const lines = text.split('\n').map(l => l.trim()).filter(l => l)
    const data = {
      nik: '',
      name: '',
      birthPlace: '',
      birthDate: '',
      gender: '',
      address: '',
      kelurahan: '',
      kecamatan: ''
    }

    // Helper to clean and format
    const cleanText = (str) => str.replace(/[^\w\s,.\-\/]/g, '').trim()
    const capitalizeWords = (str) => {
      return str.toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
    }

    // Find NIK first (16 digit number anywhere in text)
    for (const line of lines) {
      const nikMatch = line.match(/\b(\d{16})\b/)
      if (nikMatch) {
        data.nik = nikMatch[1]
        break
      }
    }

    // Track if we found NIK line to help locate name
    let nikLineIndex = -1
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].match(/\d{16}/)) {
        nikLineIndex = i
        break
      }
    }

    // Process each line looking for labels
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const upperLine = line.toUpperCase()
      const nextLine = lines[i + 1] || ''
      const nextNextLine = lines[i + 2] || ''
      
      // ==== NAMA ====
      if (upperLine.includes('NAMA') && !data.name) {
        // Check if name is on same line after colon
        if (line.includes(':')) {
          const afterColon = line.split(':').slice(1).join(':').trim()
          if (afterColon.length > 2 && !afterColon.match(/^\d{16}/)) {
            data.name = capitalizeWords(cleanText(afterColon))
          }
        }
        
        // If not found, check next line
        if (!data.name && nextLine && !nextLine.match(/^(NIK|TTL|ALAMAT|RT|RW|KEL|KEC|KELAMIN|JENIS|\d{3}\/\d{3})/i)) {
          data.name = capitalizeWords(cleanText(nextLine))
        }
      }

      // ==== Name from position after NIK (e-KTP format) ====
      // In e-KTP, name is usually 1-2 lines after NIK
      if (!data.name && nikLineIndex >= 0) {
        for (let j = 1; j <= 3; j++) {
          const candidateLine = lines[nikLineIndex + j]
          if (candidateLine && 
              candidateLine.length > 5 &&
              !candidateLine.match(/^(TTL|ALAMAT|RT|RW|KEL|KEC|KELAMIN|JENIS|PROVINSI|KABUPATEN|KECAMATAN|KELURAHAN|\d{3}\/\d{3})/i) &&
              !candidateLine.match(/\d{6}/)) {
            // Check if it looks like a name (letters and spaces only)
            const nameCandidate = candidateLine.replace(/[^\w\s]/g, '').trim()
            if (nameCandidate.length > 3 && nameCandidate.split(' ').length >= 1) {
              data.name = capitalizeWords(nameCandidate)
              break
            }
          }
        }
      }

      // ==== TTL (Tempat/Tanggal Lahir) ====
      if ((upperLine.includes('TTL') || upperLine.includes('TEMPAT') || upperLine === 'LAHIR') && !data.birthDate) {
        let ttlValue = ''
        
        if (line.includes(':')) {
          ttlValue = line.split(':').slice(1).join(':').trim()
        } else if (nextLine && !nextLine.match(/^\d{16}/)) {
          ttlValue = nextLine.trim()
        }
        
        if (ttlValue) {
          const parts = ttlValue.split(/[,,-]/)
          if (parts.length >= 2) {
            data.birthPlace = capitalizeWords(cleanText(parts[0]))
            const dateStr = parts.slice(1).join('-')
            const dateMatch = dateStr.match(/(\d{1,2})[\s\-\.\/](\d{1,2})[\s\-\.\/](\d{4})/)
            if (dateMatch) {
              const day = dateMatch[1].padStart(2, '0')
              const month = dateMatch[2].padStart(2, '0')
              const year = dateMatch[3]
              data.birthDate = `${year}-${month}-${day}`
            }
          }
        }
      }

      // ==== JENIS KELAMIN ====
      if ((upperLine.includes('KELAMIN') || upperLine === 'JENIS KELAMIN' || upperLine.includes('SEX')) && !data.gender) {
        let genderLine = ''
        
        if (line.includes(':')) {
          genderLine = line.split(':').slice(1).join(':').trim().toUpperCase()
        } else if (nextLine) {
          genderLine = nextLine.trim().toUpperCase()
        }
        
        if (genderLine.includes('LAKI') || genderLine === 'L' || genderLine.includes('LAKI-LAKI')) {
          data.gender = 'L'
        } else if (genderLine.includes('PEREMPUAN') || genderLine === 'P' || genderLine.includes('WANITA')) {
          data.gender = 'P'
        }
      }

      // ==== ALAMAT ====
      if (upperLine.includes('ALAMAT') && !upperLine.includes('DOMISILI') && !data.address) {
        let addrValue = ''
        
        if (line.includes(':')) {
          addrValue = line.split(':').slice(1).join(':').trim()
        }
        
        if (addrValue.length < 3 && nextLine && !nextLine.match(/^(RT|RW|KEL|KEC|\d{3}\/\d{3})/i)) {
          addrValue = nextLine.trim()
        }
        
        if (addrValue.length < 3 && nextNextLine && !nextNextLine.match(/^(RT|RW|KEL|KEC|\d{3}\/\d{3})/i)) {
          addrValue = nextLine + ' ' + nextNextLine
        }
        
        if (addrValue) {
          data.address = addrValue.replace(/^[:\s]+/, '').trim()
        }
      }

      // ==== KELURAHAN/DESA ====
      if ((upperLine.includes('KELURAHAN') || upperLine.includes('KEL/DESA') || upperLine.includes('KEL')) && !data.kelurahan) {
        const colonSplit = line.split(':')
        if (colonSplit.length > 1) {
          data.kelurahan = capitalizeWords(cleanText(colonSplit[1]))
        } else if (nextLine && !nextLine.match(/^(KEC|RT|RW|\d{3})/i)) {
          data.kelurahan = capitalizeWords(cleanText(nextLine))
        }
      }

      // ==== KECAMATAN ====
      if (upperLine.includes('KECAMATAN') && !data.kecamatan) {
        const colonSplit = line.split(':')
        if (colonSplit.length > 1) {
          data.kecamatan = capitalizeWords(cleanText(colonSplit[1]))
        } else if (nextLine && !nextLine.match(/^(RT|RW|\d{3}|KEL)/i)) {
          data.kecamatan = capitalizeWords(cleanText(nextLine))
        }
      }
    }

    // ==== FALLBACKS ====
    
    // Gender from NIK
    if (data.nik && data.nik.length === 16 && !data.gender) {
      const dayFromNik = parseInt(data.nik.substring(6, 8))
      data.gender = (dayFromNik > 40) ? 'P' : 'L'
    }
    
    // Birthdate from NIK
    if (data.nik && data.nik.length === 16 && !data.birthDate) {
      const dayRaw = parseInt(data.nik.substring(6, 8))
      const month = data.nik.substring(8, 10)
      const yearShort = data.nik.substring(10, 12)
      
      const day = (dayRaw > 40) ? (dayRaw - 40) : dayRaw
      const year = parseInt(yearShort) > 50 ? `19${yearShort}` : `20${yearShort}`
      
      data.birthDate = `${year}-${month}-${day.toString().padStart(2, '0')}`
    }

    // If address is empty or too short, use kelurahan/kecamatan
    if (!data.address || data.address.length < 5) {
      const addrParts = []
      if (data.kelurahan) addrParts.push(data.kelurahan)
      if (data.kecamatan) addrParts.push(data.kecamatan)
      if (addrParts.length > 0) {
        data.address = addrParts.join(', ')
      }
    }

    console.log('=== PARSED DATA ===')
    console.log(data)

    return data
  }

  // Process image with OCR
  const processImage = async (file) => {
    setScanning(true)
    setError('')
    setProgress(0)
    setDetectedData(null)

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target.result)
    reader.readAsDataURL(file)

    try {
      // Preprocess image for better OCR
      setProgress(5)
      const preprocessedFile = await preprocessImage(file)
      setProgress(10)

      const result = await Tesseract.recognize(preprocessedFile, 'ind+eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgress(10 + Math.round(m.progress * 90))
          }
        }
      })

      const text = result.data.text
      const parsedData = parseKTP(text)

      // Check if we got at least some data
      if (!parsedData.name && !parsedData.nik && !parsedData.birthDate) {
        setError('Tidak dapat membaca data KTP. Pastikan foto jelas dan semua teks terlihat.')
        setScanning(false)
        return
      }

      setDetectedData(parsedData)
      setScanning(false)
    } catch (err) {
      console.error('OCR Error:', err)
      setError('Gagal memproses gambar. Silakan coba lagi.')
      setScanning(false)
    }
  }

  const handleConfirm = () => {
    if (!detectedData) return
    
    const formData = {
      name: detectedData.name || '',
      gender: detectedData.gender || 'L',
      birthDate: detectedData.birthDate || '',
      birthPlace: detectedData.birthPlace || '',
      address: detectedData.address || '',
      nik: detectedData.nik || ''
    }

    onScanComplete(formData)
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
    setPreview(null)
    setError('')
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    const match = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/)
    if (match) {
      return `${match[3]}-${match[2]}-${match[1]}`
    }
    return dateStr
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white border border-[#e9e9e7] rounded-[4px] shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e9e9e7] sticky top-0 bg-white">
          <h3 className="text-base font-semibold text-[#37352f]">📷 Scan KTP</h3>
          <button onClick={onClose} className="p-2 hover:bg-[#f7f6f3] rounded-[4px] transition-colors">
            <svg className="w-4 h-4 text-[#9b9a97]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-[4px] text-red-600 text-sm">
              {error}
            </div>
          )}

          {preview && (
            <div className="mb-4 relative">
              <img src={preview} alt="Preview" className="w-full h-48 object-cover rounded-[4px] border border-[#e9e9e7]" />
              {scanning && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-[4px]">
                  <div className="text-center text-white">
                    <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-sm">Memproses... {progress}%</p>
                    <p className="text-xs opacity-75 mt-1">Meningkatkan kontras...</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Detected Data Preview */}
          {detectedData && !scanning && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-[#37352f] mb-3">📋 Data Terdeteksi:</h4>
              <div className="bg-[#f7f6f3] border border-[#e9e9e7] rounded-[4px] p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#9b9a97] text-sm">NIK</span>
                  <span className="text-[#37352f] font-mono text-sm">{detectedData.nik || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9b9a97] text-sm">Nama</span>
                  <span className="text-[#37352f] text-sm font-medium">{detectedData.name || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9b9a97] text-sm">Jenis Kelamin</span>
                  <span className="text-[#37352f] text-sm">{detectedData.gender === 'L' ? 'Laki-laki' : detectedData.gender === 'P' ? 'Perempuan' : '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9b9a97] text-sm">Tgl Lahir</span>
                  <span className="text-[#37352f] text-sm">{formatDate(detectedData.birthDate)}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-[#9b9a97] text-sm">Alamat</span>
                  <span className="text-[#37352f] text-sm text-right max-w-[60%]">{detectedData.address || '-'}</span>
                </div>
              </div>
              
              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleRetry}
                  className="flex-1 py-2.5 px-4 bg-[#f7f6f3] text-[#37352f] border border-[#e9e9e7] rounded-[4px] font-medium hover:bg-[#efefef] transition-colors"
                >
                  🔄 Ulangi
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 py-2.5 px-4 bg-[#d97706] text-white rounded-[4px] font-medium hover:bg-[#b45309] transition-colors"
                >
                  ✅ Gunakan
                </button>
              </div>
              
              <p className="text-xs text-[#9b9a97] mt-3 text-center">
                Data akan diisi otomatis ke form. Periksa dan lengkapi jika ada yang salah.
              </p>
            </div>
          )}

          {!scanning && !detectedData && (
            <div className="space-y-3">
              {/* Camera Button */}
              <label className="flex items-center justify-center gap-2 w-full py-4 px-4 bg-[#d97706] hover:bg-[#b45309] text-white rounded-[4px] cursor-pointer transition-colors font-medium">
                <span className="text-lg">📸</span>
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
              <label className="flex items-center justify-center gap-2 w-full py-4 px-4 bg-[#f7f6f3] hover:bg-[#efefef] text-[#37352f] border border-[#e9e9e7] rounded-[4px] cursor-pointer transition-colors font-medium">
                <span className="text-lg">📁</span>
                <span>Upload dari Galeri</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {/* Tips */}
          {!scanning && !detectedData && (
            <div className="mt-5 p-4 bg-[#f7f6f3] rounded-[4px]">
              <p className="text-xs text-[#9b9a97] font-medium mb-2">💡 Tips hasil lebih akurat:</p>
              <ul className="text-xs text-[#5f5e5b] space-y-1">
                <li>• Foto KTP dalam keadaan tegak (portrait)</li>
                <li>• Pastikan semua teks terlihat jelas</li>
                <li>• Pencahayaan merata, tidak ada bayangan</li>
                <li>• Tidak blur atau goyang</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}