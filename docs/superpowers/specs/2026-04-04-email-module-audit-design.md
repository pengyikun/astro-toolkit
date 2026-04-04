# Email Module Audit Design

Date: 2026-04-04
Topic: first-party audit of the repo's mail/email module against Himalaya read capabilities and safety requirements
Status: approved design, pending user review before audit execution

## Goal

Produce an evidence-based audit of the repo's first-party mail/email implementation that answers four questions:

1. Does the repo fully implement the relevant Himalaya email read functions?
2. Does the implementation match the installed `himalaya v1.2.0` CLI contract?
3. How does the implementation compare against the broader upstream/latest Himalaya read surface?
4. Is there any dangerous, malicious, exfiltrating, infinite-loop, memory-leak, or disk-retention-risk code in the first-party mail path?

## In Scope

The audit covers first-party mail code in this repository only:

- `lib/mail.ts`
- `actions/mail.ts`
- `app/api/mail/attachments/[downloadId]/[filename]/route.ts`
- `components/mail/MailFetcher.tsx`
- `app/mail/page.tsx`
- `components/data/MailSettings.tsx`
- `schemas/mail.schema.ts`
- `models/mail-setting.model.ts`
- relevant types and i18n strings only when they affect the mail path
- mail-focused tests under `tests/unit/`

## Out of Scope

- third-party dependency audits
- Himalaya source-code security review
- non-mail features
- live IMAP end-to-end validation against a real mailbox
- remediation or implementation work

## Audit Standard

The audit standard is stricter than "a similarly named function exists."

A Himalaya read capability is considered fully implemented only if:

- the repo exposes the capability through a real first-party path
- the wrapper matches the real CLI contract of the installed `himalaya v1.2.0`
- the wrapper shape is usable by the rest of the application
- fallbacks do not silently corrupt or misrepresent data
- the path does not introduce avoidable security or reliability regressions

## Audit Method

### 1. Capability Pass

Map the repo's read-oriented Himalaya surface, including:

- folder list
- envelope list
- envelope thread
- message read
- message thread
- message export or raw-message retrieval
- attachment download

For each capability, compare:

- installed `himalaya v1.2.0`
- broader upstream/latest Himalaya read surface
- repo implementation status

Status labels:

- `fully implemented`
- `partially implemented`
- `incompatible`
- `missing`

### 2. Trust-Boundary Pass

Trace every boundary where first-party mail code handles secrets, files, subprocesses, or browser-visible downloads:

- encrypted and decrypted IMAP credentials
- temporary TOML config generation
- subprocess argument construction
- subprocess environment passing
- raw export temp storage
- attachment download storage
- authenticated attachment route
- client-generated download URLs

Primary questions:

- can local data be transmitted to an unintended external destination?
- can one user access another user's downloaded attachment?
- can secrets persist on disk longer than intended?
- are subprocess inputs strongly bounded?

### 3. Control-Flow And Resource Pass

Check for:

- infinite loops
- unbounded retries
- subprocess hangs without timeout
- unbounded stdout or file reads
- memory-pressure risks
- stale file or directory accumulation
- cleanup paths that fail open

### 4. Test-Evidence Pass

Use tests as evidence, not as proof by assertion.

Review:

- parser-level tests
- action-level tests
- route tests
- fake-CLI integration tests
- coverage of security-sensitive and contract-sensitive branches

If an important branch or contract is untested, call it out explicitly.

## Evidence Sources

The audit may use:

- repo source files
- repo tests
- local command outputs
- local `himalaya --help` and subcommand help output
- official upstream Himalaya docs or source references when comparing against broader/latest read capabilities

## Deliverable Format

The final audit response will be structured as:

1. Findings first, ordered by severity with file references
2. Compatibility matrix:
   - installed `v1.2.0`
   - upstream/latest read-surface comparison
   - repo implementation status
   - notes
3. Security conclusion:
   - malicious code found or not
   - exfiltration risk found or not
   - infinite-loop risk found or not
   - memory or disk-retention leak risk found or not
4. Evidence summary with commands run and what they proved

## Success Criteria

The audit is complete when:

- every in-scope mail boundary has been reviewed
- every relevant Himalaya read capability has a compatibility judgment
- every major safety concern in the user request has a direct answer
- the report distinguishes confirmed evidence from inference
- the report does not claim live IMAP behavior that was not tested

## Constraints

- no implementation work during this phase
- no live mailbox use
- no expansion into third-party dependency review
- no assumptions that passing tests alone imply safety

## Resolved Design Decisions

- audit target includes both installed `himalaya v1.2.0` and broader/latest upstream read capabilities
- audit scope is limited to first-party mail code in this repo
- recommended audit mode is static plus contract audit, with extra scrutiny on the riskiest trust boundaries

## Risks And Mitigations

- Risk: fake-CLI tests may diverge from the installed binary
  - Mitigation: cross-check every relevant command against the real installed `himalaya v1.2.0` help output

- Risk: "latest/upstream" may differ from installed behavior
  - Mitigation: report installed and upstream comparisons separately

- Risk: absence of real IMAP credentials could be mistaken for absence of runtime risk
  - Mitigation: explicitly label which conclusions come from static review, local CLI contract inspection, and non-network tests

## Next Step

After user review and approval of this spec, proceed to planning or direct audit execution only through the approved workflow.
