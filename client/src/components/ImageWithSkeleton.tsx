import { useState } from 'react'
import { LoadingSkeleton } from './LoadingSkeleton'

interface ImageWithSkeletonProps {
  src: string
  alt: string
  fallbackSrc?: string
  className?: string
  imageClassName?: string
  loading?: 'eager' | 'lazy'
}

function LoadedImage({
  src,
  alt,
  fallbackSrc,
  className = '',
  imageClassName = '',
  loading = 'lazy',
}: ImageWithSkeletonProps) {
  const [imageSource, setImageSource] = useState(src)
  const [isLoading, setIsLoading] = useState(true)
  const [isUnavailable, setIsUnavailable] = useState(false)

  function handleError() {
    if (fallbackSrc && imageSource !== fallbackSrc) {
      setImageSource(fallbackSrc)
      setIsLoading(true)
      return
    }

    setIsLoading(false)
    setIsUnavailable(true)
  }

  return (
    <span className={`image-with-skeleton ${className}`} aria-busy={isLoading}>
      {isLoading && <LoadingSkeleton className="image-loading-placeholder" />}
      {!isUnavailable && (
        <img
          className={imageClassName}
          src={imageSource}
          alt={alt}
          loading={loading}
          onLoad={() => setIsLoading(false)}
          onError={handleError}
        />
      )}
      {isUnavailable && (
        <span className="image-unavailable">
          Image unavailable
        </span>
      )}
    </span>
  )
}

export function ImageWithSkeleton(props: ImageWithSkeletonProps) {
  return <LoadedImage key={`${props.src}:${props.fallbackSrc ?? ''}`} {...props} />
}
