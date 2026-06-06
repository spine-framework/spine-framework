export interface SpineConfig {
  database: {
    url: string
    poolSize?: number
  }
  auth: {
    providers: string[]
    sessionTimeout: string
  }
  apps: {
    registry: string
    autoUpdate: boolean
  }
  ai?: {
    provider: string
    model: string
  }
}

export interface SpineClient {
  config: SpineConfig
  supabase: any
  auth: AuthClient
  apps: AppsClient
}

export interface AuthClient {
  signIn: (credentials: SignInCredentials) => Promise<AuthResult>
  signUp: (credentials: SignUpCredentials) => Promise<AuthResult>
  signOut: () => Promise<void>
  getCurrentUser: () => Promise<User | null>
  onAuthStateChange: (callback: (user: User | null) => void) => () => void
}

export interface AppsClient {
  list: (filters?: AppFilters) => Promise<App[]>
  install: (appSlug: string, options?: InstallOptions) => Promise<void>
  uninstall: (appSlug: string) => Promise<void>
  update: (appSlug: string) => Promise<void>
}

export interface User {
  id: string
  email: string
  name?: string
  avatar_url?: string
  role?: string
  account_id: string
  created_at: string
  updated_at: string
}

export interface Account {
  id: string
  name: string
  slug: string
  type: 'tenant' | 'organization' | 'individual'
  owner_account_id?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface App {
  id: string
  slug: string
  name: string
  description: string
  version: string
  app_type: string
  source: string
  owner_account_id?: string
  is_active: boolean
  is_system: boolean
  min_role?: string
  config: Record<string, any>
  nav_items: NavItem[]
  route_prefix?: string
  renderer: string
  created_at: string
}

export interface NavItem {
  title: string
  path: string
  icon: string
  order: number
  children?: NavItem[]
}

export interface SignInCredentials {
  email: string
  password: string
}

export interface SignUpCredentials {
  email: string
  password: string
  name?: string
}

export interface AuthResult {
  user: User
  session: any
}

export interface AppFilters {
  account_id?: string
  include_system?: boolean
  include_inactive?: boolean
  app_type?: string
}

export interface InstallOptions {
  account_id?: string
  config?: Record<string, any>
}

export interface Permission {
  action: string
  resource: string
  conditions?: Record<string, any>
}

export interface Role {
  id: string
  slug: string
  name: string
  description: string
  permissions: Permission[]
}

export interface Item {
  id: string
  type_id: string
  account_id: string
  title: string
  content: any
  status: string
  created_at: string
  updated_at: string
}

export interface Thread {
  id: string
  target_type: string
  target_id: string
  title: string
  visibility: string
  status: string
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  thread_id: string
  direction: 'in' | 'out'
  content: any
  sequence: number
  visibility: string
  created_at: string
}
