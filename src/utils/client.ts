import { createClient } from '@supabase/supabase-js'
import { SpineClient, SpineConfig, AuthClient, AppsClient } from '../types'

export function createSpineClient(config: SpineConfig): SpineClient {
  const supabase = createClient(config.database.url, config.database.url.replace('/rest/v1', '/auth/v1'))

  const authClient: AuthClient = {
    signIn: async (credentials) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
      })
      
      if (error) throw error
      
      return {
        user: {
          id: data.user!.id,
          email: data.user!.email!,
          name: data.user!.user_metadata?.name,
          avatar_url: data.user!.user_metadata?.avatar_url,
          role: data.user!.user_metadata?.role,
          account_id: data.user!.user_metadata?.account_id || data.user!.id,
          created_at: data.user!.created_at,
          updated_at: data.user!.updated_at || data.user!.created_at
        },
        session: data.session
      }
    },
    
    signUp: async (credentials) => {
      const { data, error } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
          data: {
            name: credentials.name
          }
        }
      })
      
      if (error) throw error
      
      return {
        user: {
          id: data.user!.id,
          email: data.user!.email!,
          name: data.user!.user_metadata?.name,
          avatar_url: data.user!.user_metadata?.avatar_url,
          role: data.user!.user_metadata?.role,
          account_id: data.user!.user_metadata?.account_id || data.user!.id,
          created_at: data.user!.created_at,
          updated_at: data.user!.updated_at || data.user!.created_at
        },
        session: data.session
      }
    },
    
    signOut: async () => {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    },
    
    getCurrentUser: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return null
      
      return {
        id: user.id,
        email: user.email!,
        name: user.user_metadata?.name,
        avatar_url: user.user_metadata?.avatar_url,
        role: user.user_metadata?.role,
        account_id: user.user_metadata?.account_id || user.id,
        created_at: user.created_at,
        updated_at: user.updated_at || user.created_at
      }
    },
    
    onAuthStateChange: (callback) => {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        const user = session?.user ? {
          id: session.user.id,
          email: session.user.email!,
          name: session.user.user_metadata?.name,
          avatar_url: session.user.user_metadata?.avatar_url,
          role: session.user.user_metadata?.role,
          account_id: session.user.user_metadata?.account_id || session.user.id,
          created_at: session.user.created_at,
          updated_at: session.user.updated_at || session.user.created_at
        } : null
        
        callback(user)
      })
      
      return () => subscription.unsubscribe()
    }
  }

  const appsClient: AppsClient = {
    list: async (filters) => {
      const { data, error } = await supabase.rpc('get_account_apps', {
        account_id: filters?.account_id,
        include_system: filters?.include_system !== false,
        include_inactive: filters?.include_inactive === true
      })
      
      if (error) throw error
      return data || []
    },
    
    install: async (appSlug, options) => {
      const { error } = await supabase.rpc('install_app', {
        app_slug: appSlug,
        account_id: options?.account_id,
        config: options?.config || {}
      })
      
      if (error) throw error
    },
    
    uninstall: async (appSlug) => {
      const { error } = await supabase.rpc('uninstall_app', {
        app_slug: appSlug
      })
      
      if (error) throw error
    },
    
    update: async (appSlug) => {
      const { error } = await supabase.rpc('update_app', {
        app_slug: appSlug
      })
      
      if (error) throw error
    }
  }

  return {
    config,
    supabase,
    auth: authClient,
    apps: appsClient
  }
}
