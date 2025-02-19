;; Policy Contract

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-found (err u101))
(define-constant err-unauthorized (err u102))

;; Data Variables
(define-data-var last-policy-id uint u0)

;; Data Maps
(define-map policies
  { policy-id: uint }
  {
    policyholder: principal,
    coverage-amount: uint,
    premium: uint,
    start-time: uint,
    end-time: uint,
    trigger-condition: (string-ascii 50),
    trigger-value: int,
    is-active: bool
  }
)

;; Public Functions

;; Create a new policy
(define-public (create-policy (coverage-amount uint) (premium uint) (duration uint) (trigger-condition (string-ascii 50)) (trigger-value int))
  (let
    (
      (policy-id (+ (var-get last-policy-id) u1))
      (start-time block-height)
      (end-time (+ block-height duration))
    )
    (try! (stx-transfer? premium tx-sender (as-contract tx-sender)))
    (map-set policies
      { policy-id: policy-id }
      {
        policyholder: tx-sender,
        coverage-amount: coverage-amount,
        premium: premium,
        start-time: start-time,
        end-time: end-time,
        trigger-condition: trigger-condition,
        trigger-value: trigger-value,
        is-active: true
      }
    )
    (var-set last-policy-id policy-id)
    (ok policy-id)
  )
)

;; Cancel a policy (only by policyholder)
(define-public (cancel-policy (policy-id uint))
  (let
    (
      (policy (unwrap! (map-get? policies { policy-id: policy-id }) err-not-found))
    )
    (asserts! (is-eq tx-sender (get policyholder policy)) err-unauthorized)
    (asserts! (get is-active policy) err-unauthorized)
    (map-set policies
      { policy-id: policy-id }
      (merge policy { is-active: false })
    )
    (ok true)
  )
)

;; Read-only function to get policy details
(define-read-only (get-policy (policy-id uint))
  (ok (unwrap! (map-get? policies { policy-id: policy-id }) err-not-found))
)

;; Initialize contract
(begin
  (var-set last-policy-id u0)
)

