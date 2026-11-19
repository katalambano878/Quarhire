# Email setup for Quarhire

Booking confirmations, contact-form messages, invoices, and admin alerts are sent through Postal (`https://postal.zoepayhub.com`).

## Environment variables

```env
POSTAL_API_URL=https://postal.zoepayhub.com
POSTAL_API_KEY=
EMAIL_FROM=Quarhire <info@quarhire.com>
ADMIN_EMAIL=raphael@quarhire.com
```

`EMAIL_FROM` must be an address on `quarhire.com`. `ADMIN_EMAIL` receives booking alerts, contact-form messages, and a copy of each invoice.

## What gets sent

- **New booking (reserve or pay now):** admin email as soon as the booking is saved. The customer email goes out immediately for reservations, and after Hubtel confirms payment for pay-now bookings.
- **Paid booking:** customer confirmation plus a second admin notice marked paid.
- **Contact form:** message to the admin, with reply-to set to the customer.
- **Invoice:** invoice to the customer, and a copy to the admin.

## DNS required on quarhire.com

The domain's DNS is at GoDaddy. These records let Postal sign and deliver mail. Do not change the existing Microsoft 365 / Amazon MX records.

- TXT on `@`: `postal-verification <token from Postal>`
- TXT on the Postal DKIM host (`postal-xxxxxx._domainkey`): the DKIM key Postal shows
- CNAME `psrp` → `rp.zoepayhub.com`
- SPF on `@`: keep the current includes and add `include:spf.zoepayhub.com` before `-all`

DMARC for this domain is `p=reject`, so mail from `quarhire.com` is dropped unless SPF and DKIM pass.
