export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function errorCode(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'code' in error
    ? String(error.code)
    : undefined
}

export function errorStatus(error: unknown): number {
  const status =
    typeof error === 'object' && error !== null && 'status' in error ? error.status : undefined
  return typeof status === 'number' && Number.isInteger(status) && status >= 400 && status <= 599
    ? status
    : 400
}
