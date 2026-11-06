# 15 — AI Class Assistant Learning Features

## Capabilities

- `.ask <pertanyaan>` and natural language Q&A.
- Summarize course materials / discussion / PDF.
- Create study notes, flashcards, quizzes, MCQ, essay questions, explanations, exam outline/kisi-kisi.
- Explain difficult nursing concepts in simple Indonesian.
- Proofread and improve grammar.
- Translate materials.
- Create paper/PPT outlines and bibliography suggestions.
- Answer questions from authorized PDF/material repository.

## Academic integrity

- AI should help learning, not impersonate students or fabricate experimental data/references.
- For proofreading, preserve the student's ideas and label meaningful content changes.
- For bibliography, never invent DOI, journal, year, volume, author, or URL; verify reference metadata from trusted source.
- If asked for a complete assignment answer, offer explanation, outline, references, and worked examples; don't claim it represents official lecturer guidance.

## Nursing domain safety

- Explain theoretical concepts, nursing processes, patient education principles, and academic cases.
- Avoid individualized diagnosis, prescriptions, emergency triage decisions, or patient-specific treatment instruction.
- For real clinical decisions, direct users to clinical instructor / licensed professional and local protocol.
- Never store a real patient's identifiable health record in class database.

## RAG workflow

Question → permissions → query rewrite → retrieval → rerank → answer grounded in passages → citations → uncertainty note. If no relevant chunk, ask for material or provide general educational response clearly labelled as general knowledge.

## Prompt untuk coding agent

> Build tutor tools with RAG, file/page citations, flashcard/quiz generator, proofreading, translation, outline and question creation. Include Indonesian nursing vocabulary tests, hallucinated citation tests, prompt injection documents, and clinical-safety tests. Keep all AI-generated material labeled as AI-assisted.
