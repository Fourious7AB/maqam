# SRDV Hotel Booking and Settlement Flow

> Summary: This document describes the hotel booking lifecycle for SRDV, from customer search through supplier settlement and accounting.

## Overview

Maqam's hotel booking flow separates customer payment from supplier reservation and settlement. The public API works with opaque Maqam IDs and safe session state, while internal SRDV requests use provider credentials and supplier-specific payloads.

## Client-facing flow

1. Customer performs hotel search and receives `searchId` plus hotel cards.
2. Customer requests hotel details with `hotelId` and `searchId`.
3. Customer selects a room rate and Maqam performs a recheck/block operation.
4. Customer completes payment through Maqam's gateway.
5. Payment success triggers a worker to confirm the SRDV booking asynchronously.

## Supplier settlement flow

- Maqam reserves with SRDV using a validated `recheckId` and booking request.
- SRDV returns booking confirmation or pending voucher state.
- Maqam records supplier booking IDs, voucher/invoice details, and raw supplier response.
- Settlement and reconciliation are handled separately from the public booking result.

## Important distinctions

- Public endpoints never expose SRDV credentials, `TraceId`, `ResultIndex`, supplier-only rate IDs, or raw supplier price.
- Internal SRDV payloads may use `GetHotelInfo`, `HotelRoom`, `BlockRoom`, `Book`, `HotelCancel`, and settlement APIs as defined by the SRDV contract.
- Booking confirmation is only complete after SRDV confirms the reservation, not after customer payment alone.

## Notes

This document is intended for Maqam engineering and integration teams. The exact SRDV request/response fields and settlement contract must be validated against the SRDV sandbox and the current supplier contract.
