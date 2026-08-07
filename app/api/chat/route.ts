// app/api/chat/route.ts
import { NextRequest } from 'next/server';
import { streamText, convertToModelMessages } from 'ai';
import { google } from '@ai-sdk/google';
import { getJwtToken } from '@/utils/serverCookie';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { messages = [], patientId, emrFiles = [], screenContext }: { 
    messages?: any[], 
    patientId?: string, 
    emrFiles?: Array<{
      id: string;
      name: string;
      type?: string;
      content?: string;
    }>,
    screenContext?: string | null
  } = body;
  
  // Ensure messages is always an array
  const safeMessages = Array.isArray(messages) ? messages : [];

  let systemPrompt = 'You are a helpful veterinary AI assistant with vision capabilities. You can analyze images, including X-rays, ultrasounds, photographs, and other medical imaging.';

  if (patientId) {
    try {
      const token = getJwtToken(req);
      const backendToken = token;
      const [patientResponse, historyResponse] = await Promise.all([
        fetch(`${apiUrl}/api/Patient/${patientId}`, {
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${backendToken}`,
          },
        }),
        fetch(`${apiUrl}/api/Patient/${patientId}/appointment-history`, {
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${backendToken}`,
          },
        })
      ]);

      let patientInfo = '';
      if (patientResponse.ok) {
        const patientData = await patientResponse.json();
        patientInfo = `
Patient Details:
- Name: ${patientData.name || 'N/A'}
- Species: ${patientData.species || 'N/A'}
- Breed: ${patientData.breed || 'N/A'}
- Date of Birth: ${patientData.dateOfBirth || 'N/A'}
- Gender: ${patientData.gender || 'N/A'}
- Color: ${patientData.color || 'N/A'}
- Microchip: ${patientData.microchipNumber || 'N/A'}
- Notes: ${patientData.notes || 'N/A'}

Owner Information:
- Name: ${patientData.clientFirstName || ''} ${patientData.clientLastName || ''}
- Email: ${patientData.clientEmail || 'N/A'}
- Phone: ${patientData.clientPhonePrimary || 'N/A'}
- Address: ${[patientData.clientAddressLine1, patientData.clientAddressLine2, patientData.clientCity, patientData.clientState, patientData.clientPostalCode].filter(Boolean).join(', ') || 'N/A'}
- Emergency Contact: ${patientData.clientEmergencyContactName || 'N/A'} (${patientData.clientEmergencyContactPhone || 'N/A'})`;
      }

      let historyInfo = 'No appointment history available.';
      if (historyResponse.ok) {
        const historyJson: any = await historyResponse.json();
        const appointmentHistory: any[] = Array.isArray(historyJson.appointmentHistory)
          ? historyJson.appointmentHistory
          : [];

        if (appointmentHistory.length > 0) {
          // Send the complete JSON data to the AI
          historyInfo = `Complete Appointment History Data (${appointmentHistory.length} appointments):

${JSON.stringify(appointmentHistory, null, 2)}`;
        }
      }

      systemPrompt = `You are a helpful veterinary AI assistant. Below is the detailed information about the current patient, including their complete medical history in JSON format.

${patientInfo}

${historyInfo}

Instructions:
- When the user refers to "this patient" or "the patient", they are referring to the patient detailed above.
- The appointment history contains complete structured data including intake details, vital signs, complaints, procedures, prescriptions, plans, surgery details, vaccination records, deworming information, and more.
- Extract and present relevant information based on what the user asks for. Be thorough and include all pertinent details from the JSON data.
- If a user asks about a specific appointment (like "consultation appointment" or "surgery on Dec 11"), analyze the JSON data to find the matching appointment and provide comprehensive details.
- Present the information in a clear, organized, and professional manner suitable for veterinary professionals.
- If specific information is not available in the records, politely state that it's not available.`;
    } catch (error) {
      console.error('Error fetching patient data or appointment history:', error);
    }
  }

  // Load previous messages from conversation API if patientId exists
  let previousMessages: any[] = [];
  let summaries: any[] = [];
  if (patientId) {
    try {
      const token = getJwtToken(req);
      if (token) {
        // Fetch all messages (with pagination if needed)
        let allFetchedMessages: any[] = [];
        let pageNumber = 1;
        const pageSize = 100;
        let hasMorePages = true;

        while (hasMorePages) {
          const conversationResponse = await fetch(
            `${apiUrl}/api/Conversation/patient/${patientId}/messages?pageNumber=${pageNumber}&pageSize=${pageSize}&paginationRequired=true`,
            {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              cache: 'no-store',
            }
          );

          if (conversationResponse.ok) {
            const conversationData = await conversationResponse.json();
            let pageMessages: any[] = [];
            
            if (Array.isArray(conversationData)) {
              pageMessages = conversationData;
              hasMorePages = false;
            } else if (conversationData.items && Array.isArray(conversationData.items)) {
              pageMessages = conversationData.items;
              hasMorePages = conversationData.hasNextPage === true;
            } else if (conversationData.messages && Array.isArray(conversationData.messages)) {
              pageMessages = conversationData.messages;
              hasMorePages = false;
            }

            allFetchedMessages = allFetchedMessages.concat(pageMessages);
            
            if (pageMessages.length < pageSize || !hasMorePages) {
              hasMorePages = false;
            } else {
              pageNumber++;
            }
          } else {
            hasMorePages = false;
          }
        }

        // Separate summaries (system role) from regular messages
        const regularMessages = allFetchedMessages.filter((msg: any) => {
          const role = msg.role || msg.roleName || '';
          return role !== 'system';
        });

        summaries = allFetchedMessages
          .filter((msg: any) => {
            const role = msg.role || msg.roleName || '';
            if (role === 'system') {
              try {
                const metadata = typeof msg.metadata === 'string' ? JSON.parse(msg.metadata) : msg.metadata;
                return metadata?.type === 'summary';
              } catch {
                return false;
              }
            }
            return false;
          })
          .map((msg: any) => ({
            role: 'system',
            content: msg.content || msg.text || '',
          }));

        previousMessages = regularMessages.map((msg: any) => ({
          role: msg.role || msg.roleName || 'user',
          content: msg.content || msg.text || '',
        })).filter((msg: any) => msg.role && msg.content);

        // Check if summarization is needed (>15 messages)
        if (previousMessages.length > 15) {
          const messagesToSummarize = previousMessages.slice(0, previousMessages.length - 15);
          const recentMessages = previousMessages.slice(-15);

          // Create summary if we have messages to summarize
          // This runs asynchronously and doesn't block the current request
          if (messagesToSummarize.length > 0) {
            // Run summarization asynchronously (don't await to avoid blocking)
            (async () => {
              try {
                // Create summary using AI
                const summaryPrompt = `Summarize the following veterinary consultation conversation between a doctor and AI assistant. Focus on key medical information, diagnoses, treatments, medications, procedures, and important decisions. Keep it concise but comprehensive:

${messagesToSummarize.map((msg: any) => `${msg.role}: ${msg.content}`).join('\n\n')}

Provide a clear, structured summary that captures all important medical information and context.`;

                const summaryResult = await streamText({
                  model: google('gemini-2.5-flash'),
                  messages: [{ role: 'user', content: summaryPrompt }],
                  system: 'You are a medical summarization assistant. Create concise summaries of veterinary consultations, focusing on medical facts, diagnoses, treatments, and important clinical decisions.',
                });

                const summaryText = await summaryResult.text;

                if (summaryText && summaryText.trim()) {
                  // Store summary as system message with metadata
                  const summaryMetadata = JSON.stringify({
                    type: 'summary',
                    summarizedMessageCount: messagesToSummarize.length,
                    createdAt: new Date().toISOString(),
                  });

                  const saveSummaryResponse = await fetch(`${apiUrl}/api/Conversation/messages`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                      patientId: patientId,
                      role: 'system',
                      content: summaryText.trim(),
                      metadata: summaryMetadata,
                    }),
                  });

                  if (saveSummaryResponse.ok) {
                    // Delete the summarized messages by matching content
                    const messageIdsToDelete = regularMessages
                      .filter((msg: any) => {
                        const msgContent = msg.content || msg.text || '';
                        const msgRole = msg.role || msg.roleName || '';
                        return msgRole !== 'system' && messagesToSummarize.some((m: any) => {
                          return m.content === msgContent && m.role === msgRole;
                        });
                      })
                      .map((msg: any) => msg.id)
                      .filter((id: any) => id);

                    if (messageIdsToDelete.length > 0) {
                      await Promise.all(
                        messageIdsToDelete.map(async (msgId: string) => {
                          try {
                            await fetch(`${apiUrl}/api/Conversation/messages/${msgId}`, {
                              method: 'DELETE',
                              headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`,
                              },
                            });
                          } catch {
                            // Error handled silently
                          }
                        })
                      );
                    }
                  }
                }
              } catch (error) {
                // Error handled silently - summarization failure shouldn't break chat
              }
            })();
          }

          // Use existing summaries + recent messages for this request
          previousMessages = [...summaries, ...recentMessages];
        } else {
          // If <= 15 messages, include summaries if they exist
          previousMessages = [...summaries, ...previousMessages];
        }
      }
    } catch (error) {
      // Continue without previous messages if fetch fails
    }
  }

  // Include summaries first, then recent messages (last 15), then current messages
  // Summaries provide context, recent messages provide immediate context
  // Ensure all are arrays to avoid undefined errors
  const safePreviousMessages = Array.isArray(previousMessages) ? previousMessages : [];
  
  const recentHistory = Array.isArray(safePreviousMessages) 
    ? safePreviousMessages.filter((msg: any) => msg && msg.role !== 'system').slice(-15)
    : [];
  const allSummaries = Array.isArray(safePreviousMessages)
    ? safePreviousMessages.filter((msg: any) => msg && msg.role === 'system')
    : [];
  
  // Ensure all arrays are valid before merging
  const safeAllSummaries = Array.isArray(allSummaries) ? allSummaries : [];
  const safeRecentHistory = Array.isArray(recentHistory) ? recentHistory : [];
  const safeMessagesArray = Array.isArray(safeMessages) ? safeMessages : [];
  
  // Merge: summaries + recent history + current client messages
  const allMessages: any[] = [...safeAllSummaries, ...safeRecentHistory, ...safeMessagesArray];
  
  // Final validation - ensure allMessages is always an array
  if (!Array.isArray(allMessages)) {
    throw new Error('allMessages must be an array');
  }
  
  // Ensure convertToModelMessages is available and receives a valid array
  if (typeof convertToModelMessages !== 'function') {
    throw new Error('convertToModelMessages is not a function');
  }
  
  // Filter out any null/undefined messages and convert to proper format
  // convertToModelMessages expects messages with 'parts' array (from useChat) or proper structure
  const validMessages = allMessages
    .filter((msg: any) => msg != null && typeof msg === 'object')
    .map((msg: any) => {
      // If message already has 'parts' array (from useChat), use it as-is
      if (msg.parts && Array.isArray(msg.parts)) {
        return msg;
      }
      
      // If message has 'content' (from database), convert to 'parts' format
      if (msg.content) {
        return {
          role: msg.role,
          parts: [{ type: 'text', text: msg.content }],
        };
      }
      
      // If message has both 'content' and 'parts', prefer 'parts'
      if (msg.parts) {
        return msg;
      }
      
      // Fallback: return as-is (might be in correct format already)
      return msg;
    });
  
  // Ensure we have a valid array
  if (!Array.isArray(validMessages)) {
    throw new Error('validMessages must be an array');
  }
  
  let processedMessages;
  try {
    // convertToModelMessages expects messages in the format from useChat hook with 'parts' array
    // AI SDK 6+: convertToModelMessages is async
    processedMessages = await convertToModelMessages(validMessages as any);
  } catch (error: any) {
    // If conversion fails, provide better error message
    const errorMsg = error?.message || 'Unknown error';
    throw new Error(`Failed to convert messages: ${errorMsg}. Messages count: ${validMessages.length}`);
  }
  
  if (emrFiles && emrFiles.length > 0) {
    try {
      const lastUserMessageIndex = processedMessages.length - 1;
      
      if (lastUserMessageIndex >= 0 && processedMessages[lastUserMessageIndex].role === 'user') {
        const lastMessage = processedMessages[lastUserMessageIndex];
        
        const existingContent = typeof lastMessage.content === 'string' 
          ? [{ type: 'text' as const, text: lastMessage.content }]
          : Array.isArray(lastMessage.content) 
            ? lastMessage.content 
            : [];

        const emrContentParts = emrFiles
          .map(file => {
            if (file.content && (
              file.type?.startsWith('image/') || 
              file.type === '.webp' || 
              file.type === '.jpeg' || 
              file.type === '.jpg' || 
              file.type === '.png' ||
              file.type === '.gif'
            )) {
            
              const base64Data = file.content.includes(',') 
                ? file.content.split(',')[1] 
                : file.content;
              
              let mimeType = 'image/jpeg'; 
              if (file.content.includes('data:image/')) {
                const match = file.content.match(/data:(image\/[^;]+);/);
                if (match) {
                  mimeType = match[1];
                }
              } else if (file.type === '.webp') {
                mimeType = 'image/webp';
              } else if (file.type === '.png') {
                mimeType = 'image/png';
              } else if (file.type === '.gif') {
                mimeType = 'image/gif';
              }
              
              return {
                type: 'image' as const,
                image: base64Data,
                mimeType: mimeType
              };
            } else if (file.content) {
              return {
                type: 'text' as const,
                text: `\n\nEMR File: ${file.name}\n${file.content}`
              };
            }
            return null;
          })
          .filter((part): part is { type: 'text'; text: string } | { type: 'image'; image: string; mimeType: string } => part !== null);

        processedMessages[lastUserMessageIndex] = {
          ...lastMessage,
          content: [...existingContent, ...emrContentParts]
        };
      }
    } catch (error) {
      console.error('Error processing EMR files:', error);
      systemPrompt += '\n\n[Note: There was an error processing the attached EMR files]';
    }
  }

  const result = streamText({
    model: google('gemini-2.5-flash'),
    system: systemPrompt,
    messages: processedMessages,
  });

  // Save assistant message after streaming completes
  if (patientId) {
    Promise.resolve(result.text).then(async (assistantText) => {
      if (assistantText && assistantText.trim()) {
        const token = getJwtToken(req);
        if (!token) {
          return;
        }
        
        try {
          const requestBody = {
            patientId: patientId,
            role: 'assistant',
            content: assistantText.trim(),
          };
          
          const saveResponse = await fetch(`${apiUrl}/api/Conversation/messages`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(requestBody),
          });
          
          if (!saveResponse.ok) {
            // Error logged silently - message save failure shouldn't break chat
          }
        } catch (error) {
          // Error handled silently
        }
      }
    }).catch(() => {
      // Error handled silently
    });
  }

  if (patientId && messages.length > 0) {
    const token = getJwtToken(req);
    if (token) {
      const userMessages = messages.filter((msg: any) => msg.role === 'user');
      const lastUserMessage = userMessages[userMessages.length - 1];
      
      if (lastUserMessage) {
        try {
          let messageContent = '';
          
          if (lastUserMessage.parts && Array.isArray(lastUserMessage.parts)) {
            messageContent = lastUserMessage.parts
              .filter((part: any) => part.type === 'text')
              .map((part: any) => part.text)
              .join(' ');
          } else if (typeof lastUserMessage.content === 'string') {
            messageContent = lastUserMessage.content;
          } else if (Array.isArray(lastUserMessage.content)) {
            messageContent = lastUserMessage.content
              .filter((part: any) => part.type === 'text')
              .map((part: any) => part.text)
              .join(' ');
          } else if (lastUserMessage.content?.text) {
            messageContent = lastUserMessage.content.text;
          }

          if (messageContent.trim()) {
            if (!patientId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(patientId)) {
              return;
            }
            
            const requestBody = {
              patientId: patientId,
              role: 'user',
              content: messageContent.trim(),
            };
            
            const saveResponse = await fetch(`${apiUrl}/api/Conversation/messages`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify(requestBody),
            });
            
            if (!saveResponse.ok) {
              // Error handled silently - message save failure shouldn't break chat
            }
          }
        } catch (error) {
          // Error handled silently
        }
      }
    }
  }


  return result.toUIMessageStreamResponse();
}