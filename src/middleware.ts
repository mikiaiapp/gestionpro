import { NextResponse, type NextRequest } from 'next/server';

// Middleware simplificado al máximo para diagnosticar el bloqueo
// Dejamos que el AuthGuard (lado cliente) maneje la redirección por ahora
export async function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|.*\\.png$).*)'],
};
