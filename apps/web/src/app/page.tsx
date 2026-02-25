import Link from 'next/link'

const FEATURES = [
  {
    icon: '📍',
    titel: 'GPS Ritregistratie',
    tekst: 'Start, rij, stop. Fiscio registreert automatisch je zakelijke ritten en classificeert ze via AI.',
  },
  {
    icon: '📸',
    titel: 'Bonnetjes scannen',
    tekst: 'Foto maken → klaar. GPT-4o leest bedrag, leverancier en BTW uit elk bonnetje.',
  },
  {
    icon: '🧾',
    titel: 'Facturen & e-mail',
    tekst: 'Maak facturen, genereer PDF en stuur ze direct vanuit de app. Automatische betaalherinnering.',
  },
  {
    icon: '🤖',
    titel: 'AI Belastingadvies',
    tekst: 'Fiscio kent jouw cijfers. Vraag alles: "hoeveel bewaar ik?", "kom ik in aanmerking voor KIA?"',
  },
  {
    icon: '💡',
    titel: 'Proactieve belastingtips',
    tekst: 'KIA, KOR, urencriterium, lijfrente — Fiscio signaleert kansen voordat je ze mist.',
  },
  {
    icon: '📊',
    titel: 'Rapportages & Export',
    tekst: 'Jaaroverzicht PDF, CSV-export voor de boekhouder, kwartaaloverzicht met één klik.',
  },
]

const STAPPEN = [
  { stap: '01', titel: 'Maak een account', tekst: 'Inloggen met e-mail. Geen creditcard, geen gedoe.' },
  { stap: '02', titel: 'Verbind je administratie', tekst: 'Voer ritten in, scan bonnetjes, sla facturen op. Fiscio vult zichzelf aan.' },
  { stap: '03', titel: 'Fiscio denkt voor je', tekst: 'De AI signaleert kansen, beantwoordt vragen en houdt je belastingpositie up-to-date.' },
]

export default function LandingPage() {
  return (
    <div style={{ fontFamily: 'var(--font-sans)' }}>

      {/* ─── Nav ─────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid oklch(0.91 0.01 255)',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 2rem', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'oklch(0.52 0.21 255)' }}>
            Fiscio
          </span>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <Link href="/login" style={{ fontSize: '0.875rem', color: 'oklch(0.50 0.015 255)', textDecoration: 'none', padding: '0.5rem 1rem' }}>
              Inloggen
            </Link>
            <Link href="/login" style={{
              fontSize: '0.875rem', fontWeight: 600, color: '#fff', textDecoration: 'none',
              background: 'oklch(0.52 0.21 255)', padding: '0.5rem 1.25rem',
              borderRadius: '0.625rem', transition: 'all 0.15s',
            }}>
              Start gratis →
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero ────────────────────────────────────────────────────── */}
      <section style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '7rem 2rem 4rem',
        background: 'radial-gradient(ellipse 80% 60% at 50% -10%, oklch(0.85 0.08 255 / 0.4), transparent)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Achtergrond blobs */}
        <div style={{
          position: 'absolute', top: '10%', right: '-5%', width: 500, height: 500,
          background: 'radial-gradient(circle, oklch(0.72 0.12 255 / 0.15), transparent 70%)',
          borderRadius: '50%', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '5%', left: '-5%', width: 400, height: 400,
          background: 'radial-gradient(circle, oklch(0.68 0.16 190 / 0.12), transparent 70%)',
          borderRadius: '50%', pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: 760, textAlign: 'center', position: 'relative' }}>
          <div className="animate-fade-in" style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            background: 'oklch(0.95 0.04 255)', color: 'oklch(0.40 0.22 255)',
            padding: '0.375rem 1rem', borderRadius: '2rem', fontSize: '0.8rem', fontWeight: 600,
            marginBottom: '1.5rem', border: '1px solid oklch(0.85 0.08 255)',
          }}>
            🇳🇱 Gemaakt voor Nederlandse ZZP'ers
          </div>

          <h1 className="animate-fade-up" style={{
            fontSize: 'clamp(2.5rem, 7vw, 4.5rem)', fontWeight: 800, lineHeight: 1.1,
            letterSpacing: '-0.03em', marginBottom: '1.25rem',
            color: 'oklch(0.13 0.02 255)',
          }}>
            Boekhouding die{' '}
            <span style={{
              background: 'linear-gradient(135deg, oklch(0.52 0.21 255), oklch(0.68 0.16 190))',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>
              voor je denkt.
            </span>
          </h1>

          <p className="animate-fade-up delay-100" style={{
            fontSize: '1.2rem', color: 'oklch(0.50 0.015 255)', marginBottom: '2.5rem',
            maxWidth: 580, margin: '0 auto 2.5rem', lineHeight: 1.7,
          }}>
            GPS ritregistratie, bonnetjes scannen, facturen versturen en AI-belastingadvies.
            Alles in één app — zonder gedoe.
          </p>

          <div className="animate-fade-up delay-200" style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/login" style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              background: 'oklch(0.52 0.21 255)', color: '#fff',
              padding: '0.875rem 2rem', borderRadius: '0.75rem',
              fontWeight: 700, fontSize: '1rem', textDecoration: 'none',
              boxShadow: '0 4px 16px oklch(0.52 0.21 255 / 0.35)',
              transition: 'all 0.2s',
            }}>
              Start gratis <span style={{ fontSize: '1.1rem' }}>→</span>
            </Link>
            <a href="#hoe-het-werkt" style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              background: 'white', color: 'oklch(0.40 0.22 255)',
              padding: '0.875rem 2rem', borderRadius: '0.75rem',
              fontWeight: 600, fontSize: '1rem', textDecoration: 'none',
              border: '1.5px solid oklch(0.85 0.08 255)',
              transition: 'all 0.2s',
            }}>
              Hoe het werkt ↓
            </a>
          </div>

          {/* Social proof */}
          <p className="animate-fade-up delay-300" style={{ marginTop: '2rem', fontSize: '0.8rem', color: 'oklch(0.68 0.01 255)' }}>
            ✓ Gratis te proberen &nbsp;·&nbsp; ✓ AVG-compliant &nbsp;·&nbsp; ✓ Servers in Europa
          </p>
        </div>
      </section>

      {/* ─── Features ────────────────────────────────────────────────── */}
      <section style={{ padding: '6rem 2rem', background: 'oklch(0.97 0.007 255)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 800, color: 'oklch(0.13 0.02 255)', letterSpacing: '-0.02em' }}>
              Alles wat je nodig hebt
            </h2>
            <p style={{ marginTop: '0.75rem', color: 'oklch(0.50 0.015 255)', fontSize: '1.1rem' }}>
              Geen losse tools meer. Fiscio combineert alles in één app.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
            {FEATURES.map((f, i) => (
              <div key={f.titel} style={{
                background: 'white', borderRadius: '1rem', padding: '1.75rem',
                border: '1px solid oklch(0.91 0.01 255)',
                boxShadow: '0 2px 8px oklch(0 0 0 / 0.04)',
                transition: 'all 0.2s',
              }}>
                <span style={{ fontSize: '2rem' }}>{f.icon}</span>
                <h3 style={{ fontWeight: 700, fontSize: '1rem', marginTop: '1rem', color: 'oklch(0.13 0.02 255)' }}>
                  {f.titel}
                </h3>
                <p style={{ marginTop: '0.5rem', color: 'oklch(0.50 0.015 255)', fontSize: '0.9rem', lineHeight: 1.7 }}>
                  {f.tekst}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Hoe het werkt ───────────────────────────────────────────── */}
      <section id="hoe-het-werkt" style={{ padding: '6rem 2rem', background: 'white' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 800, color: 'oklch(0.13 0.02 255)', letterSpacing: '-0.02em' }}>
              Hoe het werkt
            </h2>
            <p style={{ marginTop: '0.75rem', color: 'oklch(0.50 0.015 255)', fontSize: '1.1rem' }}>
              In drie stappen klaar.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {STAPPEN.map((s, i) => (
              <div key={s.stap} style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
                <div style={{
                  minWidth: 56, height: 56, borderRadius: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'oklch(0.95 0.04 255)', color: 'oklch(0.40 0.22 255)',
                  fontWeight: 800, fontSize: '1rem', flexShrink: 0,
                }}>
                  {s.stap}
                </div>
                <div style={{ paddingTop: '0.25rem' }}>
                  <h3 style={{ fontWeight: 700, fontSize: '1.1rem', color: 'oklch(0.13 0.02 255)', marginBottom: '0.375rem' }}>
                    {s.titel}
                  </h3>
                  <p style={{ color: 'oklch(0.50 0.015 255)', fontSize: '0.95rem', lineHeight: 1.7 }}>
                    {s.tekst}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── AI highlight ────────────────────────────────────────────── */}
      <section style={{
        padding: '5rem 2rem',
        background: 'linear-gradient(135deg, oklch(0.40 0.22 255) 0%, oklch(0.55 0.20 220) 100%)',
      }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center', color: 'white' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🤖</div>
          <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 800, marginBottom: '1rem', letterSpacing: '-0.02em' }}>
            Stel alles aan je AI-adviseur
          </h2>
          <p style={{ opacity: 0.85, fontSize: '1.1rem', marginBottom: '2rem', maxWidth: 600, margin: '0 auto 2rem', lineHeight: 1.7 }}>
            "Hoeveel belasting betaal ik dit jaar?" "Wat verandert er in 2026?" "Kom ik in aanmerking voor KIA?"
            Fiscio weet jouw cijfers en geeft direct antwoord.
          </p>
          <Link href="/login" style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            background: 'white', color: 'oklch(0.40 0.22 255)',
            padding: '0.875rem 2rem', borderRadius: '0.75rem',
            fontWeight: 700, fontSize: '1rem', textDecoration: 'none',
          }}>
            Probeer gratis →
          </Link>
        </div>
      </section>

      {/* ─── CTA ─────────────────────────────────────────────────────── */}
      <section style={{ padding: '6rem 2rem', background: 'oklch(0.97 0.007 255)', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 800, color: 'oklch(0.13 0.02 255)', marginBottom: '1rem', letterSpacing: '-0.02em' }}>
          Klaar om te starten?
        </h2>
        <p style={{ color: 'oklch(0.50 0.015 255)', fontSize: '1.1rem', marginBottom: '2rem' }}>
          Gratis te proberen. Geen creditcard nodig.
        </p>
        <Link href="/login" style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          background: 'oklch(0.52 0.21 255)', color: '#fff',
          padding: '0.875rem 2.5rem', borderRadius: '0.75rem',
          fontWeight: 700, fontSize: '1.1rem', textDecoration: 'none',
          boxShadow: '0 4px 20px oklch(0.52 0.21 255 / 0.35)',
        }}>
          Maak gratis account →
        </Link>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────────── */}
      <footer style={{
        borderTop: '1px solid oklch(0.91 0.01 255)', background: 'white',
        padding: '2.5rem 2rem',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <span style={{ fontWeight: 800, color: 'oklch(0.52 0.21 255)', fontSize: '1.1rem' }}>Fiscio</span>
          <div style={{ display: 'flex', gap: '2rem', fontSize: '0.875rem', color: 'oklch(0.50 0.015 255)' }}>
            <Link href="/login" style={{ color: 'inherit', textDecoration: 'none' }}>Inloggen</Link>
            <Link href="/instellingen/verwerkingen" style={{ color: 'inherit', textDecoration: 'none' }}>Privacy</Link>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'oklch(0.68 0.01 255)', margin: 0 }}>
            © {new Date().getFullYear()} Fiscio · Gemaakt in Nederland
          </p>
        </div>
      </footer>

    </div>
  )
}
