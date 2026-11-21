import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { FLAGSHIP_QUESTION, type PlanInput } from './plan'

export function QuestionStep({ onNext }: { onNext: (input: PlanInput) => void }) {
  const [question, setQuestion] = useState('')
  const [success, setSuccess] = useState('')
  const len = question.trim().length
  const valid = len >= 10 && len <= 500
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (valid) onNext({ question: question.trim(), successAction: success.trim() || undefined })
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="question">Your question</Label>
        <Textarea id="question" value={question} maxLength={500} onChange={(e) => setQuestion(e.target.value)} />
        <p className="text-xs text-muted-foreground">{len}/500 (minimum 10)</p>
        <Button type="button" variant="outline" size="sm" onClick={() => setQuestion(FLAGSHIP_QUESTION)}>
          {FLAGSHIP_QUESTION}
        </Button>
      </div>
      <div className="space-y-2">
        <Label htmlFor="success">What counts as success?</Label>
        <Input id="success" value={success} maxLength={200} onChange={(e) => setSuccess(e.target.value)} />
      </div>
      <Button type="submit" disabled={!valid}>Next</Button>
    </form>
  )
}
