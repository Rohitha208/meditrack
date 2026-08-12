'use server';
import { aiFormat, AIProvider, getDefaultAIProvider } from "@/services/AI/aiFormatting";

export async function reasonFormatting(reason: string) {
    try {
        const provider = (process.env.AI_PROVIDER as AIProvider) || getDefaultAIProvider();
        const formattedReason = await aiFormat({
            provider,
            systemPrompt: 'Rewrite the text to be grammatically correct, clear, and professional. Output ONLY the rewritten text. Do not add headings, labels, categories, recommendations, or any extra text. Do not use phrases like "Reason:", "Appointment:", "Recommended:", etc. Just rewrite the input text and return it directly.',
            userPrompt: reason,
        });
        return formattedReason;
    } catch (error) {
        console.error(error);
        return reason;
    }
}
 
export async function notesFormatting(notes: string) {
    try {
        const provider = (process.env.AI_PROVIDER as AIProvider) || getDefaultAIProvider();
        const formattedNotes = await aiFormat({
            provider,
            systemPrompt: 'Rewrite the notes to be grammatically correct, clear, and well-structured. Output ONLY the rewritten notes. Do not add headings, labels, summaries, or any extra text. Do not use phrases like "Notes:", "Summary:", "Details:", etc. Just rewrite the input notes and return them directly.',
            userPrompt: notes,
        });
        return formattedNotes;
    } catch (error) {
        console.error(error);
        return notes;
    }
}
 
export async function vitalsAnalysis(species: string, vitalsData: {
    temperatureC?: number;
    heartRateBpm?: number;
    respiratoryRateBpm?: number;
    mucousMembraneColor?: string;
    capillaryRefillTimeSec?: number;
    hydrationStatus?: string;
    notes?: string;
}) {
    try {
        const provider = (process.env.AI_PROVIDER as AIProvider) || getDefaultAIProvider();
        
        // Build a structured prompt with the vitals data
        const vitalsInfo = `
Species: ${species}
Temperature: ${vitalsData.temperatureC ? `${vitalsData.temperatureC}°C` : 'Not recorded'}
Heart Rate: ${vitalsData.heartRateBpm ? `${vitalsData.heartRateBpm} BPM` : 'Not recorded'}
Respiratory Rate: ${vitalsData.respiratoryRateBpm ? `${vitalsData.respiratoryRateBpm} BPM` : 'Not recorded'}
Mucous Membrane Color: ${vitalsData.mucousMembraneColor || 'Not recorded'}
Capillary Refill Time: ${vitalsData.capillaryRefillTimeSec ? `${vitalsData.capillaryRefillTimeSec} seconds` : 'Not recorded'}
Hydration Status: ${vitalsData.hydrationStatus || 'Not recorded'}
${vitalsData.notes ? `Additional Notes: ${vitalsData.notes}` : ''}
        `.trim();
 
        const analysis = await aiFormat({
            provider,
            systemPrompt: `You are a data analysis tool in veterinary clinic software. Compare the provided vital signs measurements against standard reference ranges and generate a technical report.
 
REFERENCE RANGES:
Dogs: Temperature 38-39.2°C, Heart Rate 60-140 BPM, Respiratory Rate 10-30 BPM, CRT <2 sec
Cats: Temperature 38-39.2°C, Heart Rate 120-140 BPM, Respiratory Rate 20-30 BPM, CRT <2 sec
 
OUTPUT FORMAT:
1. Data Comparison: State each measurement and whether it falls within/above/below the reference range
2. Observations: Note any measurements outside expected ranges
3. Patterns: Identify any notable patterns in the data set
4. Technical Notes: Any relevant observations about the measurements
 
Example output:
"Temperature: 38.5°C - Within normal range (38-39.2°C)
Heart Rate: 155 BPM - Above normal range (120-140 BPM)
Observations: Elevated heart rate detected, may warrant monitoring."
 
Generate ONLY the technical data comparison report. Do not provide medical advice or recommendations for treatment.`,
            userPrompt: vitalsInfo,
        });
             return analysis;
    } catch (error) {
        console.error('Error in vitalsAnalysis:', error);
        throw new Error(error instanceof Error ? error.message : 'Failed to analyze vitals. Please try again.');
    }
}
 
export async function complaintsAnalysis(species: string, symptomsData: {
    symptoms: string[];
    notes?: string;
}) {
    try {
        const provider = (process.env.AI_PROVIDER as AIProvider) || getDefaultAIProvider();
        
        // Build a structured prompt with the complaints data
        const complaintsInfo = `
Species: ${species}
Reported Symptoms: ${symptomsData.symptoms.length > 0 ? symptomsData.symptoms.join(', ') : 'None reported'}
${symptomsData.notes ? `Additional Notes: ${symptomsData.notes}` : ''}
        `.trim();
 
        const analysis = await aiFormat({
            provider,
            systemPrompt: `You are a clinical pattern recognition tool in veterinary clinic software. Analyze the reported symptoms and generate a technical assessment report.
 
YOUR TASK:
1. Symptom Analysis: Categorize the symptoms by body system (e.g., respiratory, gastrointestinal, neurological, dermatological, etc.)
2. Pattern Recognition: Identify if symptoms suggest common clinical patterns or syndromes
3. Severity Indicators: Note any symptoms that may indicate urgent or serious conditions
4. Related Systems: Identify which body systems may be affected based on the symptom cluster
5. Additional Observations: Note any relevant patterns or considerations
 
OUTPUT FORMAT:
- Present information in clear bullet points or short paragraphs
- Focus on symptom patterns and clinical correlations
- Use veterinary terminology where appropriate
- Be objective and factual
 
Example output:
"Symptoms by System:
- Respiratory: Coughing, difficulty breathing
- General: Lethargy
 
Pattern Recognition:
The combination of respiratory symptoms with lethargy may suggest upper respiratory involvement.
 
Systems Affected: Respiratory system, possibly affecting overall energy levels.
 
Observations: Multiple respiratory symptoms present, consider thorough respiratory examination."
 
Generate ONLY the technical symptom pattern analysis. Do not provide diagnostic conclusions or treatment recommendations.`,
            userPrompt: complaintsInfo,
        });
       
        return analysis;
    } catch (error) {
        console.error('Error in complaintsAnalysis:', error);
        throw new Error(error instanceof Error ? error.message : 'Failed to analyze complaints. Please try again.');
    }
}
 
export async function prescriptionAnalysis(species: string, prescriptionData: {
  medicines: Array<{
    name: string;
    dosage?: string;
    frequency?: string;
    numberOfDays?: number;
    directions?: string;
    category?: string;
    unitOfMeasure?: string;
    quantity?: number;
    batchNo?: string;
    expDate?: string;
  }>,
  notes?: string;
}) {
  try {
    const provider = (process.env.AI_PROVIDER as AIProvider) || getDefaultAIProvider();
    const medicinesList = prescriptionData.medicines.map((med, idx) =>
      `${idx + 1}. ${med.name}${med.dosage ? `, Dosage: ${med.dosage}` : ''}${med.frequency ? `, Frequency: ${med.frequency}` : ''}${med.numberOfDays ? `, Days: ${med.numberOfDays}` : ''}${med.directions ? `, Directions: ${med.directions}` : ''}${med.category ? `, Category: ${med.category}` : ''}${med.unitOfMeasure ? `, Unit: ${med.unitOfMeasure}` : ''}${med.quantity ? `, Qty: ${med.quantity}` : ''}${med.batchNo ? `, Batch: ${med.batchNo}` : ''}${med.expDate ? `, Exp: ${med.expDate}` : ''}`
    ).join("\n");
    const prescriptionInfo = `
Species: ${species}
Prescribed Medicines:
${medicinesList}
${prescriptionData.notes ? `Notes: ${prescriptionData.notes}` : ''}
    `.trim();
 
    const analysis = await aiFormat({
      provider,
      systemPrompt: `You are a clinical pharmacy analysis tool in veterinary clinic software. Analyze the prescribed medicines for this patient and generate a technical report.\n\nYOUR TASK:\n1. Data Comparison: State each medicine and whether its dosage, frequency, and duration are typical for the species.\n2. Interactions: Note any potential drug interactions or duplications.\n3. Observations: Highlight any unusual patterns, high dosages, or off-label uses.\n4. Technical Notes: Any relevant observations about the prescription.\n\nOUTPUT FORMAT:\n- Present information in clear bullet points or short paragraphs\n- Focus on technical and pharmacy-related insights\n- Use veterinary terminology where appropriate\n- Be objective and factual\n\nGenerate ONLY the technical prescription analysis. Do not provide diagnostic conclusions or treatment recommendations.`,
      userPrompt: prescriptionInfo,
    });
    return analysis;
  } catch (error) {
    console.error('Error in prescriptionAnalysis:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to analyze prescription. Please try again.');
  }
}
 
export async function planAnalysis(species: string, planData: {
  plans: Array<{ name: string }>,
  notes?: string,
  followUpDate?: string | null
}) {
  try {
    const provider = (process.env.AI_PROVIDER as AIProvider) || getDefaultAIProvider();
    const plansList = planData.plans.map((plan, idx) => `${idx + 1}. ${plan.name}`).join("\n");
    const planInfo = `
Species: ${species}
Treatment Plans:\n${plansList}
${planData.notes ? `Notes: ${planData.notes}` : ''}
${planData.followUpDate ? `Follow-up Date: ${planData.followUpDate}` : ''}
    `.trim();
 
    const analysis = await aiFormat({
      provider,
      systemPrompt: `You are a clinical treatment plan analysis tool in veterinary clinic software. Analyze the selected treatment plans for this patient and generate a technical report.\n\nYOUR TASK:\n1. Data Comparison: State each plan and whether it is typical for the species and presenting complaints.\n2. Observations: Highlight any unusual, duplicate, or missing plans.\n3. Follow-up: Note if the follow-up date is appropriate.\n4. Technical Notes: Any relevant observations about the treatment plan.\n\nOUTPUT FORMAT:\n- Present information in clear bullet points or short paragraphs\n- Focus on technical and clinical insights\n- Use veterinary terminology where appropriate\n- Be objective and factual\n\nGenerate ONLY the technical plan analysis. Do not provide diagnostic conclusions or treatment recommendations.`,
      userPrompt: planInfo,
    });
    return analysis;
  } catch (error) {
    console.error('Error in planAnalysis:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to analyze treatment plan. Please try again.');
  }
}
 
export async function dewormingMedicationAnalysis(species: string, medicationData: {
  route: string;
  dateTimeGiven: string;
  veterinarianName: string;
  administeredBy: string;
  remarks?: string;
}) {
    try {
        const provider = (process.env.AI_PROVIDER as AIProvider) || getDefaultAIProvider();
        
        // Format the date for better readability
        const formattedDate = medicationData.dateTimeGiven
            ? new Date(medicationData.dateTimeGiven).toLocaleString()
            : 'Not specified';
 
        // Build a structured prompt with the medication data
        const medicationInfo = `
Species: ${species}
Route of Administration: ${medicationData.route}
Date/Time Given: ${formattedDate}
Veterinarian: ${medicationData.veterinarianName}
Administered By: ${medicationData.administeredBy}
${medicationData.remarks ? `Remarks: ${medicationData.remarks}` : ''}
        `.trim();
 
        const analysis = await aiFormat({
            provider,
            systemPrompt: `You are a veterinary assistant analyzing deworming medication administration records.
            Review the provided medication details and generate a clear, technical assessment.
 
GUIDELINES:
1. Confirm the route of administration is appropriate for deworming medication
2. Note the timing of administration
3. Verify the personnel involved in the process
4. Highlight any special remarks or considerations
5. Format the response in a clear, organized manner
6. Use appropriate veterinary terminology
7. Do not provide medical advice or recommendations
 
OUTPUT FORMAT:
1. Administration Details:
   - Route: [route] (with note if unusual for deworming)
   - Date/Time: [formatted date/time]
   - Administered By: [staff name]
   - Prescribed By: [veterinarian name]
 
2. Notes:
   - [Any relevant observations from remarks]
   - [Any potential follow-up needed]
 
Only include information that can be directly derived from the provided data.`,
            userPrompt: medicationInfo,
        });
       
        return analysis;
    } catch (error) {
        console.error(error);
        throw new Error('Failed to analyze deworming medication. Please try again.');
    }
}
export async function dewormingNotesAnalysis(
  species: string,
  dewormingData: {
    adverseReactions?: string;
    additionalNotes?: string;
    ownerConcerns?: string;
    resolutionStatus?: string;
  }
) {
  try {
    const provider = (process.env.AI_PROVIDER as AIProvider) || getDefaultAIProvider();

    const dewormingInfo = `
Species: ${species}
 
Owner Concerns:
${dewormingData.ownerConcerns || "Not provided"}
 
Adverse Reactions:
${dewormingData.adverseReactions || "None reported"}
 
Resolution Status:
${dewormingData.resolutionStatus || "Not specified"}
 
Additional Notes:
${dewormingData.additionalNotes || "Not provided"}
`.trim();
 
    const analysis = await aiFormat({
      provider,
      systemPrompt: `You are an experienced veterinary clinician reviewing deworming visit notes.
 
Your tasks:
1. Summarize the deworming visit context based on documented notes.
2. Highlight owner concerns and any adverse reactions mentioned.
3. Describe resolution or outcome status if recorded.
4. Note documentation completeness and clarity.
5. Identify missing or incomplete information (descriptive only).
 
Output rules:
- Use bullet points or short paragraphs.
- Be strictly technical and factual.
- Do NOT provide new medical advice or recommendations.
- Do NOT infer or invent information beyond what is documented.`,
      userPrompt: dewormingInfo,
    });
 
    return analysis;
  } catch (error) {
    console.error("Error in dewormingNotesAnalysis:", error);
    throw new Error(
      "Failed to analyze deworming notes. Please try again."
    );
  }
}
 
export async function dewormingCheckoutAnalysis(
  species: string,
  checkoutData: {
    summary?: string;
    nextDewormingDueDate?: string;
    homeCareInstructions?: string;
    clientAcknowledged?: boolean;
  }
) {
  try {
    const provider = (process.env.AI_PROVIDER as AIProvider) || getDefaultAIProvider();

    const checkoutInfo = `
Species: ${species}
 
Checkout Summary:
${checkoutData.summary || "Not provided"}
 
Home Care Instructions:
${checkoutData.homeCareInstructions || "Not provided"}
 
Next Deworming Due Date:
${
      checkoutData.nextDewormingDueDate
        ? new Date(checkoutData.nextDewormingDueDate).toLocaleDateString()
        : "Not scheduled"
    }
 
Client Acknowledged Discharge:
${
      checkoutData.clientAcknowledged === true
        ? "Yes"
        : checkoutData.clientAcknowledged === false
        ? "No"
        : "Not recorded"
    }
`.trim();
 
    const analysis = await aiFormat({
      provider,
      systemPrompt: `You are an experienced veterinary clinician reviewing deworming checkout documentation.
 
Your tasks:
1. Summarize the checkout status and completion of the deworming visit.
2. Highlight key points from the checkout summary and home care instructions.
3. Describe follow-up planning based on the next scheduled deworming date.
4. Note client acknowledgment and communication if documented.
5. Identify missing or incomplete checkout information (descriptive only).
 
Output rules:
- Use bullet points or short paragraphs.
- Be strictly technical and factual.
- Do NOT provide new medical advice or recommendations.
- Do NOT infer or invent information beyond what is documented.`,
      userPrompt: checkoutInfo,
    });
 
    return analysis;
  } catch (error) {
    console.error("Error in dewormingCheckoutAnalysis:", error);
    throw new Error(
      "Failed to analyze deworming checkout details. Please try again."
    );
  }
}
 
 
export async function emergencyVitalsAnalysis(species: string, vitalsData: {
    temperatureC?: number;
    heartRateBpm?: number;
    respiratoryRateBpm?: number;
    mucousMembraneColor?: string;
    hydrationStatus?: string;
    weightKg?: number;
    bodyConditionScore?: number;
    painScore?: number;
    mentation?: string;
    heartRhythm?: string;
    pulseQuality?: string;
    respiratoryEffort?: string;
    lungSounds?: string;
    capillaryRefillTimeSec?: number;
    skinTentSec?: number;
    mmColor?: string;
    crtSec?: number;
    hydrationPercent?: number;
    notes?: string;
}) {
    try {
        const provider = (process.env.AI_PROVIDER as AIProvider) || getDefaultAIProvider();
        
        // Build a structured prompt with the vitals data
        const vitalsInfo = `
Species: ${species}
Temperature: ${vitalsData.temperatureC ? `${vitalsData.temperatureC}°C` : 'Not recorded'}
Heart Rate: ${vitalsData.heartRateBpm ? `${vitalsData.heartRateBpm} BPM` : 'Not recorded'}
Respiratory Rate: ${vitalsData.respiratoryRateBpm ? `${vitalsData.respiratoryRateBpm} BPM` : 'Not recorded'}
Heart Rhythm: ${vitalsData.heartRhythm || 'Not recorded'}
Pulse Quality: ${vitalsData.pulseQuality || 'Not recorded'}
Respiratory Effort: ${vitalsData.respiratoryEffort || 'Not recorded'}
Lung Sounds: ${vitalsData.lungSounds || 'Not recorded'}
Mucous Membrane Color: ${vitalsData.mmColor || 'Not recorded'}
Capillary Refill Time: ${vitalsData.crtSec ? `${vitalsData.crtSec} seconds` : 'Not recorded'}
Hydration Status: ${vitalsData.hydrationStatus || 'Not recorded'}
Hydration Percentage: ${vitalsData.hydrationPercent ? `${vitalsData.hydrationPercent}%` : 'Not recorded'}
Skin Tent: ${vitalsData.skinTentSec ? `${vitalsData.skinTentSec} seconds` : 'Not recorded'}
Weight: ${vitalsData.weightKg ? `${vitalsData.weightKg} kg` : 'Not recorded'}
Body Condition Score: ${vitalsData.bodyConditionScore || 'Not recorded'}
Pain Score: ${vitalsData.painScore || 'Not recorded'}
Mentation: ${vitalsData.mentation || 'Not recorded'}
Notes: ${vitalsData.notes || 'None'}`;
 
        const analysis = await aiFormat({
            provider,
            systemPrompt: `You are an experienced emergency veterinary specialist. Analyze the following emergency vitals data and provide a concise but comprehensive assessment.
 
Focus on:
1. Identifying any critical abnormalities that require immediate attention
2. Noting any values outside normal ranges for the species
3. Highlighting potential underlying conditions
4. Suggesting any immediate interventions if needed
5. Flagging any concerning patterns or combinations of findings
 
For each abnormal finding, include:
- The specific parameter that's abnormal
- The clinical significance
- Recommended next steps or monitoring
 
Keep the response professional, clear, and action-oriented.`,
            userPrompt: `Please analyze these emergency vitals and provide your assessment:
${vitalsInfo}
 
Analysis:`,
        });
 
        return analysis;
    } catch (error) {
        console.error('Error in emergency vitals analysis:', error);
        return "Unable to analyze vitals at this time. Please check the values and try again.";
    }
}
 
export async function emergencyProceduresAnalysis(species: string, proceduresData: {
    proceduresPerformed: string[];
    otherProcedure?: string;
    procedureTime?: string;
    performedBy?: string;
    fluidsType?: string;
    fluidsVolumeMl?: number;
    fluidsRateMlHr?: number;
    responseToTreatment?: string;
    notes?: string;
}) {
    try {
        const provider = (process.env.AI_PROVIDER as AIProvider) || getDefaultAIProvider();

        const proceduresInfo = `
Species: ${species}
Procedures Performed: ${proceduresData.proceduresPerformed.length > 0 ? proceduresData.proceduresPerformed.join(', ') : 'None selected'}
Other Procedure Details: ${proceduresData.otherProcedure || 'Not specified'}
Procedure Time: ${proceduresData.procedureTime ? new Date(proceduresData.procedureTime).toLocaleString() : 'Not recorded'}
Performed By: ${proceduresData.performedBy || 'Not recorded'}
Fluids: ${proceduresData.fluidsType || 'Not specified'}; Volume: ${proceduresData.fluidsVolumeMl ?? 'Not recorded'} ml; Rate: ${proceduresData.fluidsRateMlHr ?? 'Not recorded'} ml/hr
Response to Treatment: ${proceduresData.responseToTreatment || 'Not recorded'}
${proceduresData.notes ? `Notes: ${proceduresData.notes}` : ''}`.trim();
 
        const analysis = await aiFormat({
            provider,
            systemPrompt: `You are an experienced emergency veterinary clinician reviewing recorded emergency procedures.
 
Your tasks:
1. Summarize the key procedures performed and their relevance for an emergency case in this species.
2. Comment on the timing and sequence of interventions where possible.
3. Note any high‑acuity procedures (e.g., CPR, intubation, blood transfusion) and their implications.
4. Highlight how fluids and other interventions relate to stabilization efforts.
5. Identify any important gaps or missing information in the record (purely descriptive, no criticism).
 
Output format:
- Use clear bullet points or short paragraphs.
- Be strictly technical and descriptive (no treatment recommendations or new interventions).
- Do not invent data that is not in the record.`,
            userPrompt: proceduresInfo,
        });
 
        return analysis;
    } catch (error) {
        console.error('Error in emergencyProceduresAnalysis:', error);
        throw new Error('Failed to analyze emergency procedures. Please try again.');
    }
}
 
export async function emergencyTriageAnalysis(species: string, triageData: {
    arrivalTime?: string;
    triageNurseDoctor?: string;
    triageCategory?: string;
    painScore?: number;
    allergies?: string;
    immediateInterventionRequired?: boolean;
    reasonForEmergency?: string;
    presentingComplaint?: string;
    initialNotes?: string;
}) {
    try {
        const provider = (process.env.AI_PROVIDER as AIProvider) || getDefaultAIProvider();
        
        // Build the prompt with all available triage data
        let prompt = `Analyze the following emergency triage data for a ${species} patient. `;
        prompt += 'Provide a concise assessment of the patient\'s condition, immediate concerns, and recommended triage actions. ';
        prompt += 'Focus on critical findings that require immediate attention.\n\n';
 
        if (triageData.arrivalTime) {
            prompt += `Arrival Time: ${new Date(triageData.arrivalTime).toLocaleString()}\n`;
        }
 
        if (triageData.triageNurseDoctor) {
            prompt += `Triage Nurse/Doctor: ${triageData.triageNurseDoctor}\n`;
        }
 
        if (triageData.triageCategory) {
            prompt += `Triage Category: ${triageData.triageCategory}\n`;
        }
 
        if (triageData.painScore !== undefined) {
            prompt += `Pain Score: ${triageData.painScore}/10\n`;
        }
 
        if (triageData.allergies) {
            prompt += `Allergies: ${triageData.allergies}\n`;
        }
 
        if (triageData.immediateInterventionRequired !== undefined) {
            prompt += `Immediate Intervention Required: ${triageData.immediateInterventionRequired ? 'YES' : 'No'}\n`;
        }
 
        if (triageData.reasonForEmergency) {
            prompt += `\nReason for Emergency: ${triageData.reasonForEmergency}\n`;
        }
 
        if (triageData.presentingComplaint) {
            prompt += `\nPresenting Complaint: ${triageData.presentingComplaint}\n`;
        }
 
        if (triageData.initialNotes) {
            prompt += `\nInitial Notes: ${triageData.initialNotes}\n`;
        }
 
        const analysis = await aiFormat({
            provider,
            systemPrompt: `You are an experienced emergency veterinary triage specialist. Analyze the provided patient information and provide:
1. A brief assessment of the patient's condition
2. Immediate concerns that require attention
3. Recommended triage actions
4. Any critical interventions needed
 
Format your response in clear, concise markdown with appropriate headings. Be direct and prioritize life-threatening conditions.`,
            userPrompt: prompt,
        });
 
        return analysis;
    } catch (error) {
        console.error('Error in emergencyTriageAnalysis:', error);
        throw new Error('Failed to analyze emergency triage data. Please try again.');
    }
}
 
export async function emergencydischargeAnalysis(
    species: string,
    dischargeData: {
      dischargeStatus: string;
      dischargeTime?: string;
      responsibleClinician?: string;
      dischargeSummary?: string;
      homeCareInstructions?: string;
      followupInstructions?: string;
      followupDate?: string;
      reviewedWithClient?: boolean;
    }
  ) {
    try {
      const provider = (process.env.AI_PROVIDER as AIProvider) || getDefaultAIProvider();
  
      const dischargeInfo = `
  Species: ${species}
  Discharge Status: ${dischargeData.dischargeStatus || 'Not specified'}
  Discharge Time: ${
        dischargeData.dischargeTime
          ? new Date(dischargeData.dischargeTime).toLocaleString()
          : 'Not recorded'
      }
  Responsible Clinician: ${dischargeData.responsibleClinician || 'Not recorded'}
 
  Discharge Summary:
  ${dischargeData.dischargeSummary || 'Not provided'}
 
  Home Care Instructions:
  ${dischargeData.homeCareInstructions || 'Not provided'}
 
  Follow-up Instructions:
  ${dischargeData.followupInstructions || 'Not provided'}
 
  Follow-up Date: ${
        dischargeData.followupDate
          ? new Date(dischargeData.followupDate).toLocaleDateString()
          : 'Not scheduled'
      }
 
  Reviewed With Client: ${
        dischargeData.reviewedWithClient === true
          ? 'Yes'
          : dischargeData.reviewedWithClient === false
          ? 'No'
          : 'Not recorded'
      }
  `.trim();
 
      const analysis = await aiFormat({
        provider,
        systemPrompt: `You are an experienced veterinary clinician reviewing a patient discharge record.
 
  Your tasks:
  1. Summarize the discharge status and patient readiness based on documented information.
  2. Highlight key points from the discharge summary and home care instructions.
  3. Describe follow-up planning and continuity of care where recorded.
  4. Note clinician responsibility and client communication if documented.
  5. Identify any missing or incomplete discharge information (descriptive only).
 
  Output rules:
  - Use bullet points or short paragraphs.
  - Be strictly technical and factual.
  - Do NOT provide new medical advice or recommendations.
  - Do NOT infer or invent information beyond what is documented.`,
 
        userPrompt: dischargeInfo,
      });
 
      return analysis;
    } catch (error) {
      console.error('Error in dischargeAnalysis:', error);
      throw new Error('Failed to analyze discharge details. Please try again.');
    }
  }
 
export async function surgeryDischargeAnalysis(
  species: string,
  dischargeData: {
    dischargeStatus: string;
    dischargeDatetime?: string;
    homeCareInstructions?: string;
    medicationsToGoHome?: string;
    followUpInstructions?: string;
    followupDate?: string;
  }
) {
  try {
    const provider = (process.env.AI_PROVIDER as AIProvider) || getDefaultAIProvider();

    const dischargeInfo = `
Species: ${species}
Discharge Status: ${dischargeData.dischargeStatus || "Not specified"}
Discharge Datetime: ${
      dischargeData.dischargeDatetime
        ? new Date(dischargeData.dischargeDatetime).toLocaleString()
        : "Not recorded"
    }
 
Home Care Instructions:
${dischargeData.homeCareInstructions || "Not provided"}
 
Medications to Go Home:
${dischargeData.medicationsToGoHome || "Not provided"}
 
Follow-up Instructions:
${dischargeData.followUpInstructions || "Not provided"}
 
Follow-up Date: ${
      dischargeData.followupDate
        ? new Date(dischargeData.followupDate).toLocaleDateString()
        : "Not scheduled"
    }
`.trim();
 
    const analysis = await aiFormat({
      provider,
      systemPrompt: `You are an experienced veterinary clinician reviewing a patient surgery discharge record.
 
Your tasks:
1. Summarize the surgery discharge status and patient readiness based on documented information.
2. Highlight key points from home care instructions and medications to go home.
3. Describe follow-up planning and continuity of care where recorded.
4. Note whether the discharge process was completed and any gaps in documentation.
5. Identify any missing or incomplete discharge information (descriptive only).
 
Output rules:
- Use bullet points or short paragraphs.
- Be strictly technical and factual.
- Do NOT provide new medical advice or recommendations.
- Do NOT infer or invent information beyond what is documented.`,
      userPrompt: dischargeInfo,
    });
 
    return analysis;
  } catch (error) {
    console.error("Error in surgeryDischargeAnalysis:", error);
    throw new Error(
      "Failed to analyze surgery discharge details. Please try again."
    );
  }
}
 
export async function surgeryPostOpAnalysis(
  species: string,
  postOpData: {
    recoveryStatus?: string;
    painAssessment?: string;
    vitalSigns?: string;
    postOpMedications?: string;
    woundCare?: string;
    notes?: string;
  }
) {
  try {
    const provider = (process.env.AI_PROVIDER as AIProvider) || getDefaultAIProvider();

    const postOpInfo = `
Species: ${species}
 
Recovery Status:
${postOpData.recoveryStatus || "Not provided"}
 
Pain Assessment:
${postOpData.painAssessment || "Not recorded"}
 
Vital Signs:
${postOpData.vitalSigns || "Not recorded"}
 
Post-Op Medications:
${postOpData.postOpMedications || "Not provided"}
 
Wound Care:
${postOpData.woundCare || "Not provided"}
 
Additional Notes:
${postOpData.notes || "Not provided"}
    `.trim();
 
    const analysis = await aiFormat({
      provider,
      systemPrompt: `You are an experienced veterinary clinician reviewing post-operative surgery notes.
 
Your tasks:
1. Summarize the patient's recovery status based on documented post-op information.
2. Highlight pain assessment, vital signs, wound care, and medications administered.
3. Describe any deviations or concerns in recovery progress.
4. Note completeness and clarity of documentation.
5. Identify any missing or incomplete post-op information (descriptive only).
 
Output rules:
- Use bullet points or short paragraphs.
- Be strictly technical and factual.
- Do NOT provide new medical advice or recommendations.
- Do NOT infer or invent information beyond what is documented.`,
      userPrompt: postOpInfo,
    });
 
    return analysis;
  } catch (error) {
    console.error("Error in surgeryPostOpAnalysis:", error);
    throw new Error(
      "Failed to analyze post-op surgery details. Please try again."
    );
  }
}
 
export async function surgeryPreOpAnalysis(
  species: string,
  preOpData: {
    weightKg?: number;
    preOpBloodworkResults?: string;
    anesthesiaRiskAssessment?: string;
    fastingStatus?: string;
    preOpMedications?: string;
    notes?: string;
  }
) {
  try {
    const provider = (process.env.AI_PROVIDER as AIProvider) || getDefaultAIProvider();

    const preOpInfo = `
Species: ${species}
 
Weight (kg):
${preOpData.weightKg !== undefined ? preOpData.weightKg : "Not recorded"}
 
Pre-Op Bloodwork Results:
${preOpData.preOpBloodworkResults || "Not provided"}
 
Anesthesia Risk Assessment:
${preOpData.anesthesiaRiskAssessment || "Not provided"}
 
Fasting Status:
${preOpData.fastingStatus || "Not recorded"}
 
Pre-Op Medications:
${preOpData.preOpMedications || "Not provided"}
 
Additional Notes:
${preOpData.notes || "Not provided"}
    `.trim();
 
    const analysis = await aiFormat({
      provider,
      systemPrompt: `You are an experienced veterinary clinician reviewing pre-operative surgery assessment notes.
 
Your tasks:
1. Summarize the patient’s pre-operative readiness for surgery.
2. Highlight key findings from bloodwork, anesthesia risk, and fasting status.
3. Note pre-operative medications and relevant clinical considerations.
4. Assess completeness and clarity of pre-operative documentation.
5. Identify any missing or incomplete pre-op information (descriptive only).
 
Output rules:
- Use bullet points or short paragraphs.
- Be strictly technical and factual.
- Do NOT provide new medical advice or recommendations.
- Do NOT infer or invent information beyond what is documented.`,
      userPrompt: preOpInfo,
    });
 
    return analysis;
  } catch (error) {
    console.error("Error in surgeryPreOpAnalysis:", error);
    throw new Error(
      "Failed to analyze pre-op surgery details. Please try again."
    );
  }
}
 
export async function surgeryDetailsAnalysis(
  species: string,
  surgeryData: {
    surgeryType?: string;
    surgeon?: string;
    anesthesiologist?: string;
    surgeryStartTime?: string;
    surgeryEndTime?: string;
    anesthesiaProtocol?: string;
    surgicalFindings?: string;
    complications?: string;
    notes?: string;
  }
) {
  try {
    const provider = (process.env.AI_PROVIDER as AIProvider) || getDefaultAIProvider();

    const surgeryInfo = `
Species: ${species}
 
Surgery Type:
${surgeryData.surgeryType || "Not recorded"}
 
Surgeon:
${surgeryData.surgeon || "Not recorded"}
 
Anesthesiologist:
${surgeryData.anesthesiologist || "Not recorded"}
 
Surgery Start Time:
${surgeryData.surgeryStartTime || "Not recorded"}
 
Surgery End Time:
${surgeryData.surgeryEndTime || "Not recorded"}
 
Anesthesia Protocol:
${surgeryData.anesthesiaProtocol || "Not documented"}
 
Surgical Findings:
${surgeryData.surgicalFindings || "Not documented"}
 
Complications:
${surgeryData.complications || "None reported"}
 
Additional Notes:
${surgeryData.notes || "Not provided"}
    `.trim();
 
    const analysis = await aiFormat({
      provider,
      systemPrompt: `You are an experienced veterinary surgeon reviewing intra-operative surgical records.
 
Your tasks:
1. Summarize the surgical procedure performed.
2. Identify key anesthesia and operative details.
3. Highlight documented findings and complications.
4. Assess clarity and completeness of surgical documentation.
5. Identify any missing or incomplete surgical details (descriptive only).
 
Output rules:
- Use bullet points or short paragraphs.
- Be strictly technical and factual.
- Do NOT provide new medical advice or recommendations.
- Do NOT infer or invent information beyond what is documented.`,
      userPrompt: surgeryInfo,
    });
 
    return analysis;
  } catch (error) {
    console.error("Error in surgeryDetailsAnalysis:", error);
    throw new Error(
      "Failed to analyze surgery details. Please try again."
    );
  }
}