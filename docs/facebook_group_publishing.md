# Car Daddy Facebook Group Publishing Preparation

Status: prepared and paused. No Facebook post has been created or queued for automatic execution.

## Profile and catalog

- Facebook Group Join Assistant profile: `fgja-2` (`Car Daddy`).
- The local catalog is read through its loopback-only authenticated integration.
- The integration token is never copied into this repository or the generated queue.
- Only active, confirmed memberships are considered.

## Queue policy

- English and Spanish destinations are stored in separate queues.
- One global destination is selected every 120 minutes; language queues never run concurrently.
- Planned Central Time window: 8:00 AM through 8:00 PM.
- Planned maximum: seven group posts per day.
- Every destination begins with `rules_review_status: pending`.
- Publishing remains blocked while `enabled` is `false`, `dry_run` is `true`, or rules review is incomplete.
- A Facebook warning, login request, CAPTCHA, identity check, disabled composer, or uncertain submission must stop the future worker.
- A group ID cannot appear twice in one generated queue. Publication history must be checked before any retry.

## Understanding the counts

The Facebook Group Join Assistant dashboard's **Total Groups** number is the complete processing inventory for the selected profile. It includes new groups that have not been visited, pending requests, groups requiring answers, skipped entries, failures, and groups where the profile is already a member. It is not the number of confirmed memberships or publishable destinations.

The generated CarDaddy queue reports a narrower funnel:

- `regional_confirmed_memberships_read`: confirmed memberships returned by the integration after its launch-region filter.
- `eligibility`: the exact count accepted or excluded by topic, category, name quality, and CarDaddy service-area rules.
- `english_queue` and `spanish_queue`: prepared destinations by posting language.
- `total_prepared`: the combined paused publishing queue.

Never describe one language queue or the filtered queue as the profile's total Facebook groups.

## Prepared content

`data/facebook-post-templates.json` contains separate English and Spanish drafts and approved Car Daddy media paths. These drafts have not been posted.

The provider-network beta campaign is isolated in `data/facebook-provider-recruitment.json`. It contains:

- The Spanish group post inviting independent automotive providers to send `MECÁNICO` privately.
- The private response explaining the beta, direct payment, no advance payment before arrival, evidence requirements, and email confirmation.
- A draft response to `QUIERO REGISTRARME` with the production application link.

The message flow accepts `MECÁNICO` with or without the accent and only as an exact normalized response. It deduplicates inbound event IDs, honors opt-out words, and never sends from unsupported sources. Both the campaign and each message require explicit approval; the automation remains disabled and in dry-run mode.

## Refreshing the paused queue

Run the Facebook Group Join Assistant, confirm that the `Car Daddy` profile catalog is current, then run:

```powershell
pnpm social:prepare
```

This updates `data/facebook-group-queue.json` without publishing anything.

## Activation gate

Activation is a later task. Before enabling any worker:

1. Review group rules and mark only destinations that permit relevant business/service posts.
2. Approve the final English and Spanish text and image rotation.
3. Confirm the Facebook profile session and posting window.
4. Keep the worker disabled until the owner explicitly authorizes the first live post.

Private-message activation is also a later task. It requires a supported Meta integration, approval of both message steps, and explicit owner authorization. No browser automation, group publication, or private reply is currently running.
