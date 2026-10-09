import { describe, expect, it } from 'vitest'
import { getAccountEmailSender, getAppEmailSender } from '../../supabase/functions/_shared/email-senders'

describe('JogBook email senders', () => {
  it('sends customer payment receipts from billing@jogbook.com', () => {
    expect(getAppEmailSender('order-receipt', 'jogbook.com')).toBe('billing@jogbook.com')
  })

  it('sends paid-order alerts from billing@jogbook.com', () => {
    expect(getAppEmailSender('admin-new-order', 'jogbook.com')).toBe('billing@jogbook.com')
  })

  it('sends account emails from hello@jogbook.com', () => {
    expect(getAccountEmailSender('jogbook.com')).toBe('hello@jogbook.com')
  })

  it('uses hello@jogbook.com for non-payment app emails', () => {
    expect(getAppEmailSender('contact-confirmation', 'jogbook.com')).toBe('hello@jogbook.com')
  })
})