"use client"

import type React from "react"
import { useState } from "react"
import { Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { useCreateRating } from "@/queries/rating/create-rating"

type RatingFormProps = {
  appointmentId: string
  open: boolean
  onClose: () => void
  onSubmitted?: () => void
}

const ratingLabels: Record<number, string> = {
  1: "Very Bad",
  2: "Bad",
  3: "Okay",
  4: "Good",
  5: "Excellent",
}

export default function RatingForm({
  appointmentId,
  open,
  onClose,
  onSubmitted,
}: RatingFormProps) {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [feedback, setFeedback] = useState("")
  const { toast } = useToast()

  const resetForm = () => {
    setRating(0)
    setHoverRating(0)
    setFeedback("")
  }

  const { mutateAsync, isPending } = useCreateRating({
    onSuccess: () => {
      toast({ title: "Thanks!", description: "Feedback submitted ⭐" })
      resetForm()
      onSubmitted?.()
      onClose()
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rating) {
      toast({
        title: "Rating required",
        description: "Please select a rating",
        variant: "destructive",
      })
      return
    }
    await mutateAsync({ appointmentId, rating, feedback })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && (resetForm(), onClose())}>
      <DialogContent className="sm:max-w-md rounded-2xl p-8 text-center">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">
            How was your experience?
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Your input helps us improve our service
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {/* ⭐ Stars (center focus like image 1) */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative flex gap-3 px-6 py-4 rounded-full bg-muted/40">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={cn(
                      "h-10 w-10 transition-colors",
                      (hoverRating || rating) >= star
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    )}
                  />
                </button>
              ))}
            </div>

            {/* Label like “Medium” */}
            {rating > 0 && (
              <span className="px-4 py-1 rounded-full text-sm font-medium bg-black text-white">
                {ratingLabels[rating]}
              </span>
            )}
          </div>

          {/* Feedback */}
          <Textarea
            placeholder="Add a comment..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={4}
            className="resize-none"
          />

          {/* CTA */}
          <Button
            type="submit"
            disabled={isPending}
            className="w-full h-11 text-base"
          >
            {isPending ? "Submitting..." : "Submit Now"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
