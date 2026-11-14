import { LoadingSkeleton } from './LoadingSkeleton'

export function CustomerActivitySkeleton() {
  return (
    <div className="customer-activity-skeleton" role="status" aria-label="Loading order activity" aria-busy="true">
      {Array.from({ length: 3 }, (_, index) => (
        <div className="customer-activity-skeleton-row" key={index}>
          <LoadingSkeleton className="customer-activity-skeleton-icon" />
          <div className="customer-activity-skeleton-copy">
            <LoadingSkeleton className="customer-activity-skeleton-title" />
            <LoadingSkeleton className="customer-activity-skeleton-line" />
          </div>
          <LoadingSkeleton className="customer-activity-skeleton-total" />
        </div>
      ))}
    </div>
  )
}
