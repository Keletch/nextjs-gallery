'use client'
import { useState, useEffect } from 'react'
import { supabaseClient } from '@/lib/supabase-client'
import styles from './ModeratorImageViewer.module.css'

interface ModeratorImageViewerProps {
  imageUrl: string
  filename: string
  evento: string
  folder: 'pending' | 'approved' | 'rejected'
  onClose: () => void
  onUpdate?: () => void
}

// ✅ Componente Typewriter para efecto de escritura
function TypewriterText({ text, delay = 0, speed = 30 }: { text: string; delay?: number; speed?: number }) {
  const [displayedText, setDisplayedText] = useState('')
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const timeout = setTimeout(() => {
      setStarted(true)
    }, delay)
    return () => clearTimeout(timeout)
  }, [delay])

  useEffect(() => {
    if (!started) return

    let i = 0
    const interval = setInterval(() => {
      setDisplayedText(text.slice(0, i + 1))
      i++
      if (i >= text.length) clearInterval(interval)
    }, speed)

    return () => clearInterval(interval)
  }, [text, started, speed])

  return <span>{displayedText}</span>
}

export default function ModeratorImageViewer({
  imageUrl,
  filename,
  evento,
  folder,
  onClose,
  onUpdate,
}: ModeratorImageViewerProps) {
  const [description, setDescription] = useState<string>('')
  const [originalDescription, setOriginalDescription] = useState<string>('')
  const [rotation, setRotation] = useState(0)
  const [flipH, setFlipH] = useState(false)
  const [flipV, setFlipV] = useState(false)
  const [fileSize, setFileSize] = useState<number>(0)
  const [isResizing, setIsResizing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<string>('')
  const [hasChanges, setHasChanges] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

  const hash = filename.replace(/\.webp$/, '')

  useEffect(() => {
    const fetchInfo = async () => {
      const { data } = await supabaseClient
        .from('imageInfo')
        .select('description')
        .eq('imghash', hash)
        .maybeSingle()

      if (data) {
        setDescription(data.description || '')
        setOriginalDescription(data.description || '')
      }
    }

    fetchInfo()

    // Obtener tamaño del archivo original
    fetch(imageUrl, { method: 'HEAD' })
      .then(res => {
        const size = parseInt(res.headers.get('content-length') || '0')
        setFileSize(size)
      })
      .catch(() => setFileSize(0))
  }, [hash, imageUrl])

  // Detectar cambios
  useEffect(() => {
    const descChanged = description !== originalDescription
    const transformChanged = rotation !== 0 || flipH || flipV
    setHasChanges(descChanged || transformChanged)
  }, [description, originalDescription, rotation, flipH, flipV])

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const handleSaveChanges = async () => {
    if (!hasChanges) {
      onClose()
      return
    }

    setIsSaving(true)
    setSaveStatus('Guardando cambios...')

    try {
      // 1. Guardar descripción si cambió
      if (description !== originalDescription) {
        const { error: descError } = await supabaseClient
          .from('imageInfo')
          .update({ description: description.trim() || null })
          .eq('imghash', hash)

        if (descError) throw new Error('Error al guardar descripción')
      }

      // 2. Aplicar transformaciones si hay rotación o volteo
      if (rotation !== 0 || flipH || flipV) {
        const transformRes = await fetch('/api/transform-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename,
            evento,
            folder,
            rotation,
            flipH,
            flipV,
          }),
        })

        if (!transformRes.ok) {
          const error = await transformRes.json()
          throw new Error(error.error || 'Error al transformar imagen')
        }
      }

      setSaveStatus('✅ Cambios guardados correctamente')
      setTimeout(() => {
        if (onUpdate) onUpdate()
        onClose()
      }, 1500)
    } catch (err) {
      console.error('Error al guardar cambios:', err)
      setSaveStatus(`❌ ${err instanceof Error ? err.message : 'Error al guardar'}`)
      setIsSaving(false)
    }
  }

  const handleResize = async () => {
    if (fileSize < 1024 * 1024) {
      alert('Esta imagen pesa menos de 1MB. No es necesario redimensionar.')
      return
    }

    if (!confirm('¿Reducir imagen al 80% del tamaño original con calidad 90%?')) {
      return
    }

    setIsResizing(true)
    setSaveStatus('Redimensionando imagen...')

    try {
      const res = await fetch('/api/resize-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename,
          evento,
          folder,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Error al redimensionar')
      }

      const result = await res.json()
      setSaveStatus(`✅ Imagen redimensionada: ${result.originalSize} → ${result.newSize}`)

      // Actualizar tamaño mostrado
      setTimeout(() => {
        fetch(imageUrl, { method: 'HEAD' })
          .then(r => {
            const size = parseInt(r.headers.get('content-length') || '0')
            setFileSize(size)
          })
      }, 1000)

      setTimeout(() => {
        if (onUpdate) onUpdate()
      }, 2000)
    } catch (err) {
      console.error('Error al redimensionar:', err)
      setSaveStatus(`❌ ${err instanceof Error ? err.message : 'Error'}`)
    } finally {
      setIsResizing(false)
    }
  }

  const getTransform = () => {
    let transform = `rotate(${rotation}deg)`
    if (flipH) transform += ' scaleX(-1)'
    if (flipV) transform += ' scaleY(-1)'
    return transform
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Imagen */}
        <div className={styles.imageContainer}>
          {!imageLoaded && (
            <div className={styles.imageLoader}>
              <div className={styles.spinner}></div>
              <p>Cargando imagen...</p>
            </div>
          )}
          <img
            src={imageUrl}
            alt="Preview"
            className={`${styles.image} ${styles.fadeInImage} ${imageLoaded ? styles.visible : ''}`}
            style={{ transform: getTransform() }}
            onLoad={() => setImageLoaded(true)}
          />
        </div>

        {/* Panel de controles */}
        <div className={styles.controls}>
          <h3>Editar Imagen</h3>

          {/* Info del archivo - Solo mostrar cuando fileSize > 0 */}
          {fileSize > 0 && (
            <div className={styles.fileInfo}>
              <p><strong>Tamaño: </strong> <TypewriterText text={formatFileSize(fileSize)} speed={50} /></p>
              <p><strong>Carpeta: </strong> <TypewriterText text={folder} delay={300} speed={50} /></p>
            </div>
          )}

          {/* Descripción */}
          <div className={styles.section}>
            <label>Descripción:</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Escribe una descripción..."
              maxLength={500}
              className={styles.textarea}
            />
          </div>

          {/* Transformaciones */}
          <div className={styles.section}>
            <label>Transformaciones:</label>
            <div className={styles.transformButtons}>
              <button onClick={() => setRotation((r) => (r - 90) % 360)} className={`${styles.transformBtn} ${styles.staggeredButton}`}>
                ↶ 90°
              </button>
              <button onClick={() => setRotation((r) => (r + 90) % 360)} className={`${styles.transformBtn} ${styles.staggeredButton}`}>
                ↷ 90°
              </button>
              <button onClick={() => setFlipH(!flipH)} className={`${styles.transformBtn} ${flipH ? styles.active : ''} ${styles.staggeredButton}`}>
                ⇄ Horizontal
              </button>
              <button onClick={() => setFlipV(!flipV)} className={`${styles.transformBtn} ${flipV ? styles.active : ''} ${styles.staggeredButton}`}>
                ⇅ Vertical
              </button>
            </div>
            {(rotation !== 0 || flipH || flipV) && (
              <button
                onClick={() => {
                  setRotation(0)
                  setFlipH(false)
                  setFlipV(false)
                }}
                className={styles.resetBtn}
              >
                Restablecer
              </button>
            )}
          </div>

          {/* Resize */}
          {fileSize > 1024 * 1024 && (
            <div className={styles.section}>
              <button
                onClick={handleResize}
                disabled={isResizing}
                className={styles.resizeBtn}
              >
                {isResizing ? 'Redimensionando...' : '🔧 Reducir Tamaño (80%)'}
              </button>
              <p className={styles.resizeInfo}>
                Solo para imágenes &gt; 1MB. Reduce al 80% con calidad 90%.
              </p>
            </div>
          )}

          {/* Status */}
          {saveStatus && (
            <div className={styles.status}>
              {saveStatus}
            </div>
          )}

          {/* Botones de acción */}
          <div className={styles.actions}>
            {hasChanges && (
              <button
                onClick={handleSaveChanges}
                disabled={isSaving}
                className={`${styles.saveBtn} ${styles.staggeredButton}`}
              >
                {isSaving ? 'Guardando...' : '✓ Guardar Cambios'}
              </button>
            )}
            <button onClick={onClose} className={`${styles.cancelBtn} ${styles.staggeredButton}`}>
              {hasChanges ? 'Cancelar' : 'Cerrar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}