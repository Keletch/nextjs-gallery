import { NextRequest, NextResponse } from 'next/server'
import { readFile, writeFile } from 'fs/promises'
import path from 'path'

export async function POST(req: NextRequest) {
  try {
    const {
      filename,
      action,
      from,
      to,
      device,
      browser,
      os,
      location,
    } = await req.json()

    const timestamp = new Date().toISOString()

    const logEntry = {
      filename,
      action,
      from,
      to,
      device,
      browser,
      os,
      location,
      timestamp,
    }

    const logPath = path.join(process.cwd(), 'logs', 'moderation-log.json')

    let existing = []
    try {
      const raw = await readFile(logPath, 'utf-8')
      existing = JSON.parse(raw)
    } catch {
      // Si el archivo no existe, empezamos con array vacío
    }

    existing.push(logEntry)
    await writeFile(logPath, JSON.stringify(existing, null, 2))

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error al guardar log:', err)
    return NextResponse.json({ error: 'No se pudo guardar el log' }, { status: 500 })
  }
}