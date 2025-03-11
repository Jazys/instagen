import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Image from 'next/image'

interface PreviewSectionProps {
  currentImage: string
}

export const PreviewSection = ({ currentImage }: PreviewSectionProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Preview</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue='portrait' className='w-full'>
          <TabsList className='w-full'>
            <TabsTrigger value='portrait' className='flex-1'>Portrait</TabsTrigger>
            <TabsTrigger value='full-body' className='flex-1'>Full Body</TabsTrigger>
            <TabsTrigger value='lifestyle' className='flex-1'>Lifestyle</TabsTrigger>
          </TabsList>
          
          <TabsContent value='portrait'>
            <div className='relative aspect-square rounded-lg overflow-hidden'>
              <Image
                src={currentImage}
                alt='Portrait Preview'
                fill
                className='object-cover'
                sizes='(max-width: 768px) 100vw, 50vw'
              />
            </div>
          </TabsContent>
          
          <TabsContent value='full-body'>
            <div className='relative aspect-[3/4] rounded-lg overflow-hidden'>
              <Image
                src={currentImage}
                alt='Full Body Preview'
                fill
                className='object-cover'
                sizes='(max-width: 768px) 100vw, 50vw'
              />
            </div>
          </TabsContent>
          
          <TabsContent value='lifestyle'>
            <div className='relative aspect-video rounded-lg overflow-hidden'>
              <Image
                src={currentImage}
                alt='Lifestyle Preview'
                fill
                className='object-cover'
                sizes='(max-width: 768px) 100vw, 50vw'
              />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}