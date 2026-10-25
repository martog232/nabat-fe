import type { AxiosError } from 'axios'
import type { ErrorCode, ErrorResponse } from '../types'

/**
 * The backend's stable failure code, or undefined for anything that is not one of its error
 * envelopes — a network failure, a timeout, a proxy's HTML page. Branch on this, never on the
 * message, which the server words for people and may reword.
 */
export function errorCodeOf(err: unknown): ErrorCode | undefined {
  return (err as AxiosError<ErrorResponse> | undefined)?.response?.data?.code
}
