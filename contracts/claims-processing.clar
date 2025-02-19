;; Claims Processing Contract

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-found (err u101))
(define-constant err-unauthorized (err u102))

;; Data Variables
(define-data-var last-claim-id uint u0)

;; Data Maps
(define-map claims
  { claim-id: uint }
  {
    policy-id: uint,
    claimant: principal,
    amount: uint,
    status: (string-ascii 20),
    processed-at: uint
  }
)

;; Public Functions

;; File a new claim
(define-public (file-claim (policy-id uint))
  (let
    (
      (claim-id (+ (var-get last-claim-id) u1))
      (policy (unwrap! (contract-call? .policy get-policy policy-id) err-not-found))
    )
    (asserts! (is-eq tx-sender (get policyholder policy)) err-unauthorized)
    (asserts! (get is-active policy) err-unauthorized)
    (map-set claims
      { claim-id: claim-id }
      {
        policy-id: policy-id,
        claimant: tx-sender,
        amount: (get coverage-amount policy),
        status: "pending",
        processed-at: u0
      }
    )
    (var-set last-claim-id claim-id)
    (ok claim-id)
  )
)

;; Process a claim (automated based on oracle data)
(define-public (process-claim (claim-id uint))
  (let
    (
      (claim (unwrap! (map-get? claims { claim-id: claim-id }) err-not-found))
      (policy (unwrap! (contract-call? .policy get-policy (get policy-id claim)) err-not-found))
      (oracle-data (unwrap! (contract-call? .oracle get-oracle-data (get trigger-condition policy)) err-not-found))
    )
    (asserts! (is-eq (get status claim) "pending") err-unauthorized)
    (if (>= (get value oracle-data) (get trigger-value policy))
      (begin
        (try! (as-contract (stx-transfer? (get amount claim) tx-sender (get claimant claim))))
        (map-set claims
          { claim-id: claim-id }
          (merge claim { status: "approved", processed-at: block-height })
        )
        (ok true)
      )
      (begin
        (map-set claims
          { claim-id: claim-id }
          (merge claim { status: "rejected", processed-at: block-height })
        )
        (ok false)
      )
    )
  )
)

;; Read-only function to get claim details
(define-read-only (get-claim (claim-id uint))
  (ok (unwrap! (map-get? claims { claim-id: claim-id }) err-not-found))
)

;; Initialize contract
(begin
  (var-set last-claim-id u0)
)

