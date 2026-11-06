# 14 — Materi Kuliah, Files, dan Knowledge Base

## Supported material types

- PDF, PPT/PPTX, DOC/DOCX, spreadsheet, image, video, audio, URL.
- Group by course, lecturer, semester, week, material type, and source.
- Search by title, extracted text, metadata, and semantic similarity.

## Upload workflow

1. Verify user permission and allowed group/source.
2. Validate MIME, extension, size, and malware scan where available.
3. Store original in object storage with random object key.
4. Extract text/metadata; use OCR/Vision for scans.
5. Keep page/slide boundaries where possible.
6. Chunk extracted content with source file/page/slide metadata.
7. Index for full-text + vector retrieval.
8. Provide catalog and signed temporary download link.
9. Apply retention and deletion policy.

## AI question-answering

- Retrieve only the relevant authorized files.
- Cite file name and page/slide where possible.
- If no source is found, say so; don't invent a citation.
- Separate extracted fact from generated explanation.
- For medical/nursing study content, state educational context and defer clinical decisions to qualified supervisor and current protocols.

## Commands

`.materi`, `.materi <matkul>`, `.materi terbaru`, `.uploadmateri`, `.hapusmateri`, `.carimateri`, `.materi minggu1`, `.katalogpdf`, `.katalogppt`, `.katalogdocx`, `.kataloggambar`, `.kataloglink`, `.katalogvideo`, `.downloadmateri`, `.previewmateri`, `.statistikmateri`, `.arsipmateri`, `.backupmateri`.

## SHJ public references

Start with official references and verify accessibility/licensing before ingestion:

- https://shj.ac.id/
- https://shj.ac.id/prodi-profesi-ners/
- https://shj.ac.id/materi-pembelajaran/
- https://shj.ac.id/halaman-download-file/
- https://siakad.shj.ac.id/
- https://lms.shj.ac.id/
- https://e-journal.shj.ac.id/

Do not bypass login, paywalls, robots rules, or access controls. Prefer files supplied by class/admin. SIAKAD/LMS credentials must never be requested or stored by this class assistant.

## Prompt untuk coding agent

> Implement upload, parser, OCR/vision path, full-text/semantic index, metadata catalog, page-aware RAG, access control, signed links, retention, and deletion. Do not scrape private portals or store account credentials. Add retrieval evaluation and citation tests.
