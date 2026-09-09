<!--
  This is the PUBLIC repo's README — a public-facing statement, not a runbook.
  Deploy notes live in docs/promo_site/README.md, which is never exported.
  D2: no personal name, email, or company identity in this file.
-->

# GRID

**Every place on Earth gets an address that lasts.**

Roughly half the world cannot be addressed. Not "is addressed badly" — cannot
be addressed at all. The fastest-growing cities on Earth are growing faster
than anyone can name their streets, so deliveries are made by phone call and
landmark, ambulances are directed by relative, and whole neighbourhoods exist
in full with no way to refer to them.

Where addressing schemes do exist, they are often licensed by the lookup,
closed at the format, and tied to one supplier. Nations have bought addressing
twice and lost it twice, because the codes were never theirs to keep.

GRID is one index for the planet, and one engine that models what happens at
each point on it — water, crowds, machines, cities. A code here does not move
when the world around it does.

## Why this is one system and not five

A map tells you where a building is. It will not tell you where the floodwater
goes, how a crowd moves when a gate closes, or whether the machine you trained
in simulation will recognise the street when it arrives.

So addressing is the floor, not the product. Ten adapters run against the same
index — addressing, flood, crowds, volumetric, worldgen, climate, medical,
robotics, splats, synthetic worlds — which means a result from one is
addressable by the next. That combination is the part usually rebuilt five
separate times.

## What is open

The **GSF** and **GSF-T** container formats are published under CC BY 4.0, with
independent reader SDKs in Python and JavaScript under MIT. Anyone can read
their own data, forever, with or without us. That is deliberate: a government
that cannot read its own address layer does not own it.

The compression engine and the compute kernels are not open.

## Where we actually are

We are pre-launch. There is **no public service yet, and no customers yet**, and
we would rather say so here than have you find out later.

What exists: a complete national addressing layer generated for Nigeria —
8,809 wards, each assigned a persistent code — built and validated in
development, not running as a live public service. An open format spec with
working independent readers. Ten adapters on one engine. A pipeline that takes
days-to-weeks of compute and engineering to point at a new country, against
survey programmes that have historically taken years.

Performance and compression figures get published when they have been
independently measured, and not before. There are none on this site for that
reason.

## Working with us

We are looking for people who can open doors — governments, agencies, donors,
operators, universities. Anywhere a national or city-scale spatial layer is
being argued about, we want to be in the room.

There is a brief for that on the site, behind a password. If you think you
should have it, say so.

---

<sub>This repository is a built artefact. It is generated from a private source
tree and replaced wholesale on each deploy, so its commit history is not a
development history and changes made here will not survive. Issues are read.</sub>
