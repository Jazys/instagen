
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export const PreviewSection = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Preview</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="portrait" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="portrait" className="flex-1">Portrait</TabsTrigger>
            <TabsTrigger value="full-body" className="flex-1">Full Body</TabsTrigger>
            <TabsTrigger value="lifestyle" className="flex-1">Lifestyle</TabsTrigger>
          </TabsList>
          
          <TabsContent value="portrait">
            <div className="aspect-square rounded-lg border bg-muted/50 flex items-center justify-center">
              <span className="text-muted-foreground">Portrait Preview</span>
            </div>
          </TabsContent>
          
          <TabsContent value="full-body">
            <div className="aspect-[3/4] rounded-lg border bg-muted/50 flex items-center justify-center">
              <span className="text-muted-foreground">Full Body Preview</span>
            </div>
          </TabsContent>
          
          <TabsContent value="lifestyle">
            <div className="aspect-video rounded-lg border bg-muted/50 flex items-center justify-center">
              <span className="text-muted-foreground">Lifestyle Preview</span>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
