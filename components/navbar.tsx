"use client"

import Link from "next/link"
import { useRouter, usePathname } from 'next/navigation'
import { MapPin, Menu, X } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { useSession, signOut } from "next-auth/react"
import { useState } from "react"

export function Navbar() {
 const { data: session } = useSession()
 const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
 const router = useRouter()
 const pathname = usePathname()

 const handleExploreClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
  e.preventDefault();
  if (pathname.startsWith('/itinerary/') || pathname.startsWith('/explore/')) {
    router.push('/explore');
  } else {
    router.push(e.currentTarget.href);
  }
 };

 return (
   <header className="bg-white shadow-md">
     <div className="container mx-auto px-4">
       <div className="flex h-16 items-center justify-between">
         <div className="flex items-center">
           <Link href="/" className="flex items-center space-x-2">
             <MapPin className="h-6 w-6 text-primary" />
             <span className="text-xl font-bold text-primary">CityGuide</span>
           </Link>
         </div>
         <nav className="hidden md:flex md:space-x-8 md:ml-8 md:flex-grow">
           <Link 
             href="/explore" 
             className="text-sm font-medium text-gray-500 hover:text-primary"
             onClick={handleExploreClick}
           >
             Explore
           </Link>
           <Link href="/about" className="text-sm font-medium text-gray-500 hover:text-primary">
             About
           </Link>
           <Link href="/saved" className="text-sm font-medium text-gray-500 hover:text-primary">
             Saved
           </Link>
         </nav>
         <div className="flex items-center md:hidden">
           <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
             {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
           </Button>
         </div>
         <div className="hidden md:flex items-center space-x-4">
           {session ? (
             <>
               <span className="text-sm font-medium text-gray-500">Hello, {session.user?.name}</span>
               <Button variant="ghost" onClick={() => signOut()}>
                 Log out
               </Button>
             </>
           ) : (
             <Button variant="ghost" asChild>
               <Link href="/login">Log in</Link>
             </Button>
           )}
         </div>
       </div>
     </div>
     {mobileMenuOpen && (
       <div className="md:hidden">
         <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
           <Link 
             href="/explore" 
             className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary hover:bg-gray-50"
             onClick={handleExploreClick}
           >
             Explore
           </Link>
           <Link href="/about" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary hover:bg-gray-50">
             About
           </Link>
           <Link href="/saved" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-primary hover:bg-gray-50">
             Saved
           </Link>
         </div>
         <div className="pt-4 pb-3 border-t border-gray-200">
           {session ? (
             <div className="flex items-center px-5">
               <div className="flex-shrink-0">
                 <span className="text-base font-medium text-gray-700">Hello, {session.user?.name}</span>
               </div>
               <Button variant="ghost" onClick={() => signOut()} className="ml-auto">
                 Log out
               </Button>
             </div>
           ) : (
             <div className="px-5">
               <Button variant="ghost" asChild className="w-full justify-center">
                 <Link href="/login">Log in</Link>
               </Button>
             </div>
           )}
         </div>
       </div>
     )}
   </header>
 )
}












