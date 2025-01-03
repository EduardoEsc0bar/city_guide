import Image from "next/image"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface DestinationCardProps {
  id: string
  name: string
  image: string
  description: string
  rating: number
  tags: string[]
}

export function DestinationCard({ id, name, image, description, rating, tags }: DestinationCardProps) {
  return (
    <Link href={`/destination/${id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        <div className="relative h-48">
          <Image
            src={image}
            alt={name}
            fill
            className="object-cover"
          />
        </div>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <h3 className="font-semibold text-lg">{name}</h3>
            <Badge variant="secondary">{rating.toFixed(1)}★</Badge>
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
    </Link>
  )
}

