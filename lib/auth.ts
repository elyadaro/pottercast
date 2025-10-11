export type UserProfile = {
  id: string
  first_name: string
  last_name: string
  phone: string | null
  email: string | null
}

export async function getCurrentUser() {
  try {
    const response = await fetch('/api/auth/user')
    if (!response.ok) return null

    const data = await response.json()
    return data.user
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const response = await fetch(`/api/auth/profile?userId=${userId}`)
    if (!response.ok) return null

    const data = await response.json()
    return data.profile
  } catch (error) {
    console.error('Error getting user profile:', error)
    return null
  }
}

export async function createUserProfile(
  userId: string,
  firstName: string,
  lastName: string,
  phone?: string,
  isAdmin?: boolean
) {
  try {
    const response = await fetch('/api/auth/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        firstName,
        lastName,
        phone,
        isAdmin
      })
    })

    if (!response.ok) return false

    const data = await response.json()
    return data.success
  } catch (error) {
    console.error('Error creating user profile:', error)
    return false
  }
}

export async function getUserVote(userId: string) {
  try {
    const response = await fetch(`/api/votes?userId=${userId}`)
    if (!response.ok) return null

    const data = await response.json()
    return data.vote
  } catch (error) {
    console.error('Error getting user vote:', error)
    return null
  }
}

export async function signOut() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' })
  } catch (error) {
    console.error('Error signing out:', error)
  }
}
