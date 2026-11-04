# Asset Bridge (Dexathon 2026)

## Overview
Asset Bridge is a living financial twin designed for Indian families to address the ₹94,000+ crore unclaimed wealth crisis. It unifies holdings across five regulators (RBI, EPFO, IRDAI, SEBI, PFRDA), performs continuous real-time nominee and KYC integrity audits, and automates estate succession upon death registration.

## Architecture & Tech Stack
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS 4, Framer Motion, Kokonut UI & Aceternity UI components.
- **Backend API**: Node.js, Express 5, native WebSockets (`ws`), and dual-mode data store (Supabase/PostgreSQL + JSON fallback).
- **AI Guidance**: Python FastAPI, BM25 RAG over state succession regulations with extractive and LLM (Gemini 2.5 Flash / OpenAI) inference.
- **Engines**: 1,000-path Monte Carlo wealth simulator, FY 2025-26 Indian income tax engine, and automated succession checklist builder.

## Target Audience & Event
- **Primary Event**: Dexathon 2026 Hackathon.
- **Scope**: Production-hardened MVP with database persistence, CAS statement upload, mobile PWA polish, and live demo reliability.
