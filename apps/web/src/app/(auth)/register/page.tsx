import Link from 'next/link'
import { register } from '../login/actions'

type Props = { searchParams: Promise<{ error?: string; success?: string }> }

const inputStyle = {
  width: '100%', padding: '0.75rem 1rem', fontSize: '0.9rem',
  border: '1.5px solid oklch(0.88 0.01 255)', borderRadius: '0.625rem',
  outline: 'none', background: 'white', color: 'oklch(0.13 0.02 255)',
  boxSizing: 'border-box' as const,
}

const labelStyle = {
  display: 'block', fontSize: '0.825rem', fontWeight: 600,
  color: 'oklch(0.30 0.02 255)', marginBottom: '0.4rem',
}

export default async function RegisterPage({ searchParams }: Props) {
  const { error, success } = await searchParams

  if (success === 'check_email') {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'oklch(0.99 0.003 255)', padding: '2rem' }}>
        <div style={{ maxWidth: 420, textAlign: 'center', background: 'white', borderRadius: '1.25rem', padding: '3rem 2.5rem', border: '1px solid oklch(0.91 0.01 255)', boxShadow: '0 4px 24px oklch(0 0 0 / 0.06)' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1.25rem' }}>📧</div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'oklch(0.13 0.02 255)', marginBottom: '0.75rem' }}>Check je e-mail</h2>
          <p style={{ color: 'oklch(0.50 0.015 255)', fontSize: '0.9rem', lineHeight: 1.7 }}>
            We hebben een bevestigingslink gestuurd. Klik op de link om je account te activeren.
          </p>
          <Link href="/login" style={{ display: 'inline-block', marginTop: '1.5rem', fontSize: '0.875rem', color: 'oklch(0.52 0.21 255)', fontWeight: 600, textDecoration: 'none' }}>
            ← Terug naar inloggen
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex' }}>
      {/* Brand panel */}
      <div style={{
        flex: '0 0 42%', display: 'none',
        background: 'linear-gradient(160deg, oklch(0.40 0.22 255) 0%, oklch(0.55 0.20 220) 100%)',
        padding: '3rem', flexDirection: 'column', justifyContent: 'space-between',
      }} className="brand-panel">
        <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white', letterSpacing: '-0.03em' }}>Fiscio</span>
        <div>
          <p style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white', lineHeight: 1.2, marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>
            Start gratis.<br />Stop met papiertjes.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {['✓ Geen creditcard nodig', '✓ AVG-compliant', '✓ Servers in Nederland (EU)', '✓ Annuleer wanneer je wil'].map(f => (
              <p key={f} style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.95rem', margin: 0 }}>{f}</p>
            ))}
          </div>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>© {new Date().getFullYear()} Fiscio</p>
      </div>

      {/* Form panel */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: 'oklch(0.99 0.003 255)' }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ marginBottom: '2.5rem' }}>
            <Link href="/" style={{ textDecoration: 'none' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'oklch(0.52 0.21 255)', letterSpacing: '-0.02em' }}>Fiscio</span>
            </Link>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'oklch(0.13 0.02 255)', marginTop: '1.5rem', marginBottom: '0.25rem' }}>
              Account aanmaken
            </h1>
            <p style={{ color: 'oklch(0.50 0.015 255)', fontSize: '0.9rem' }}>Gratis starten — geen creditcard nodig</p>
          </div>

          {error && (
            <div style={{ marginBottom: '1.25rem', padding: '0.875rem 1rem', background: 'oklch(0.97 0.03 25)', border: '1px solid oklch(0.88 0.06 25)', borderRadius: '0.625rem', fontSize: '0.875rem', color: 'oklch(0.45 0.18 25)' }}>
              {error}
            </div>
          )}

          <form action={register}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={labelStyle}>E-mailadres</label>
              <input name="email" type="email" autoComplete="email" required placeholder="jij@voorbeeld.nl" style={inputStyle} />
            </div>

            <div style={{ marginBottom: '1.75rem' }}>
              <label style={labelStyle}>Wachtwoord</label>
              <input name="password" type="password" autoComplete="new-password" required placeholder="Minimaal 8 tekens" style={inputStyle} />
            </div>

            <button type="submit" style={{
              width: '100%', padding: '0.875rem', fontSize: '0.95rem', fontWeight: 700,
              color: 'white', background: 'oklch(0.52 0.21 255)',
              border: 'none', borderRadius: '0.75rem', cursor: 'pointer',
              boxShadow: '0 4px 16px oklch(0.52 0.21 255 / 0.30)',
            }}>
              Maak gratis account →
            </button>
          </form>

          <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: 'oklch(0.50 0.015 255)' }}>
            Al een account?{' '}
            <Link href="/login" style={{ color: 'oklch(0.52 0.21 255)', fontWeight: 600, textDecoration: 'none' }}>
              Inloggen
            </Link>
          </p>
        </div>
      </div>

      <style>{`@media (min-width: 768px) { .brand-panel { display: flex !important; } }`}</style>
    </main>
  )
}
