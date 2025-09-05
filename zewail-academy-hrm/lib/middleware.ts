import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from './auth';

export async function authMiddleware(request: NextRequest) {
  const user = await getCurrentUser(request);
  
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return user;
}

export async function adminMiddleware(request: NextRequest) {
  const user = await authMiddleware(request);
  
  if (user instanceof NextResponse) {
    return user;
  }

  if (user.role !== 'admin') {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }

  return user;
}

export async function hrMiddleware(request: NextRequest) {
  const user = await authMiddleware(request);
  
  if (user instanceof NextResponse) {
    return user;
  }

  if (!['admin', 'hr'].includes(user.role)) {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }

  return user;
}