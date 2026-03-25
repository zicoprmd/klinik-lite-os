import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import * as db from '../lib/db'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      role: null,
      organization: null,
      loading: false,
      error: null,

      signIn: async (email, password) => {
        set({ loading: true, error: null })
        
        try {
          const users = await db.getUsers()
          const user = users.find(u => u.email === email && u.password === password)
          
          if (!user) {
            throw new Error('Email atau password salah')
          }
          
          // Skip is_active check for demo
          // if (!user.is_active) throw new Error('Akun dinonaktifkan')

          let organization = null
          if (user.organization_id) {
            const orgs = await db.getOrganizations()
            organization = orgs.find(o => o.id === user.organization_id)
          }

          // Save session
          localStorage.setItem('klinik_session', JSON.stringify({ user, organization }))
          
          set({ user, role: user.role, organization, loading: false })
          return user
        } catch (err) {
          console.error('Login error:', err.message)
          set({ loading: false, error: err.message })
          throw err
        }
      },

      signOut: async () => {
        localStorage.removeItem('klinik_session')
        set({ user: null, role: null, organization: null })
      },

      getOrganizations: () => db.getOrganizations(),
      
      getOrganizationBySlug: async (slug) => {
        const orgs = await db.getOrganizations()
        return orgs.find(o => o.slug === slug)
      },

      // Admin functions
      getUsers: async () => {
        const org = get().organization
        const role = get().role
        
        const allUsers = await db.getUsers()
        
        // Super admin can see all users
        if (role === 'super_admin') {
          return allUsers
        }
        
        // Regular admin only sees users in their organization
        if (!org) throw new Error('Tidak ada organisasi')
        return allUsers.filter(u => u.organization_id === org.id)
      },

      addUser: async (userData) => {
        const org = get().organization
        const role = get().role
        let organizationId
        
        // Super admin can specify organization, otherwise use current org
        if (role === 'super_admin' && userData.organization_id) {
          organizationId = userData.organization_id
        } else if (org) {
          organizationId = org.id
        } else {
          throw new Error('Tidak ada organisasi')
        }
        
        const users = await db.getUsers()
        
        if (users.find(u => u.email === userData.email)) {
          throw new Error('Email sudah terdaftar')
        }
        
        const newUser = await db.addUser({
          organization_id: organizationId,
          name: userData.name,
          email: userData.email,
          password: userData.password,
          role: userData.role
        })
        
        return newUser
      },

      deleteUser: async (userId) => {
        const currentUser = get().user
        if (currentUser?.id === userId) {
          throw new Error('Tidak bisa menghapus akun sendiri')
        }
        
        await db.deleteUser(userId)
      },

      isAdmin: () => get().role === 'admin' || get().role === 'super_admin',

      // Initialize - restore session
      initialize: async () => {
        try {
          const session = localStorage.getItem('klinik_session')
          if (session) {
            const { user, organization } = JSON.parse(session)
            set({ user, role: user?.role, organization })
          }
        } catch (e) {
          console.error('Session restore error:', e)
        }
        
        set({ loading: false })
      }
    }),
    {
      name: 'klinik-auth',
      partialize: (state) => ({ user: state.user, role: state.role, organization: state.organization })
    }
  )
)