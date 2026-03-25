import { create } from 'zustand'
import { useAuthStore } from './authStore'
import * as db from '../lib/db'

export const usePatientStore = create((set, get) => ({
  patients: [],
  currentPatient: null,
  visits: [],
  loading: false,
  error: null,
  // Pagination state
  totalPatients: 0,
  totalPages: 0,
  currentPage: 1,
  pageSize: 25,
  searchQuery: '',

  initialize: async () => {
    set({ patients: [], visits: [], loading: false, totalPatients: 0, totalPages: 0, currentPage: 1 })
  },

  fetchPatients: async (options = {}) => {
    const { page = 1, search = '' } = options
    set({ loading: true, searchQuery: search, currentPage: page })

    try {
      const org = useAuthStore.getState().organization
      const role = useAuthStore.getState().role

      let orgId = null
      if (role === 'super_admin') {
        orgId = null // Super admin sees all
      } else if (org) {
        orgId = org.id
      } else {
        set({ patients: [], loading: false, totalPatients: 0, totalPages: 0 })
        return
      }

      const result = await db.getPatients(orgId, {
        page,
        pageSize: get().pageSize,
        search
      })

      set({
        patients: result.data || [],
        totalPatients: result.totalCount,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        loading: false
      })
    } catch (err) {
      console.error('fetchPatients error:', err)
      set({ error: err.message, loading: false })
    }
  },

  fetchPatient: async (id) => {
    set({ loading: true })
    try {
      const patients = get().patients
      const patient = patients.find(p => p.id === id)
      set({ currentPatient: patient, loading: false })
    } catch (err) {
      set({ error: err.message, loading: false })
    }
  },

  createPatient: async (patientData) => {
    const org = useAuthStore.getState().organization
    const role = useAuthStore.getState().role

    if (!org && role !== 'super_admin') {
      throw new Error('Tidak ada organisasi')
    }

    let orgId = org?.id
    if (role === 'super_admin' && !orgId) {
      orgId = 'org-001'
    }

    const newPatient = await db.addPatient({
      organization_id: orgId,
      name: patientData.name,
      gender: patientData.gender,
      birth_date: patientData.birth_date,
      age: patientData.age,
      address: patientData.address,
      phone: patientData.phone,
      medical_record_number: patientData.medical_record_number || `RM-${Date.now()}`,
      blood_type: patientData.blood_type,
      allergies: patientData.allergies
    })

    // Refresh current page
    const { currentPage, searchQuery } = get()
    await get().fetchPatients({ page: currentPage, search: searchQuery })
    return newPatient
  },

  updatePatient: async (id, patientData) => {
    await db.updatePatient(id, patientData)

    // Refresh current page
    const { currentPage, searchQuery } = get()
    await get().fetchPatients({ page: currentPage, search: searchQuery })

    const patients = get().patients
    const current = patients.find(p => p.id === id)
    set({ currentPatient: current })
  },

  deletePatient: async (id) => {
    await db.deletePatient(id)

    // Refresh current page
    const { currentPage, searchQuery, totalPatients, pageSize } = get()

    // If last item on page, go to previous page
    let newPage = currentPage
    if (totalPatients > 1 && totalPatients % pageSize === 1 && currentPage > 1) {
      newPage = currentPage - 1
    }

    await get().fetchPatients({ page: newPage, search: searchQuery })
  },

  importPatients: async (patientsData) => {
    const org = useAuthStore.getState().organization
    const role = useAuthStore.getState().role

    if (!org && role !== 'super_admin') {
      throw new Error('Tidak ada organisasi')
    }

    let orgId = org?.id
    if (role === 'super_admin' && !orgId) {
      orgId = 'org-001'
    }

    const results = { success: 0, failed: 0, errors: [] }

    for (const patientData of patientsData) {
      try {
        await db.addPatient({
          organization_id: orgId,
          name: patientData.name,
          gender: patientData.gender,
          birth_date: patientData.birth_date,
          age: patientData.age,
          address: patientData.address,
          phone: patientData.phone,
          medical_record_number: patientData.medical_record_number || `RM-${Date.now()}`
        })
        results.success++
      } catch (err) {
        results.failed++
        results.errors.push({ name: patientData.name, error: err.message })
      }
    }

    // Refresh current page
    const { currentPage, searchQuery } = get()
    await get().fetchPatients({ page: currentPage, search: searchQuery })
    return results
  },

  // Visits
  fetchVisits: async (patientId) => {
    set({ loading: true })
    try {
      const visits = await db.getVisits(patientId)
      set({ visits, loading: false })
    } catch (err) {
      set({ error: err.message, loading: false })
    }
  },

  getTodaysVisits: async () => {
    const org = useAuthStore.getState().organization
    const role = useAuthStore.getState().role

    let orgId = org?.id
    if (role === 'super_admin' && !orgId) {
      orgId = 'org-001'
    }
    if (!orgId) return []

    const visits = await db.getVisits(null, orgId)
    const today = new Date().toISOString().split('T')[0]

    const todayVisits = visits.filter(v =>
      v.visit_date?.startsWith(today)
    )

    // Fetch all patients for this org to attach patient data
    const result = await db.getPatients(orgId, { page: 1, pageSize: 10000 })
    const patients = result.data

    return todayVisits.map(v => ({
      ...v,
      patients: patients.find(p => p.id === v.patient_id)
    }))
  },

  createVisit: async (visitData) => {
    const org = useAuthStore.getState().organization
    const role = useAuthStore.getState().role

    let orgId = org?.id
    if (role === 'super_admin' && !orgId) {
      orgId = 'org-001'
    }
    if (!orgId) throw new Error('Tidak ada organisasi')

    const newVisit = await db.addVisit({
      organization_id: orgId,
      patient_id: visitData.patient_id,
      doctor_id: visitData.doctor_id,
      visit_date: visitData.visit_date || new Date().toISOString(),
      subjective: visitData.subjective,
      objective: visitData.objective,
      assessment: visitData.assessment,
      plan: visitData.plan,
      status: visitData.status || 'completed'
    })

    return newVisit
  },

  updateVisit: async (id, visitData) => {
    await db.addVisit({ id, ...visitData })
  },

  deleteVisit: async (id) => {
    // Not implemented in db.js yet
  },

  // Set page size
  setPageSize: (size) => {
    set({ pageSize: size })
  },

  // Go to specific page
  goToPage: (page) => {
    const { searchQuery } = get()
    get().fetchPatients({ page, search: searchQuery })
  }
}))