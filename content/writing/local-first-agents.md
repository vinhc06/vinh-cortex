---
title: "What should a local-first agent do first?"
summary: "A draft about designing a small, observable workflow before handing an agent more autonomy."
date: "2026-11-26"
draft: true
---

I start with one task I can already do by hand. For a local-first agent, that might mean turning a folder of notes into a daily brief. I can write down the inputs, decide which files the agent may read, and describe what a useful brief looks like.

## Make failures visible

The first version should be easy to inspect. Record which inputs were used, keep the draft separate from the source notes, and show what the agent skipped. If it goes wrong, I want enough information to reproduce the run and decide whether the workflow or the model needs to change.

## Expand after the feedback loop works

A predictable draft is a good place to start. Once I can review and rerun it comfortably, the next question is which action saves enough time to justify giving the agent more responsibility.
