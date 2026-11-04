# Asset Bridge - LARP Archive Directory (`larp/`)

This directory houses non-application markdown files, brainstorming logs, historical audits, and hackathon artifacts separate from the running application codebase.

## Directory Contents

- `larp/future.md`: Initial quality-of-life and future roadmap notes (implemented across Round 2 and Round 3).
- `larp/BACKEND_CHANGES_AUDIT.md`: Historical audit report of backend migrations and optimizations.
- `larp/round2/`: Round 2 hackathon contribution reports, personal deliverables (Asvand, Shajith, Sai), and system architecture drafts.
- `larp/round3/`: Round 3 audit summaries and frontend PDF review notes.

## Active Application Code Structure

The active production codebase is strictly organized across four dedicated engines:
1. `fastapi-backend/app/ai_bot/`: AI Succession Guide LLM and knowledge RAG search.
2. `fastapi-backend/app/email_sender/`: Google App Password SMTP, Twilio Comms Email API, and SMS alerts.
3. `fastapi-backend/app/pdf_generator/`: ReportLab statutory claiming dossier PDF generator.
4. `scrapers/`: Scrapy statutory circular crawler with hybrid Redis and SQLite Document Vault storage.

