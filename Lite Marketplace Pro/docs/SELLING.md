# Selling this template

A practical guide for the owner of Lite Marketplace. It's general advice, not legal or financial advice.

## Three ways to sell it

| Way | Typical buyer | Typical price | Good for |
|---|---|---|---|
| **One buyer, full rights** (Flippa, Acquire.com, direct to an agency or entrepreneur) | Someone who wants to launch this business in their country | Highest per sale. A few thousand dollars is realistic when you include setup and support; revenue and real users raise it a lot | Reaching a single large sale such as $5,000 |
| **Many copies** (Gumroad, Lemon Squeezy, CodeCanyon) | Developers and agencies | Usually tens to a few hundred dollars per licence | Steady income over time |
| **Done-for-you launch** (template + setup + branding + 3 months support) | Non-technical business owners | Priced per project | Turning the template into a service |

A $5,000+ price is most believable as a **full-rights sale or a launch package**, not as a single download. Buyers pay that kind of money for proof that it works and saves them months.

## What makes buyers pay more

1. **A live demo they can click.** Build the demo (`npm run build:demo`) and drop `web/dist` on Netlify. Put the link at the top of every listing.
2. **A 2-3 minute video**: sign up → add a product with the AI writer → order from the shop → pay → see it in the dashboard → admin panel.
3. **Screenshots** of the landing page, dashboard, storefront on a phone, AI coach and admin panel, in light and dark mode.
4. **Proof it runs**: mention the automated tests and the one-command Docker setup.
5. **Real usage**: even 5-10 real shops using it (friends, family, local sellers) makes a full-rights sale much easier, and any revenue makes it worth more.
6. **Clear licence and support terms** (see `LICENSE.md`): what buyers may do, and how long you'll answer questions.

## Before you list it

- [ ] Run it on your own computer with Docker and click through everything.
- [ ] Put your support email in `.env.example`, `web/src/config.ts` and the licence.
- [ ] Decide your licence tiers and fill in the brackets in `LICENSE.md`.
- [ ] Remove anything personal from the code and data (old accounts, your phone number, test keys).
- [ ] Make a zip without `node_modules`, `target`, `dist`, `data` or `.env`.
- [ ] Record the video and deploy the demo.

## A note on accounts

Most marketplaces, payment providers (Paystack, Flutterwave, Stripe) and escrow services require the account holder to be 18 or older and to verify their identity. If that's not you yet, a parent or guardian can open the seller account and receive payouts. For large sales, use an escrow service (Escrow.com, or the marketplace's own) so neither side can be cheated.
