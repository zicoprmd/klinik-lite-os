import { create } from 'zustand'
import { useAuthStore } from './authStore'
import * as db from '../lib/db'

export const usePatientStore = create((set, get) => ({
  patients: [],
  currentPatient: null,
  visits: [],
  loading: false,
  error: null,

  initialize: async () => {
    set({ patients: [], visits: [], loading: false })
  },

  fetchPatients: async () => {
    set({ loading: true })
    try {
      const org = useAuthStore.getState().organization
      const role = useAuthStore.getState().role
      
      let patients
      if (role === 'super_admin') {
        // Super admin sees all patients
        patients = await db.getPatients()
      } else if (org) {
        patients = await db.getPatients(org.id)
      } else {
        patients = []
      }
      
      set({ patients, loading: false })
    } catch (err) {
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
    
    // For super_admin, use first organization or require selection
    if (!org && role !== 'super_admin') {
      throw new Error('Tidak ada organisasi')
    }
    
    // For super_admin without organization selected, use org-001 as default
    let orgId = org?.id
    if (role === 'super_admin' && !orgId) {
      orgId = 'org-001' // Default for super_admin
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
    
    await get().fetchPatients()
    return newPatient
  },

  updatePatient: async (id, patientData) => {
    await db.updatePatient(id, patientData)
    await get().fetchPatients()
    
    const patients = get().patients
    const current = patients.find(p => p.id === id)
    set({ currentPatient: current })
  },

  deletePatient: async (id) => {
    await db.deletePatient(id)
    await get().fetchPatients()
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
    
    // Attach patient data
    const patients = await db.getPatients(orgId)
    
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
    await db.addVisit({ id, ...visitData }) // Using upsert pattern
  },

  deleteVisit: async (id) => {
    // Not implemented in db.js yet
  }
}))