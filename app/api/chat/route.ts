import { cookies } from 'next/headers'

import { getCurrentUserId } from '@/lib/auth/get-current-user'
import { createManualToolStreamResponse } from '@/lib/streaming/create-manual-tool-stream'
import { createToolCallingStreamResponse } from '@/lib/streaming/create-tool-calling-stream'
import { Model } from '@/lib/types/models'
import { isProviderEnabled } from '@/lib/utils/registry'

export const maxDuration = 30

const DEFAULT_MODEL: Model = {
  id: 'gpt-4o-mini',
  name: 'GPT-4o mini',
  provider: 'OpenAI',
  providerId: 'openai',
  enabled: true,
  toolCallType: 'native'
}

export async function POST(req: Request) {
  try {
    const { messages, id: chatId } = await req.json()
    const referer = req.headers.get('referer')
    const isSharePage = referer?.includes('/share/')
    const userId = await getCurrentUserId()

    type FileAttachment = {
      name: string
      type: string
      binary: boolean
      content?: string
    }

    const lastUserReverseIndex =
      [...messages].reverse().findIndex((msg: any) => msg.role === 'user')

    const lastUserIndex =
      lastUserReverseIndex === -1
        ? -1
        : messages.length - 1 - lastUserReverseIndex

    const enrichedMessages = [...messages]

    if (lastUserIndex >= 0) {
      const lastUserMessage = messages[lastUserIndex]
      const files = Array.isArray((lastUserMessage as any).files)
        ? (lastUserMessage as any).files as FileAttachment[]
        : []

      let userContent = typeof lastUserMessage.content === 'string'
        ? lastUserMessage.content
        : ''
      let systemNotes = ''

      for (const file of files) {
        if (file.binary) {
          systemNotes += `\nBinary file attached: ${file.name} (${file.type})`
        } else if (file.content) {
          userContent += `\n\nAttached file (${file.name}):\n\`\`\`\n${file.content}\n\`\`\`\n`
        }
      }

      enrichedMessages[lastUserIndex] = {
        ...lastUserMessage,
        content: userContent,
        metadata: {
          ...(lastUserMessage as any).metadata,
          files
        }
      }

      if (systemNotes.trim()) {
        enrichedMessages.splice(lastUserIndex + 1, 0, {
          role: 'system',
          content: `${systemNotes}\nProvide a brief summary of binary attachments and confirm receipt.`
        })
      }
    }

    if (isSharePage) {
      return new Response('Chat API is not available on share pages', {
        status: 403,
        statusText: 'Forbidden'
      })
    }

    const cookieStore = await cookies()
    const modelJson = cookieStore.get('selectedModel')?.value
    const searchMode = cookieStore.get('search-mode')?.value === 'true'

    let selectedModel = DEFAULT_MODEL

    if (modelJson) {
      try {
        selectedModel = JSON.parse(modelJson) as Model
      } catch (e) {
        console.error('Failed to parse selected model:', e)
      }
    }

    if (
      !isProviderEnabled(selectedModel.providerId) ||
      selectedModel.enabled === false
    ) {
      return new Response(
        `Selected provider is not enabled ${selectedModel.providerId}`,
        {
          status: 404,
          statusText: 'Not Found'
        }
      )
    }

    const supportsToolCalling = selectedModel.toolCallType === 'native'

    return supportsToolCalling
      ? createToolCallingStreamResponse({
          messages: enrichedMessages,
          model: selectedModel,
          chatId,
          searchMode,
          userId
        })
      : createManualToolStreamResponse({
          messages: enrichedMessages,
          model: selectedModel,
          chatId,
          searchMode,
          userId
        })
  } catch (error) {
    console.error('API route error:', error)
    return new Response('Error processing your request', {
      status: 500,
      statusText: 'Internal Server Error'
    })
  }
}
