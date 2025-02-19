import { describe, it, expect, beforeEach } from "vitest"

// Mock the Clarity functions and types
const mockClarity = {
  tx: {
    sender: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
  },
  types: {
    uint: (value: number) => ({ type: "uint", value }),
    principal: (value: string) => ({ type: "principal", value }),
    string: (value: string) => ({ type: "string", value }),
    int: (value: number) => ({ type: "int", value }),
    bool: (value: boolean) => ({ type: "bool", value }),
  },
}

// Mock contract state
let lastClaimId = 0
const claims = new Map()

// Mock external contract calls
const mockPolicyContract = {
  "get-policy": (policyId: number) => ({
    success: true,
    value: {
      policyholder: mockClarity.types.principal("ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"),
      "coverage-amount": mockClarity.types.uint(1000),
      "is-active": mockClarity.types.bool(true),
      "trigger-condition": mockClarity.types.string("temperature"),
      "trigger-value": mockClarity.types.int(35),
    },
  }),
}

const mockOracleContract = {
  "get-oracle-data": (dataFeed: string) => ({
    success: true,
    value: {
      value: mockClarity.types.int(40),
      "last-updated": mockClarity.types.uint(100),
    },
  }),
}

// Mock contract calls
const contractCalls = {
  "file-claim": (policyId: number) => {
    const claimId = ++lastClaimId
    claims.set(claimId, {
      "policy-id": mockClarity.types.uint(policyId),
      claimant: mockClarity.types.principal(mockClarity.tx.sender),
      amount: mockClarity.types.uint(1000),
      status: mockClarity.types.string("pending"),
      "processed-at": mockClarity.types.uint(0),
    })
    return { success: true, value: mockClarity.types.uint(claimId) }
  },
  "process-claim": (claimId: number) => {
    const claim = claims.get(claimId)
    if (!claim || claim.status.value !== "pending") {
      return { success: false, error: "err-unauthorized" }
    }
    const policy = mockPolicyContract["get-policy"](claim["policy-id"].value).value
    const oracleData = mockOracleContract["get-oracle-data"](policy["trigger-condition"].value).value
    
    if (oracleData.value.value >= policy["trigger-value"].value) {
      claim.status = mockClarity.types.string("approved")
      claim["processed-at"] = mockClarity.types.uint(100)
      return { success: true, value: true }
    } else {
      claim.status = mockClarity.types.string("rejected")
      claim["processed-at"] = mockClarity.types.uint(100)
      return { success: true, value: false }
    }
  },
  "get-claim": (claimId: number) => {
    const claim = claims.get(claimId)
    return claim ? { success: true, value: claim } : { success: false, error: "err-not-found" }
  },
}

describe("Claims Processing Contract", () => {
  beforeEach(() => {
    lastClaimId = 0
    claims.clear()
  })
  
  it("should file a new claim", () => {
    const result = contractCalls["file-claim"](1)
    expect(result.success).toBe(true)
    expect(result.value).toEqual(mockClarity.types.uint(1))
    
    const claim = claims.get(1)
    expect(claim).toBeDefined()
    expect(claim.status).toEqual(mockClarity.types.string("pending"))
  })
  
  it("should process and approve a valid claim", () => {
    contractCalls["file-claim"](1)
    const result = contractCalls["process-claim"](1)
    expect(result.success).toBe(true)
    expect(result.value).toBe(true)
    
    const claim = claims.get(1)
    expect(claim.status).toEqual(mockClarity.types.string("approved"))
  })
  
  it("should process and reject an invalid claim", () => {
    contractCalls["file-claim"](1)
    mockOracleContract["get-oracle-data"] = () => ({
      success: true,
      value: {
        value: mockClarity.types.int(30),
        "last-updated": mockClarity.types.uint(100),
      },
    })
    const result = contractCalls["process-claim"](1)
    expect(result.success).toBe(true)
    expect(result.value).toBe(false)
    
    const claim = claims.get(1)
    expect(claim.status).toEqual(mockClarity.types.string("rejected"))
  })
  
  it("should get claim details", () => {
    contractCalls["file-claim"](1)
    const result = contractCalls["get-claim"](1)
    expect(result.success).toBe(true)
    expect(result.value["policy-id"]).toEqual(mockClarity.types.uint(1))
    expect(result.value.status).toEqual(mockClarity.types.string("pending"))
  })
  
  it("should fail to get non-existent claim", () => {
    const result = contractCalls["get-claim"](999)
    expect(result.success).toBe(false)
    expect(result.error).toBe("err-not-found")
  })
})

