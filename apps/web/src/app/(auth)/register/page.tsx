import Link from 'next/link'
import { register } from '../login/actions'

type Props = {
  searchParams: Promise<{ error?: string; success?: string }>
}

export default async function RegisterPage({ searchParams }: Props) {
  const { error, success } = await searchParams

  if (success === 'check_email') {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-sm border border-gray-100 text-center">
          <div className="text-4xl mb-4">📧</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Check je e-mail</h2>
          <p className="text-gray-500 text-sm">
            We hebben een bevestigingslink gestuurd. Klik op de link om je account te activeren.
          </p>
          <Link href="/login" className="mt-6 inline-block text-sm text-blue-600 hover:underline">
            Terug naar inloggen
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-blue-600">Fiscio</h1>
          <p className="text-gray-500 mt-1 text-sm">Account aanmaken</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <form action={register} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              E-mailadres
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="jij@voorbeeld.nl"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Wachtwoord
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Minimaal 8 tekens"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            Account aanmaken
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          Al een account?{' '}
          <Link href="/login" className="text-blue-600 hover:underline font-medium">
            Inloggen
          </Link>
        </p>
      </div>
    </main>
  )
}
