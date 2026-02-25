'use client'

import { logout } from '@/app/(auth)/login/actions'

export function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="logout-btn"
        style={{
          width: '100%', textAlign: 'left', padding: '0.5rem 0.75rem',
          fontSize: '0.8rem', color: 'oklch(0.50 0.015 255)',
          borderRadius: '0.5rem', border: 'none', background: 'none',
          cursor: 'pointer', transition: 'background 0.15s',
        }}
      >
        ↩ Uitloggen
      </button>
    </form>
  )
}
