import { describe, it, expect } from 'vitest'
import {
  emptyPathConfForm,
  fillPathConfForm,
  pathConfPayload,
  isRedactedCredential
} from '@/composables/usePathConfForm'

describe('isRedactedCredential', () => {
  it('recognizes MediaMTX 1.20.1 password redaction', () => {
    expect(isRedactedCredential('<redacted>')).toBe(true)
  })

  it('rejects real credentials and non-strings', () => {
    expect(isRedactedCredential('hunter2')).toBe(false)
    expect(isRedactedCredential('')).toBe(false)
    expect(isRedactedCredential(null)).toBe(false)
    expect(isRedactedCredential(undefined)).toBe(false)
  })
})

describe('pathConfPayload', () => {
  it('omits redacted publish/read passwords so they are preserved server-side', () => {
    const form = emptyPathConfForm()
    form.publishPass = '<redacted>'
    form.readPass = '<redacted>'
    const payload = pathConfPayload(form)
    expect(payload).not.toHaveProperty('publishPass')
    expect(payload).not.toHaveProperty('readPass')
  })

  it('keeps real passwords in the payload', () => {
    const form = emptyPathConfForm()
    form.publishPass = 'new-pass'
    form.readPass = ''
    const payload = pathConfPayload(form)
    expect(payload.publishPass).toBe('new-pass')
    expect(payload.readPass).toBe('')
  })

  it('sends an empty password to explicitly clear it', () => {
    const form = emptyPathConfForm()
    form.publishPass = ''
    expect(pathConfPayload(form).publishPass).toBe('')
  })

  it('never sends the path name', () => {
    const form = emptyPathConfForm()
    form.name = 'mystream'
    expect(pathConfPayload(form)).not.toHaveProperty('name')
  })

  it('maps an empty source to the literal publisher default', () => {
    const form = emptyPathConfForm()
    form.source = ''
    expect(pathConfPayload(form).source).toBe('publisher')
  })

  it('serializes IP allowlists as comma-separated strings', () => {
    const form = emptyPathConfForm()
    form.publishIPs = ['192.168.1.0/24', '203.0.113.5']
    expect(pathConfPayload(form).publishIPs).toBe('192.168.1.0/24,203.0.113.5')
  })
})

describe('fillPathConfForm', () => {
  it('round-trips a redacted password into the form for display purposes', () => {
    const form = emptyPathConfForm()
    fillPathConfForm(form, { publishPass: '<redacted>', readPass: '<redacted>' })
    expect(form.publishPass).toBe('<redacted>')
    expect(form.readPass).toBe('<redacted>')
  })
})
