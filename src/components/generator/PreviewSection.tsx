import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Image from 'next/image'

export const PreviewSection = () => {
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
                src='/photo-8-m84j64ee.jpeg'
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
                src='https://images.unsplash.com/photo-1618641986557-1ecd230959aa'
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
                src='https://images.unsplash.com/photo-1614644147798-f8c0fc9da7f6'
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