# Dealer-lead pipeline (`submission-created`)

Netlify runs this function automatically on every **verified** Netlify Forms submission for the
site (the file name `submission-created` is what wires it up — no webhook to configure).
Spam caught by the honeypot never reaches it.

For dealer-intent submissions it does three independent things:

| Step | What happens | Needs |
|---|---|---|
| CRM | Create/update the **contact**, match or create the **company** (dealer_status = Prospect), open a **deal** in *Dealer Acquisition → New Prospect* (deal_source = website, region set from the state), attach a **note** with the full submission, and create a **HIGH-priority call task** for the owner due the same day | `HUBSPOT_PRIVATE_APP_TOKEN` |
| Prospect email | A short email from the sending mailbox promising that *your Pinnacle Sales rep* will call *later today* (weekdays before 3 pm Pacific) or *first thing the next business morning*, BCC'd to the HubSpot logging address so it appears on the contact timeline | `SMTP_USER` + `SMTP_PASS` |
| Team alert | Internal email with the submission and links to the HubSpot deal / contact / task | `SMTP_*` + `LEAD_ALERT_TO` |

Forms that count as dealer leads: `dealer-application`, `territory-check`, and the `contact`
form when the topic is **Dealer Partnership Inquiry**. Everything else (homeowner lookups,
stone inquiries, playbook submissions, dealer-hub requests) is ignored by this function.

Each step degrades independently: if HubSpot is down the prospect still gets the reply and the
team alert says the sync was skipped; if SMTP isn't configured the CRM sync still runs.
Netlify's own form email notifications (Site configuration → Forms → Form notifications) are
unaffected and keep working.

## One-time setup (≈15 minutes)

### 1. HubSpot private app

HubSpot → **Settings → Integrations → Private Apps → Create private app**

- Name: `Pinnacle website leads`
- Scopes (CRM tab): `crm.objects.contacts.read` + `.write`, `crm.objects.companies.read` + `.write`,
  `crm.objects.deals.read` + `.write`
- Create → copy the access token (starts with `pat-na2-…`).

### 2. Mailbox app password (Google Workspace)

Sign in as the mailbox the replies should come from (recommended: `ben@pinnaclesales.biz`).
Google Account → **Security → 2-Step Verification → App passwords** → create one named
`Netlify lead replies` → copy the 16-character password. Replies to the auto-reply thread land
in that mailbox like any other email.

### 3. HubSpot BCC logging address

HubSpot → **Settings → Objects → Activities → Email Log** → copy the BCC address
(`<portal id>@bcc.na2.hubspot.com` for this portal). Optional but recommended: it puts the
auto-reply on the contact timeline with no extra API calls.

### 4. Environment variables

Netlify → **Site configuration → Environment variables** (scope: Functions is enough):

| Variable | Value |
|---|---|
| `HUBSPOT_PRIVATE_APP_TOKEN` | token from step 1 |
| `SMTP_USER` | `ben@pinnaclesales.biz` (the mailbox from step 2) |
| `SMTP_PASS` | the app password from step 2 |
| `HUBSPOT_BCC_ADDRESS` | address from step 3 |
| `LEAD_ALERT_TO` | `ben@pinnaclesales.biz,gillian@pinnaclesales.biz` (comma-separated) |

Optional overrides (defaults in parentheses): `MAIL_FROM_NAME` (`Ben Miller · Pinnacle Sales`),
`MAIL_REPLY_TO` (`ben@pinnaclesales.biz`), `MAIL_SIGNATURE_NAME` / `MAIL_SIGNATURE_TITLE` /
`MAIL_SIGNATURE_EMAIL` (`Ben Miller` / `Partner, Pinnacle Sales` / the reply-to — set these to
`Pinnacle Sales` / `Dealer Development` / `marketing@pinnaclesales.biz` for a team signature), `SMTP_HOST` (`smtp.gmail.com`), `SMTP_PORT` (`465`),
`LEAD_DEFAULT_OWNER_ID` (Ben, `84039521`), `LEAD_OWNER_BY_STATE` (JSON, e.g.
`{"AZ":"160712108","NM":"160712108","OR":"160712575","WA":"160712575"}` to route AZ/NM to Scott
and OR/WA to Josh), `HUBSPOT_API_BASE` (`https://api.hubapi.com`), `HUBSPOT_PORTAL_ID`
(`244107450`), `HUBSPOT_UI_DOMAIN` (`app-na2.hubspot.com`), `HUBSPOT_DEALER_PIPELINE_ID`
(`1403353831`), `HUBSPOT_NEW_PROSPECT_STAGE_ID` (`2277725906`), `AUTO_REPLY_DISABLED=1`
(keep the CRM sync, skip the prospect email), `DRY_RUN=1` (log only, no HubSpot/SMTP calls).

### 5. Deploy and verify

The function ships with any deploy that includes the `netlify/functions` directory — a Git-triggered
build, or `netlify deploy --prod` from the CLI. **A raw API upload of `dist/` alone does not
include it** (the Sept 17 production deploy had "No functions deployed").

After deploying, submit the live form once with your own email, then check:

1. Netlify → **Logs → Functions → submission-created**: one `[dealer-lead] lead received …` line
   followed by `hubspot ok: contact …, deal …, task …` and `prospect email sent to …`.
2. HubSpot → Deals → *Dealer Acquisition*: the new deal sits in **New Prospect** with the note and
   the call task attached.
3. Your inbox: the auto-reply (and, if configured, the team alert).

## Timing rules

`copy.mjs` decides what the prospect is promised. Weekdays before **3 pm Pacific** →
"later today" (task due 5 pm). Otherwise → "first thing tomorrow morning" / "first thing
Monday morning" (task due 10 am). The Become-a-Dealer page and both thank-you pages state the
same rule, so change them together if you change `SAME_DAY_CUTOFF_HOUR`.

## Editing the emails

All copy lives in `copy.mjs` (`prospectEmail`, `internalAlert`, `SENDER_DEFAULTS`/`sender`). The body never
names a person — it says "your Pinnacle Sales rep" — so owner routing by state stays truthful. Field → HubSpot
property mapping lives in `hubspot.mjs`; enumeration values and IDs in `mapping.mjs`.

## Tests

```
npm run test:leads
```

Runs `scripts/test-dealer-lead-function.mjs` offline: normalization, region/owner mapping,
the Pacific-time promise logic (incl. Friday → Monday and the DST boundary), the full HubSpot
request sequence in dry-run mode, reuse of an open deal, contact-form routing, and graceful
degradation when HubSpot or SMTP is unavailable. Drop `--quiet` to print the three sample emails.

To exercise the real integrations without the website, create a `.env` (see `.env.example`) and run
`node --env-file=.env -e "import('./netlify/functions/submission-created/submission-created.mjs').then(m => m.handler({ body: JSON.stringify({ payload: { form_name: 'territory-check', created_at: new Date().toISOString(), data: { name: 'Test Dealer', email: 'you@example.com', company: 'Test Showroom', city: 'Tucson', state: 'AZ', brand: 'Shiloh Cabinetry', 'source-page': '/become-a-dealer/' } } }) }).then(r => console.log(r.body)))"`
— set `DRY_RUN=1` in `.env` first to see the plan without writing to HubSpot.
