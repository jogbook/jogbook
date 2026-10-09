import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  productName?: string
  amount?: string
  currency?: string
  customerEmail?: string
  orderId?: string
}

const Email = ({ productName = 'Service', amount = '', currency = 'USD', customerEmail = 'unknown', orderId = '' }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New paid order: {productName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>New paid order</Heading>
        <Text style={row}><b>Service:</b> {productName}</Text>
        <Text style={row}><b>Amount:</b> {amount} {currency}</Text>
        <Text style={row}><b>Customer:</b> {customerEmail}</Text>
        {orderId ? <Text style={row}><b>Order:</b> {orderId}</Text> : null}
        <Text style={text}>Payment was verified with PayPal. It's waiting in your work queue.</Text>
        <Button href="https://jogbook.com/admin" style={button}>Open admin</Button>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `New order: ${d.productName ?? 'service'} (${d.amount ?? ''} ${d.currency ?? ''})`,
  displayName: 'Admin new-order alert',
  to: 'chilstamusic@gmail.com',
  previewData: { productName: 'DJ Concierge Setup', amount: '49.00', currency: 'USD', customerEmail: 'dj@example.com', orderId: 'abc123' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', color: '#111111', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#333333', lineHeight: '1.5', marginTop: '16px' }
const row = { fontSize: '15px', color: '#111111', margin: '4px 0' }
const button = { backgroundColor: '#009900', color: '#ffffff', borderRadius: '12px', padding: '12px 20px', fontSize: '15px', textDecoration: 'none' }
