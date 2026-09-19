# AGENTS.md

## Project

This is a take-home case study for Zamp's AI Solutions Associate role.

Selected problem:
PS-2 — Vendor Onboarding

The goal is to build a live, runnable workflow that takes a vendor submission,
processes it end-to-end, and produces one of:

- APPROVED
- PENDING
- REJECTED

The workflow must make its reasoning and intermediate steps visible.

## Product Goal

Build a simple Vendor Onboarding Operations Console.

Core workflow:

1. Intake and normalize vendor submission
2. Completeness check
3. Format validation
4. Document extraction
5. Identity consistency checks
6. Duplicate detection
7. Decision engine
8. Required action / vendor communication
9. Audit history

## Decision Philosophy

Deterministic business rules control the final decision.

AI may assist with:

- document extraction
- information normalization
- ambiguous identity comparison
- human-readable explanations
- vendor communication

AI must NOT directly override hard business rules or independently decide
whether a vendor should be approved.

## Current Decision Policy

APPROVED when:

- required information is complete
- required documents are present
- no hard validation failures exist
- identity information is consistent
- no unresolved duplicate or identity conflict exists

PENDING when:

- information or documents are missing
- identity matching is ambiguous
- a human review is required

REJECTED when:

- a hard validation failure exists
- a critical identity conflict exists
- a duplicate/identity conflict meets the rejection rule

## Scope

Initial MVP is focused on India-based vendor onboarding.

Do not add multi-country compliance logic unless explicitly required.

Avoid unnecessary production infrastructure.

Do not add Redis, queues, microservices, authentication, or other infrastructure
unless there is a clear case-study reason.

## Engineering Principles

- Keep the architecture simple.
- Prefer deterministic logic for deterministic rules.
- Use AI only where interpretation is genuinely useful.
- Keep every workflow step observable.
- Keep the application runnable after each meaningful milestone.
- Write tests for important business rules.
- Do not introduce dependencies without a reason.
- Never hard-code secrets.
- Never commit `.env` files or API keys.
- Inspect the existing code before making architectural changes.

## Demo Requirements

The final application should demonstrate:

1. A clean vendor submission → APPROVED
2. A missing-document submission → PENDING
3. A legitimate company-name variation → handled correctly
4. A material identity conflict → REJECTED

The system should expose the workflow steps and final reasoning clearly.

## Working Method

Before a significant change:

1. Read PROJECT_STATE.md.
2. Inspect the relevant existing code.
3. Make the smallest reasonable change.
4. Run relevant tests.
5. Fix failures.
6. Update PROJECT_STATE.md with the actual state of the project.

Do not rewrite unrelated parts of the project.

## Definition of Done

A feature is not considered complete until:

- it works end-to-end
- relevant tests pass
- the behavior is explainable
- no unnecessary complexity was introduced
- the project remains runnable