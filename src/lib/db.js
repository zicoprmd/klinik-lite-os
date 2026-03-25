// Database helper - Supabase with localStorage fallback
import { supabase, isSupabaseConfigured } from './supabase'

const STORAGE_KEYS = {
  users: 'klinik_users',
  organizations: 'klinik_organizations',
  patients: 'klinik_patients',
  visits: 'klinik_visits'
}

// ==================== ORGANIZATIONS ====================
export const getOrganizations = async () => {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase.from('organizations').select('*').order('name')
    if (error) throw error
    return data
  }
  // Fallback to localStorage
  const stored = localStorage.getItem(STORAGE_KEYS.organizations)
  if (stored) return JSON.parse(stored)
  
  // Initialize default
  const defaults = [
    { id: 'org-001', name: 'Klinik Utama Jaya', slug: 'utama', address: 'Jl. Utama No. 1', phone: '021-1234567', is_active: true },
    { id: 'org-002', name: 'Klinik Sehat Bersama', slug: 'sehat', address: 'Jl. Sehat No. 2', phone: '021-7654321', is_active: true },
    { id: 'org-003', name: 'Klinik Medika', slug: 'medika', address: 'Jl. Medika No. 3', phone: '021-1111222', is_active: true }
  ]
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.organizations, JSON.stringify(defaults))
  }
  return defaults
}

export const addOrganization = async (org) => {
  const newOrg = { ...org, is_active: true }
  if (!newOrg.id) {
    newOrg.id = `org-${Date.now()}`
  }
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase.from('organizations').insert(newOrg).select().single()
    if (error) throw error
    return data
  }
  const orgs = await getOrganizations()
  newOrg.id = `org-${Date.now()}`
  orgs.push(newOrg)
  localStorage.setItem(STORAGE_KEYS.organizations, JSON.stringify(orgs))
  return newOrg
}

export const updateOrganization = async (id, updates) => {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase.from('organizations').update(updates).eq('id', id).select().single()
    if (error) throw error
    return data
  }
  const orgs = await getOrganizations()
  const idx = orgs.findIndex(o => o.id === id)
  if (idx >= 0) { orgs[idx] = { ...orgs[idx], ...updates }; localStorage.setItem(STORAGE_KEYS.organizations, JSON.stringify(orgs)) }
  return orgs[idx]
}

export const deleteOrganization = async (id) => {
  if (isSupabaseConfigured()) {
    const { error } = await supabase.from('organizations').delete().eq('id', id)
    if (error) throw error
    return
  }
  const orgs = await getOrganizations()
  const filtered = orgs.filter(o => o.id !== id)
  localStorage.setItem(STORAGE_KEYS.organizations, JSON.stringify(filtered))
}

// ==================== USERS ====================
export const getUsers = async () => {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase.from('users').select('*').order('name')
    if (error) throw error
    return data
  }
  const stored = localStorage.getItem(STORAGE_KEYS.users)
  if (stored) return JSON.parse(stored)
  
  const defaults = [
    { id: 'user-super', organization_id: null, email: 'superadmin@klinik.com', password: 'super123', name: 'Super Admin', role: 'super_admin', is_active: true },
    { id: 'user-001', organization_id: 'org-001', email: 'admin@utama.com', password: 'admin123', name: 'Budi Santoso', role: 'admin', is_active: true },
    { id: 'user-002', organization_id: 'org-001', email: 'dokter@utama.com', password: 'demo123', name: 'Dr. Siti Aminah', role: 'dokter', is_active: true },
    { id: 'user-003', organization_id: 'org-002', email: 'admin@sehat.com', password: 'admin123', name: 'Ahmad Fauzi', role: 'admin', is_active: true },
    { id: 'user-004', organization_id: 'org-002', email: 'dokter@sehat.com', password: 'demo123', name: 'Dr. Rina Kusuma', role: 'dokter', is_active: true },
    { id: 'user-005', organization_id: 'org-003', email: 'admin@medika.com', password: 'admin123', name: 'Joko Prasetyo', role: 'admin', is_active: true }
  ]
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(defaults))
  }
  return defaults
}

export const addUser = async (userData) => {
  const newUser = { ...userData, is_active: true }
  if (!newUser.id) {
    newUser.id = `user-${Date.now()}`
  }
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase.from('users').insert(newUser).select().single()
    if (error) throw error
    return data
  }
  const users = await getUsers()
  newUser.id = `user-${Date.now()}`
  users.push(newUser)
  localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users))
  return newUser
}

export const updateUser = async (id, updates) => {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase.from('users').update(updates).eq('id', id).select().single()
    if (error) throw error
    return data
  }
  const users = await getUsers()
  const idx = users.findIndex(u => u.id === id)
  if (idx >= 0) { users[idx] = { ...users[idx], ...updates }; localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users)) }
  return users[idx]
}

export const deleteUser = async (id) => {
  if (isSupabaseConfigured()) {
    const { error } = await supabase.from('users').delete().eq('id', id)
    if (error) throw error
    return
  }
  const users = await getUsers()
  const filtered = users.filter(u => u.id !== id)
  localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(filtered))
}

// ==================== PATIENTS ====================
export const getPatients = async (organizationId = null, options = {}) => {
  const { page = 1, pageSize = 25, search = '', searchPhone = false } = options
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  if (isSupabaseConfigured()) {
    try {
      let query = supabase
        .from('patients')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })

      if (organizationId) {
        query = query.eq('organization_id', organizationId)
      }

      // Apply search filter
      if (search) {
        if (searchPhone) {
          query = query.or(`name.ilike.%${search}%,medical_record_number.ilike.%${search}%,phone.ilike.%${search}%`)
        } else {
          query = query.or(`name.ilike.%${search}%,medical_record_number.ilike.%${search}%`)
        }
      }

      // Apply pagination
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) {
        console.error('Supabase getPatients error:', error)
        throw error
      }

      const totalCount = count || 0
      return {
        data,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
        currentPage: page,
        pageSize
      }
    } catch (err) {
      console.error('Failed to fetch from Supabase, falling back to localStorage:', err)
    }
  }

  // Fallback to localStorage
  const stored = localStorage.getItem(STORAGE_KEYS.patients)
  let patients = stored ? JSON.parse(stored) : []

  if (organizationId) {
    patients = patients.filter(p => p.organization_id === organizationId)
  }

  // Apply search filter for localStorage
  if (search) {
    const searchLower = search.toLowerCase()
    patients = patients.filter(p =>
      p.name?.toLowerCase().includes(searchLower) ||
      p.medical_record_number?.toLowerCase().includes(searchLower) ||
      (searchPhone && p.phone?.toLowerCase().includes(searchLower))
    )
  }

  const totalCount = patients.length
  const paginatedPatients = patients.slice(from, to)

  return {
    data: paginatedPatients,
    totalCount,
    totalPages: Math.ceil(totalCount / pageSize),
    currentPage: page,
    pageSize
  }
}

export const addPatient = async (patient) => {
  // Generate ID if not provided
  if (!patient.id) {
    patient.id = `pat-${Date.now()}`
  }
  
  console.log('addPatient called with:', patient)
  
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from('patients').insert(patient).select().single()
      if (error) {
        console.error('Supabase insert error:', error)
        throw error
      }
      console.log('Supabase insert success:', data)
      return data
    } catch (err) {
      console.error('Supabase failed, falling back to localStorage:', err)
    }
  }
  
  // Fallback to localStorage
  const patients = await getPatients()
  patient.created_at = new Date().toISOString()
  patients.push(patient)
  localStorage.setItem(STORAGE_KEYS.patients, JSON.stringify(patients))
  console.log('Saved to localStorage:', patient)
  return patient
}

export const updatePatient = async (id, updates) => {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase.from('patients').update(updates).eq('id', id).select().single()
    if (error) throw error
    return data
  }
  const patients = await getPatients()
  const idx = patients.findIndex(p => p.id === id)
  if (idx >= 0) { patients[idx] = { ...patients[idx], ...updates }; localStorage.setItem(STORAGE_KEYS.patients, JSON.stringify(patients)) }
  return patients[idx]
}

export const deletePatient = async (id) => {
  if (isSupabaseConfigured()) {
    const { error } = await supabase.from('patients').delete().eq('id', id)
    if (error) throw error
    return
  }
  const patients = await getPatients()
  const filtered = patients.filter(p => p.id !== id)
  localStorage.setItem(STORAGE_KEYS.patients, JSON.stringify(filtered))
}

// ==================== VISITS ====================
export const getVisits = async (patientId = null, organizationId = null) => {
  if (isSupabaseConfigured()) {
    let query = supabase.from('visits').select('*').order('visit_date', { ascending: false })
    if (patientId) query = query.eq('patient_id', patientId)
    if (organizationId) query = query.eq('organization_id', organizationId)
    const { data, error } = await query
    if (error) throw error
    return data
  }
  const stored = localStorage.getItem(STORAGE_KEYS.visits)
  let visits = stored ? JSON.parse(stored) : []
  if (patientId) visits = visits.filter(v => v.patient_id === patientId)
  if (organizationId) visits = visits.filter(v => v.organization_id === organizationId)
  return visits
}

export const addVisit = async (visit) => {
  if (!visit.id) {
    visit.id = `visit-${Date.now()}`
  }
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase.from('visits').insert(visit).select().single()
    if (error) throw error
    return data
  }
  const visits = await getVisits()
  visit.id = `visit-${Date.now()}`
  visit.created_at = new Date().toISOString()
  visits.push(visit)
  localStorage.setItem(STORAGE_KEYS.visits, JSON.stringify(visits))
  return visit
}