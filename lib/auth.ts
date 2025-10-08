import { createClient } from './supabase'

export type UserProfile = {
  id: string
  first_name: string
  last_name: string
  phone: string | null
  email: string | null
}

export async function getCurrentUser() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const supabase = createClient()

  // Get auth user for email
  const { data: { user } } = await supabase.auth.getUser()

  // Get profile data
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (error || !data) return null

  return {
    id: data.id,
    first_name: data.first_name,
    last_name: data.last_name,
    phone: data.phone,
    email: user?.email || null
  }
}

export async function createUserProfile(
  userId: string,
  firstName: string,
  lastName: string,
  phone?: string,
  isAdmin?: boolean
) {
  const supabase = createClient()

  const { error } = await supabase
    .from('users')
    .insert({
      id: userId,
      first_name: firstName,
      last_name: lastName,
      phone: phone || null,
      is_admin: isAdmin || false
    })

  if (error) {
    console.error('Error creating user profile:', error)
    return false
  }

  return true
}

export async function getUserVote(userId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('votes')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) return null
  return data
}

export async function signOut() {
  const supabase = createClient()
  await supabase.auth.signOut()
}
