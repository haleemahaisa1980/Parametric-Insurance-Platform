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
const oracleData = new Map()
const authorizedUpdaters = new Map()

// Mock contract calls
const contractCalls = {
  "update-oracle-data": (dataFeed: string, value: number) => {
    if (!authorizedUpdaters.get(mockClarity.tx.sender)) {
      return { success: false, error: "err-unauthorized" }
    }
    oracleData.set(dataFeed, {
      value: mockClarity.types.int(value),
      "last-updated": mockClarity.types.uint(100),
    })
    return { success: true, value: true }
  },
  "set-authorized-updater": (updater: string, isAuthorized: boolean) => {
    if (mockClarity.tx.sender !== "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM") {
      return { success: false, error: "err-owner-only" }
    }
    authorizedUpdaters.set(updater, isAuthorized)
    return { success: true, value: true }
  },
  "get-oracle-data": (dataFeed: string) => {
    const data = oracleData.get(dataFeed)
    return data ? { success: true, value: data } : { success: false, error: "err-not-found" }
  },
}

describe("Oracle Contract", () => {
  beforeEach(() => {
    oracleData.clear()
    authorizedUpdaters.clear()
    authorizedUpdaters.set("ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM", true)
  })
  
  it("should update oracle data by authorized updater", () => {
    const result = contractCalls["update-oracle-data"]("temperature", 30)
    expect(result.success).toBe(true)
    expect(result.value).toBe(true)
    
    const data = oracleData.get("temperature")
    expect(data).toBeDefined()
    expect(data.value).toEqual(mockClarity.types.int(30))
  })
  
  it("should fail to update oracle data by unauthorized updater", () => {
    mockClarity.tx.sender = "ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const result = contractCalls["update-oracle-data"]("temperature", 30)
    expect(result.success).toBe(false)
    expect(result.error).toBe("err-unauthorized")
  })
  
  it("should set authorized updater", () => {
    mockClarity.tx.sender = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const result = contractCalls["set-authorized-updater"]("ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM", true)
    expect(result.success).toBe(true)
    expect(result.value).toBe(true)
    
    expect(authorizedUpdaters.get("ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM")).toBe(true)
  })
  
  it("should fail to set authorized updater by non-owner", () => {
    mockClarity.tx.sender = "ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const result = contractCalls["set-authorized-updater"]("ST3PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM", true)
    expect(result.success).toBe(false)
    expect(result.error).toBe("err-owner-only")
  })
  
  it("should fail to get non-existent oracle data", () => {
    const result = contractCalls["get-oracle-data"]("humidity")
    expect(result.success).toBe(false)
    expect(result.error).toBe("err-not-found")
  })
})

