import { z } from 'zod';
import Groq from 'groq-sdk';

// Define Zod schema for WhatsApp confirmation parameters
const WhatsAppAppointmentDetailsSchema = z.object({
  appointment_date: z.string()
    .min(1, { message: "Date string cannot be empty if provided." })
    .refine((val) => !isNaN(new Date(val).getTime()), { message: "Invalid date format." })
    .nullable(),
  appointment_time: z.string()
    .min(1, { message: "Time string cannot be empty if provided." })
    .refine((val) => /^\d{1,2}:\d{2}(\s*(am|pm))?$/i.test(val) || !isNaN(new Date(`1970-01-01T${val}Z`).getTime()), {
      message: "Invalid time format. Expected e.g., '4:00 pm' or '16:00'.",
    })
    .nullable(),
});

// System prompt for AI parameter extraction
const parameterExtractionSystemPrompt = `You are an AI assistant specialized in extracting structured data from text.
The current date is May 7, 2025.
From the conversation history provided in the subsequent messages, extract the appointment_date and appointment_time for a WhatsApp appointment confirmation.
- Resolve any relative dates or times (e.g., "tomorrow at 2pm", "next Monday") to absolute values based on the current date.
- Format the appointment_date STRICTLY as "DD MMMM YYYY" (e.g., "07 May 2025" or "16 May 2025").
- Format the appointment_time STRICTLY as "H:MM am/pm" (e.g., "4:00 pm" or "09:30 am").

Respond ONLY with a valid JSON object matching this structure:
{
  "appointment_date": "string (DD MMMM YYYY) or null",
  "appointment_time": "string (H:MM am/pm) or null"
}
If a field cannot be extracted or resolved to the required format, use null as its value for that field, but ensure the overall response is still a valid JSON object with all keys present.`;

export async function extractAppointmentDetails(
  groq: Groq,
  fullTranscript: string,
  requestId: string
): Promise<{ appointment_date: string | null; appointment_time: string | null } | null> {
  console.log(`[${requestId}] whatsappService: Extracting appointment details...`);
  try {
    const paramsCompletion = await groq.chat.completions.create({
      model: "meta-llama/llama-4-maverick-17b-128e-instruct",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: parameterExtractionSystemPrompt },
        { role: "user", content: fullTranscript }
      ],
      temperature: 0.1,
    });

    const extractedParamsText = paramsCompletion.choices[0].message.content?.trim();
    console.log(`[${requestId}] whatsappService: Extracted parameters text from AI:`, extractedParamsText);

    if (!extractedParamsText) {
      console.error(`[${requestId}] whatsappService: AI returned no text for parameters.`);
      return null;
    }

    try {
      const jsonData = JSON.parse(extractedParamsText);
      const validatedDetails = WhatsAppAppointmentDetailsSchema.parse(jsonData);
      console.log(`[${requestId}] whatsappService: Zod validation successful:`, validatedDetails);
      return {
        appointment_date: validatedDetails.appointment_date,
        appointment_time: validatedDetails.appointment_time
      };
    } catch (validationError) {
      console.error(`[${requestId}] whatsappService: Error parsing/validating extracted parameters:`, validationError);
      console.error(`[${requestId}] whatsappService: Problematic AI response from AI: ${extractedParamsText}`);
      return null;
    }
  } catch (aiError) {
    console.error(`[${requestId}] whatsappService: Error calling Groq AI for parameter extraction:`, aiError);
    return null;
  }
}

export interface roleplayProfile {
  id: string;
  name: string;
  nric: string; // Masked NRIC
  phone: string; // e.g., '+65 **** 1234' or '+65 9123 4567'
  dob: string;   // Date of Birth
  outstandingBalance?: string; // e.g., "SGD 50.00" or "None"
}

export async function sendWhatsAppConfirmation(
  appointmentDetails: { appointment_date: string | null; appointment_time: string | null },
  roleplayProfile: roleplayProfile
): Promise<void> {
  const webhookUrl = process.env.WHATSAPP_WEBHOOK_URL;
  const apiKey = process.env.DEMO_API_KEY;

  if (!webhookUrl || !apiKey) {
    console.error("Webhook URL or API Key for WhatsApp is not configured. Skipping confirmation.");
    return;
  }

  // Format phone number: remove '+' and spaces
  const formattedSenderId = roleplayProfile.phone.replace(/\+|\s/g, "");

  console.log("sender_id", formattedSenderId);

  const webhookPayload = {
    recipient_id: "13134990961", // This is typically the business's WhatsApp number, remains a placeholder
    sender_id: formattedSenderId,    // Patient's formatted phone number
    event: "set",
    data: {
      data: {
        appointment_date: appointmentDetails.appointment_date || "Not Specified", // Fallback if not extracted
        appointment_time: appointmentDetails.appointment_time || "Not Specified", // Fallback if not extracted
        patient_name: roleplayProfile.name,
        patient_nric_masked: roleplayProfile.nric,
        patient_dob: roleplayProfile.dob,
        patient_outstanding_balance: roleplayProfile.outstandingBalance || "Not applicable", // Include outstanding balance
      },
      next: {
        event: "goto",
        data: "whatsapp_confirmation"
      }
    }
  };

  console.log("Sending WhatsApp confirmation to webhook:", JSON.stringify(webhookPayload, null, 2));

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + apiKey
      },
      body: JSON.stringify(webhookPayload)
    });

    if (response.ok) {
      console.log("WhatsApp confirmation webhook call successful.");
    } else {
      console.error(`WhatsApp confirmation webhook call failed with status: ${response.status}`, await response.text());
    }
  } catch (webhookError) {
    console.error("Error calling WhatsApp confirmation webhook:", webhookError);
  }
}
