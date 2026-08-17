import { afterEach, describe, expect, it, vi } from 'vitest'

const pluralRulesDescriptor = Object.getOwnPropertyDescriptor(Intl, 'PluralRules')

describe('mobile i18n', () => {
  afterEach(() => {
    if (pluralRulesDescriptor) Object.defineProperty(Intl, 'PluralRules', pluralRulesDescriptor)
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it('initializes without a visible error when Hermes lacks Intl.PluralRules', async () => {
    Object.defineProperty(Intl, 'PluralRules', { configurable: true, value: undefined })
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    await import('../i18n')

    expect(consoleError.mock.calls.flat().join(' ')).not.toContain('pluralResolver')
  })
})
