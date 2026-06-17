import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  if (token_hash && type === 'recovery') {
    return NextResponse.redirect(
      new URL(`/auth/reset?token_hash=${token_hash}&type=${type}`, request.url)
    )
  }

  return NextResponse.redirect(new URL('/', request.url))
}
