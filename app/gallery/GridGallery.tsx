'use client'

import { useState } from 'react'
import styles from './GalleryPage.module.css'
import { GridImageCanvas } from './GridImageCanvas'

type GridGalleryProps = {
  images: { id: string; url: string; alt?: string }[]
  onSelect: (image: { id: string; url: string }) => void
}

export function GridGallery({ images, onSelect }: GridGalleryProps) {
  const [page, setPage] = useState(0)
  const IMAGES_PER_PAGE = 24
  const totalPages = Math.ceil(images.length / IMAGES_PER_PAGE)

  const visibleImages = images.slice(
    page * IMAGES_PER_PAGE,
    (page + 1) * IMAGES_PER_PAGE
  )

  return (
    <div className={styles.gridWrapper}>
      <div className={styles.gridGallery}>
        {visibleImages.map((img) => (
          <div key={img.id} className={styles.canvasCell}>
            <GridImageCanvas url={img.url} onClick={() => onSelect(img)} />
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              className={`${styles.pageButton} ${
                i === page ? styles.activePage : ''
              }`}
              onClick={() => setPage(i)}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}