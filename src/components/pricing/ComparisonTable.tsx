
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Check, X } from "lucide-react"

export const ComparisonTable = () => {
  const features = [
    {
      name: "AI Influencer Creation",
      starter: "1 influencer",
      pro: "3 influencers" 
    },
    {
      name: "Monthly AI Photos",
      starter: "5 photos",
      pro: "300 photos",
    },
    {
      name: "Customization Options",
      starter: "Basic",
      pro: "Advanced",
    },
    {
      name: "Brand Collaboration Tools",
      starter: false,
      pro: true,
    },
    {
      name: "Analytics Dashboard",
      starter: false,
      pro: true,
    },
    {
      name: "API Access",
      starter: false,
      pro: false,
    }
  ]

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[300px]">Features</TableHead>
            <TableHead>Starter</TableHead>
            <TableHead>Professional</TableHead>          
          </TableRow>
        </TableHeader>
        <TableBody>
          {features.map((feature, i) => (
            <TableRow key={i}>
              <TableCell className="font-medium">{feature.name}</TableCell>
              <TableCell>
                {typeof feature.starter === "boolean" ? (
                  feature.starter ? (
                    <Check className="w-5 h-5 text-primary" />
                  ) : (
                    <X className="w-5 h-5 text-muted-foreground" />
                  )
                ) : (
                  feature.starter
                )}
              </TableCell>
              <TableCell>
                {typeof feature.pro === "boolean" ? (
                  feature.pro ? (
                    <Check className="w-5 h-5 text-primary" />
                  ) : (
                    <X className="w-5 h-5 text-muted-foreground" />
                  )
                ) : (
                  feature.pro
                )}
              </TableCell>      
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
