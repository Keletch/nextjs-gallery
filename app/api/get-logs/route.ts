import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'

export async function GET() {
  const logPath = path.join(process.cwd(), 'logs', 'moderation-log.json')

  try {
    const raw = await readFile(logPath, 'utf-8')
    const logs = JSON.parse(raw)
    return NextResponse.json(logs)
  } catch (err) {
    console.error('Error al leer logs:', err)
    return NextResponse.json([], { status: 500 })
  }
}