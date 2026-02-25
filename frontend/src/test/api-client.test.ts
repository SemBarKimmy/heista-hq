import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiRequest, ApiError, API_BASE_URL } from '../lib/api-client'

describe('api-client', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('uses NEXT_PUBLIC_API_URL (or non-localhost default) as base URL', () => {
    expect(API_BASE_URL.startsWith('http')).toBe(true)
    expect(API_BASE_URL.includes('localhost')).toBe(false)
  })

  it('returns parsed JSON when request succeeds', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(JSON.stringify({ ok: true })),
    } as unknown as Response)

    const result = await apiRequest<{ ok: boolean }>('/api/health')
    expect(result.ok).toBe(true)
  })

  it('throws ApiError on non-2xx response', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
      text: vi.fn().mockResolvedValue(JSON.stringify({ error: 'boom' })),
    } as unknown as Response)

    await expect(apiRequest('/api/fail')).rejects.toBeInstanceOf(ApiError)
  })
})
