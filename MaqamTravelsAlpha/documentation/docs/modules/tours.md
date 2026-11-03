---
sidebar_position: 5
---

# Tours Module

The `tours` module oversees day excursions, religious site tours (Ziyarat), and city guides.

## Component Map

* **Routes:** `tour.routes.js`
* **Controller:** `tour.controller.js`
* **Service:** `tour.service.js`
* **Model:** `Tour`

---

## Operations & Logic

### 1. Inventory & Slots
* Deals with booking slots (dates and times) with vendor caps (e.g. maximum of 15 people per bus).
* Utilizes MongoDB atomic increments to prevent overbooking on public slots.

### 2. Tour Guides Assignment
* Integrates scheduling calendars to assign available guides, vehicles, and entry passes.
