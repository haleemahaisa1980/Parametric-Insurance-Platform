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
let lastPolicyId = 0
const policies = new Map()

// Mock contract calls
const contractCalls = {
  "create-policy": (
      coverageAmount: number,
      premium: number,
      duration: number,
      triggerCondition: string,
      triggerValue: number,
  ) => {
    const policyId = ++lastPolicyId
    policies.set(policyId, {
      policyholder: mockClarity.types.principal(mockClarity.tx.sender),
      "coverage-amount": mockClarity.types.uint(coverageAmount),
      premium: mockClarity.types.uint(premium),
      "start-time": mockClarity.types.uint(100),
      "end-time": mockClarity.types.uint(100 + duration),
      "trigger-condition": mockClarity.types.string(triggerCondition),
      "trigger-value": mockClarity.types.int(triggerValue),
      "is-active": mockClarity.types.bool(true),
    })
    return { success: true, value: mockClarity.types.uint(policyId) }
  },
  "cancel-policy": (policyId: number) => {
    const policy = policies.get(policyId)
    if (!policy || policy.policyholder.value !== mockClarity.tx.sender || !policy["is-active"].value) {
      return { success: false, error: "err-unauthorized" }
    }
    policy["is-active"] = mockClarity.types.bool(false)
    return { success: true, value: true }
  },
  "get-policy": (policyId: number) => {
    const policy = policies.get(policyId)
    return policy ? { success: true, value: policy } : { success: false, error: "err-not-found" }
  },
}

describe("Policy Contract", () => {
  beforeEach(() => {
    lastPolicyId = 0
    policies.clear()
  })
  
  it("should create a new policy", () => {
    const result = contractCalls["create-policy"](1000, 50, 30, "temperature", 35)
    expect(result.success).toBe(true)
    expect(result.value).toEqual(mockClarity.types.uint(1))
    
    const policy = policies.get(1)
    expect(policy).toBeDefined()
    expect(policy["coverage-amount"]).toEqual(mockClarity.types.uint(1000))
    expect(policy["trigger-condition"]).toEqual(mockClarity.types.string("temperature"))
  })
  
  it("should cancel an active policy", () => {
    contractCalls["create-policy"](1000, 50, 30, "temperature", 35)
    const result = contractCalls["cancel-policy"](1)
    expect(result.success).toBe(true)
    expect(result.value).toBe(true)
    
    const policy = policies.get(1)
    expect(policy["is-active"]).toEqual(mockClarity.types.bool(false))
  })
  
  it("should fail to cancel an inactive policy", () => {
    contractCalls["create-policy"](1000, 50, 30, "temperature", 35)
    contractCalls["cancel-policy"](1)
    const result = contractCalls["cancel-policy"](1)
    expect(result.success).toBe(false)
    expect(result.error).toBe("err-unauthorized")
  })
  
  it("should get policy details", () => {
    contractCalls["create-policy"](1000, 50, 30, "temperature", 35)
    const result = contractCalls["get-policy"](1)
    expect(result.success).toBe(true)
    expect(result.value["coverage-amount"]).toEqual(mockClarity.types.uint(1000))
    expect(result.value["trigger-condition"]).toEqual(mockClarity.types.string("temperature"))
  })
  
  it("should fail to get non-existent policy", () => {
    const result = contractCalls["get-policy"](999)
    expect(result.success).toBe(false)
    expect(result.error).toBe("err-not-found")
  })
})

