import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  productName?: string
  amount?: string
  currency?: string
  orderId?: string
  paidAt?: string
}

const Email = ({ productName = 'JogBook service', amount = '', currency = 'USD', orderId = '', paidAt = '' }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your JogBook receipt for {productName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Thanks for your purchase</Heading>
        <Text style={text}>Your payment was received. Here is your receipt.</Text>
        <Text style={row}><b>Service:</b> {productName}</Text>
        <Text style={row}><b>Amount paid:</b> {amount} {currency}</Text>
        {paidAt ? <Text style={row}><b>Date:</b> {paidAt}</Text> : null}
        {orderId ? <Text style={row}><b>Order reference:</b> {orderId}</Text> : null}
        <Hr style={hr} />
        <Text style={text}>
          We'll start working on your request shortly. You can follow its progress on your Billing page.
        </Text>
        <Button href="https://jogbook.com/billing" style={button}>View my billing</Button>
        <Text style={small}>Questions? Reply via the support form on your Billing page.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `Your JogBook receipt — ${d.productName ?? 'purchase'}`,
  displayName: 'Customer receipt',
  previewData: { productName: 'DJ Concierge Setup', amount: '49.00', currency: 'USD', orderId: 'abc123', paidAt: 'Oct 9, 2026' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', color: '#111111', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#333333', lineHeight: '1.5' }
const row = { fontSize: '15px', color: '#111111', margin: '4px 0' }
const hr = { borderColor: '#e5e7eb', margin: '20px 0' }
const button = { backgroundColor: '#009900', color: '#ffffff', borderRadius: '12px', padding: '12px 20px', fontSize: '15px', textDecoration: 'none' }
const small = { fontSize: '13px', color: '#6b7280', marginTop: '20px' }
