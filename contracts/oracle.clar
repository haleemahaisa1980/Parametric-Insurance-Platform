;; Oracle Contract

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-found (err u101))
(define-constant err-unauthorized (err u102))

;; Data Maps
(define-map oracle-data
  { data-feed: (string-ascii 50) }
  { value: int, last-updated: uint }
)

(define-map authorized-updaters
  { updater: principal }
  { is-authorized: bool }
)

;; Public Functions

;; Update oracle data (only by authorized updaters)
(define-public (update-oracle-data (data-feed (string-ascii 50)) (value int))
  (let
    (
      (updater-status (default-to { is-authorized: false } (map-get? authorized-updaters { updater: tx-sender })))
    )
    (asserts! (get is-authorized updater-status) err-unauthorized)
    (ok (map-set oracle-data
      { data-feed: data-feed }
      { value: value, last-updated: block-height }
    ))
  )
)

;; Add or remove authorized updaters (only by contract owner)
(define-public (set-authorized-updater (updater principal) (is-authorized bool))
  (begin
    (asserts! (is-eq tx-sender contract-owner) err-owner-only)
    (ok (map-set authorized-updaters { updater: updater } { is-authorized: is-authorized }))
  )
)

;; Read-only function to get oracle data
(define-read-only (get-oracle-data (data-feed (string-ascii 50)))
  (ok (unwrap! (map-get? oracle-data { data-feed: data-feed }) err-not-found))
)

;; Initialize contract
(begin
  (map-set authorized-updaters { updater: contract-owner } { is-authorized: true })
)

