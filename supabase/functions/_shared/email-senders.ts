/** Visible From addresses; DNS verification continues using the delegated sender domain. */
export function getAccountEmailSender(fromDomain: string): string {
  return `hello@${fromDomain}`
}

export function getAppEmailSender(templateName: string, fromDomain: string): string {
  if (templateName === 'order-receipt' || templateName === 'admin-new-order') {
    return `billing@${fromDomain}`
  }
  return getAccountEmailSender(fromDomain)
}