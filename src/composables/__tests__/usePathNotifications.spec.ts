import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  notificationsEnabled,
  setNotificationsEnabled,
  notifyPathTransitions,
  reseedPathBaseline
} from '@/composables/usePathNotifications'

class FakeNotification {
  static instances: { title: string; options: NotificationOptions }[] = []
  onclick: (() => void) | null = null
  constructor(
    public title: string,
    public options: NotificationOptions
  ) {
    FakeNotification.instances.push({ title, options })
  }
  close() {}
}

describe('usePathNotifications', () => {
  beforeEach(() => {
    vi.stubGlobal('Notification', FakeNotification)
    FakeNotification.instances = []
    // The composable only notifies when the page isn't focused.
    vi.spyOn(document, 'hasFocus').mockReturnValue(false)
    setNotificationsEnabled(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    setNotificationsEnabled(false)
  })

  it('exposes the enabled flag', () => {
    expect(notificationsEnabled()).toBe(true)
    setNotificationsEnabled(false)
    expect(notificationsEnabled()).toBe(false)
  })

  it('seeds the baseline without firing on the first poll', () => {
    notifyPathTransitions([{ name: 'cam1', online: true }])
    expect(FakeNotification.instances).toHaveLength(0)
  })

  it('fires once when a path transitions after the baseline', () => {
    notifyPathTransitions([{ name: 'cam1', online: true }]) // seed
    notifyPathTransitions([{ name: 'cam1', online: false }]) // went offline
    expect(FakeNotification.instances).toHaveLength(1)
    expect(FakeNotification.instances[0].title).toBe('Path offline')
    expect(FakeNotification.instances[0].options.body).toContain('cam1')

    notifyPathTransitions([{ name: 'cam1', online: true }]) // came back online
    expect(FakeNotification.instances).toHaveLength(2)
    expect(FakeNotification.instances[1].title).toBe('Path online')
  })

  it('does not fire for paths that stay unchanged', () => {
    notifyPathTransitions([{ name: 'cam1', online: true }]) // seed
    notifyPathTransitions([{ name: 'cam1', online: true }]) // unchanged
    expect(FakeNotification.instances).toHaveLength(0)
  })

  it('ignores brand-new paths that appear after the baseline', () => {
    notifyPathTransitions([{ name: 'cam1', online: true }]) // seed
    notifyPathTransitions([
      { name: 'cam1', online: true },
      { name: 'cam2', online: true }
    ]) // new path appears
    expect(FakeNotification.instances).toHaveLength(0)
  })

  it('does not fire while notifications are disabled', () => {
    setNotificationsEnabled(false)
    notifyPathTransitions([{ name: 'cam1', online: true }])
    notifyPathTransitions([{ name: 'cam1', online: false }])
    expect(FakeNotification.instances).toHaveLength(0)
  })

  it('re-seeding the baseline silences subsequent polls', () => {
    notifyPathTransitions([{ name: 'cam1', online: true }]) // seed
    reseedPathBaseline([{ name: 'cam1', online: false }]) // e.g. after a pause
    notifyPathTransitions([{ name: 'cam1', online: false }]) // unchanged vs reseed
    expect(FakeNotification.instances).toHaveLength(0)
  })
})
