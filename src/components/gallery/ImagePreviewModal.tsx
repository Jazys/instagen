import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Heart, Share2, Download } from "lucide-react"
import Image from "next/image"
import { useEffect, useState } from 'react'

interface ImagePreviewModalProps {
  isOpen: boolean
  onClose: () => void
  imageSrc: string
}

export const ImagePreviewModal = ({ isOpen, onClose, imageSrc }: ImagePreviewModalProps) => {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden">
        <div className="flex flex-col md:flex-row">
          <div className="relative w-full md:w-2/3 aspect-[4/5]">
            <Image
              src={imageSrc}
              alt="AI Influencer Preview"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 66vw"
            />
          </div>
          <div className="w-full md:w-1/3 p-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">AI Influencer</h3>
              <p className="text-muted-foreground text-sm">
                Generated with advanced AI technology
              </p>
            </div>
            <div className="flex gap-4">
              <Button variant="outline" size="icon">
                <Heart className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon">
                <Share2 className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon">
                <Download className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Details</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>Style: Contemporary</li>
                <li>Resolution: 4K</li>
                <li>Created: Recently</li>
              </ul>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}