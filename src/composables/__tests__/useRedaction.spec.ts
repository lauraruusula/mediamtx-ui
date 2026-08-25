import { describe, it, expect } from 'vitest'
import { redactUrlCredentials, maskSecret } from '@/composables/useRedaction'

describe('redactUrlCredentials', () => {
  it('masks the password but keeps the username', () => {
    expect(redactUrlCredentials('rtsp://admin:secret@192.168.1.10/stream')).toBe(
      'rtsp://admin:***@192.168.1.10/stream'
    )
  })

  it('masks passwords in every supported stream scheme', () => {
    expect(redactUrlCredentials('rtmp://user:pass@host/app/stream')).toBe(
      'rtmp://user:***@host/app/stream'
    )
    expect(redactUrlCredentials('srt://u:p@host:8890?streamid=read:cam')).toBe(
      'srt://u:***@host:8890?streamid=read:cam'
    )
    expect(redactUrlCredentials('whips://user:pass@host/whip')).toBe('whips://user:***@host/whip')
  })

  it('handles URL-encoded password characters', () => {
    expect(redactUrlCredentials('rtsp://user:p%40ss%2Fword@host/cam')).toBe(
      'rtsp://user:***@host/cam'
    )
  })

  it('leaves URLs without a password untouched', () => {
    expect(redactUrlCredentials('rtsp://admin@host/cam')).toBe('rtsp://admin@host/cam')
    expect(redactUrlCredentials('rtsp://host/cam')).toBe('rtsp://host/cam')
  })

  it('returns empty string for null/undefined/empty', () => {
    expect(redactUrlCredentials(null)).toBe('')
    expect(redactUrlCredentials(undefined)).toBe('')
    expect(redactUrlCredentials('')).toBe('')
  })
})

describe('maskSecret', () => {
  it('returns a fixed placeholder when set and empty when not', () => {
    expect(maskSecret('supersecret')).toBe('••••••••')
    expect(maskSecret('')).toBe('')
    expect(maskSecret(null)).toBe('')
  })
})
