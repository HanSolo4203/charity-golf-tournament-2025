import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database helper functions
export const db = {
  // Events
  async getEvents() {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('time', { ascending: true })
    
    if (error) throw error
    return data || []
  },

  async createEvent(eventData) {
    const { data, error } = await supabase
      .from('events')
      .insert(eventData)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async updateEvent(id, eventData) {
    const { data, error } = await supabase
      .from('events')
      .update(eventData)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async deleteEvent(id) {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    return true
  },

  // Raffle Items
  async getRaffleItems() {
    const { data, error } = await supabase
      .from('raffle_items')
      .select('*')
      .order('id', { ascending: true })
    
    if (error) throw error
    return data || []
  },

  async createRaffleItem(raffleData) {
    const { data, error } = await supabase
      .from('raffle_items')
      .insert(raffleData)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async updateRaffleItem(id, raffleData) {
    const { data, error } = await supabase
      .from('raffle_items')
      .update(raffleData)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async deleteRaffleItem(id) {
    const { error } = await supabase
      .from('raffle_items')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    return true
  },

  // Admin Users
  async checkAdminCredentials(username, password) {
    const { data, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('username', username)
      .eq('password_hash', password)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - invalid credentials
        return null
      }
      throw error
    }
    
    return data
  },

  // Storage
  async uploadLogo(file, fileName) {
    const { data, error } = await supabase.storage
      .from('sponsor-logos')
      .upload(fileName, file)
    
    if (error) throw error
    return data
  },

  async getLogoUrl(filePath) {
    const { data } = supabase.storage
      .from('sponsor-logos')
      .getPublicUrl(filePath)
    
    return data.publicUrl
  },

  async deleteLogo(filePath) {
    const { error } = await supabase.storage
      .from('sponsor-logos')
      .remove([filePath])
    
    if (error) throw error
    return true
  },

  // Organization Settings
  async getOrganizationSettings() {
    const { data, error } = await supabase
      .from('organization_settings')
      .select('*')
    
    if (error) throw error
    
    // Convert array to object for easier access
    const settings = {}
    data.forEach(setting => {
      settings[setting.setting_key] = setting.setting_value
    })
    
    return settings
  },

  async updateOrganizationSetting(key, value) {
    const { data, error } = await supabase
      .from('organization_settings')
      .upsert({ setting_key: key, setting_value: value })
    
    if (error) throw error
    return data
  }
}
