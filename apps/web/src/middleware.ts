import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

const PROTECTED_PATHS = ['/dashboard', '/ritten', '/kosten', '/facturen', '/btw', '/instellingen']

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env['NEXT_PUBLIC_SUPABASE_URL']!,
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Vernieuw sessie indien nodig
  const { data: { user } } = await supabase.auth.getUser()

  const isProtected = PROTECTED_PATHS.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  )

  if (isProtected && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Ingelogde gebruiker hoeft niet naar login
  if (user && request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
