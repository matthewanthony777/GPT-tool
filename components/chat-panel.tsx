'use client'

import { useEffect, useRef, useState } from 'react'
import Textarea from 'react-textarea-autosize'
import { useRouter } from 'next/navigation'

import { Message } from 'ai'
import { ArrowUp, ChevronDown, MessageCirclePlus, Square } from 'lucide-react'
import { toast } from 'sonner'

import { useFileUpload } from '@/lib/hooks/useFileUpload'
import { Model } from '@/lib/types/models'
import { cn } from '@/lib/utils'

import { useArtifact } from './artifact/artifact-context'
import { FilePreview } from './file-upload/FilePreview'
import { FileUploadButton } from './file-upload/FileUploadButton'
import { Button } from './ui/button'
import { IconLogo } from './ui/icons'
import { EmptyScreen } from './empty-screen'
import { ModelSelector } from './model-selector'
import { SearchModeToggle } from './search-mode-toggle'

interface ChatPanelProps {
  input: string
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  isLoading: boolean
  messages: Message[]
  setMessages: (messages: Message[]) => void
  query?: string
  stop: () => void
  append: (message: any) => void
  models?: Model[]
  /** Whether to show the scroll to bottom button */
  showScrollToBottomButton: boolean
  /** Reference to the scroll container */
  scrollContainerRef: React.RefObject<HTMLDivElement>
  /** File upload hook instance */
  fileUpload: ReturnType<typeof useFileUpload>
  setInput: (value: string) => void
}

export function ChatPanel({
  input,
  handleInputChange,
  isLoading,
  messages,
  setMessages,
  query,
  stop,
  append,
  models,
  showScrollToBottomButton,
  scrollContainerRef,
  fileUpload,
  setInput
}: ChatPanelProps) {
  const [showEmptyScreen, setShowEmptyScreen] = useState(false)
  const router = useRouter()
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const formRef = useRef<HTMLFormElement | null>(null)
  const isFirstRender = useRef(true)
  const [isComposing, setIsComposing] = useState(false) // Composition state
  const [enterDisabled, setEnterDisabled] = useState(false) // Disable Enter after composition ends
  const { close: closeArtifact } = useArtifact()

  // Destructure fileUpload prop
  const {
    files,
    addFiles,
    removeFile,
    clearFiles,
    getAcceptString,
    completedFiles
  } = fileUpload

  const handleCompositionStart = () => setIsComposing(true)

  const handleCompositionEnd = () => {
    setIsComposing(false)
    setEnterDisabled(true)
    setTimeout(() => {
      setEnterDisabled(false)
    }, 300)
  }

  const handleNewChat = () => {
    setMessages([])
    closeArtifact()
    clearFiles()
    router.push('/')
  }

  const handleFilesSelected = async (selectedFiles: File[]) => {
    await addFiles(selectedFiles)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing && !enterDisabled) {
      e.preventDefault()
      formRef.current?.requestSubmit()
    }
  }

  const handleFormSubmit = (e?: any) => {
    if (e?.preventDefault) e.preventDefault()

    const filesPayload = completedFiles.map(file => ({
      name: file.name,
      type: file.type,
      binary: file.binary,
      content: file.content
    }))

    const userMsg = input.trim() || (filesPayload.length ? 'Attached files' : '')
    if (!userMsg && filesPayload.length === 0) return

    append({ role: 'user', content: userMsg, files: filesPayload } as any)
    setInput('')
    clearFiles?.()
  }

  const shouldShowScrollButton =
    showScrollToBottomButton &&
    messages.length > 0 &&
    !isLoading

  const isToolInvocationInProgress = () => {
    if (!messages.length) return false

    const lastMessage = messages[messages.length - 1]
    if (lastMessage.role !== 'assistant' || !lastMessage.parts) return false

    const parts = lastMessage.parts
    const lastPart = parts[parts.length - 1]

    return (
      lastPart?.type === 'tool-invocation' &&
      lastPart?.toolInvocation?.state === 'call'
    )
  }

  // if query is not empty, submit the query
  useEffect(() => {
    if (isFirstRender.current && query && query.trim().length > 0) {
      append({
        role: 'user',
        content: query
      })
      isFirstRender.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  // Scroll to the bottom of the container
  const handleScrollToBottom = () => {
    const scrollContainer = scrollContainerRef.current
    if (scrollContainer) {
      scrollContainer.scrollTo({
        top: scrollContainer.scrollHeight,
        behavior: 'smooth'
      })
    }
  }

  return (
    <div
      className={cn(
        'w-full bg-background group/form-container shrink-0',
        messages.length > 0 ? 'sticky bottom-0 px-2 pb-4' : 'px-6'
      )}
    >
      {messages.length === 0 && (
        <div className="mb-10 flex flex-col items-center gap-4">
          <IconLogo className="size-12 text-muted-foreground" />
          <p className="text-center text-3xl font-semibold">
            How can I help you today?
          </p>
        </div>
      )}
      <form
        ref={formRef}
        onSubmit={handleFormSubmit}
        className={cn('max-w-3xl w-full mx-auto relative')}
      >
        {/* Scroll to bottom button - only shown when showScrollToBottomButton is true */}
        {shouldShowScrollButton && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="absolute -top-10 right-4 z-20 size-8 rounded-full shadow-md"
            onClick={handleScrollToBottom}
            title="Scroll to bottom"
          >
            <ChevronDown size={16} />
          </Button>
        )}

        {/* File Preview - shown above input when files are uploaded */}
        {files.length > 0 && (
          <div className="mb-2">
            <FilePreview files={files} onRemove={removeFile} />
          </div>
        )}

        <div className="relative flex flex-col w-full gap-2 bg-muted rounded-3xl border border-input">
          <Textarea
            ref={inputRef}
            name="input"
            rows={2}
            maxRows={5}
            tabIndex={0}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            placeholder="Ask a question..."
            spellCheck={false}
            value={input}
            disabled={isLoading || isToolInvocationInProgress()}
            className="resize-none w-full min-h-12 bg-transparent border-0 p-4 text-sm placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          onChange={e => {
            handleInputChange(e)
            setShowEmptyScreen(e.target.value.length === 0)
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowEmptyScreen(true)}
          onBlur={() => setShowEmptyScreen(false)}
        />

          {/* Bottom menu area */}
          <div className="flex items-center justify-between p-3">
            <div className="flex items-center gap-2">
              <FileUploadButton
                onFilesSelected={handleFilesSelected}
                acceptedFileTypes={getAcceptString()}
                disabled={isLoading || isToolInvocationInProgress()}
              />
              <ModelSelector models={models || []} />
              <SearchModeToggle />
            </div>
            <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <Button
                variant="outline"
                size="icon"
                  onClick={handleNewChat}
                  className="shrink-0 rounded-full group"
                  type="button"
                  disabled={isLoading || isToolInvocationInProgress()}
                >
                  <MessageCirclePlus className="size-4 group-hover:rotate-12 transition-all" />
                </Button>
              )}
              <Button
                type="submit"
                size={'icon'}
                variant={'outline'}
                className={cn(isLoading && 'animate-pulse', 'rounded-full')}
                disabled={
                  (input.length === 0 && completedFiles.length === 0 && !isLoading) ||
                  isToolInvocationInProgress()
                }
                onClick={isLoading ? (e) => { e.preventDefault(); stop() } : undefined}
              >
                {isLoading ? <Square size={20} /> : <ArrowUp size={20} />}
              </Button>
            </div>
          </div>
        </div>

        {messages.length === 0 && (
          <EmptyScreen
            submitMessage={message => {
              handleInputChange({
                target: { value: message }
              } as React.ChangeEvent<HTMLTextAreaElement>)
            }}
            className={cn(showEmptyScreen ? 'visible' : 'invisible')}
          />
        )}
      </form>
    </div>
  )
}
