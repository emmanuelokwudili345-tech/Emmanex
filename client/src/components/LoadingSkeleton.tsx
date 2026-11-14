interface LoadingSkeletonProps {
  className?: string
}

export function LoadingSkeleton({ className = '' }: LoadingSkeletonProps) {
  return <span className={`loading-skeleton ${className}`} aria-hidden="true" />
}
