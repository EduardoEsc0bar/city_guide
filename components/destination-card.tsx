import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface DestinationCardProps {
  id: string
  name: string
  image: string
  description: string
  tags: string[]
  priority?: boolean
  loading?: "lazy" | "eager"
}

export function DestinationCard({ id, name, image, description, tags, priority = false, loading = "lazy" }: DestinationCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative h-48">
        <Image
          src={image}
          alt={name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
          priority={priority}
          loading={loading}
        />
      </div>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <h3 className="font-semibold text-lg">{name}</h3>
        </div>
        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{description}</p>
        <div className="flex gap-2 mt-3 flex-wrap">
          {tags.map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}





