const BRANCH_KEY = "meditrack-active-branch"

let currentUserId = ""
let currentBranchId = ""
const listeners = new Set<() => void>()

function storageKey(userId: string) {
  return `${BRANCH_KEY}:${userId}`
}

export function readActiveBranch(userId: string) {
  if (typeof window === "undefined" || !userId) return ""
  return sessionStorage.getItem(storageKey(userId)) || ""
}

function emit() {
  listeners.forEach((listener) => listener())
}

export function writeActiveBranch(userId: string, branchId: string) {
  currentUserId = userId
  currentBranchId = branchId
  if (typeof window !== "undefined" && userId) {
    if (branchId) sessionStorage.setItem(storageKey(userId), branchId)
    else sessionStorage.removeItem(storageKey(userId))
  }
  emit()
}

export function clearActiveBranch() {
  if (typeof window !== "undefined") {
    const keys: string[] = []
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (key?.startsWith(BRANCH_KEY)) keys.push(key)
    }
    keys.forEach((key) => sessionStorage.removeItem(key))
  }
  currentBranchId = ""
  currentUserId = ""
  emit()
}

export function subscribeActiveBranch(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getActiveBranchSnapshot() {
  return currentBranchId
}

export function getActiveBranchUserId() {
  return currentUserId
}
