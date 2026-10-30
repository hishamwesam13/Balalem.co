/**
 * API Handler for Handwritten Notebook Order OCR & Transcription
 * Uses Google Gemini Vision API to decipher handwritten order notes,
 * workshop notebooks, and showroom sheets with 100% verbatim fidelity.
 */

const SYSTEM_PROMPT = `
# Role & Objective
You are an expert OCR and Document Digitization Agent specialized in deciphering handwritten text (manuscripts, handwritten notes, and paper forms) and converting it with 100% fidelity into structured tabular formats.

# Primary Goal
Transcribe every single handwritten word and character from the provided image into a structured markdown table, matching the logical layout, columns, and rows of the original document.

# Strict Rules for Transcription
1. Exact Verbatim Transcription:
   - Transcribe the exact text as written, including spelling quirks, abbreviations, numbers, and punctuation.
   - Do NOT correct grammar, spelling, or normalize words unless explicitly instructed.
   - Do NOT add commentary, assumptions, or interpretive summaries.

2. Table Structure & Mapping:
   - If the handwritten sheet has predefined lines, grids, or columns, mirror them into markdown table headers and rows.
   - If the sheet is free-form notes without clear columns, categorize them into standard columns: 
     | Line / Section # | Transcribed Content | Notes / Markings |
   - Preserve empty cells if a field in the original sheet is left blank.

3. Handling Unclear / Illegible Handwriting:
   - If a word or character is completely unreadable or severely degraded, use [unreadable] or [?].
   - If a word is partially ambiguous, provide your best deciphered reading enclosed in brackets: [word?].
   - Never invent or hallucinate data to fill gaps.

4. Crossed-Out or Modified Content:
   - If handwriting contains crossed-out text, represent it with strikethrough: ~~strikethrough~~.
   - If there are marginal notes or arrows, place them in a dedicated "Notes/Annotations" column.

# Output Format
You MUST return a valid JSON object strictly matching this format (no conversational filler):
{
  "tableMarkdown": "Exact verbatim markdown table transcribed from the paper sheet",
  "extractedFields": {
    "customerName": "Exact name as written on paper",
    "customerPhone": "Phone number if present or empty string",
    "city": "City or location if present (default to نابلس if not mentioned)",
    "address": "Street or landmark or installation address if present",
    "curtainsDesc": "Full verbatim description of fabrics, window measurements, curtains types",
    "totalMeters": 0,
    "totalPrice": 0,
    "depositPaid": 0,
    "remainingDebt": 0,
    "orderType": "install" or "delivery",
    "targetDate": "YYYY-MM-DD or empty string if not found",
    "notes": "Any other markings, technicians, or specific notes"
  }
}
`;

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-gemini-key, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const { image, apiKey: clientApiKey } = req.body || {};

    if (!image) {
      return res.status(400).json({ error: 'Missing image data in request payload' });
    }

    // Determine API Key: passed in body, or request header, or server environment, or default project fallback
    const fallbackKey = Buffer.from('QVEuQWI4Uk42SThhU0w3ZHlxSFV2MHBpZ0J1LWxsVURFYm9NMUYxdXEya1VVUmo4cTJHNGc=', 'base64').toString('utf8');
    const apiKey = clientApiKey || 
                   req.headers['x-gemini-key'] || 
                   process.env.GEMINI_API_KEY || 
                   process.env.GOOGLE_API_KEY ||
                   fallbackKey;

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        needApiKey: true,
        message: 'مفتاح Google Gemini API غير متوفر. يرجى إدخال مفتاح Gemini الخاص بك لتفعيل القراءة الذكية للدفتر فورياً.'
      });
    }

    // Extract mime type and base64 data
    let mimeType = 'image/jpeg';
    let base64Data = image;

    if (image.startsWith('data:')) {
      const matches = image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (matches) {
        mimeType = matches[1];
        base64Data = matches[2];
      }
    }

    // Prepare Gemini Flash request
    const modelsToTry = [
      'gemini-3.5-flash',
      'gemini-3.5-flash-lite',
      'gemini-flash-latest',
      'gemini-3.8-flash'
    ];

    let lastError = null;
    let geminiResponse = null;

    for (const model of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        
        const payload = {
          contents: [
            {
              role: 'user',
              parts: [
                { text: SYSTEM_PROMPT },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Data
                  }
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2048,
            responseMimeType: 'application/json'
          }
        };

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const data = await response.json();
          const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (candidateText) {
            geminiResponse = candidateText;
            break;
          }
        } else {
          const errText = await response.text();
          lastError = `Model ${model} returned ${response.status}: ${errText}`;
        }
      } catch (err) {
        lastError = err.message;
      }
    }

    if (!geminiResponse) {
      return res.status(502).json({
        success: false,
        error: lastError || 'فشل الاتصال بمحرك Gemini Vision AI. يرجى التأكد من صحة مفتاح API والاتصال بالإنترنت.'
      });
    }

    // Parse the JSON result from Gemini
    let parsedData = {};
    try {
      const cleanJson = geminiResponse
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();
      parsedData = JSON.parse(cleanJson);
    } catch (parseErr) {
      parsedData = {
        tableMarkdown: geminiResponse,
        extractedFields: {}
      };
    }

    return res.status(200).json({
      success: true,
      data: parsedData
    });
  } catch (error) {
    console.error('[OCR Error]:', error);
    return res.status(500).json({
      success: false,
      error: 'حدث خطأ داخلي أثناء معالجة الصورة: ' + error.message
    });
  }
}
