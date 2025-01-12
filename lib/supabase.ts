import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  },
  global: {
    headers: { 'x-my-custom-header': 'CityGuide' },
  },
  db: {
    schema: 'public',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

// Verify the connection and table existence
const verifySetup = async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true })
    
    if (error) {
      console.error('Error connecting to Supabase:', error)
      console.error('Supabase URL:', supabaseUrl)
      console.error('Error details:', JSON.stringify(error, null, 2))
      return false
    }
    
    console.log('Successfully connected to Supabase and verified users table')
    return true
  } catch (err) {
    console.error('Unexpected error during Supabase verification:', err)
    console.error('Error details:', JSON.stringify(err, null, 2))
    return false
  }
}

verifySetup()

