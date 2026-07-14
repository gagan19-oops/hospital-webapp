require("dotenv").config();
const { GoogleGenAI } = require("@google/genai");
const hospitalKb = require("./kb/hospital_kb");

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Configurable via .env so a future Google model rename/deprecation (which has
// been happening frequently) only needs a .env edit, not a code change.
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3-flash-preview";

const STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "do", "does", "did", "i", "my", "me",
  "for", "of", "in", "on", "at", "to", "and", "or", "what", "when", "how", "can", "will",
  "it", "this", "that", "with", "have", "has", "be", "been", "am", "you", "your",
]);

function tokenize(text) {
  return (text.toLowerCase().match(/[a-z0-9]+/g) || []).filter((w) => !STOPWORDS.has(w));
}

// Very lightweight keyword-overlap retrieval (a minimal stand-in for a real
// embedding/vector search). Scores each KB document by how many of the
// question's meaningful words appear in it, and returns the top matches.
// This is the "R" (retrieval) in this app's RAG pipeline - the "generation"
// step is the Claude call in answerPatientQuestion() below.
function retrieveRelevantFaqs(question, topN = 3) {
  const queryWords = tokenize(question);
  if (queryWords.length === 0) return [];

  const scored = hospitalKb.map((doc) => {
    const docWords = tokenize(doc.title + " " + doc.content);
    const docWordSet = new Set(docWords);
    let score = 0;
    for (const w of queryWords) {
      if (docWordSet.has(w)) score++;
    }
    return { doc, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .map((s) => s.doc);
}

// Formats a patient's own recent medicine requests (each with possibly
// several medicines) into a compact text block to inject into the prompt as
// structured context - the second half of this RAG setup (retrieving the
// patient's own records rather than a generic document).
function formatPatientRecords(records) {
  if (!records || records.length === 0) {
    return "This patient has no medicine requests on file.";
  }

  return records
    .map((r, i) => {
      const itemsText =
        r.items && r.items.length
          ? r.items
              .map(
                (it) =>
                  `${it.medicine_name} (${it.quantity} ${it.unit || ""}, ${
                    it.cost !== null ? "₹" + it.cost : "cost not yet set"
                  })`
              )
              .join("; ")
          : "no medicines listed";

      // diagnosis/instructions are entered by the prescribing doctor/nurse
      // at request time (see server.js /nurse route) - they're only present
      // here if staff actually filled them in for this request.
      const diagnosisText = r.diagnosis ? `, Diagnosis/Condition noted: ${r.diagnosis}` : "";
      const instructionsText = r.instructions ? `, Dosage/Timing instructions: ${r.instructions}` : "";

      return (
        `${i + 1}. Requested: ${r.request_time}, Ward: ${r.ward}, Medicines: ${itemsText}, ` +
        `Total: ₹${r.total_cost.toFixed(2)}, Delivery: ${r.delivery_status || "Pending"}, ` +
        `Payment: ${r.payment_status || "Unpaid"}${diagnosisText}${instructionsText}`
      );
    })
    .join("\n");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Google's free-tier Gemini endpoint occasionally returns a transient
// "503 UNAVAILABLE / model is overloaded" error under high demand - this
// isn't a real failure, just needs a moment and a retry. Only retries on
// that specific transient case; anything else (bad API key, invalid model
// name, etc.) fails immediately since retrying won't help.
async function generateWithRetry(params, attempts = 3) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await genAI.models.generateContent(params);
    } catch (err) {
      lastErr = err;
      const status = err.status || (err.error && err.error.code);
      const isOverloaded =
        status === 503 ||
        (err.message && (err.message.includes("UNAVAILABLE") || err.message.includes("overloaded")));

      if (!isOverloaded || i === attempts - 1) throw err;

      // Exponential backoff: ~1s, ~2s before giving up.
      await sleep(1000 * Math.pow(2, i));
    }
  }
  throw lastErr;
}

async function answerPatientQuestion(question, patientRecords) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const relevantFaqs = retrieveRelevantFaqs(question);
  const faqContext = relevantFaqs.length
    ? relevantFaqs.map((d) => `### ${d.title}\n${d.content}`).join("\n\n")
    : "(No specific hospital policy matched this question.)";

  const recordsContext = formatPatientRecords(patientRecords);

  const systemPrompt = `You are a helpful assistant for patients of Siddaganga Hospital, Tumkur.
Answer using ONLY the context provided below - the patient's own medicine request records, and
relevant hospital policy excerpts. If the answer isn't in the context, say you don't have that
information and suggest they contact the front desk. Keep answers short and friendly. Do not
invent costs, dates, policies, diagnoses, reasons for a prescription, or dosage/timing
instructions that aren't in the context.

Some requests below include a "Diagnosis/Condition noted" and/or "Dosage/Timing instructions"
field - these were entered by the treating doctor or nurse, not by you. If a patient asks why a
medicine was prescribed, what their condition is, or when to take a medicine:
- If that field is filled in for the relevant request, relay it accurately.
- If it's missing, say it wasn't recorded for that request and they should ask their doctor or
  nurse directly - never guess a diagnosis, reason, or dosage/timing from the medicine name alone.
- Always close such an answer by encouraging them to confirm with their doctor for any medical
  decision. You are not a doctor, are not providing medical advice, and must not present yourself
  as a substitute for one.

--- PATIENT'S MEDICINE REQUESTS ---
${recordsContext}

--- RELEVANT HOSPITAL POLICIES ---
${faqContext}`;

  const response = await generateWithRetry({
    model: GEMINI_MODEL,
    contents: question,
    config: {
      systemInstruction: systemPrompt,
      maxOutputTokens: 500,
    },
  });

  return response.text || "Sorry, I couldn't generate a response.";
}

module.exports = { answerPatientQuestion, retrieveRelevantFaqs, formatPatientRecords };
